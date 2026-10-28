/**
 * Closing a dialog from the dimmed background, or with Escape.
 *
 * The rule is one comparison — `event.target === overlay` — and the interesting part is
 * everything around it: the click that lands *inside* the card must not close it, a second
 * mount must not leave the first one's callback behind, and `stop()` must take the document
 * keydown listener with it. `tests/plotInspectorClose.test.js` proves the card uses this;
 * this file proves the rule itself.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { dismissOnBackdrop } from '../js/ui/backdropDismiss.js';

let overlay;
let card;

beforeEach(() => {
  overlay = installDom();
  card = globalThis.document.createElement('div');
  card.className = 'farm-dialog';
  overlay.append(card);
});

afterEach(() => {
  uninstallDom();
});

test('a click on the dimmed background dismisses', async () => {
  let closed = 0;
  dismissOnBackdrop(overlay, () => { closed += 1; });

  await overlay.dispatch('click');
  assert.equal(closed, 1);
});

test('a click that landed inside the card does not', async () => {
  let closed = 0;
  dismissOnBackdrop(overlay, () => { closed += 1; });

  // How the browser reports a press on the card: the listener is on the host, the target
  // is the card. Closing here would take the panel away from under the button clicked.
  await overlay.dispatch('click', { target: card });
  assert.equal(closed, 0);
});

test('Escape dismisses from anywhere, and other keys do not', async () => {
  let closed = 0;
  dismissOnBackdrop(overlay, () => { closed += 1; });

  await globalThis.document.dispatch('keydown', { key: 'Enter' });
  assert.equal(closed, 0, 'a key that is not Escape is not an exit');

  await globalThis.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(closed, 1);
});

test('mounting again replaces the callback instead of stacking a second one', async () => {
  const calls = [];
  dismissOnBackdrop(overlay, () => calls.push('first'));
  // What a second `mountPlotInspector` on the same `#farm-picker` does.
  dismissOnBackdrop(overlay, () => calls.push('second'));

  await overlay.dispatch('click');
  await globalThis.document.dispatch('keydown', { key: 'Escape' });

  assert.deepEqual(calls, ['second', 'second'],
    'one click, one close: the stale handler must not fire too');
});

test('stop() detaches both listeners, and the host can be wired again', async () => {
  let closed = 0;
  const stop = dismissOnBackdrop(overlay, () => { closed += 1; });
  stop();

  await overlay.dispatch('click');
  await globalThis.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(closed, 0, 'a closed dialog does not answer its old host');

  const again = dismissOnBackdrop(overlay, () => { closed += 1; });
  await overlay.dispatch('click');
  assert.equal(closed, 1, 'the next mount is wired from scratch');
  again();
});
