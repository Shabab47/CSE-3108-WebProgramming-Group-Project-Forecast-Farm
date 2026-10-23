/**
 * The field, mounted.
 *
 * `AGENTS.md` names the suite's blind spot: it has no DOM, so a rendered thing can be
 * wrong in ways nothing notices. `tests/helpers/fakeDom.js` closed that for the settings
 * page; this is the same trick pointed at the farm.
 *
 * It exists because of ISS-004. The plot was a `<div>` with a square hit box, and two
 * thirds of every tile's visible surface answered as a neighbouring plot — which no unit
 * test could see and no geometry test could either, because the geometry was right and
 * the *hit area* was wrong. What this can see is structure: that each plot is a real
 * button, that it carries a name a screen reader can read, that its square box is not a
 * pointer target, and that a click still arrives at `onPlotClick`.
 *
 * What it cannot see: layout, and therefore the `clip-path` itself. That one is asserted
 * against the stylesheet by `tests/iso.test.js`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { el } from '../js/utils/dom.js';
import { fieldSignature, mountFarmView, plotSignature } from '../js/ui/farmView.js';
import { FIELD, STARTER_PLOT_ID, UNLOCK_ORDER } from '../js/config/field.js';
import { WATER } from '../js/config/game.js';

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/**
 * The field a real player sees on their first load: one plot owned, fifteen locked.
 *
 * Plot 0 is owned because a farm always starts owning the starter — a fixture with
 * all sixteen unowned is a state the game cannot reach, and it quietly changes the
 * answer to "which plot is next", since `nextUnlockable` counts owned plots. The
 * starter's own behaviour is asserted properly in `initialState.test.js`.
 *
 * @param {object} overrides applied to every plot, on top of the defaults
 */
function buildPlots(overrides = {}) {
  const plots = [];

  for (let row = 0; row < FIELD.size; row += 1) {
    for (let col = 0; col < FIELD.size; col += 1) {
      const id = row * FIELD.size + col;
      const isStarter = id === STARTER_PLOT_ID;

      plots.push({
        id,
        col,
        row,
        zone: isStarter ? 'A' : 'B',
        zoneLabel: isStarter ? 'top' : 'right',
        isStarter,
        owned: isStarter,
        cropId: null,
        plantedAt: null,
        waterLevel: 0,
        health: 100,
        dead: false,
        ...overrides,
      });
    }
  }

  return plots;
}

/** Mount the field and collect the plot ids it reports as clicked. */
function mount({ plots = buildPlots(), selection = null, ...rest } = {}) {
  const clicks = [];
  mountFarmView(root, {
    plots,
    selection,
    nextPrice: 100,
    onPlotClick: (id) => clicks.push(id),
    ...rest,
  });
  return { clicks, tiles: root.querySelectorAll('.plot') };
}

/** Every descendant of `node` carrying `className`, exact match. */
function withClass(node, className) {
  return [...node.descendants()].filter((child) => child.classList.contains(className));
}

test('every plot is a real button carrying a name', () => {
  const { tiles } = mount();

  assert.equal(tiles.length, FIELD.size * FIELD.size, 'sixteen plots');

  for (const tile of tiles) {
    assert.equal(tile.tagName, 'BUTTON', 'a plot is a button — DEC-010');
    assert.equal(tile.getAttribute('type'), 'button', 'and must never submit a form');
    // Everything inside it is decorative, so the name has to be on the button itself.
    assert.ok(tile.getAttribute('aria-label'), `plot ${tile.dataset.plotId} has no name`);
  }

  const names = tiles.map((tile) => tile.getAttribute('aria-label'));
  assert.equal(new Set(names).size, names.length, 'no two plots share a name');
  assert.ok(names.every((name) => /^Plot \d+/.test(name)), 'numbered the way a player counts');
});

test('the box is inert and one clipped layer inside it takes the pointer', () => {
  const { tiles } = mount();

  for (const tile of tiles) {
    assert.equal(withClass(tile, 'plot__hit').length, 1, 'exactly one hit layer per plot');
  }

  // The mechanism belongs to the stylesheet: `.plot` turns pointers off and the property
  // inherits, so `.plot__hit` is all that is left answering. Delete that `auto` and the
  // whole field goes silently unclickable — nothing throws, nothing renders wrong. Same
  // shape of defect as ISS-007, which is why it is asserted here rather than trusted.
  const css = readFileSync(new URL('../css/scene.css', import.meta.url), 'utf8');
  const ruleFor = (selector) => new RegExp(`${selector.replace(/[.]/g, '\\.')}\\s*\\{[^}]*\\}`);

  assert.match(ruleFor('.plot').exec(css)?.[0] ?? '', /pointer-events:\s*none/);
  assert.match(ruleFor('.plot__hit').exec(css)?.[0] ?? '', /pointer-events:\s*auto/);
});

