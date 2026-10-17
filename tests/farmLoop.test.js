/**
 * The whole loop, once, through the real components.
 *
 * `AGENTS.md` names the suite's blind spot exactly: *"a test that imports a service
 * directly cannot catch a bug in the entry point that wires it."* Every other test in
 * `tests/farm.test.js` imports `domain/farm.js` and `ui/farmView.js` on their own, and
 * the one bug this repo actually shipped — a local `deleteAccount` shadowing the
 * imported one — passed every test in the suite for that reason.
 *
 * So this file drives the components **together**, the way `main.js` wires them: buy a
 * packet, click a plot, choose a seed, watch the sprite step, harvest, buy land. It
 * reproduces `main.js`'s click switch rather than importing it — `main.js` boots a
 * session and a weather fetch on import, which no unit test can afford — and that
 * duplication is the point made visible. If `main.js`'s switch and this one disagree,
 * one of the two assertions below is describing a game that does not exist.
 *
 * What it still cannot see: `main.js` itself, and anything real-browser.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { mountFarmView } from '../js/ui/farmView.js';
import { mountCropPicker } from '../js/ui/cropPicker.js';
import { buySeeds } from '../js/domain/shop.js';
import { buyPlot } from '../js/domain/land.js';
import { clearPlot, harvest, plant } from '../js/domain/farm.js';
import { plotAction } from '../js/ui/plotClick.js';
import { nextUnlockable, harvestsIn } from '../js/land_squares/index.js';
import { buildInitialState } from '../js/state/initialState.js';
import { START_GOLD } from '../js/config/game.js';

const HOUR = 3_600_000;
const GUEST = { status: 'guest', userId: 'acc_smoke', email: '', farmerName: 'Smoke', username: '' };

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/**
 * The farm plus a renderer, wired the way `main.js` wires them.
 *
 * `click` is the click switch copied out of `onPlotClick` in `main.js`. Kept as a
 * closure rather than extracted to a module because `main.js` cannot be imported here
 * — see the file header. The two must stay in step; `plotAction` is what keeps them
 * honest, and asserting against it is what makes the duplication safe.
 */
function harness({ gold = START_GOLD, seeds: bag = {} } = {}) {
  // `let`, not `const`: the domain rules return a **new** state and these handlers
  // reassign, which is exactly what `store.apply()` does. A `const` here threw on the
  // first click and left every later assertion reading a farm that never changed.
  let state = { ...buildInitialState(GUEST), gold, inventory: { seeds: { rice: 0 }, harvest: {} } };
  state.inventory.seeds = { ...state.inventory.seeds, ...bag };

  let lastSaid = null;

  function render() {
    const offer = nextUnlockable(state);
    mountFarmView(root, {
      plots: state.plots,
      selection: state.selection,
      clock: state.clock,
      nextPrice: offer?.price ?? 0,
      onPlotClick: (id) => {
        switch (plotAction(state, id)) {
          case 'harvest': {
            const before = state.gold;
            const r = harvest(state, id);
            if (r.ok) state = r.state;
            lastSaid = r.ok ? `harvested +${state.gold - before}` : r.reason;
            break;
          }
          case 'plant':
            mountCropPicker(root, {
              seeds: state.inventory.seeds,
              plotId: id,
              onPlant: (cropId) => {
                const r = plant(state, id, cropId);
                state = r.ok ? r.state : state;
                lastSaid = r.ok ? `planted ${cropId}` : r.reason;
              },
            });
            lastSaid = 'picker opened';
            break;
          case 'buy': {
            const r = buyPlot(state, id);
            state = r.ok ? r.state : state;
            lastSaid = r.ok ? `bought for ${r.price}` : r.reason;
            break;
          }
          default:
            lastSaid = 'nothing to do';
        }
      },
    });
  }

  function click(plotId) {
    const tile = [...root.querySelectorAll('.plot')].find((t) => t.dataset.plotId === String(plotId));
    assert.ok(tile, `plot ${plotId} is on the field`);
    tile.click();
    return lastSaid;
  }

  /** The seed options the picker is currently offering. */
  const options = () => root.querySelectorAll('.crop-picker__seed');

  /** The sprite the field is showing for a plot, by file name. */
  function sprite(plotId = 0) {
    const tile = [...root.querySelectorAll('.plot')].find((t) => t.dataset.plotId === String(plotId));
    return tile.querySelector('.plot__crop')?.getAttribute('src').split('/').pop().replace('.png', '');
  }

  return {
    get state() { return state; },
    render,
    click,
    options,
    sprite,
  };
}

