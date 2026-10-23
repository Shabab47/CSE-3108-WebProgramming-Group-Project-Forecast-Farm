/**
 * The farm page, booted.
 *
 * **This file exists because of a bug it would have caught.** `main.js` ended a build
 * with
 *
 * ```js
 *   if (pickerHost) closePicker();     // pickerHost lives in another module now
 * ```
 *
 * and every load of the farm page died with "Forecast Farm could not start. Check the
 * browser console." Four hundred and twenty tests passed. Not one of them could see
 * it, because `mainBoot.test.js` stubs `document.querySelector` to return null so that
 * the entry script's `if (qsOrNull('#top-bar'))` guard **skips `start()` entirely**.
 * Every test in the suite exercises code *below* the guard. The boot sequence itself —
 * the first thing a player sees — had no coverage at all.
 *
 * So this runs `start()` for real, with the element ids `index.html` actually has, and
 * asserts on the two things that matter: that boot finished, and that the field came
 * up with the right plots in the right states.
 *
 * ## What this still cannot see
 *
 * Layout and CSS, real event dispatch and bubbling, the network, and `location.replace`
 * navigation. It is a smoke test for *control flow*, which is where the bug was. It
 * also cannot test a signed-out player: that path calls `location.replace(LOGIN_URL)`,
 * so this drives the guest flow via `?guest=1`, which needs no network and no session.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { STATE_VERSION } from '../js/config/game.js';
import { buildInitialState } from '../js/state/initialState.js';
import { saveKey } from '../js/state/saveFile.js';

/**
 * Every id `index.html` gives the shell, as a direct child of the fake root.
 *
 * Direct children because `FakeNode.querySelectorAll` walks one level — see
 * `descendants()` in `fakeDom.js`. The real document searches the whole tree, so this
 * is a harness simplification and not a claim about how nesting works.
 */
const PAGE_IDS = [
  'app', 'top-bar', 'sidebar', 'right-rail',
  'forecast-board', 'forecast-card', 'location-bar',
  'season-card', 'shop-launch', 'almanac-launch', 'inventory-launch',
  'farm-view', 'farm-picker', 'toast-stack', 'sync-indicator',
];

let root;
let bootError = null;

/** In-memory localStorage, as in `mainBoot.test.js`. */
function installFakeStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
  return data;
}

before(async () => {
  root = installDom();

  for (const id of PAGE_IDS) {
    const node = document.createElement('div');
    node.id = id;
    root.append(node);
  }

  installFakeStorage();

  // A guest farm with a chosen avatar. The save is otherwise a fresh farm, so the
  // assertions below still describe the starting state - but this proves `main.js`
  // hands `state.profile.avatar` to the navbar, not just that the navbar can paint
  // one when a unit test passes it in directly.
  const saved = buildInitialState({
    status: 'guest',
    userId: 'guest',
    farmerName: 'Guest farmer',
  });
  saved.profile = { avatar: 'farmer2' };
  localStorage.setItem(saveKey('guest'), JSON.stringify({ version: STATE_VERSION, state: saved }));

  // `?guest=1` so `resolveSession()` succeeds with no network and no account. A
  // signed-out boot ends in `location.replace(LOGIN_URL)`, which this cannot follow.
  Object.defineProperty(globalThis, 'location', {
    value: { search: '?guest=1', href: 'http://localhost:5173/index.html', replace() {} },
    configurable: true,
    writable: true,
  });

  // `js/connection.js` listens on `window` for online/offline/pagehide. Without this
  // the harness, not the game, throws — see the note in `fakeDom.js`.
  Object.defineProperty(globalThis, 'window', {
    value: { online: true, addEventListener() {}, removeEventListener() {} },
    configurable: true,
    writable: true,
  });

  // No network. `bootWeather()` is fire-and-forget and the farm works without it.
  globalThis.fetch = async () => {
    throw new Error('network disabled in the boot harness');
  };

  // The tick and the autosave are timers this test has no use for, and a 1 Hz repaint
  // would keep the process alive past the end of the test run.
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};

  // Imported after the stubs, and only once: the module registry is per-file under
  // `node --test`, so this is a genuinely first evaluation of `main.js`.
  await import('../js/main.js');

  // Let the boot promise chain settle. It is several awaits deep — session, store,
  // then a `saveNow()` that must not reject.
  await new Promise((resolve) => setTimeout(resolve, 400));
});

