/**
 * Tests for the sync indicator and the blocked screen — the two modules that
 * tell a player the truth about a connection.
 *
 * These are pure and DOM-free: `copyFor`, `chipLabelFor`, `advanceAnnouncement`
 * and `messageFor` return the sentences and the decisions, and everything else is
 * exercised through the mount functions with a minimal fake root, so the logic is
 * verified without a browser.
 *
 * The words matter as much as the branches. A notice that says "error" when the
 * player has lost nothing is a lie that trains people to ignore warnings, and the
 * bug this work fixed (ISS-048) was exactly that kind of dishonesty — the game
 * told a player with a valid account that they were signed out.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { advanceAnnouncement } from '../js/connection.js';
import {
  SYNCED_NOTE,
  chipLabelFor,
  copyFor,
  describeStaleFor,
  mountSyncIndicator,
} from '../js/ui/syncIndicator.js';
import { messageFor, mountBlockedScreen } from '../js/ui/blockedScreen.js';

/* --- the notice copy -------------------------------------------------------- */

test('a synced farm says nothing at all', () => {
  // The healthy case must produce no notice. Text that is always on screen stops
  // being read, and then it is not telling the player anything — which is why
  // the chip prints a label only when there is genuinely something wrong.
  assert.equal(copyFor('synced', 0), null);
});

test('a pending save says the farm is safe AND what stopped', () => {
  const copy = copyFor('pending', 0);

  assert.ok(copy, 'a pending save must produce copy');
  assert.match(copy.title, /device/i, 'must say where the farm is');
  assert.match(copy.body, /weather/i, 'must say live weather is paused');
  assert.match(copy.body, /nothing has been lost/i, 'must say nothing was lost');
});

test('the pending copy never claims the save failed', () => {
  const copy = copyFor('pending', 0);

  // This is the sentence that matters most. The local write always succeeds, so
  // "save error" would be untrue and would send a player to clear their browser.
  assert.doesNotMatch(copy.title, /error/i);
  assert.doesNotMatch(copy.title, /lost/i);
  assert.doesNotMatch(copy.body, /failed/i);
});

test('a save in flight is shown as activity, not as a warning', () => {
  const copy = copyFor('saving', 0);

  assert.match(copy.title, /saving/i);
  assert.doesNotMatch(copy.title, /no connection/i);
});

/* --- the chip label --------------------------------------------------------- */

test('only a failed write prints a label on the chip', () => {
  // The dots are permanent, so the label must not be — a permanent label is read
  // once and then ignored, which is how a player ends up not noticing their farm
  // stopped syncing. This is the half of the chip that carries ISS-050.
  assert.equal(chipLabelFor('synced'), null);
  assert.equal(chipLabelFor('saving'), null);
  assert.equal(chipLabelFor('pending'), 'No connection');
});

test('the popover still says something when the farm is fine', () => {
  // The dots are always clickable, so `copyFor('synced')` being null must not
  // leave the popover opening onto a blank panel.
  assert.ok(SYNCED_NOTE.title);
  assert.ok(SYNCED_NOTE.body);
});

/* --- the first-failure notice ------------------------------------------------ */

test('the first failed write announces, and the rest of the outage does not', () => {
  // A toast that fires every 30 s for the length of an outage is how people learn
  // to ignore notifications, so it fires exactly once per outage.
  const first = advanceAnnouncement(false, 'pending');
  assert.deepEqual(first, { announce: true, announced: true });

  const second = advanceAnnouncement(first.announced, 'pending');
  assert.deepEqual(second, { announce: false, announced: true });
});

test('a save in flight never announces', () => {
  // `saving` is the state the game passes through twice every AUTOSAVE_MS. If it
  // announced, every healthy autosave would raise a toast — the exact defect that
  // made the old banner jump the page (ISS-076).
  assert.equal(advanceAnnouncement(false, 'saving').announce, false);
});

test('recovering rearms the notice for the next outage', () => {
  const outage = advanceAnnouncement(false, 'pending');
  const recovered = advanceAnnouncement(outage.announced, 'synced');

  assert.deepEqual(recovered, { announce: false, announced: false });
  assert.equal(advanceAnnouncement(recovered.announced, 'pending').announce, true);
});