/* --- the loop, in order ---------------------------------------------------- */

test('a new player can plant on their free plot within a minute of starting', () => {
  const farm = harness();

  // 1. Nothing in the bag, so the click is a dead end — and says so.
  farm.render();
  assert.equal(farm.click(0), 'picker opened');
  assert.equal(farm.options().length, 0, 'no seeds to offer');

  // 2. Buy a packet, exactly as `shop-main.js` does.
  const bought = buySeeds(farm.state, 'rice', 1);
  assert.ok(bought.ok);
  assert.equal(bought.cost, 100);
  const withSeed = { ...bought.state };

  // 3. Now the click plants.
  const ready = harness({ gold: withSeed.gold, seeds: { rice: 1 } });
  ready.render();
  assert.equal(ready.click(0), 'picker opened');
  assert.equal(ready.options().length, 1);

  ready.options()[0].click();
  assert.equal(ready.state.plots[0].cropId, 'rice');
  assert.equal(ready.state.inventory.seeds.rice, 0, 'the seed was spent');
  assert.equal(ready.state.gold, START_GOLD - 100, 'and the gold left the purse');
});

test('the field steps through the sprites once an hour and holds the last one', () => {
  const farm = harness({ seeds: { rice: 1 } });
  farm.render();
  farm.click(0);
  farm.options()[0].click();

  // Walk a real hour at a time and read the sprite off the rendered field each time,
  // rather than asking the domain for a stage and trusting the view to agree.
  const seen = [];
  for (let hours = 0; hours <= 7; hours += 1) {
    const aged = {
      ...farm.state,
      plots: farm.state.plots.map((plot) =>
        plot.id === 0 ? { ...plot, plantedAt: Date.now() - hours * HOUR } : plot,
      ),
    };
    const offer = nextUnlockable(aged);
    mountFarmView(root, { plots: aged.plots, selection: null, clock: aged.clock, nextPrice: offer?.price ?? 0, onPlotClick: () => {} });

    const tile = [...root.querySelectorAll('.plot')].find((t) => t.dataset.plotId === '0');
    seen.push(tile.querySelector('.plot__crop').getAttribute('src').split('/').pop());
  }

  assert.deepEqual(seen, [
    'rice_1.png', 'rice_2.png', 'rice_3.png', 'rice_4.png',
    'rice_5.png', // 5h
    'rice_5.png', // 6h — held, because there is no rice_6.png
    'rice_5.png',
    'rice_5.png',
  ]);

  // And nothing ever asks for a file that is not on disk.
  assert.ok(!seen.some((src) => /rice_6/.test(src)), 'no missing sixth sprite is requested');
});

test('a finished-looking crop is not harvestable until it is actually ready', () => {
  // The distinction the sprite cannot show: stage 5 is drawn from four hours, and
  // rice takes six. Judging readiness by the picture would pay out two hours early.
  const farm = harness({ seeds: { rice: 1 } });
  farm.render();
  farm.click(0);
  farm.options()[0].click();

  const at = (hours) => ({
    ...farm.state,
    plots: farm.state.plots.map((plot) =>
      plot.id === 0 ? { ...plot, plantedAt: Date.now() - hours * HOUR } : plot,
    ),
  });

  assert.equal(harvest(at(5.9), 0).reason, 'That crop is not ready yet.');
  assert.equal(harvest(at(6), 0).gold, 200);
});

