/**
 * The farm's rules: planting, growth, harvesting, buying land.
 *
 * Pure functions, so this needs no DOM, no store and no `fetch` — `node --test` runs
 * it in milliseconds. What it cannot cover is the wiring in `main.js` that decides
 * which of these a click means; `tests/farmView.test.js` covers the rendering and
 * this file covers the rules, and the join between them is asserted by name here
 * (`plotAction`) so that both halves are pinned to the same answers.
 *
 * Every test builds a real farm through `buildInitialState` and then edits it, rather
 * than hand-rolling a plot object. A fabricated plot is how a test ends up asserting
 * behaviour for a shape the game never produces.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clearPlot,
  FARM_REASONS,
  harvest,
  plant,
} from '../js/domain/farm.js';
import { damageSprite } from '../js/domain/damage.js';
import { buyPlot, canBuyPlot, LAND_REASONS } from '../js/domain/land.js';
import { plotAction } from '../js/ui/plotClick.js';
import { cropOf } from '../js/config/crops.js';
import { HEALTH, START_GOLD } from '../js/config/game.js';
import { PLOT_PRICES, STARTER_PLOT_ID, UNLOCK_ORDER } from '../js/config/field.js';
import { buildInitialState } from '../js/state/initialState.js';
import { harvestsIn, nextUnlockable } from '../js/land_squares/index.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'abdul@rice.bd' };
const HOUR = 3_600_000;

/** A fresh farm, optionally with gold and seeds, pinned so times are predictable. */
function farm({ gold = START_GOLD, seeds = {} } = {}) {
  const state = buildInitialState(SESSION);
  state.gold = gold;
  state.inventory.seeds = { ...state.inventory.seeds, ...seeds };
  return state;
}

/** A farm with a rice crop sown on the starter plot `hoursAgo` hours ago. */
function growing({ hoursAgo = 0, health = 100, seeds = { rice: 5 }, gold = START_GOLD } = {}) {
  const sown = farm({ gold, seeds });
  const result = plant(sown, STARTER_PLOT_ID, 'rice');
  assert.ok(result.ok, 'the starter plot accepts a seed');

  const plot = result.state.plots.find((p) => p.id === STARTER_PLOT_ID);
  plot.plantedAt = Date.now() - hoursAgo * HOUR;
  plot.health = health;
  return result.state;
}

/** The plot on the starter id, for terser assertions. */
function plotAt(state, plotId = STARTER_PLOT_ID) {
  return state.plots.find((plot) => plot.id === plotId);
}

/* --- the free plot --------------------------------------------------------- */

test('a new farm can be planted on immediately, with no land to buy', () => {
  const state = farm({ seeds: { rice: 2 } });

  assert.equal(STARTER_PLOT_ID, 0, 'the free plot is the back corner');
  assert.equal(plotAt(state).owned, true);

  const result = plant(state, STARTER_PLOT_ID, 'rice');
  assert.ok(result.ok, 'so planting on it works with 200 starting gold and no purchases');
});

test('the free plot cannot be bought — it is never for sale', () => {
  const state = farm({ gold: 999_999 });

  const result = buyPlot(state, STARTER_PLOT_ID);
  assert.equal(result.ok, false);
  assert.equal(result.reason, LAND_REASONS.forSale);
  assert.equal(plotAt(state).owned, true, 'and it was already owned');
});

test('the other fifteen plots cannot be planted on until they are bought', () => {
  const state = farm({ seeds: { rice: 5 } });

  for (const plot of state.plots.filter((p) => !p.owned)) {
    const result = plant(state, plot.id, 'rice');
    assert.equal(result.ok, false, `plot ${plot.id}`);
    assert.equal(result.reason, FARM_REASONS.notOwned);
  }
});

/* --- planting -------------------------------------------------------------- */

test('planting spends exactly one seed and stamps the time', () => {
  const state = farm({ seeds: { rice: 3 } });
  const before = Date.now();

  const result = plant(state, STARTER_PLOT_ID, 'rice');

  assert.ok(result.ok);
  assert.equal(result.state.inventory.seeds.rice, 2, 'one seed gone');
  assert.equal(state.inventory.seeds.rice, 3, 'and the original state is untouched');

  const plot = plotAt(result.state);
  assert.equal(plot.cropId, 'rice');
  assert.ok(plot.plantedAt >= before, 'plantedAt is now, not zero');
});