test('a crop sprite is scaled onto the soil, and the damage sprite takes the same box', () => {
  // Measured from the alpha bounding boxes: the ground's art is ~99% of its canvas, the
  // rice stages are 97–100%, and the crop art is taller than the soil diamond on purpose
  // — 0.589 against 0.538. At full size the patch covers the tile and stages 3–4 hang
  // 35–44 canvas px past its front vertex, so the layer is drawn at 93% and lifted 6.5%
  // instead, with `left: 50.5%` putting it half a percent right of centre. Those numbers
  // were tuned on the running page; what this pins is that the pair moves together
  // (ISS-072, DEC-048).
  //
  // `.plot__crop` was `width: 70%`, which drew the plant at roughly 68% of the
  // diamond's width, and `bottom: 10%`, which floated it above the soil. Every stage
  // looked like a sprout on a dinner plate. Nothing throws, nothing is missing, and
  // no unit test can see a size — so the stylesheet is the assertion.
  const css = readFileSync(new URL('../css/scene.css', import.meta.url), 'utf8');
  // Anchored to the start of a line, and that is load-bearing: `\.plot__ground\s*\{`
  // unanchored also matches the tail of `.plot--locked .plot__ground { ... }`, which is a
  // descendant rule with no `width` in it, so the ground's width came back `undefined`.
  const ruleFor = (selector) => new RegExp(`^\\s*${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? '';
  const decl = (rule, property) => new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(rule)?.[1]?.trim();

  const ground = ruleFor('.plot__ground');
  const crop = ruleFor('.plot__crop');
  const damage = ruleFor('.plot__damage');

  assert.equal(decl(ground, 'width'), '100%', 'the ground fills the tile, edge to edge');
  assert.equal(decl(crop, 'width'), '93%', 'the crop is drawn inside it, not stretched to it');
  assert.equal(decl(crop, 'bottom'), '6.5%', 'lifted clear of the soil\'s front vertex');
  assert.equal(decl(crop, 'left'), '50.5%', 'and half a percent right of centre');
  assert.match(decl(crop, 'transform') ?? '', /translateX\(-50%\)/);

  // The damage art is a whole replacement patch on a 1024 canvas, not an overlay
  // fragment, so it shares the crop's box exactly: retuning one retunes both.
  for (const property of ['bottom', 'left', 'width']) {
    assert.equal(
      decl(damage, property),
      decl(crop, property),
      `the damage sprite takes the crop's ${property} — the two draw as a pair`,
    );
  }
  assert.match(decl(damage, 'transform') ?? '', /translateX\(-50%\)/);

  // And nothing between the plot and the stage clips the extra height the crops are
  // drawn with on purpose — `docs/crops.md` says so, and clipping the tops is the one
  // failure mode a "fix" here would cause.
  for (const selector of ['.plot', '.field-stage__plots', '.field-stage__mount', '.field-stage']) {
    const rule = ruleFor(selector);
    if (!rule) continue;
    assert.ok(
      !/overflow\s*:\s*hidden/.test(rule),
      `${selector} clips overflow, so a crop taller than the ground loses its top`,
    );
  }
});

test('the free plot is plain ground, and exactly one of the rest is for sale', () => {
  // Three states, not two (DEC-036). The starter is `owned`; of the fifteen locked
  // plots exactly one is `next` and the other fourteen are `locked` — the whole point
  // being that the far plots must not look identical to the one on offer.
  const { tiles } = mount();

  const owned = tiles.filter((tile) => tile.classList.contains('plot--owned'));
  const next = tiles.filter((tile) => tile.classList.contains('plot--next'));
  const locked = tiles.filter((tile) => tile.classList.contains('plot--locked'));

  assert.equal(owned.length, 1, 'the starter plot');
  assert.equal(owned[0].dataset.plotId, String(STARTER_PLOT_ID));
  assert.equal(next.length, 1, 'exactly one plot is on offer');
  assert.equal(locked.length, 14, 'the rest are locked');
  assert.equal(owned.length + next.length + locked.length, 16, 'and every plot is exactly one of them');

  for (const tile of locked) {
    assert.equal(withClass(tile, 'plot__lock').length, 1, 'every locked plot is padlocked');
    assert.equal(withClass(tile, 'plot__price').length, 0, 'and carries no price');
    assert.equal(tile.getAttribute('disabled'), 'true', 'and cannot be clicked at all');
  }

  assert.equal(withClass(owned[0], 'plot__lock').length, 0, 'the free plot has no padlock');

  // `next` shows the price and takes a click.
  assert.equal(withClass(next[0], 'plot__lock').length, 1, 'and is still padlocked');
  assert.equal(withClass(next[0], 'plot__price').length, 1, 'the next plot carries its price');
  assert.equal(next[0].getAttribute('disabled'), null, 'and is clickable');

  // The two unowned states are told apart by the pin's colour (DEC-047): green on the
  // one plot that can be bought next, red on the fourteen that cannot. The old lock
  // emoji carried the same distinction by brightness, which a red pin cannot do.
  const pinSrc = (tile) => withClass(tile, 'plot__lock-icon')[0].getAttribute('src');
  assert.match(pinSrc(next[0]), /lock_pin_green\.png$/, 'the plot on offer wears the green pin');
  assert.ok(
    locked.every((tile) => /lock_pin_red\.png$/.test(pinSrc(tile))),
    'and every locked plot wears the red one',
  );
  assert.equal(pinSrc(next[0]).startsWith('/'), false, 'a relative path, so the game works under a subpath');

  const onOffer = UNLOCK_ORDER[1]; // index 0 is the free starter's own slot
  assert.equal(
    next[0].dataset.plotId,
    String(onOffer),
    `the plot on offer is id ${onOffer}, straight from config/field.js`,
  );
  assert.equal(
    next[0].getAttribute('aria-label'),
    `Plot ${onOffer + 1}, 100 gold, buy this plot`,
    'and the name says what a click will do, in gold rather than an unlabelled number',
  );

  // The tag is the gold coin and the number, in that order — the plot price reads like
  // every other gold amount in the game rather than a floating digit. The coin is a
  // sibling of the number, not part of its text, so a long price ellipsises beside the
  // coin instead of through it.
  const priceTag = withClass(next[0], 'plot__price')[0];
  const [coin, number] = priceTag.children;
  assert.equal(priceTag.children.length, 2, 'the tag is exactly a coin and a number');
  assert.ok(coin.classList.contains('plot__price-coin'), 'the coin comes first');
  assert.equal(coin.getAttribute('aria-hidden'), 'true', 'and is decorative, not read out');
  assert.ok(number.classList.contains('plot__price-num'), 'then the number');
  assert.equal(number.textContent, '100');
});