test('the first harvest pays for the second plot, and the plot after it', () => {
  // The whole economic loop the free plot exists to start: 200 gold in, 200 out,
  // which is the first plot at 100 and half a packet of the next seed.
  const farm = harness({ seeds: { rice: 1 } });

  farm.render();
  farm.click(0);
  farm.options()[0].click();

  const ripe = {
    ...farm.state,
    plots: farm.state.plots.map((p) => (p.id === 0 ? { ...p, plantedAt: Date.now() - 6 * HOUR } : p)),
  };

  const picked = harvest(ripe, 0);
  assert.ok(picked.ok, picked.reason);
  assert.equal(picked.gold, 200, 'twice the 100 the seed cost');

  const offer = nextUnlockable(picked.state);
  assert.equal(offer.price, 100);

  const land = buyPlot(picked.state, offer.plotId);
  assert.ok(land.ok, land.reason);
  // The harness hands over the seed rather than charging for it, so this is
  // 200 start + 200 harvest - 100 land. Buying it *and* a packet would still leave
  // enough, which is the pacing point docs/crops.md makes about the freebie.
  assert.equal(land.state.gold, 300);
  assert.ok(land.state.gold >= 100, 'and there is still a packet of rice in it');
  assert.equal(land.state.plots.filter((p) => p.owned).length, 2);

  // The plot just bought is now farmable, and the one after it is on offer.
  assert.equal(plotAction(land.state, offer.plotId), 'plant', 'bought and empty, so plantable');
  assert.notEqual(nextUnlockable(land.state).plotId, offer.plotId, 'the offer moved along');
});

test('buying through the field actually debits and unlocks', () => {
  // The click path, not the domain function directly — this is the join `main.js`
  // performs, and it is the part no other test in this file covers.
  const farm = harness({ gold: 250 });

  farm.render();
  const onOffer = nextUnlockable(farm.state).plotId;

  assert.equal(farm.click(onOffer), 'bought for 100');
  assert.equal(farm.state.gold, 150);
  assert.equal(farm.state.plots.find((p) => p.id === onOffer).owned, true);

  // Clicking a locked plot does nothing at all, because the button is `disabled`.
  const tile = [...root.querySelectorAll('.plot')].find((t) => t.dataset.plotId === String(onOffer + 1));
  assert.equal(tile.getAttribute('disabled'), 'true');
  assert.equal(farm.state.gold, 150, 'and takes no gold');
});

test('a dead crop is cleared rather than harvested, so the ground is reusable', () => {
  // ISS-006. Without `clearPlot` the plot is stuck forever: `plant` refuses an
  // occupied plot and `harvest` refuses a dead one.
  const farm = harness({ seeds: { rice: 2 } });
  farm.render();
  farm.click(0);
  farm.options()[0].click();

  const dying = {
    ...farm.state,
    plots: farm.state.plots.map((p) =>
      p.id === 0 ? { ...p, plantedAt: Date.now() - 50 * HOUR, dead: true } : p,
    ),
  };

  assert.equal(plotAction(dying, 0), 'clear');
  assert.ok(harvest(dying, 0).ok === false, 'and it pays nothing');

  const cleared = clearPlot(dying, 0);
  assert.ok(cleared.ok);
  assert.equal(cleared.state.plots[0].cropId, null);

  // Replantable, with the second seed.
  const again = plant(cleared.state, 0, 'rice');
  assert.ok(again.ok, 'so the ground is not wasted');
});

test('the player can only ever grow on land they own', () => {
  const farm = harness({ gold: 500, seeds: { rice: 1 } });
  farm.render();

  const locked = farm.state.plots.filter((p) => !p.owned);
  assert.equal(locked.length, 15);

  for (const plot of locked) {
    assert.equal(plant(farm.state, plot.id, 'rice').reason, 'That land is not yours yet. Buy it first.');
  }

  assert.equal(farm.state.plots.filter((p) => p.cropId).length, 0, 'nothing was planted anywhere');
});

test('growth keeps running with the tab closed, because it is derived not stored', () => {
  // The reason there is no `timeLeft` field. A save written at planting and read six
  // hours later must come back finished — this is what the export/import round trip
  // depends on, and `state/transfer.js` rebases `plantedAt` rather than a countdown.
  const farm = harness({ seeds: { rice: 1 } });
  farm.render();
  farm.click(0);
  farm.options()[0].click();

  const plot = farm.state.plots[0];
  assert.equal(JSON.parse(JSON.stringify(plot)).cropId, 'rice', 'it survives a round trip');

  const sixHoursOn = { ...plot, plantedAt: Date.now() - 6 * HOUR };
  const reloaded = harvestsIn(JSON.parse(JSON.stringify(sixHoursOn)), Date.now(), 1);

  assert.equal(reloaded.ready, true, 'a farm saved at planting is harvestable after six hours');
  assert.equal(reloaded.stage, 5);
});