test('planting is refused for every reason that would be wrong', () => {
  const seeds = { rice: 2 };
  const sown = farm({ seeds });

  const occupied = plant(sown, STARTER_PLOT_ID, 'rice').state;
  assert.equal(plant(occupied, STARTER_PLOT_ID, 'rice').reason, FARM_REASONS.occupied);

  const noSeed = farm({ seeds: { rice: 0 } });
  assert.equal(plant(noSeed, STARTER_PLOT_ID, 'rice').reason, FARM_REASONS.noSeed('Rice'));

  assert.equal(plant(farm({ seeds }), 99, 'rice').reason, FARM_REASONS.unknownPlot);
  assert.equal(plant(farm({ seeds }), STARTER_PLOT_ID, 'dragonfruit').reason, FARM_REASONS.unknownCrop);

  // A dead plot has to be cleared first, or the ground would be unusable forever —
  // `plant` refuses an occupied plot and `harvest` refuses a dead one. ISS-006.
  const dead = plant(farm({ seeds }), STARTER_PLOT_ID, 'rice').state;
  dead.plots[STARTER_PLOT_ID].dead = true;
  assert.equal(plant(dead, STARTER_PLOT_ID, 'rice').reason, FARM_REASONS.deadPlot);
});

/* --- growth ---------------------------------------------------------------- */

test('a rice crop changes sprite once an hour, and holds the last one', () => {
  // Rice takes six hours and there are five sprites, so the last hour holds stage 5.
  // The pairs below are the whole table; anything off by one fails here.
  const expected = [
    [0, 1], [0.9, 1],
    [1, 2], [1.9, 2],
    [2, 3], [2.9, 3],
    [3, 4], [3.9, 4],
    [4, 5], [5.9, 5],
    [6, 5], [99, 5],
  ];

  for (const [hours, stage] of expected) {
    const grown = harvestsIn({ cropId: 'rice', plantedAt: Date.now() - hours * HOUR }, Date.now(), 1);
    assert.equal(grown.stage, stage, `${hours}h in`);
  }
});

test('readiness is progress, not the sprite — the last stage is not "ready" early', () => {
  // The bug this guards: stage 5 is drawn from 4h, so a player looking at a finished
  // rice plant must still not be able to harvest it for two more hours.
  const atFiveHours = harvestsIn(
    { cropId: 'rice', plantedAt: Date.now() - 5 * HOUR },
    Date.now(),
    1,
  );
  assert.equal(atFiveHours.stage, 5, 'it looks finished');
  assert.equal(atFiveHours.ready, false, 'but it is not');

  const atSixHours = harvestsIn(
    { cropId: 'rice', plantedAt: Date.now() - 6 * HOUR },
    Date.now(),
    1,
  );
  assert.equal(atSixHours.ready, true);
  assert.equal(atSixHours.msLeft, 0);
});

test('a dead crop never becomes ready, however long it has been planted', () => {
  const grown = harvestsIn(
    { cropId: 'rice', plantedAt: Date.now() - 100 * HOUR, dead: true },
    Date.now(),
    1,
  );
  assert.equal(grown.progress, 1);
  assert.equal(grown.ready, false, 'and the only way out is clearPlot');
});

test('growth runs on the game clock, and the debug speed moves it too', () => {
  const plot = { cropId: 'rice', plantedAt: Date.now() };
  const now = Date.now();

  // A time-skip moves `now`; `?fast=N` divides elapsed time. Both feed the same
  // question, so both have to move the crop — otherwise a demo under `?fast` shows a
  // season card and a season's worth of weather over an unchanging field.
  assert.equal(harvestsIn(plot, now, 1).stage, 1, 'just sown');
  assert.equal(harvestsIn(plot, now + 3 * HOUR, 1).stage, 4, 'three hours later, stage 4');

  // 30 minutes real: a sixth of an hour at 1x, half an hour of crop at 60x.
  const halfHourAgo = { cropId: 'rice', plantedAt: now - HOUR / 2 };
  assert.equal(harvestsIn(halfHourAgo, now, 1).stage, 1, '30 min at 1x is still sprouting');
  assert.equal(harvestsIn(halfHourAgo, now, 60).stage, 5, '30 min at 60x is 30 crop-hours — done');
  assert.equal(harvestsIn(halfHourAgo, now, 60).ready, true, 'and harvestable');

  // The speed changes nothing about the crop table itself.
  assert.equal(harvestsIn(plot, now, 1).progress, 0);
  assert.equal(harvestsIn(plot, now, 60).progress, 0, 'a freshly sown seed is stage 1 at any speed');
});