test('a seven-figure price is separated, because 1638400 is a smear at plot size', () => {
  const { tiles } = mount({ nextPrice: 1_638_400 });

  const next = tiles.filter((tile) => tile.classList.contains('plot--next'));
  const priceTag = withClass(next[0], 'plot__price')[0];
  assert.equal(withClass(priceTag, 'plot__price-num')[0].textContent, '1,638,400');
});

test('the word "Buy" is not rendered anywhere', () => {
  mount();

  // The caption went on purpose: it sat in the half of the diamond that the plot in
  // front paints over, so it was clipped to "BU.." or "..UY" depending on the row.
  assert.ok(
    !visibleText(root).some((line) => /buy/i.test(line)),
    'no "Buy" caption is rendered anywhere',
  );
});

test('an owned plot is not padlocked, and is not "locked"', () => {
  const { tiles } = mount({ plots: buildPlots({ owned: true }) });

  for (const tile of tiles) {
    assert.equal(withClass(tile, 'plot__lock').length, 0, 'owned plots carry no padlock');
    assert.equal(withClass(tile, 'plot__price').length, 0, 'and no price');
    assert.ok(!tile.classList.contains('plot--locked'), 'and are not locked');
    assert.equal(tile.getAttribute('disabled'), null, 'and are clickable');

    // The name says what the plot *is*, not just what it is not. It used to be the
    // bare "Plot 7"; a screen reader user now hears that the ground is free.
    assert.ok(
      /^Plot \d+, empty$/.test(tile.getAttribute('aria-label')),
      `an owned empty plot says it is empty, got "${tile.getAttribute('aria-label')}"`,
    );
  }
});

test('a click reports the plot it came from', async () => {
  const { tiles, clicks } = mount();

  await tiles[5].click();
  await tiles[0].click();

  // The fake DOM does not bubble, so this fires the listener on the button itself. In a
  // browser the click lands on `.plot__hit` and bubbles up to the same listener — the
  // one thing about the hit layer this harness cannot prove.
  assert.deepEqual(clicks, [5, 0]);
});

test('a planted plot renders its layers, and they are phrasing content', () => {
  // A button's content model is phrasing content, so the layers inside are `<span>`s
  // rather than `<div>`s. They are absolutely positioned, so the element name is free.
  const planted = buildPlots().map((plot) =>
    plot.id === 5
      ? { ...plot, owned: true, cropId: 'rice', plantedAt: Date.now(), waterLevel: 60 }
      : plot,
  );
  const { tiles } = mount({ plots: planted });

  const tile = tiles[5];
  assert.equal(tile.querySelector('.plot__crop').tagName, 'IMG', 'the crop is an image');
  assert.equal(tile.querySelector('.plot__water').tagName, 'SPAN');
  assert.equal(
    tile.querySelector('.plot__water-fill').getAttribute('style'),
    // Normalised against `WATER.max`, which is 120 — not a raw percentage of 100.
    // Drawing 60 as `height:60%` would fill the whole track at 60 water, leaving
    // nowhere for over-watering to go and making the top of the meter meaningless.
    `height:${((60 / WATER.max) * 100).toFixed(1)}%`,
    'the water bar keeps its level',
  );
});