test('the banner never says the player has been signed out', () => {
  // The whole point of ISS-048: a disconnected player is not signed out, and
  // telling them otherwise is what sent them to a password prompt. The word may
  // only appear inside an explicit reassurance — see the blocked-screen tests.
  for (const sync of ['synced', 'saving', 'pending']) {
    const copy = copyFor(sync, 0);
    if (!copy) continue;
    assert.doesNotMatch(copy.title, /signed out/i);
    assert.doesNotMatch(copy.body, /signed out/i);
  }
});

test('stale ages are phrased, not numbered', () => {
  assert.equal(describeStaleFor(0), 'just now');
  assert.equal(describeStaleFor(-5), 'just now', 'a clock skew must not print a negative age');
  assert.equal(describeStaleFor(60_000), '1 minute ago');
  assert.equal(describeStaleFor(120_000), '2 minutes ago');
  assert.equal(describeStaleFor(3_600_000), '1 hour ago');
  assert.equal(describeStaleFor(7_200_000), '2 hours ago');
  assert.equal(describeStaleFor(Number.NaN), 'just now', 'an unknown age still reads as recent');
});

/* --- the chip mount --------------------------------------------------------- */

/*
 * A minimal DOM, in the shape `js/utils/dom.js`'s `el()` needs: `createElement`,
 * `createTextNode`, and a `Node` class for its `child instanceof Node` check.
 *
 * This is the same approach `loadingTips.test.js` takes, kept deliberately close
 * to it — a second, subtly different fake DOM in this suite would drift from the
 * real `el()` contract and quietly stop testing anything.
 */

class FakeNode {}

class FakeElement extends FakeNode {
  constructor(tag) {
    super();
    this.tag = String(tag).toLowerCase();
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.on = {};
    this.listeners = {};
  }

  append(...kids) {
    for (const kid of kids) this.children.push(kid);
  }

  /** `clear()` in `utils/dom.js` calls this, so a mount can empty a root. */
  replaceChildren(...kids) {
    this.children = kids;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  /** A simplified stand-in: the tests walk `on`, which `el()` populates. */
  addEventListener(event, handler) {
    (this.listeners[event] ??= []).push(handler);
    this.on[event] = handler;
  }

  removeEventListener(event, handler) {
    this.listeners[event] = (this.listeners[event] ?? []).filter((fn) => fn !== handler);
  }

  /** Enough of the real thing for the popover's outside-click check. */
  contains(node) {
    if (node === this) return true;
    return (this.children ?? []).some((kid) => kid instanceof FakeElement && kid.contains(node));
  }

  remove() {}
}

function installFakeDom() {
  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
    // `mountSyncIndicator` wires its outside-click and Escape handlers through
    // `listen(document, …)` at mount time, so the fake document needs these even
    // though most tests never dispatch them.
    addEventListener(event, handler) {
      (this.listeners ??= {})[event] = [...(this.listeners[event] ?? []), handler];
    },
    removeEventListener(event, handler) {
      this.listeners[event] = (this.listeners?.[event] ?? []).filter((fn) => fn !== handler);
    },
    listeners: {},
  };
}

installFakeDom();

/** The smallest thing the mount functions need: an element with children. */
function fakeRoot() {
  return new FakeElement('div');
}

/** Walk the mounted tree for a node matching `predicate`. */
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

/** The chip or blocked-screen root that the mount appended. */
function mounted(root) {
  return findNode(root, (n) => String(n.className ?? '').includes('sync-indicator') || String(n.className ?? '').includes('blocked'));
}

function buttonLabelled(root, label) {
  return findNode(root, (n) => n.tag === 'button' && n.textContent === label);
}

function partOf(root, className) {
  return findNode(root, (n) => String(n.className ?? '') === className);
}

test('the dots are on screen even when the farm is perfectly synced', () => {
  // Always present, by design: the chip is the reassurance that autosave is
  // happening at all, and a fixture that appears only when something is wrong
  // teaches players to ignore it. What stays empty is the *label*.
  const root = fakeRoot();
  mountSyncIndicator(root, { getSync: () => 'synced' });

  assert.equal(partOf(root, 'sync-indicator__dots').children.length, 2);
  assert.equal(partOf(root, 'sync-indicator__label').textContent, '');
});