test('a nonsensical speed is ignored rather than producing a zero-length crop', () => {
  const plot = { cropId: 'rice', plantedAt: Date.now() - 2 * HOUR };
  const now = Date.now();

  for (const speed of [0, -5, NaN, Infinity, 'fast', null, undefined]) {
    const grown = harvestsIn(plot, now, speed);
    assert.equal(grown.stage, 3, `speed ${String(speed)} falls back to 1x`);
    assert.ok(grown.progress > 0, `speed ${String(speed)} did not freeze the crop`);
  }
});

test('an empty plot reports nothing planted rather than throwing', () => {
  for (const plot of [{}, { cropId: null }, { cropId: 'rice' }, { cropId: 'dragonfruit', plantedAt: 1 }]) {
    assert.equal(harvestsIn(plot, Date.now(), 1).planted, false, JSON.stringify(plot));
  }
});

/* --- harvesting ------------------------------------------------------------ */

test('harvesting pays twice the seed at full health', () => {
  const state = growing({ hoursAgo: 6 });
  const rice = cropOf('rice');

  const result = harvest(state, STARTER_PLOT_ID);

  assert.ok(result.ok);
  assert.equal(result.gold, rice.yield * rice.sellPrice);
  assert.equal(result.gold, rice.seedPrice * 2, 'the 2x invariant from docs/crops.md');
  assert.equal(result.state.gold, START_GOLD + result.gold, 'gold is added, not replaced');
});

test('health is what a poor harvest costs you', () => {
  const full = harvest(growing({ hoursAgo: 6 }), STARTER_PLOT_ID);
  const half = harvest(growing({ hoursAgo: 6, health: 50 }), STARTER_PLOT_ID);

  assert.equal(half.gold, full.gold * 0.5, 'half health, half the money');
  assert.equal(
    half.gold,
    cropOf('rice').seedPrice,
    'at exactly 50% a harvest exactly repays its own seed',
  );

  // Below that it does not, which is the whole risk model: weather is not decoration.
  const poor = harvest(growing({ hoursAgo: 6, health: 49 }), STARTER_PLOT_ID);
  assert.ok(poor.gold < cropOf('rice').seedPrice, 'below 50% the harvest loses money');
  assert.equal(poor.gold, 98);
});

test('health is clamped, so a hand-edited save cannot mint gold', () => {
  const negative = harvest(growing({ hoursAgo: 6, health: -500 }), STARTER_PLOT_ID);
  const absurd = harvest(growing({ hoursAgo: 6, health: 9999 }), STARTER_PLOT_ID);
  const full = harvest(growing({ hoursAgo: 6, health: HEALTH.max }), STARTER_PLOT_ID);

  assert.equal(negative.gold, 0, 'negative health pays nothing rather than going backwards');
  assert.equal(absurd.gold, full.gold, 'and more than full health is not more gold');
});

test('harvesting empties the plot and banks the crop', () => {
  const result = harvest(growing({ hoursAgo: 6 }), STARTER_PLOT_ID);
  const plot = plotAt(result.state);

  assert.equal(plot.cropId, null, 'the ground is free again');
  assert.equal(plot.plantedAt, null);
  assert.equal(plot.owned, true, 'and the land is still the player\'s');

  const rice = cropOf('rice');
  assert.equal(result.state.inventory.harvest.rice.units, rice.yield);
  assert.equal(result.state.inventory.harvest.rice.quality, 1);
});