after(() => {
  uninstallDom();
  delete globalThis.window;
  delete globalThis.location;
  delete globalThis.fetch;
  // `localStorage` is left in place on purpose. The boot's autosave is debounced and can
  // still be in flight when the tests end, and tearing the global out from under it logs
  // "save failed - localStorage is not defined" — a harness artefact printed next to real
  // output, which is the last thing a failing run needs.
});

/** The failure path replaces the whole body with one sentence. That is the symptom. */
function bootFailure() {
  const text = document.body.textContent;
  return text.includes('could not start') ? text : null;
}

test('the right rail carries the environment card, and no stale placeholder', () => {
  // ISS-095 started here: the pump panel was built into a bare `el('div')` that was never
  // appended, so it rendered into a node belonging to nothing and the rail showed no pump
  // at all. Nothing threw and this file passed, because `right-rail` appeared in
  // `PAGE_IDS` only so `qsOrNull('#right-rail')` would return something to append to.
  //
  // The card has since become the Environment card, and the assertion is the same one: on
  // what is **in** the rail after boot. A panel that is not in the document is not a panel.
  const rail = root.querySelector('#right-rail');
  const text = rail.textContent;

  assert.ok(text.includes('Environment'), `the rail should carry the environment card, got: "${text}"`);
  assert.ok(rail.querySelector('.env'), 'and the card element itself');

  // And the placeholder it replaced is gone. The first version mounted the card and *then*
  // removed the placeholder with `:last-of-type`, which the fake DOM cannot select — so
  // both were on the page, and only in a browser would it have looked right.
  assert.equal(
    /T-11/.test(text),
    false,
    'the "Humidity and wind — T-11" placeholder is still on the page',
  );
});

test('boot finishes without falling into the catch handler', () => {
  const failure = bootFailure();

  assert.equal(
    failure,
    null,
    `main.js caught a boot error and replaced the page: "${failure}". ` +
      'The error itself is in the log above it — read that, not this assertion.',
  );
});

test('the shell mounts where index.html says it should', () => {
  // The navbar is the one thing `start()` puts on the page unconditionally, so its
  // presence is the cheapest proof that boot ran rather than bailing early.
  assert.ok(
    document.querySelector('#top-bar').children.length > 0,
    '#top-bar was left empty, so mountShell never ran',
  );
});

test('the navbar wears the avatar saved on the farm', () => {
  const tile = document.querySelector('.navbar__tile--avatar');

  assert.ok(tile, 'the profile tile is missing from the booted navbar');
  assert.ok(tile.querySelector('.navbar__avatar-art'), 'the saved preset was not painted');
  assert.equal(tile.querySelector('.navbar__avatar-default'), null, 'the gray fallback won');
});

test('the field comes up with sixteen plots in the three right states', () => {
  const farm = document.querySelector('#farm-view');
  assert.ok(farm, '#farm-view is missing from the page');

  const tiles = farm.querySelectorAll('.plot');
  assert.equal(tiles.length, 16, 'sixteen plots, all rendered');

  const owned = tiles.filter((t) => t.classList.contains('plot--owned'));
  const next = tiles.filter((t) => t.classList.contains('plot--next'));
  const locked = tiles.filter((t) => t.classList.contains('plot--locked'));

  // The whole point of DEC-040: one plot is the player's from the first frame, and
  // exactly one of the rest is on offer. If this ever reads 0 owned, the free plot has
  // regressed and the game is unplayable at the start.
  assert.equal(owned.length, 1, 'the free starting plot');
  assert.equal(owned[0].dataset.plotId, '0', 'and it is the back corner');
  assert.equal(next.length, 1, 'exactly one plot on offer');
  assert.equal(locked.length, 14, 'the other fourteen are locked');

  // And the free plot is genuinely usable: no padlock, no price, not disabled.
  assert.equal(owned[0].querySelector('.plot__lock'), null, 'the free plot is not padlocked');
  assert.equal(owned[0].getAttribute('disabled'), null, 'and can be clicked');
});