test('a damage sprite replaces the growth stage, and an undamaged crop keeps it', () => {
  // ISS-115: a living crop with a latched damage state drew both its growth stage and its
  // damage patch. The damage art is a whole replacement patch on its own soil diamond
  // (DEC-048), not a transparent overlay, so drawing it over the stage leaves two plants
  // in one tile — the healthy one visible through the gaps in the dead one.
  const HOUR = 3_600_000;
  const now = Date.now();
  const plots = buildPlots().map((plot) => {
    if (plot.id === 5) {
      return {
        ...plot,
        owned: true,
        cropId: 'rice',
        plantedAt: now - 5 * HOUR,
        waterLevel: 83,
        damage: 'dry',
        damageAt: now - HOUR,
      };
    }
    if (plot.id === 6) {
      return {
        ...plot,
        owned: true,
        cropId: 'rice',
        plantedAt: now - 5 * HOUR,
        waterLevel: 120,
        damage: 'waterlogged',
        damageAt: now - 2 * HOUR,
      };
    }
    if (plot.id === 7) {
      return { ...plot, owned: true, cropId: 'rice', plantedAt: now - 5 * HOUR, waterLevel: 60 };
    }
    if (plot.id === 8) {
      return { ...plot, owned: true, cropId: 'rice', plantedAt: now - 7 * HOUR, dead: true };
    }
    return plot;
  });
  const { tiles } = mount({ plots });

  const dry = tiles[5];
  assert.equal(dry.querySelector('.plot__crop'), null, 'the healthy stage is not drawn under the dry patch');
  assert.match(dry.querySelector('.plot__damage').getAttribute('src'), /rice_drought_killed\.png$/);
  assert.equal(dry.querySelector('.plot__damage-word').textContent, 'Dry');
  assert.ok(dry.querySelector('.plot__water'), 'the live water meter is still there');
  assert.ok(dry.querySelector('.plot__grow'), 'and the crop still grows under the damage badge');

  const waterlogged = tiles[6];
  assert.equal(waterlogged.querySelector('.plot__crop'), null, 'the stage is not drawn under the rain patch');
  assert.match(waterlogged.querySelector('.plot__damage').getAttribute('src'), /rice_rain_damaged\.png$/);
  assert.equal(waterlogged.querySelector('.plot__damage-word').textContent, 'Waterlogged');

  const healthy = tiles[7];
  assert.ok(healthy.querySelector('.plot__crop'), 'an undamaged crop still draws its stage');
  assert.equal(healthy.querySelector('.plot__damage'), null, 'and no damage patch');

  const dead = tiles[8];
  assert.equal(dead.querySelector('.plot__crop'), null, 'a dead crop has no stage');
  assert.match(dead.querySelector('.plot__damage').getAttribute('src'), /rice_dead\.png$/);
  assert.equal(dead.querySelector('.plot__damage-word').textContent, 'Dead');
});

test('a planted potato draws its own sprites, not the rice fallback', () => {
  // Potato's five stages are on disk now, and `available: true` makes
  // `fieldSpriteFor()` return the real path instead of the tinted rice fallback.
  // The stage comes from the same `stageAt` formula as rice, so a potato two hours
  // into a four-hour grow is on `potato_3.png` — the swap is the growth animation.
  const HOUR = 3_600_000;
  const planted = buildPlots().map((plot) =>
    plot.id === 5
      ? { ...plot, owned: true, cropId: 'potato', plantedAt: Date.now() - 2 * HOUR, waterLevel: 60 }
      : plot,
  );
  const { tiles } = mount({ plots: planted });

  const crop = tiles[5].querySelector('.plot__crop');
  assert.match(crop.getAttribute('src'), /\/potato\/potato_3\.png$/, 'potato_3, its own art');
  assert.ok(
    !crop.classList.contains('plot__crop--fallback'),
    'and not the rice fallback tint',
  );
});

test('an empty plot still shows a meter, because that is where a farm mostly is', () => {
  // Reported as "no watering meter". The bar rendered, and rendered correctly: a plot at 0
  // water drew a fill at `height:0%`, which is zero pixels tall. On a fresh farm, and on
  // every square nobody has watered yet, that is what the meter looked like — absent.
  //
  // So the target zone is painted ON the track, which is there to be read at zero, and the
  // state word is always shown rather than only when something is wrong. A gauge that
  // says nothing is indistinguishable from a gauge that is broken.
  const bare = buildPlots().map((p) => (p.id === 5 ? { ...p, owned: true, waterLevel: 0 } : p));
  const { tiles } = mount({ plots: bare });

  const meter = tiles[5].querySelector('.plot__water');
  assert.ok(meter, 'the meter is there');

  const band = meter.querySelector('.plot__water-band');
  assert.ok(band, 'and the zone it is aiming for is painted on the track');
  const style = band.getAttribute('style');
  assert.ok(style.includes('height:') && style.includes('bottom:'),
    `with both edges, not just a line: "${style}"`);

  assert.equal(meter.querySelector('.plot__water-word').textContent, 'dry',
    'and it says so in words at zero water');
});