test('harvest quality averages into the stack rather than overwriting it', () => {
  // Harvesting empties the plot, so a second harvest needs a second sowing — which is
  // itself worth asserting, because a stack that reset on an empty plot would hide it.
  const first = harvest(growing({ hoursAgo: 6 }), STARTER_PLOT_ID);
  assert.equal(plotAt(first.state).cropId, null, 'the ground is free after a harvest');

  const replanted = plant(first.state, STARTER_PLOT_ID, 'rice').state;
  plotAt(replanted).plantedAt = Date.now() - 6 * HOUR;

  const second = harvest(replanted, STARTER_PLOT_ID);
  assert.equal(second.state.inventory.harvest.rice.units, 20, 'two packets banked');
  assert.equal(second.state.inventory.harvest.rice.quality, 1, 'both full health, so still 1');

  // A bad lot afterwards drags the average down rather than replacing it.
  const third = plant(second.state, STARTER_PLOT_ID, 'rice').state;
  plotAt(third).plantedAt = Date.now() - 6 * HOUR;
  plotAt(third).health = 50;

  const mixed = harvest(third, STARTER_PLOT_ID);
  const bag = mixed.state.inventory.harvest.rice;

  assert.equal(bag.units, 30, 'and adds to the pile');
  assert.ok(bag.quality < 1, 'quality fell');
  assert.ok(bag.quality > 0.5, 'but not down to the bad lot alone — it is an average');
  assert.equal(bag.quality, (20 * 1 + 10 * 0.5) / 30);
});

test('an unripe crop cannot be harvested', () => {
  for (const hoursAgo of [0, 1, 3, 5.9]) {
    const result = harvest(growing({ hoursAgo }), STARTER_PLOT_ID);
    assert.equal(result.ok, false, `${hoursAgo}h`);
    assert.equal(result.reason, FARM_REASONS.notReady);
  }
});

test('a dead crop pays nothing and says why', () => {
  const state = growing({ hoursAgo: 50 });
  plotAt(state).dead = true;

  const result = harvest(state, STARTER_PLOT_ID);
  assert.equal(result.ok, false);
  assert.equal(result.reason, FARM_REASONS.deadCrop);
});

test('harvesting is refused on land the player does not own', () => {
  const state = growing({ hoursAgo: 6 });
  const target = state.plots.find((plot) => !plot.owned);

  assert.equal(harvest(state, target.id).reason, FARM_REASONS.notOwned);
  assert.equal(harvest(state, 99).reason, FARM_REASONS.unknownPlot);
});

/* --- clearing -------------------------------------------------------------- */

test('clearPlot frees a dead plot, and a living crop has to be harvested instead', () => {
  const dead = growing({ hoursAgo: 50 });
  plotAt(dead).dead = true;

  const cleared = clearPlot(dead, STARTER_PLOT_ID);
  assert.ok(cleared.ok);
  assert.equal(plotAt(cleared.state).dead, false);
  assert.equal(plotAt(cleared.state).cropId, null);
  assert.ok(plant(cleared.state, STARTER_PLOT_ID, 'rice').ok, 'so it can be replanted');

  assert.equal(clearPlot(growing({ hoursAgo: 1 }), STARTER_PLOT_ID).ok, true);
  assert.equal(clearPlot(farm(), STARTER_PLOT_ID).reason, FARM_REASONS.nothingPlanted);
});

test('a new crop does not inherit the previous crop\'s damage latch', () => {
  // ISS-112. The latch is permanent for the crop, not for the plot: `plant`,
  // `harvest` and `clearPlot` all clear it. Before this, a replant on a plot that had
  // ever been `dry` drew the drought sprite and the word "Dry" over a healthy
  // stage-1 crop, because `plot.dead` was false and the crop itself grew normally.
  const damaged = growing({ hoursAgo: 6, health: 70 });
  plotAt(damaged).damage = 'dry';
  plotAt(damaged).damageAt = plotAt(damaged).plantedAt + HOUR;

  const harvested = harvest(damaged, STARTER_PLOT_ID);
  assert.ok(harvested.ok);
  assert.equal(plotAt(harvested.state).damage, null, 'harvesting takes the latch with the crop');
  assert.equal(plotAt(harvested.state).damageAt, null, 'and its timestamp');

  const replanted = plant(harvested.state, STARTER_PLOT_ID, 'rice');
  assert.ok(replanted.ok);
  const plot = plotAt(replanted.state);
  assert.equal(plot.damage, null, 'so the next crop starts clean');
  assert.equal(plot.damageAt, null, 'with no latch time from its predecessor');
  assert.equal(damageSprite(plot), null, 'and draws no damage sprite');
  assert.equal(plot.dead, false, 'while the crop itself is alive and growing');

  // The clear path, which is how a latched crop usually leaves a plot.
  const dead = growing({ hoursAgo: 50 });
  plotAt(dead).dead = true;
  plotAt(dead).damage = 'waterlogged';
  plotAt(dead).damageAt = plotAt(dead).plantedAt + 2 * HOUR;
  const cleared = clearPlot(dead, STARTER_PLOT_ID);
  assert.ok(cleared.ok);
  assert.equal(plotAt(cleared.state).damage, null, 'clearPlot clears the latch too');
  assert.equal(plotAt(cleared.state).damageAt, null, 'and its timestamp');
  assert.ok(plant(cleared.state, STARTER_PLOT_ID, 'rice').ok);
});

