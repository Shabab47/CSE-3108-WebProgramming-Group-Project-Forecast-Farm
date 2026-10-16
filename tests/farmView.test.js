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
import { mountFarmView } from '../js/ui/farmView.js';
import { FIELD } from '../js/config/field.js';

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** Sixteen plots as `buildPlots()` makes them — unowned, empty, dry. */
function buildPlots(overrides = {}) {
  const plots = [];

  for (let row = 0; row < FIELD.size; row += 1) {
    for (let col = 0; col < FIELD.size; col += 1) {
      plots.push({
        id: row * FIELD.size + col,
        col,
        row,
        owned: false,
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
function mount({ plots = buildPlots(), selection = null } = {}) {
  const clicks = [];
  mountFarmView(root, { plots, selection, onPlotClick: (id) => clicks.push(id) });
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

test('an unowned plot is padlocked, and the word "Buy" is gone', () => {
  const { tiles } = mount();

  for (const tile of tiles) {
    assert.equal(withClass(tile, 'plot__lock').length, 1, 'every unowned plot is padlocked');
    assert.ok(/unowned$/.test(tile.getAttribute('aria-label')), 'and says so out loud');
  }

  // The caption went on purpose: it sat in the half of the diamond that the plot in
  // front paints over, so it was clipped to "BU.." or "..UY" depending on the row.
  assert.ok(
    !visibleText(root).some((line) => /buy/i.test(line)),
    'no "Buy" caption is rendered anywhere',
  );
});

test('an owned plot is not padlocked', () => {
  const { tiles } = mount({ plots: buildPlots({ owned: true }) });

  for (const tile of tiles) {
    assert.equal(withClass(tile, 'plot__lock').length, 0, 'owned plots carry no padlock');
    assert.ok(/^Plot \d+$/.test(tile.getAttribute('aria-label')), 'and are not "unowned"');
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
    'height:60%',
    'the water bar keeps its level',
  );
});