test('bare ground carries a water meter, because that is when the pump is used', () => {
  // Reported as "clicking on ground not showing any water meter". The meter was gated on
  // `hasCrop`, so the sequence the pump actually drives - aim, watch the bar rise, plant -
  // had nothing to watch. The only readout of bare soil was `ground_watered.png`, a binary
  // that says wet or dry and nothing about how far.
  const bare = buildPlots().map((p) => (p.id === 5 ? { ...p, owned: true, waterLevel: 30 } : p));
  const { tiles } = mount({ plots: bare });

  const meter = tiles[5].querySelector('.plot__water');
  assert.ok(meter, 'bare owned soil has a meter');
  assert.equal(meter.getAttribute('data-state'), 'low',
    'and it reads against bare soil\'s own band, which is 45 to 60');
  assert.equal(
    meter.querySelector('.plot__water-fill').getAttribute('style'),
    `height:${((30 / WATER.max) * 100).toFixed(1)}%`,
  );
});

test('the ground sprite crosses the water threshold with the meter, in place', () => {
  // ISS-110. The meter was patched on every water-only tick, but the ground was chosen
  // only when the tile was rebuilt. A plot that dried from 60 to 0 therefore said "dry"
  // over `ground_watered.png` until something unrelated rebuilt the tile — the exact
  // inconsistency reported as "it's saying dry but the sprite already switched to wet".
  const at = (waterLevel) => buildPlots().map((plot) => (
    plot.id === 5 ? { ...plot, owned: true, waterLevel } : plot
  ));

  mount({ plots: at(0) });
  // The first water-only repaint has no structure signature yet, so it rebuilds. That is
  // deliberate here: it establishes the signature the next two repaints exercise.
  mount({ plots: at(30) });
  const beforeThreshold = root.querySelectorAll('.plot')[5];
  assert.match(
    beforeThreshold.querySelector('.plot__ground').getAttribute('src'),
    /ground_unwatered\.png$/,
    '30 is below the 40-water threshold',
  );

  mount({ plots: at(60) });
  const aboveThreshold = root.querySelectorAll('.plot')[5];
  assert.equal(aboveThreshold, beforeThreshold, 'a water-only tick must patch, not rebuild');
  assert.match(
    aboveThreshold.querySelector('.plot__ground').getAttribute('src'),
    /ground_watered\.png$/,
    'and the ground must follow the meter across 40',
  );
  assert.equal(aboveThreshold.querySelector('.plot__water-word').textContent, 'optimal');

  mount({ plots: at(0) });
  const backBelow = root.querySelectorAll('.plot')[5];
  assert.equal(backBelow, aboveThreshold, 'drying is patched too');
  assert.match(
    backBelow.querySelector('.plot__ground').getAttribute('src'),
    /ground_unwatered\.png$/,
    'the wet sprite must not linger after the water is gone',
  );
  assert.equal(backBelow.querySelector('.plot__water-word').textContent, 'dry');
});

test('the meter never appears on a locked plot, and never on a dead crop', () => {
  // buildPlots() leaves 15 of the 16 unowned, and none of them have a crop - so a locked
  // square is the default state of most of the field and must stay silent.
  const { tiles } = mount({ plots: buildPlots() });
  const locked = tiles.find((t, i) => !buildPlots()[i].owned);
  assert.equal(locked.querySelector('.plot__water'), null,
    'a padlocked square has nothing to say about water');

  const died = buildPlots().map((p) => (
    p.id === 5 ? { ...p, owned: true, cropId: 'rice', plantedAt: Date.now(), dead: true, waterLevel: 5 } : p
  ));
  const { tiles: withDead } = mount({ plots: died });
  assert.equal(withDead[5].querySelector('.plot__water'), null,
    'a dead crop is past watering');
});

test('widening the water gate does not drag the growth meter onto bare soil', () => {
  // The two meters sit in one branch, and `growthMeter` guards on `grown?.planted` rather
  // than on anything the water gate can influence. Worth pinning, because the natural way
  // to break this is to move the water meter out and forget what was sharing the branch.
  const bare = buildPlots().map((p) => (p.id === 5 ? { ...p, owned: true, waterLevel: 30 } : p));
  const { tiles } = mount({ plots: bare });
  assert.equal(tiles[5].querySelector('.plot__grow'), null, 'nothing is growing on bare soil');
});

test('a growing crop carries a green meter with the time left', () => {
  // Rice takes 6h. Planted 3h ago it is half grown: the bar reads 50% and the
  // label reads 3h — the same words the screen-reader name already says, so
  // the two can never disagree. See `plotLabel.formatLeft`.
  const HOUR = 3_600_000;
  const planted = buildPlots().map((plot) =>
    plot.id === 5
      ? { ...plot, owned: true, cropId: 'rice', plantedAt: Date.now() - 3 * HOUR, waterLevel: 60 }
      : plot,
  );
  const { tiles } = mount({ plots: planted });

  const tile = tiles[5];
  assert.equal(tile.querySelector('.plot__grow').tagName, 'SPAN', 'the meter is there while growing');
  assert.equal(
    tile.querySelector('.plot__grow-fill').getAttribute('style'),
    'width:50%',
    'the bar matches progress',
  );
  assert.equal(tile.querySelector('.plot__grow-label').textContent, '3h', 'and the label names the wait');
  assert.ok(
    /^Plot 6, Rice growing, 3h left$/.test(tile.getAttribute('aria-label')),
    `the accessible name says the same thing, got "${tile.getAttribute('aria-label')}"`,
  );
});