test('planting on bare ground that carries damage starts the crop clean', () => {
  // Defence in depth: `plant` is the boundary that starts a crop, so it clears the
  // latch even when an older save left one on the plot rather than on a crop.
  const state = farm({ seeds: { rice: 1 } });
  plotAt(state).damage = 'dry';
  plotAt(state).damageAt = Date.now() - HOUR;

  const result = plant(state, STARTER_PLOT_ID, 'rice');
  assert.ok(result.ok);
  assert.equal(plotAt(result.state).damage, null);
  assert.equal(plotAt(result.state).damageAt, null);
  assert.equal(damageSprite(plotAt(result.state)), null);
});

/* --- buying land ----------------------------------------------------------- */

test('the first purchase is the next plot in order, at 100 gold', () => {
  const state = farm({ gold: 100 });

  const offer = nextUnlockable(state);
  assert.equal(offer.plotId, UNLOCK_ORDER[1], 'indexed by ownedCount, and one is already owned');
  assert.equal(offer.price, 100);

  // Zone A is ids {0,1,4,5} because `id = row * 4 + col`, so the second plot sold is
  // id 4 and *not* id 1. This is the assertion that catches a contiguous-run reading
  // of the zones, which sold a zone-B plot second and left a hole in the field.
  assert.equal(offer.plotId, 4, 'plot 5, the first one next to the free plot');

  const result = buyPlot(state, offer.plotId);
  assert.ok(result.ok);
  assert.equal(result.state.gold, 0);
  assert.equal(plotAt(result.state, 4).owned, true);
  assert.equal(state.gold, 100, 'the original state is untouched');
});

test('only the next plot is buyable — the rest are refused by name', () => {
  const state = farm({ gold: 1_000_000 });
  const onOffer = nextUnlockable(state).plotId;

  for (const plotId of [1, 7, 15]) {
    assert.notEqual(plotId, onOffer);
    const result = buyPlot(state, plotId);
    assert.equal(result.ok, false, `plot ${plotId}`);
    assert.equal(result.reason, LAND_REASONS.notNext);
    assert.equal(canBuyPlot(state, plotId), false, 'and the UI knows it too');
  }

  assert.equal(canBuyPlot(state, onOffer), true);
});

test('being poor is a different message from being early', () => {
  // Order matters: a player who clicked the wrong plot should be told that, not told
  // they need more gold. Being short on the *right* plot is a different problem.
  const onOffer = nextUnlockable(farm()).plotId;
  const notOnOffer = farm().plots.find((plot) => !plot.owned && plot.id !== onOffer).id;

  assert.equal(buyPlot(farm({ gold: 0 }), notOnOffer).reason, LAND_REASONS.notNext);
  assert.equal(buyPlot(farm({ gold: 50 }), onOffer).reason, LAND_REASONS.tooExpensive(100, 50));
  assert.equal(canBuyPlot(farm({ gold: 50 }), onOffer), false);
});

