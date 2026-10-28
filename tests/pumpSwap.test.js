/**
 * A full pump lets go of a finished plot when the player asks for another one.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildInitialState } from '../js/state/initialState.js';
import { aimPump, pumpTargetIds } from '../js/domain/pump.js';
import { aimPumpOrRelease, releasableTarget, wouldSwap } from '../js/domain/pumpSwap.js';
import { targetFor } from '../js/domain/plotWater.js';

const SESSION = { status: 'authed', userId: 'acc_swap', email: 'swap@farm.test', farmerName: 'Swap Tester' };

/** Four owned rice plots, with the given pump and per-plot water levels. */
function farm({ level = 1, targets = [], levels = [] } = {}) {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot, index) => ({
    ...plot,
    owned: index < 4,
    cropId: 'rice',
    waterLevel: levels[index] ?? 0,
  }));
  state.pump = { on: true, level, targets };
  return state;
}

const RICE = targetFor({ cropId: 'rice' });
const THIRSTY = 20; // well below rice's band floor

test('a full level-1 pump on finished plots hands over to the next plot', () => {
  // Level 1 holds two plots. Both are finished, so the tie goes to the older target.
  const state = farm({ level: 1, targets: [0, 1], levels: [RICE, RICE] });
  state.pump.on = false; // the tick switched it off when the plots filled

  assert.equal(aimPump(state, 2).ok, false, 'the plain rule still refuses');
  const result = aimPumpOrRelease(state, 2);

  assert.equal(result.ok, true);
  assert.equal(result.released, 0);
  assert.deepEqual(result.state.pump, { on: true, level: 1, targets: [1, 2] });
});

test('a pump that is still filling its plot does not let go of it', () => {
  const state = farm({ level: 1, targets: [0, 1], levels: [THIRSTY, THIRSTY] });

  assert.equal(releasableTarget(state), null);
  assert.equal(wouldSwap(state, 2), false);
  assert.deepEqual(aimPumpOrRelease(state, 2),
    { ok: false, reason: 'pump_full', level: 1, capacity: 2 });
});

test('with several outlets, only a finished plot is released, and the others keep running', () => {
  const state = farm({ level: 1, targets: [0, 1], levels: [THIRSTY, RICE] });

  const result = aimPumpOrRelease(state, 2);
  assert.equal(result.released, 1, 'plot 0 is still thirsty, so plot 1 is the one let go');
  assert.deepEqual(pumpTargetIds(result.state), [0, 2]);
});

test('when several are finished, the most-watered goes first, and a tie goes to the oldest', () => {
  const over = farm({ level: 2, targets: [0, 1], levels: [RICE, RICE + 5] });
  assert.equal(releasableTarget(over), 1, 'the plot holding more water is released first');

  const tie = farm({ level: 2, targets: [1, 0], levels: [RICE, RICE] });
  assert.equal(releasableTarget(tie), 1, 'equal water: the earlier target in the list goes');
});

test('there is nothing to swap when the pump has room', () => {
  const state = farm({ level: 2, targets: [0], levels: [RICE] });
  const result = aimPumpOrRelease(state, 1);

  assert.equal(result.released, null);
  assert.deepEqual(pumpTargetIds(result.state), [0, 1]);
});

test('a plot that cannot take water is still refused, with no release', () => {
  const state = farm({ level: 1, targets: [0], levels: [RICE] });
  const result = aimPumpOrRelease(state, 9); // not owned

  assert.deepEqual(result, { ok: false, reason: 'bad_plot' });
});

test('a plot that has dried a little since the pump stopped still counts as finished', () => {
  // The pump switches off when the plot fills, then evaporation takes it just under the
  // target. It still reads Optimal, so it must still be releasable.
  const state = farm({ level: 1, targets: [0, 2], levels: [RICE - 3, 0, THIRSTY] });
  state.pump.on = false;

  assert.equal(releasableTarget(state), 0);
  assert.equal(aimPumpOrRelease(state, 1).released, 0);
});