test('the meter hides on empty, locked, dead and ready plots', () => {
  // Empty, locked and dead never grew anything; ready hands the moment to the
  // gold rim instead — a full green bar beside it would say the same thing
  // twice. See `js/ui/growthMeter.js`.
  const HOUR = 3_600_000;
  const now = Date.now();
  const plots = buildPlots().map((plot) => {
    if (plot.id === 0) return { ...plot, cropId: 'rice', plantedAt: now - 3 * HOUR }; // growing: meter
    if (plot.id === 1) return plot; // owned by fixture? no — only the starter is owned; empty
    if (plot.id === 5) {
      return { ...plot, owned: true, cropId: 'rice', plantedAt: now - 3 * HOUR, dead: true }; // dead
    }
    if (plot.id === 6) {
      return { ...plot, owned: true, cropId: 'rice', plantedAt: now - 7 * HOUR }; // ready
    }
    return plot;
  });
  const { tiles } = mount({ plots });

  assert.ok(tiles[0].querySelector('.plot__grow'), 'a growing crop shows its meter');

  const emptyStarter = tiles.find((tile) => tile.dataset.plotId === '1' && !tile.querySelector('.plot__grow'));
  assert.ok(emptyStarter, 'an empty owned plot shows no meter');

  const locked = tiles.filter((tile) => tile.classList.contains('plot--locked'));
  assert.ok(locked.length > 0, 'the fixture has locked plots');
  for (const tile of locked) {
    assert.equal(tile.querySelector('.plot__grow'), null, `locked plot ${tile.dataset.plotId} shows no meter`);
  }

  assert.equal(tiles[5].querySelector('.plot__grow'), null, 'a dead crop shows no meter');
  assert.equal(tiles[6].querySelector('.plot__grow'), null, 'a ready crop shows no meter — the gold rim owns it');
  assert.ok(tiles[6].querySelector('.plot__ready'), 'and the rim is there instead');
});

/* --- ISS-088: the repaint guard and the per-tile diff ------------------------
 *
 * The field used to be destroyed and rebuilt once a second, recreating ~34 `<img>`
 * elements over 313–712 KB of art — roughly 16 MB of PNG re-decoded per second. These
 * are the tests for the replacement, and the important half is the negative one: the
 * signature must **stay equal** when nothing visible moved, because that is the only
 * thing that makes the 1 Hz tick free.
 */

const HOUR = 3_600_000;

/** A field signature, given plot overrides applied to every plot and/or state overrides. */
function signatureWith(plotOverrides = {}, stateOverrides = {}) {
  return fieldSignature({ plots: buildPlots(plotOverrides), selection: null, nextPrice: 100, ...stateOverrides });
}

test('a field nobody touched keeps one signature, so the tick does no work', () => {
  // The single most important assertion in this file. A signature that drifted on every
  // call would put the whole jank back while still looking correct, so this is checked
  // twice in a row as well as across two structurally identical builds.
  const plots = buildPlots();

  assert.equal(
    fieldSignature({ plots, selection: null, nextPrice: 100 }),
    fieldSignature({ plots, selection: null, nextPrice: 100 }),
    'two reads of the same field agree',
  );

  // A different array of equal plots must also agree — the signature is about values,
  // not identity, or every `apply()` would repaint because it hands over a new array.
  const rebuilt = buildPlots();
  assert.notEqual(rebuilt, plots, 'the fixture really is a different array');
  assert.equal(
    fieldSignature({ plots: rebuilt, selection: null, nextPrice: 100 }),
    fieldSignature({ plots, selection: null, nextPrice: 100 }),
    'a fresh array of equal plots gives the same signature',
  );
});

test('every visible change moves the signature', () => {
  const base = signatureWith();

  const changed = {
    'selection moved': signatureWith({}, { selection: { plotId: 3 } }),
    'the price moved': signatureWith({}, { nextPrice: 250 }),
    'a plot was bought': signatureWith({ owned: true }),
    'a crop died': signatureWith({ dead: true }),
    'water rose': signatureWith({ waterLevel: 55 }),
  };

  for (const [why, signature] of Object.entries(changed)) {
    assert.notEqual(signature, base, `${why} must repaint the field`);
  }

  // Planted plots are the interesting ones: stage, the rounded percent and the rounded
  // minutes all move, and each is a separate term in the signature.
  const growing = fieldSignature({
    plots: buildPlots().map((plot) =>
      plot.id === 5
        ? { ...plot, owned: true, cropId: 'rice', plantedAt: Date.now() - 2 * HOUR, waterLevel: 60 }
        : plot),
    selection: null,
    nextPrice: 100,
  });
  assert.notEqual(growing, base, 'planting repaints');

  const ready = fieldSignature({
    plots: buildPlots().map((plot) =>
      plot.id === 5 ? { ...plot, owned: true, cropId: 'rice', plantedAt: Date.now() - 7 * HOUR } : plot),
    selection: null,
    nextPrice: 100,
  });
  assert.notEqual(ready, growing, 'and so does reaching maturity');
});