test('prices double with every plot bought, and the ladder is 16 deep', () => {
  assert.equal(UNLOCK_ORDER.length, 16, 'sixteen entries, one per owned-count');
  assert.equal(new Set(UNLOCK_ORDER).size, 16, 'no plot twice');
  assert.equal(UNLOCK_ORDER[0], STARTER_PLOT_ID, 'index 0 is the free starter\'s own slot');

  let state = farm({ gold: 10_000_000 });
  const paid = [];

  for (const plotId of UNLOCK_ORDER.slice(1)) {
    const result = buyPlot(state, plotId);
    assert.ok(result.ok, `plot ${plotId}`);
    paid.push(result.price);
    state = result.state;
  }

  assert.equal(state.plots.filter((plot) => plot.owned).length, 16, 'the whole field');
  assert.equal(paid.length, 15, 'fifteen paid plots');
  assert.equal(paid[0], PLOT_PRICES[1], 'buying starts at index 1');
  for (let i = 1; i < paid.length; i += 1) {
    assert.equal(paid[i], paid[i - 1] * 2, `price ${i} doubles`);
  }
  assert.equal(nextUnlockable(state), null, 'and there is nothing left to sell');
  assert.equal(
    buyPlot(state, STARTER_PLOT_ID).reason,
    LAND_REASONS.forSale,
    'the free plot is never for sale, even at the end',
  );
});

test('the unlock order fills zone by zone, from the back edge to the front', () => {
  // Zone A (top) first, then B (right), C (left), D (bottom), col-then-row inside
  // each — so every plot bought touches one already owned, and nothing is ever
  // reachable only through land the player does not have.
  const plots = buildInitialState(SESSION).plots;

  assert.deepEqual(UNLOCK_ORDER.map((id) => plots.find((p) => p.id === id).zone), [
    'A', 'A', 'A', 'A',
    'B', 'B', 'B', 'B',
    'C', 'C', 'C', 'C',
    'D', 'D', 'D', 'D',
  ]);

  assert.ok(
    UNLOCK_ORDER.slice(0, 4).every((id) => plots.find((p) => p.id === id).zone === 'A'),
    'zone A is sold first, and the free plot is part of zone A',
  );

  let state = farm({ gold: 10_000_000 });
  const owned = new Set(state.plots.filter((plot) => plot.owned).map((plot) => plot.id));
  const at = (id) => plots.find((plot) => plot.id === id);

  for (const plotId of UNLOCK_ORDER.slice(1)) {
    const result = buyPlot(state, plotId);
    assert.ok(result.ok, `plot ${plotId}`);
    state = result.state;

    // Adjacency: the new plot must touch one already owned, or the player is being
    // asked to buy an island with no path to the rest of their farm.
    const here = at(plotId);
    const touches = [
      [here.col - 1, here.row], [here.col + 1, here.row],
      [here.col, here.row - 1], [here.col, here.row + 1],
    ].some(([col, row]) => col >= 0 && row >= 0 && col < 4 && row < 4 && owned.has(row * 4 + col));

    assert.ok(touches, `plot ${plotId} at (${here.col},${here.row}) touches land already bought`);
    owned.add(plotId);
  }
});

/* --- what a click means ---------------------------------------------------- */

test('a click means exactly one thing per plot state', () => {
  const ripe = growing({ hoursAgo: 6 });
  const young = growing({ hoursAgo: 1 });
  const dead = growing({ hoursAgo: 50 });
  plotAt(dead).dead = true;

  const emptyWithSeed = farm({ seeds: { rice: 1 } });
  const emptyNoSeed = farm({ seeds: { rice: 0 } });

  assert.equal(plotAction(ripe, STARTER_PLOT_ID), 'harvest', 'a finished crop');
  assert.equal(plotAction(young, STARTER_PLOT_ID), 'select', 'a growing one is left alone');
  assert.equal(plotAction(dead, STARTER_PLOT_ID), 'clear', 'a dead one needs clearing');
  assert.equal(plotAction(emptyWithSeed, STARTER_PLOT_ID), 'plant', 'empty with a seed');
  // An empty plot is `plant` even with an empty bag: the picker opens, says there is
  // nothing to plant, and offers the shop. A click that silently did nothing would
  // leave the player not knowing the plot was theirs.
  assert.equal(plotAction(emptyNoSeed, STARTER_PLOT_ID), 'plant', 'empty with nothing to plant');

  const onOffer = nextUnlockable(emptyWithSeed).plotId;
  const notOnOffer = emptyWithSeed.plots.find((plot) => !plot.owned && plot.id !== onOffer).id;

  assert.equal(plotAction(emptyWithSeed, onOffer), 'buy', 'the plot on offer');
  assert.equal(plotAction(emptyWithSeed, notOnOffer), 'locked', 'a plot that is not on offer');
  assert.equal(plotAction(emptyWithSeed, 99), 'locked', 'and a plot that does not exist');

  // Buying the next plot moves the offer along, which is what makes `main.js`'s
  // switch and this function agree after every purchase.
  const bought = buyPlot(emptyWithSeed, onOffer).state;
  assert.equal(plotAction(bought, onOffer), 'plant', 'the plot just bought is now usable');
  assert.equal(
    plotAction(bought, nextUnlockable(bought).plotId),
    'buy',
    'and the next one is on offer',
  );
});