test('the chip records the sync state for the stylesheet to read', () => {
  // `data-sync` is the whole contract with css/components.css: it is what turns
  // the dots amber and what starts the wave.
  const root = fakeRoot();
  mountSyncIndicator(root, { getSync: () => 'pending', now: () => 0 });

  const chip = mounted(root);
  assert.equal(chip.dataset.sync, 'pending');
  assert.equal(partOf(root, 'sync-indicator__label').textContent, 'No connection');
});

test('a healthy save never prints a label', () => {
  // The regression that mattered: `saving` used to produce a full-width banner,
  // so a *working* autosave shoved the whole page down every 10 s (ISS-076).
  const root = fakeRoot();
  const chip = mountSyncIndicator(root, { getSync: () => 'saving', now: () => 0 });

  assert.equal(mounted(root).dataset.sync, 'saving');
  assert.equal(partOf(root, 'sync-indicator__label').textContent, '');
  assert.equal(partOf(root, 'sync-indicator__popover').hidden, true, 'the popover must not open itself');
});

test('the popover stays shut until the chip is clicked', () => {
  const root = fakeRoot();
  const chip = mountSyncIndicator(root, { getSync: () => 'pending', now: () => 0 });
  const popover = partOf(root, 'sync-indicator__popover');
  const button = partOf(root, 'sync-indicator__chip');

  assert.equal(popover.hidden, true);
  assert.equal(button.attributes['aria-expanded'], 'false');

  button.on.click();
  assert.equal(popover.hidden, false);
  assert.equal(button.attributes['aria-expanded'], 'true', 'the toggle must be announced, not just drawn');

  button.on.click();
  assert.equal(popover.hidden, true);
});

test('unmount takes the document listeners with it', () => {
  // A chip that is torn down but still listening to `document` keeps the whole
  // indicator alive in memory, and every remount adds another pair. Measured as
  // this mount's own delta, because earlier tests leave their own listeners
  // behind on the shared fake document.
  const listenerCount = () => Object.keys(globalThis.document.listeners)
    .reduce((n, key) => n + globalThis.document.listeners[key].length, 0);

  const before = listenerCount();
  const root = fakeRoot();
  const chip = mountSyncIndicator(root, { getSync: () => 'synced' });

  assert.equal(listenerCount(), before + 2, 'mount wires one click and one keydown handler');

  chip.unmount();
  assert.equal(listenerCount(), before, 'unmount must remove both');
  assert.equal(root.children.length, 0);
});

test('the export button only exists when an export handler is given', () => {
  // A guest cannot export — there is no account to bind the file to. Showing a
  // button that cannot work is worse than showing none.
  const withoutExport = fakeRoot();
  mountSyncIndicator(withoutExport, { getSync: () => 'pending', now: () => 0 });
  assert.equal(buttonLabelled(withoutExport, 'Export your farm').hidden, true);

  const withExport = fakeRoot();
  mountSyncIndicator(withExport, {
    getSync: () => 'pending',
    now: () => 0,
    onExport: () => {},
  });
  assert.equal(buttonLabelled(withExport, 'Export your farm').hidden, false);
});

test('the export button fires the handler it was given', () => {
  let exported = false;
  const root = fakeRoot();
  mountSyncIndicator(root, { getSync: () => 'pending', now: () => 0, onExport: () => { exported = true; } });

  buttonLabelled(root, 'Export your farm').on.click();

  assert.equal(exported, true, 'the chip must offer the escape hatch, not just mention it');
});

test('refresh re-reads the state, so recovering clears the chip', () => {
  let sync = 'pending';
  const root = fakeRoot();
  const chip = mountSyncIndicator(root, { getSync: () => sync, now: () => 0 });

  assert.equal(partOf(root, 'sync-indicator__label').textContent, 'No connection');

  // This is the reconnect path: the store emits `sync`, `js/connection.js` calls
  // `refresh`, and the label goes away on its own.
  sync = 'synced';
  chip.refresh();

  assert.equal(mounted(root).dataset.sync, 'synced');
  assert.equal(partOf(root, 'sync-indicator__label').textContent, '');
});