test('gold moving does not repaint the field', () => {
  // Gold is drawn outside `#farm-view` and is not part of any tile. If it were in the
  // signature, every purchase and every sale would rebuild all sixteen plots for nothing.
  const plots = buildPlots({ owned: true });
  assert.equal(
    fieldSignature({ plots, gold: 0, selection: null, nextPrice: 100 }),
    fieldSignature({ plots, gold: 999_999, selection: null, nextPrice: 100 }),
    'gold is not on the field',
  );
});

test('the threshold that swaps the ground sprite is in the signature', () => {
  // `plotLayers` picks the watered or unwatered ground at 40%. Rounding the water level
  // alone would miss the frame where a tile crosses that line, because 39 and 40 are one
  // apart — so the boolean is tracked separately and not left to the rounded number.
  const below = plotSignature({ ...buildPlots()[0], owned: true, waterLevel: 39 }, { nextPrice: 100 });
  const above = plotSignature({ ...buildPlots()[0], owned: true, waterLevel: 40 }, { nextPrice: 100 });

  assert.notEqual(below, above, 'crossing the watered threshold repaints');
});

test('a repaint that changes nothing does not touch the DOM at all', () => {
  // The guard itself. Asserting on node identity is what proves nothing was rebuilt —
  // a test that only compared markup would pass on a full rebuild too.
  const plots = buildPlots();
  const state = { plots, selection: null, nextPrice: 100 };

  mountFarmView(root, state);

  const baseBefore = root.querySelector('.field-stage__base');
  const pumpBefore = root.querySelector('.field-stage__pump');
  const tilesBefore = root.querySelectorAll('.plot');

  mountFarmView(root, { ...state, plots: buildPlots() });

  assert.equal(root.querySelector('.field-stage__base'), baseBefore, 'the base image survives');
  assert.equal(root.querySelector('.field-stage__pump'), pumpBefore, 'the pump survives');
  assert.deepEqual(root.querySelectorAll('.plot'), tilesBefore, 'and so does every tile');
});

test('buying a plot replaces that plot and the one it hands the offer to', () => {
  // The other half, and the assertion is deliberately about **two** tiles rather than
  // one. Buying plot 4 makes it owned, which changes the owned count, which moves the
  // "next" marker onto `UNLOCK_ORDER[2]` — plot 1. So a correct diff rebuilds two tiles
  // and leaves fourteen alone. A diff that only caught the clicked plot would leave the
  // padlock and the price sitting on the wrong diamond.
  const onOffer = UNLOCK_ORDER[1];
  const nowOnOffer = UNLOCK_ORDER[2];

  const state = { plots: buildPlots(), selection: null, nextPrice: 100 };
  mountFarmView(root, state);
  const before = root.querySelectorAll('.plot');

  assert.ok(before[onOffer].classList.contains('plot--next'), 'the fixture starts with plot 4 on offer');

  const bought = buildPlots().map((plot) => (plot.id === onOffer ? { ...plot, owned: true } : plot));
  mountFarmView(root, { ...state, plots: bought });

  const after = root.querySelectorAll('.plot');

  assert.equal(after.length, before.length, 'still sixteen tiles');
  assert.notEqual(after[onOffer], before[onOffer], 'the bought plot is a new node');
  assert.notEqual(after[nowOnOffer], before[nowOnOffer], 'and so is the plot that took the offer');
  assert.ok(after[onOffer].classList.contains('plot--owned'), 'the bought plot draws as owned');
  assert.ok(after[nowOnOffer].classList.contains('plot--next'), 'the new one draws as on offer');
  assert.ok(after[nowOnOffer].querySelector('.plot__price'), 'carrying its price');

  for (const tile of after) {
    const id = Number(tile.dataset.plotId);
    if (id === onOffer || id === nowOnOffer) continue;
    assert.equal(tile, before[id], `plot ${id} did not move and was left alone`);
  }

  // And nothing restacked: the plots are absolutely positioned siblings whose append
  // order IS the z-order, so a repaint that appended instead of replacing would paint
  // the field in the wrong order and look subtly wrong rather than broken.
  assert.deepEqual(
    after.map((tile) => tile.dataset.plotId),
    before.map((tile) => tile.dataset.plotId),
    'paint order is unchanged',
  );
});