/* --- ISS-089: planting is judged by the weather, once, at the moment of sowing --- */

/** A forecast sitting `hours` either side of now, so a full forward window exists. */
function sky({ code = 0, temp = 20, rain = 0 } = {}) {
  const base = new Date().getTime();
  const stamp = (ms) => {
    const at = new Date(ms);
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-`
      + `${String(at.getDate()).padStart(2, '0')}T${String(at.getHours()).padStart(2, '0')}:00`;
  };
  const hours = 12;
  const fill = (v) => Array.from({ length: hours }, () => v);
  return {
    hourly: {
      time: Array.from({ length: hours }, (_, i) => stamp(base - 3_600_000 * (6 - i))),
      weatherCode: fill(code), temperature: fill(temp), humidity: fill(50),
      windSpeed: fill(5), precipitationProbability: fill(rain),
    },
  };
}

const DHAKA = { name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41 };

test('planting records the weather verdict and the health it produced', () => {
  // The whole system in one assertion: a forecast exists, so the seed is sown *and*
  // stamped with what the next few hours will do to it.
  const sown = farm({ seeds: { rice: 1 } });
  sown.weather = sky({ code: 0, temp: 40, rain: 0 }); // a drought
  sown.location = DHAKA;

  const result = plant(sown, STARTER_PLOT_ID, 'rice');
  assert.ok(result.ok);

  const plot = plotAt(result.state);
  assert.ok(plot.forecast, 'the verdict is stored on the plot');
  assert.equal(plot.forecast.event, 'drought');
  assert.equal(plot.forecast.windowHours, 6);
  assert.ok(plot.health < 100, 'and the crop starts wounded');
  assert.ok(plot.health >= 25, 'but never dead');
});

test('a crop sown without a forecast records no verdict rather than a clean bill', () => {
  // Honesty over convenience: `forecast: null` says "the weather was never asked",
  // which is a different thing from "the weather was fine".
  const sown = farm({ seeds: { rice: 1 } });
  const result = plant(sown, STARTER_PLOT_ID, 'rice');

  assert.ok(result.ok, 'planting still works, because the domain does not gate on weather');
  assert.equal(plotAt(result.state).forecast, null);
  assert.equal(plotAt(result.state).health, 100);
});

test('the health a planting gets is the health a harvest is paid on', () => {
  // The two halves have to agree, or the whole verdict is decoration. Two identical
  // rice plants, sown a week apart in real time, one through a drought and one
  // through a fine day, harvested the same way. Only the weather differed.
  const sow = (weather) => {
    const state = farm({ seeds: { rice: 1 } });
    state.weather = weather;
    state.location = DHAKA;
    const sown = plant(state, STARTER_PLOT_ID, 'rice');
    assert.ok(sown.ok, 'the seed goes in');
    const plot = plotAt(sown.state);
    plot.plantedAt = Date.now() - 7 * 3_600_000; // grown; rice is ready at six hours
    return sown.state;
  };

  const calm = sow(sky({ code: 0, temp: 20 }));
  const hurt = sow(sky({ code: 0, temp: 40, rain: 0 }));

  const calmPlot = plotAt(calm);
  const hurtPlot = plotAt(hurt);
  assert.ok(hurtPlot.health < calmPlot.health, 'the drought cost the crop something');

  const calmGold = harvest(calm, STARTER_PLOT_ID);
  const hurtGold = harvest(hurt, STARTER_PLOT_ID);
  assert.ok(calmGold.ok && hurtGold.ok, 'both are harvestable');
  assert.ok(
    hurtGold.gold < calmGold.gold,
    `a wounded harvest must pay less: ${hurtGold.gold} vs ${calmGold.gold}`,
  );
});
