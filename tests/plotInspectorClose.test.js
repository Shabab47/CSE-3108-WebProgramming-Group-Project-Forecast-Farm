/**
 * How the plot card closes: the ×, the dimmed background, and Escape.
 *
 * `backdropDismiss.js` is tested on its own. This is the join — that the card actually
 * wires it, that all three exits run the *same* callback (so the farm's `closePicker`
 * cannot mean one thing to the × and another to the backdrop), and that unmounting takes
 * the listeners with it. The wiring matters because the last one of these to go wrong did
 * so in an entry point no unit test loaded (`AGENTS.md`).
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { buildInitialState } from '../js/state/initialState.js';
import { mountPlotInspector } from '../js/ui/plotInspector.js';

const SESSION = { status: 'authed', userId: 'acc_close', email: 'close@farm.test', farmerName: 'Closer' };

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** A field with one owned, empty plot — the card a click opens. */
function state() {
  const fresh = buildInitialState(SESSION);
  fresh.plots = fresh.plots.map((plot, index) => ({
    ...plot,
    owned: index === 0,
    cropId: null,
    plantedAt: null,
  }));
  return fresh;
}

function mount() {
  const closes = [];
  const view = mountPlotInspector(root, state(), 0, { onClose: () => closes.push('close') });
  return { view, closes, card: root.children[0] };
}

test('the × closes the card', async () => {
  const { closes, card } = mount();
  const cross = card.querySelector('.inspector__close');
  assert.ok(cross, 'the card has its close tile');

  await cross.click();
  assert.deepEqual(closes, ['close']);
});

test('a click on the dimmed background closes it, and a click on the card does not', async () => {
  const { closes, card } = mount();

  await root.dispatch('click', { target: card });
  assert.deepEqual(closes, [], 'pressing the card body is not an exit');

  await root.dispatch('click');
  assert.deepEqual(closes, ['close']);
});

test('Escape closes it', async () => {
  const { closes } = mount();

  await globalThis.document.dispatch('keydown', { key: 'Escape' });
  assert.deepEqual(closes, ['close']);
});

test('a closed card answers nothing afterwards', async () => {
  const { view, closes } = mount();
  view.unmount();

  await root.dispatch('click');
  await globalThis.document.dispatch('keydown', { key: 'Escape' });
  assert.deepEqual(closes, [], 'the listeners went with the card');
});

test('a card rebuilt by an update still closes, and still closes once', async () => {
  const { view, closes } = mount();
  // Planting a crop changes the card's *shape*, which is the rebuild path rather than the
  // patch path — the one that hands back a fresh set of element handles.
  const next = state();
  next.plots[0] = { ...next.plots[0], cropId: 'rice', plantedAt: Date.now() };
  const rebuilt = view.update(next);
  assert.equal(typeof rebuilt.unmount, 'function', 'the rebuilt handle can still be torn down');

  await root.dispatch('click');
  assert.deepEqual(closes, ['close'], 'one click, one close');

  rebuilt.unmount();
  await root.dispatch('click');
  assert.deepEqual(closes, ['close']);
});