test('every locked plot is disabled, so it cannot be clicked into', () => {
  const farm = document.querySelector('#farm-view');

  const locked = farm.querySelectorAll('.plot').filter((t) => t.classList.contains('plot--locked'));
  for (const tile of locked) {
    assert.equal(
      tile.getAttribute('disabled'),
      'true',
      `plot ${tile.dataset.plotId} looks locked but would still take a click`,
    );
  }
});

test('the next plot carries a price, and the lock states are mutually exclusive', () => {
  const farm = document.querySelector('#farm-view');
  const tiles = farm.querySelectorAll('.plot');

  for (const tile of tiles) {
    const states = ['plot--owned', 'plot--next', 'plot--locked'].filter((name) =>
      tile.classList.contains(name),
    );
    assert.equal(states.length, 1, `plot ${tile.dataset.plotId} has states: ${states.join(' + ')}`);
  }

  const next = tiles.filter((t) => t.classList.contains('plot--next'))[0];
  const price = next.querySelector('.plot__price');
  assert.ok(price, 'the plot on offer has no price tag');
  // The tag is the coin plus the number (T-65), so the value lives in
  // `.plot__price-num`. Reading the tag's `textContent` only worked while the fake DOM
  // left the coin's inline SVG unparsed; in a browser it would be "G100".
  assert.equal(
    price.querySelector('.plot__price-num')?.textContent,
    '100',
    'and the first plot costs 100 gold',
  );
});

test('a fresh farm starts with 200 gold and no seeds planted', async () => {
  const { getState } = await import('../js/state/store.js');
  const state = getState();

  assert.ok(state, 'the store was never initialised');
  assert.equal(state.gold, 200);
  assert.equal(state.plots.filter((plot) => plot.cropId !== null).length, 0);
  assert.equal(state.inventory.seeds.rice, 0, 'nothing is planted and nothing is sown');
});

/* --- the seed picker survives a redraw ---------------------------------------- */

/*
 * The bug this covers: clicking an empty plot opened the picker and it vanished before
 * a seed could be chosen. Two independent causes, both from the same piece of work.
 *
 * One was `renderPanels()` calling `closePicker()`, and the 1 Hz growth tick going
 * through `renderPanels` — so the picker was dismissed about once a second. The other
 * was the picker being mounted *inside* `#farm-view`, which `mountFarmView()` clears
 * wholesale on every render, so it died even when nothing called `closePicker()`.
 *
 * Neither throws, neither is visible in a unit test of `domain/`, and the first one only
 * appears once you actually click. See ISS-085.
 */

test('clicking your own empty plot opens a picker that stays open', async () => {
  const { onPlotClick } = await import('../js/farmActions.js');
  const { apply } = await import('../js/state/store.js');

  // Give the bag a seed, so the picker has something to offer and is worth defending.
  apply((state) => ({
    ok: true,
    state: { ...state, inventory: { ...state.inventory, seeds: { ...state.inventory.seeds, rice: 2 } } },
  }));

  const host = document.querySelector('#farm-picker');
  assert.ok(host, '#farm-picker is missing from the page');

  onPlotClick(0); // plot 0: owned, empty, so `plotAction` says 'plant'

  // **A click opens the plot's inspector**, not the seed picker. Clicking used to mean three
  // different things depending on what was in the plot — and "how wet is this square" was
  // not any of them. The inspector is the plot's own surface; the seed picker is one of
  // its buttons.
  assert.ok(
    host.querySelector('.inspector'),
    'clicking a plot did not open its inspector',
  );
  assert.ok(
    host.querySelector('.inspector__gauge'),
    'and the inspector carries a water gauge, because that is the thing you cannot see',
  );
  assert.ok(host.querySelector('.inspector__pump'), 'with a pump button for that plot');

  // Now the old path: the inspector's own button opens the seed picker. Clicking the real
  // button rather than calling the action function, because this is a test about what a
  // player can reach, not about whether a function exists.
  const plant = [...host.querySelectorAll('.inspector__action')]
    .find((b) => /plant/i.test(b.textContent));
  assert.ok(plant, 'the inspector offers a "Plant a seed" button on an empty plot');
  await plant.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.ok(
    host.querySelector('.crop-picker'),
    'and that button did not open the seed picker',
  );
  assert.equal(
    host.querySelectorAll('.crop-picker__seed').length,
    1,
    'and it offered the one seed in the bag',
  );

  // Now the part that was broken: anything that repaints the page must leave the picker
  // alone. `apply` runs the real `subscribe` chain, so this goes through
  // `renderPanels()` and `repaintFarm()` exactly as a save or a purchase would.
  for (const bump of [1, 2, 3]) {
    apply((state) => ({ ok: true, state: { ...state, lastSeenAt: Date.now() + bump } }));

    assert.ok(
      host.querySelector('.crop-picker'),
      `the picker was dismissed by a redraw (pass ${bump}) — a player would have under a ` +
        'second to choose a seed. Only planting, "never mind" and the shop may close it.',
    );
  }

  // And it is still interactive, not just still on screen.
  const seed = host.querySelector('.crop-picker__seed');
  await seed.click();

  assert.equal(host.querySelector('.crop-picker'), null, 'choosing a seed closes it');
  const { getState } = await import('../js/state/store.js');
  assert.equal(getState().plots[0].cropId, 'rice', 'and the crop went in the ground');
  assert.equal(getState().inventory.seeds.rice, 1, 'spending exactly one seed');
});

