/**
 * Tests for the boot loader — the veil and rotating facts shown while a page
 * resolves its session and save.
 *
 * The reason this needs tests at all is the timing. The whole feature is a
 * promise that *nothing appears for a fast load*: that is the difference between
 * a loader that helps and a loader that makes every navigation worse. The
 * thresholds in `config/tips.js` are the mechanism, and a well-meaning edit to
 * them would not fail anything else in the suite.
 *
 * The other property worth pinning is that a rotation cannot repeat itself. A
 * player waiting fifteen seconds would otherwise read the same fact three times
 * and conclude the thing is stuck.
 *
 * No DOM library is used, and none is available — the project has no runtime or
 * dev dependencies. So these drive the module against a hand-built stub of the
 * handful of DOM calls it makes, in the same spirit as the `document` stub in
 * `mainBoot.test.js`.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FIRST_TIP_AFTER_MS,
  SHOW_AFTER_MS,
  TIPS,
  TIP_ROTATE_MS,
} from '../js/config/tips.js';
import { shuffledTips } from '../js/ui/loadingTips.js';

/**
 * Imported after the fake DOM is installed in `beforeEach`, not at the top.
 *
 * `js/ui/loadingTips.js` touches `document` at mount time rather than at import
 * time, so a plain top-level import is fine — but it is imported here as a
 * dynamic import for the same reason `mainBoot.test.js` does it: the module
 * graph must not be evaluated before the globals it reads exist.
 */
const { mountBootLoader } = await import('../js/ui/loadingTips.js');

/* --- the data itself ------------------------------------------------------ */

test('every tip is well formed and uniquely identified', () => {
  // The loader holds a tip and indexes into `order` by position, so a missing
  // `text` would render "undefined" to a player mid-load with no error anywhere.
  for (const tip of TIPS) {
    assert.equal(typeof tip.id, 'string');
    assert.ok(tip.id.length > 0, 'tip has an id');
    assert.equal(typeof tip.text, 'string');
    assert.ok(tip.text.length > 0, `${tip.id} has text`);
    assert.ok(['weather', 'game'].includes(tip.kind), `${tip.id} has a known kind`);
  }

  const ids = new Set(TIPS.map((tip) => tip.id));
  assert.equal(ids.size, TIPS.length, 'no duplicate tip ids');

  // Both kinds are represented, which is the "mixed" half of the brief: weather
  // trivia is what justifies the wait, game facts are what make it worth reading.
  assert.ok(TIPS.some((tip) => tip.kind === 'weather'), 'has weather tips');
  assert.ok(TIPS.some((tip) => tip.kind === 'game'), 'has game tips');
});

test('no game tip quotes a balance number that config owns', () => {
  // AGENTS.md: prices and grow times live in `config/crops.js` and
  // `config/game.js`, and they are placeholders until balance is tuned
  // (ISS-008). A game tip that hard-codes "0.05 gold per second" is wrong the
  // moment that number moves, and nothing else would catch it.
  //
  // Only `kind: 'game'` is checked. A weather tip legitimately quotes facts
  // about the world — "11,800 mm of rain a year" — and those are not tuning
  // knobs, so a blanket number ban would force the trivia to be vague.
  for (const tip of TIPS.filter((entry) => entry.kind === 'game')) {
    assert.doesNotMatch(
      tip.text,
      /\b\d+(\.\d+)?\s*(gold|seconds?|hours?|minutes?|%)\b/i,
      `${tip.id} quotes a tunable number`,
    );
  }
});

test('the thresholds are ordered so a fast load shows nothing', () => {
  // The feature is this: below SHOW_AFTER_MS no veil, and no fact until a
  // further FIRST_TIP_AFTER_MS. If these ever invert, every page flashes.
  assert.ok(SHOW_AFTER_MS > 0);
  assert.ok(FIRST_TIP_AFTER_MS > SHOW_AFTER_MS);
  assert.ok(TIP_ROTATE_MS > FIRST_TIP_AFTER_MS, 'a fact is held longer than the wait before the first one');
});

/* --- the shuffle ---------------------------------------------------------- */

test('shuffledTips returns every tip exactly once', () => {
  // The one property worth guaranteeing: a rotation that can repeat is how a
  // player sees the same fact three times during a long wait.
  for (let run = 0; run < 50; run += 1) {
    const order = shuffledTips();
    assert.equal(order.length, TIPS.length);
    assert.equal(new Set(order.map((tip) => tip.id)).size, TIPS.length);
  }
});

test('shuffledTips does not mutate the source list', () => {
  // `TIPS` is module state. Sorting it in place would make the order depend on
  // which page loaded first.
  const before = TIPS.map((tip) => tip.id);
  shuffledTips();
  assert.deepEqual(TIPS.map((tip) => tip.id), before);
});

test('shuffledTips actually varies the order', () => {
  // Not a randomness test — a fairness one. Over many runs more than one
  // ordering must appear, or the shuffle is doing nothing.
  const seen = new Set();
  for (let run = 0; run < 40; run += 1) {
    seen.add(shuffledTips().map((tip) => tip.id).join(','));
  }
  assert.ok(seen.size > 1, 'the order is not fixed');
});

/* --- the loader, against a stub DOM ---------------------------------------- */

/** Base class so fake nodes satisfy the `child instanceof Node` check in `el()`. */
class FakeNode {}

class FakeElement extends FakeNode {
  constructor(tag) {
    super();
    const classes = new Set();
    this.tagName = String(tag).toUpperCase();
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.offsetWidth = 0;
    this.children = [];
    this.attributes = {};
    this.classList = {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    };
  }

