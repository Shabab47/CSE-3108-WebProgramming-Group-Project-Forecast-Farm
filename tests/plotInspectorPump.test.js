/**
 * The inspector's pump button, in the four states DEC-058 introduced.
 *
 * The machine rules are in `tests/pump.test.js`. What this pins down is the wiring the
 * rules cannot see: which word the player reads, which mode the button sends, and that a
 * full machine disables the button instead of silently refusing after a press.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { buildInitialState } from '../js/state/initialState.js';
import { mountPlotInspector } from '../js/ui/plotInspector.js';

const SESSION = { status: 'authed', userId: 'acc_inspector', email: 'inspect@farm.test', farmerName: 'Inspector' };

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

function field({ pump, plotId = 0 } = {}) {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot, index) => ({
    ...plot,
    owned: index < 4,
    cropId: index < 2 ? 'rice' : null,
    plantedAt: index < 2 ? Date.now() - 3_600_000 : null,
    waterLevel: 20,
  }));
  state.pump = pump;
  return { state, plotId };
}

function mount({ pump, plotId = 0 } = {}) {
  const calls = [];
  const { state } = field({ pump, plotId });
  mountPlotInspector(root, state, plotId, {
    onPump: (id, mode) => calls.push({ id, mode }),
  });
  return {
    calls,
    button: root.querySelector('.inspector__pump'),
    status: root.querySelector('.inspector__pump-status'),
    text: () => visibleText(root).join(' | '),
  };
}

test('an untargeted plot offers to add it, and says how much of the pump is in use', () => {
  const view = mount({ pump: { on: true, level: 1, targets: [1] } });

  assert.equal(view.button.textContent.trim(), 'Water this plot too');
  assert.equal(view.button.dataset.mode, 'add');
  assert.equal(view.button.disabled, false);
  assert.match(view.status.textContent, /Pump Lv 1 · watering 1 of 2 plots/);
});

test('a targeted plot on a running pump offers to stop watering it', () => {
  const view = mount({ pump: { on: true, level: 2, targets: [0] } });

  assert.equal(view.button.textContent.trim(), 'Stop watering this plot');
  assert.equal(view.button.dataset.mode, 'remove');
  assert.equal(view.button.dataset.on, 'true');
});

test('a targeted plot on an auto-stopped pump offers to resume, not remove', () => {
  const view = mount({ pump: { on: false, level: 2, targets: [0] } });

  assert.equal(view.button.textContent.trim(), 'Resume the pump');
  assert.equal(view.button.dataset.mode, 'resume',
    'pressing it must resume; removing while off would throw away the aim');
});

test('a full pump disables the button instead of refusing after the press', () => {
  // Level 1 is the smallest pump there is, and it waters two plots.
  const view = mount({ pump: { on: true, level: 1, targets: [1, 2] } });

  assert.equal(view.button.disabled, true);
  assert.equal(view.button.dataset.mode, 'full');
  assert.equal(view.button.textContent.trim(), 'Pump full (2 plots)');
});

test('the button sends its mode, so the join does not have to guess intent', async () => {
  const add = mount({ pump: { on: false, level: 2, targets: [] } });
  await add.button.click();
  assert.deepEqual(add.calls, [{ id: 0, mode: 'add' }]);

  const remove = mount({ pump: { on: true, level: 2, targets: [0] } });
  await remove.button.click();
  assert.deepEqual(remove.calls, [{ id: 0, mode: 'remove' }]);

  const resume = mount({ pump: { on: false, level: 2, targets: [0] } });
  await resume.button.click();
  assert.deepEqual(resume.calls, [{ id: 0, mode: 'resume' }]);
});

test('a full pump whose plot is at optimal offers to swap instead of refusing', () => {
  // Plot 0 is on the pump and full; the open panel is plot 1.
  // Level 1 holds two plots, so it is full with plot 0 (finished) and plot 2 (still thirsty).
  const { state } = field({ pump: { on: false, level: 1, targets: [0, 2] }, plotId: 1 });
  state.plots[0].waterLevel = 80; // inside rice's optimal band, so it counts as finished
  mountPlotInspector(root, state, 1, { onPump: () => {} });
  const button = root.querySelector('.inspector__pump');

  assert.equal(button.dataset.mode, 'swap');
  assert.equal(button.disabled, false);
  assert.equal(button.textContent.trim(), 'Water this plot instead');
});