test('the water meter animates, because the same fill element survives a tick', async () => {
  // **This is the assertion that matters, and it is about identity rather than a number.**
  //
  // `.inspector__fill` carries `transition: width`, and a CSS transition only runs when
  // the *same element* changes value. The inspector used to answer every tick by clearing
  // the host and building the whole card again — correct output, no animation ever, because
  // a node that is destroyed and recreated has no previous width to move from. The bar
  // jumped once a second and read as broken rather than busy.
  //
  // So the claim is: after a tick raises the water, the element holding the fill is *the
  // same object*, and its width is a new value. Unit tests on the domain cannot see this
  // at all — they never load a DOM — which is why it belongs here.
  const { onPlotClick, refreshInspectorOnTick } = await import('../js/farmActions.js');
  const { apply, getState } = await import('../js/state/store.js');

  onPlotClick(0);
  const host = document.querySelector('#farm-picker');

  const fillBefore = host.querySelector('.inspector__fill');
  assert.ok(fillBefore, 'the gauge has a fill element to animate');
  const widthBefore = fillBefore.style.width;

  // One tick's worth of pumping, through the real store so the real subscriber chain runs.
  apply((state) => ({
    ok: true,
    state: {
      ...state,
      pump: { on: true, target: 0 },
      plots: state.plots.map((p) => (p.id === 0 ? { ...p, waterLevel: 60 } : p)),
    },
  }));
  refreshInspectorOnTick();

  const fillAfter = host.querySelector('.inspector__fill');
  assert.equal(
    fillAfter,
    fillBefore,
    'the fill must be the SAME element after a tick - a new one cannot transition',
  );
  assert.notEqual(
    fillAfter.style.width,
    widthBefore,
    'and its width must actually have changed, or there is nothing to animate',
  );
  assert.match(fillAfter.style.width, /%$/, 'a percentage, as the stylesheet expects');

  // The target marker moves with the crop's target, so it is patched in the same pass.
  const band = host.querySelector('.inspector__band');
  assert.ok(band?.style.left, 'the target marker is positioned by the same update');
});

test('the gauge shows the pump running only for the plot the pump is aimed at', async () => {
  // The sheen is the answer to "is *this* square filling". If it keyed off `pump.on` alone
  // it would light up on every plot while the pump watered one of them, which is the
  // confusion the attribute exists to avoid.
  const { onPlotClick, refreshInspectorOnTick } = await import('../js/farmActions.js');
  const { apply } = await import('../js/state/store.js');

  onPlotClick(0);
  const host = document.querySelector('#farm-picker');

  const aimed = (target) => {
    apply((state) => ({ ok: true, state: { ...state, pump: { on: true, target } } }));
    refreshInspectorOnTick();
    return host.querySelector('.inspector__gauge').dataset.pumping;
  };

  assert.equal(aimed(0), 'true', 'the plot it is pointed at');
  assert.equal(aimed(1), 'false', 'and not a plot it is not pointed at');
});