test('a skipped repaint cannot strand the field in a stale state', () => {
  // The failure mode a guard invites: skip too eagerly and the field stops updating.
  // Change, repaint, confirm visible, then repaint again with nothing changed and
  // confirm the correct state is still the one on screen.
  const state = { plots: buildPlots(), selection: null, nextPrice: 100 };
  mountFarmView(root, state);

  const bought = buildPlots().map((plot) => (plot.id === 1 ? { ...plot, owned: true } : plot));
  mountFarmView(root, { ...state, plots: bought });

  let tiles = root.querySelectorAll('.plot');
  assert.ok(tiles[1].classList.contains('plot--owned'), 'the buy is on screen');

  mountFarmView(root, { ...state, plots: buildPlots().map((p) => (p.id === 1 ? { ...p, owned: true } : p)) });

  tiles = root.querySelectorAll('.plot');
  assert.ok(tiles[1].classList.contains('plot--owned'), 'and survives a no-op repaint');
});

test('unmounting forgets the field, so a remount is a fresh mount', () => {
  // Otherwise the guard would answer "nothing changed" against a detached tree and the
  // second mount would draw into nothing.
  const state = { plots: buildPlots(), selection: null, nextPrice: 100 };
  mountFarmView(root, state).unmount();

  mountFarmView(root, state);

  assert.equal(root.querySelectorAll('.plot').length, FIELD.size * FIELD.size, 'sixteen tiles again');
});

/* --- the pump's level is part of what the field shows ----------------------- */

test('the pump level and every target are in the field signature', () => {
  const base = signatureWith({}, { pump: { on: false, level: 1, targets: [] } });

  assert.notEqual(
    signatureWith({}, { pump: { on: false, level: 2, targets: [] } }),
    base,
    'upgrading swaps the pump art, so it repaints',
  );

  assert.notEqual(
    signatureWith({}, { pump: { on: true, level: 1, targets: [0] } }),
    base,
    'a newly watered target gets its indicator',
  );
});

test('the field draws the pump art for its level', () => {
  mount({ pump: { on: false, level: 3, targets: [] } });

  const pump = root.querySelector('.field-stage__pump');
  assert.ok(pump, 'the pump is on the field');
  assert.equal(pump.getAttribute('src'), 'assets/images/pump/pump_3.png');
  assert.equal(pump.getAttribute('alt'), 'Water pump, level 3');
});

test('an upgrade swaps the pump src without rebuilding the element', () => {
  const state = {
    plots: buildPlots(),
    selection: null,
    nextPrice: 100,
    pump: { on: false, level: 1, targets: [] },
  };
  mountFarmView(root, state);
  const before = root.querySelector('.field-stage__pump');
  assert.equal(before.getAttribute('src'), 'assets/images/pump/pump_1.png');

  mountFarmView(root, { ...state, pump: { on: false, level: 5, targets: [] } });
  const after = root.querySelector('.field-stage__pump');

  assert.equal(after, before, 'the same <img> is kept');
  assert.equal(after.getAttribute('src'), 'assets/images/pump/pump_5.png');
  assert.equal(after.getAttribute('alt'), 'Water pump, level 5');
});

test('a targeted plot is marked while the pump is running', () => {
  const { tiles } = mount({ pump: { on: true, level: 2, targets: [0, 1] } });

  assert.ok(tiles[0].classList.contains('plot--pumping'));
  assert.ok(tiles[1].classList.contains('plot--pumping'));
  assert.equal(tiles[2].classList.contains('plot--pumping'), false);

  // The mark is live, not part of the level: switching off removes it without changing art.
  mount({ pump: { on: false, level: 2, targets: [0, 1] } });
  const off = root.querySelectorAll('.plot');
  assert.equal(off[0].classList.contains('plot--pumping'), false);
});

test('something else clearing the root makes the next mount build for real', () => {
  // This is a bug that actually happened while writing the guard. `tests/farmLoop.test.js`
  // mounts the crop picker into this same element, which clears the field out from under
  // it. The reuse path trusted its cache, repainted a detached card, and left the root
  // holding a picker and no tiles — with nothing thrown and no test failing until
  // `farmLoop` looked for plot 0 and did not find it.
  //
  // So the guard verifies its card is still standing in the root rather than assuming
  // it, and this is the assertion for that.
  const state = { plots: buildPlots(), selection: null, nextPrice: 100 };
  mountFarmView(root, state);

  // Something else takes the root over, exactly as `mountCropPicker` does.
  root.replaceChildren(el('div', { class: 'someone-elses-panel' }));

  const plots = buildPlots().map((plot) => (plot.id === 5 ? { ...plot, owned: true } : plot));
  mountFarmView(root, { ...state, plots });

  const tiles = root.querySelectorAll('.plot');
  assert.equal(tiles.length, FIELD.size * FIELD.size, 'the field is rebuilt, not repainted into the void');
  assert.equal(root.querySelectorAll('.someone-elses-panel').length, 0, 'and the intruder is cleared out');
  assert.ok(tiles[5].classList.contains('plot--owned'), 'drawing the state it was given');
});
