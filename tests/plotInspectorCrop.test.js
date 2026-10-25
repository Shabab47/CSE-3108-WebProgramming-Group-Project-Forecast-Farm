/**
 * The plot inspector's crop packet.
 *
 * The packet is the only thing on the card that is not text, so what needs pinning is
 * that it is the *right* packet, that it is absent on a plot with nothing in it, and
 * that the 1 Hz repaint patches the node instead of replacing it — a fresh `<img>` (or
 * a rewritten `src`) every second would reload the PNG and flicker.
 *
 * Layout is not visible here, same as `tests/farmView.test.js`; the box itself is in
 * `css/farm-dialog.css`.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { buildInitialState } from '../js/state/initialState.js';
import { mountPlotInspector } from '../js/ui/plotInspector.js';

const SESSION = {
  status: 'authed',
  userId: 'acc_inspector_crop',
  email: 'crop@farm.test',
  farmerName: 'Inspector',
};

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** Plot 0 carries `patch`; the rest are left as the initial state made them. */
function stateWith(patch) {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot, index) => (
    index === 0 ? { ...plot, owned: true, ...patch } : plot
  ));
  return state;
}

const RICE = { cropId: 'rice', plantedAt: Date.now() - 3_600_000, waterLevel: 20 };

test('a planted plot shows the seed packet for that crop', () => {
  mountPlotInspector(root, stateWith(RICE), 0, {});

  const art = root.querySelector('.inspector__crop-art');
  assert.equal(art.hidden, false, 'the packet is on the card');
  assert.match(
    art.querySelector('img').getAttribute('src'),
    /^assets\/images\/crops\/rice\/rice%20seed\.png$/,
    'the same packet art the shop, the bag and the picker use',
  );
  assert.match(visibleText(root).join(' '), /Rice/, 'the name is still text beside it');
});

test('an empty plot hides the packet, so no crop is implied', () => {
  mountPlotInspector(root, stateWith({ cropId: null, plantedAt: null }), 0, {});

  const art = root.querySelector('.inspector__crop-art');
  assert.equal(art.hidden, true);
  assert.equal(art.querySelector('img').getAttribute('src'), null);
});

test('a plot the player does not own hides the packet too', () => {
  const state = stateWith({});
  state.plots[0].owned = false;
  mountPlotInspector(root, state, 0, {});

  assert.equal(root.querySelector('.inspector__crop-art').hidden, true);
});

test('a tick repaints the text without replacing or reloading the packet', () => {
  const state = stateWith(RICE);
  const view = mountPlotInspector(root, state, 0, {});
  const art = root.querySelector('.inspector__crop-art');
  const img = art.querySelector('img');

  view.update(state);

  assert.equal(art.querySelector('img'), img, 'same node, not a rebuild');
  assert.match(img.getAttribute('src'), /rice%20seed\.png$/);
});