  append(...kids) {
    this.children.push(...kids);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  remove() {
    this.removed = true;
    // Real `remove()` takes the node out of its parent, so a test can tell the
    // difference between "still on the page" and "detached but not garbage
    // collected". `attached` is the registry `installFakeDom` appends to.
    if (this.attached) {
      const at = this.attached.indexOf(this);
      if (at >= 0) this.attached.splice(at, 1);
    }
  }
}

/**
 * The smallest DOM the loader touches.
 *
 * `el()` needs `createElement`, `createTextNode` and `Node`; the loader needs
 * `classList`, `offsetWidth` and `remove`. Timers are real — the module uses
 * `setTimeout` directly — so the assertions below wait rather than fake time,
 * which keeps the test honest about the real thresholds.
 */
function installFakeDom() {
  const appended = [];

  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => ({ text }),
    body: new FakeElement('body'),
  };
  // `document.body` is itself a FakeElement, so appending the veil to it is the
  // same code path the browser takes.
  globalThis.document.body.append = (...kids) => {
    appended.push(...kids);
    for (const kid of kids) kid.attached = appended;
    globalThis.document.body.children.push(...kids);
  };

  return { appended };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let appended;

/** Every loader mounted by a test, so teardown cannot be skipped by a failed assert. */
let mounted = [];

function mount(options) {
  const loader = mountBootLoader(options);
  mounted.push(loader);
  return loader;
}

beforeEach(() => {
  appended = installFakeDom().appended;
  mounted = [];
});

// The rotation reschedules itself every `TIP_ROTATE_MS` until `done()`. Without
// this, an assertion that fails before reaching its `done()` leaves a timer
// running and node --test never exits — the suite hangs instead of reporting the
// failure, which hides the bug behind an unrelated timeout.
afterEach(() => {
  for (const loader of mounted) loader.unmount();
  mounted = [];
});

test('nothing is painted for a load that finishes inside SHOW_AFTER_MS', async () => {
  // The whole point. A page that renders in 100 ms must show no veil at all.
  const loader = mount({ label: 'Loading' });

  await wait(SHOW_AFTER_MS - 100);
  const veil = appended.find((node) => node.className === 'boot-loader');
  assert.ok(veil, 'the veil node is appended up front');
  assert.equal(veil.hidden, true, 'but it is hidden');

  loader.done();
});

test('the veil appears when the wait outlasts SHOW_AFTER_MS', async () => {
  const loader = mount({ label: 'Loading' });
  const veil = appended.find((node) => node.className === 'boot-loader');

  await wait(SHOW_AFTER_MS + 120);
  assert.equal(veil.hidden, false, 'the veil is showing');

  loader.done();
});

test('no fact is shown until FIRST_TIP_AFTER_MS has passed', async () => {
  // The veil with no text under it is fine — the spinner is the message. A fact
  // appearing during a two-second load would be noise.
  const loader = mount({ label: 'Loading your farm' });
  const panel = appended[0].children[0];

  await wait(FIRST_TIP_AFTER_MS - 200);
  const tipNode = panel.children.find((node) => node.className?.includes('boot-loader__tip'));
  assert.equal(tipNode.textContent, '', 'no fact yet');

  await wait(350);
  assert.notEqual(tipNode.textContent, '', 'a fact appears after the second threshold');

  loader.done();
});

test('the status line says the label once and the tip is hidden from readers', async () => {
  // A live region that rewrites itself every few seconds is unusable with a
  // screen reader, so the status announces once and only the visible tip rotates.
  const loader = mount({ label: 'Loading your farm' });
  const panel = appended[0].children[0];
  const status = panel.children.find((node) => node.className?.includes('boot-loader__status'));
  const tipNode = panel.children.find((node) => node.className?.includes('boot-loader__tip'));

  assert.equal(status.textContent, 'Loading your farm');
  assert.equal(status.attributes['aria-live'], 'polite');
  assert.equal(tipNode.attributes['aria-hidden'], 'true');

  loader.done();
});

test('done removes the veil and cancels the rotation', async () => {
  const loader = mount({ label: 'Loading' });
  const veil = appended.find((node) => node.className === 'boot-loader');

  await wait(SHOW_AFTER_MS + 120);
  loader.done();

  assert.equal(veil.removed, true, 'the veil is gone');
  assert.equal(appended.includes(veil), false);

  // A timer left running would re-show the veil behind the real page, or keep
  // writing to a detached node forever.
  const panel = veil.children[0];
  const tipNode = panel.children.find((node) => node.className?.includes('boot-loader__tip'));
  const before = tipNode.textContent;
  await wait(FIRST_TIP_AFTER_MS + 120);
  assert.equal(tipNode.textContent, before, 'no rotation survives done()');
});

test('done is safe to call twice, as the redirect paths do', async () => {
  // `start()` in every entry point calls `done()` before `location.replace`, and
  // a second call would throw on an already-detached node if this were careless.
  const loader = mount({ label: 'Loading' });
  loader.done();
  assert.doesNotThrow(() => loader.done());
  assert.doesNotThrow(() => loader.unmount());
});

test('the loader is inert with no document.body', () => {
  // `mainBoot.test.js` stubs a bare `document`, so this path is real in this
  // suite's own runtime. It must return a usable pair rather than throw.
  globalThis.document = { createElement: () => ({}) };
  const loader = mountBootLoader();
  assert.doesNotThrow(() => loader.done());
  assert.doesNotThrow(() => loader.unmount());
});