test('the popover ages its wording without re-rendering on a timer', () => {
  // The text is computed at paint time from `now()`, so one re-render covers any
  // length of outage. A popover that rebuilt itself every second would be a
  // permanent source of layout churn during a long outage.
  let now = 0;
  const root = fakeRoot();
  const chip = mountSyncIndicator(root, { getSync: () => 'pending', now: () => now });

  const findText = () => findNode(root, (n) => String(n.className ?? '').includes('__detail'))?.textContent ?? '';

  assert.match(findText(), /just now/);

  now = 20 * 60_000;
  chip.refresh();
  assert.match(findText(), /20 minutes ago/);
});

/* --- the blocked screen ----------------------------------------------------- */

test('offline and server trouble get different sentences', () => {
  // They look identical to a player and mean opposite things to whoever is
  // debugging, so they must not read identically.
  const offline = messageFor('offline');
  const server = messageFor('server_error');

  assert.notEqual(offline.title, server.title);
  assert.match(offline.title, /no internet/i);
  assert.doesNotMatch(offline.title, /trouble/i);
});

test('the blocked screen only mentions being signed out to deny it', () => {
  // The phrase is allowed in exactly one form — "you have NOT been signed out" —
  // because that reassurance is what stops someone typing their password into a
  // form that would reject it. Any other use is the ISS-048 bug coming back.
  for (const reason of ['offline', 'server_error', 'something-unexpected']) {
    const copy = messageFor(reason);

    assert.doesNotMatch(copy.title, /signed out/i, `${reason}: the title must not mention it`);

    const mentions = copy.body.match(/.{0,24}signed out.{0,4}/gi) ?? [];
    for (const phrase of mentions) {
      assert.match(
        phrase,
        /have not been signed out/i,
        `${reason}: "signed out" may only appear as a reassurance, found: ${phrase}`,
      );
    }
  }
});

test('the blocked screen reassures that the session is intact', () => {
  // The player arrived here from a login redirect they did not choose. Telling
  // them they have not been signed out is what stops them typing their password
  // into a form that will reject it.
  const copy = messageFor('offline');
  assert.match(copy.body, /have not been signed out/i);
});

test('an unknown reason falls back to the offline wording', () => {
  // Choosing wrong here is harmless; the other way round would blame the
  // player's wifi for our outage.
  assert.deepEqual(messageFor('who-knows'), messageFor('offline'));
});

test('the retry button is hidden when there is nothing to retry', () => {
  const root = fakeRoot();
  mountBlockedScreen(root, { reason: 'offline' });

  assert.equal(buttonLabelled(root, 'Try again').hidden, true);
});

test('the retry button is shown when a retry was given', () => {
  const root = fakeRoot();
  mountBlockedScreen(root, { reason: 'offline', onRetry: () => {} });

  assert.equal(buttonLabelled(root, 'Try again').hidden, false);
});

test('setBusy blocks a second press while one is in flight', () => {
  // A player on a bad connection will press the button repeatedly. Without this
  // each press fires another restore, and they queue behind each other.
  let presses = 0;
  const root = fakeRoot();
  const blocked = mountBlockedScreen(root, {
    reason: 'offline',
    onRetry: () => { presses += 1; },
  });

  const button = buttonLabelled(root, 'Try again');
  button.on.click();
  assert.equal(presses, 1);
  assert.equal(button.disabled, true, 'must not accept a second press while one is in flight');

  // A retry that will never answer must not strand the player on "Trying…".
  blocked.setBusy(false);
  assert.equal(button.disabled, false);
  button.on.click();
  assert.equal(presses, 2);
});

test('setReason rewords the screen without rebuilding it', () => {
  // The first attempt often reports `offline` while the real answer is
  // `server_error`. Rebuilding would drop focus; rewording does not.
  const root = fakeRoot();
  const blocked = mountBlockedScreen(root, { reason: 'offline' });
  const before = mounted(root);

  blocked.setReason('server_error');

  assert.equal(mounted(root), before, 'the same node must be reused');
  assert.match(findNode(root, (n) => n.tag === 'h1')?.textContent ?? '', /trouble/i);
});