test('the picker host is outside #farm-view, which a field render clears wholesale', async () => {
  // The structural half of the same bug. `mountFarmView()` calls `clear(root)` on
  // `#farm-view` before it draws, so anything mounted inside it is destroyed by any
  // repaint — the growth tick alone repaints once a second. Asserting the shape of the
  // page is cheaper and more durable than asserting the behaviour, because it holds
  // even if someone reintroduces a caller that repaints more often.
  const farm = document.querySelector('#farm-view');
  const host = document.querySelector('#farm-picker');

  assert.ok(farm && host);
  assert.equal(
    host.contains(farm),
    false,
    '#farm-picker must not contain #farm-view',
  );
  assert.equal(
    farm.contains(host),
    false,
    'and #farm-view must not contain #farm-picker — it gets cleared on every render',
  );
});

test('the picker overlays the whole screen, not just the game column', () => {
  // The other half, from the same placement decisions. The card has to centre on the
  // *viewport*. Anchored inside `.app` it centred on the middle column and read as
  // off-centre on a wide monitor — and `.app` is `overflow: hidden`, so an overlay
  // inside it could never cover the edges in the first place.
  //
  // `index.html` is the thing that decides this, so the HTML is what gets asserted: the
  // host must be a body child, a sibling of `.app`, and not a descendant of it.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<\/div>\s*<!--[^>]*-->\s*<div id="farm-picker">/s,
    '#farm-picker must come after .app closes, as a body child');

  const shell = html.slice(html.indexOf('<div class="app"'), html.indexOf('<div id="farm-picker">'));
  assert.ok(
    !shell.includes('id="farm-picker"'),
    '#farm-picker must not be nested inside .app — .app is overflow:hidden and 100dvh',
  );

  // And the stylesheet has to make it viewport-anchored for that placement to work.
  const css = readFileSync(new URL('../css/crop-picker.css', import.meta.url), 'utf8');
  const overlay = /#farm-picker\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';

  assert.match(overlay, /position:\s*fixed/, 'a body child must be position:fixed to cover the viewport');
  assert.match(overlay, /inset:\s*0/, 'and cover all of it');
  assert.match(overlay, /place-items:\s*center/, 'centring the card, which is the reported bug');
});

test('an empty picker host is inert, so it cannot dim the screen or eat clicks', async () => {
  // The bug this covers, and it is the reason this test exists. `#farm-picker` is
  // `position: fixed; inset: 0` with a dim background. That sizes and paints an element
  // whether or not it has children, so an **empty** host is a full-screen dim overlay
  // from the moment the page loads — the whole screen goes dark and nothing answers,
  // including the plot click that was supposed to open the picker. Reported as "whole
  // screen is dimmed, cant press anything".
  //
  // The guard is `:empty`, which matches only with no child nodes at all. `farmActions`
  // keeps the host truly empty when closed, so it holds — but it is a trap if anything
  // ever leaves a text node in there, which is why the stylesheet says so.
  const css = readFileSync(new URL('../css/crop-picker.css', import.meta.url), 'utf8');

  assert.match(
    css,
    /#farm-picker:empty\s*\{[^}]*display:\s*none/,
    'an empty #farm-picker must be display:none — otherwise it dims the screen and eats every click',
  );

  // And the behaviour, on the real page: with nothing planted and nothing chosen, the
  // host must be empty, which is the state the guard is protecting.
  //
  // Closed explicitly first, because these tests share one DOM. An inspector left open by
  // an earlier test would fail this one for a reason that has nothing to do with either —
  // and a test that fails because of its neighbour is a test nobody trusts.
  const { closePicker } = await import('../js/farmActions.js');
  closePicker();

  const host = document.querySelector('#farm-picker');
  assert.ok(host, '#farm-picker is missing from the page');
  assert.equal(
    host.children.length,
    0,
    'the picker host should be empty before anything is planted — if it is not, the ' +
      ':empty guard will not match and the screen will be dimmed',
  );
});
