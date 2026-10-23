/**
 * Tests for the pump as a machine: its level, its targets, its bill, and buying the
 * next level.
 *
 * The weather suite already covers one plot and the water medium. This file is about the
 * part DEC-058 added — more than one target, a capacity that refuses past its edge, and a
 * shop upgrade that spends gold once and cannot be bought out of order.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildInitialState } from '../js/state/initialState.js';
import { DIFFICULTY, PUMP } from '../js/config/game.js';
import {
  aimPump,
  pumpCapacity,
  pumpRuns,
  pumpTargetIds,
  removePumpTarget,
  setPump,
  togglePumpTarget,
} from '../js/domain/pump.js';
import { canUpgradePump, nextPumpUpgrade, upgradePump } from '../js/domain/pumpUpgrade.js';
import { tick } from '../js/domain/water.js';

const SESSION = { status: 'authed', userId: 'acc_pump', email: 'pump@farm.test', farmerName: 'Pump Tester' };
const HOUR = 3_600_000;

/** A farm owning the first `owned` plots, with enough gold unless a test says otherwise. */
function farm(owned = 16, gold = 10_000_000) {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot, index) => ({ ...plot, owned: index < owned }));
  state.gold = gold;
  state.pump = { on: false, level: 1, targets: [] };
  return state;
}

function plot(id, waterLevel = 0, extra = {}) {
  return { id, waterLevel, ...extra };
}

/* --- targets --------------------------------------------------------------- */

test('a level-1 pump aims at one plot and refuses a second', () => {
  const state = farm(4);

  const first = aimPump(state, 0);
  assert.equal(first.ok, true);
  assert.equal(first.added, true);
  assert.deepEqual(first.state.pump, { on: true, level: 1, targets: [0] });

  const second = aimPump(first.state, 1);
  assert.deepEqual(second, { ok: false, reason: 'pump_full', level: 1, capacity: 1 },
    'the refusal comes with the level and capacity the toast needs');
});

test('a level-2 pump waters two plots, and removing one keeps the other running', () => {
  const state = farm(4);
  state.pump = { on: false, level: 2, targets: [] };

  const one = aimPump(state, 0);
  const two = aimPump(one.state, 1);
  assert.deepEqual(two.state.pump, { on: true, level: 2, targets: [0, 1] });

  const third = aimPump(two.state, 2);
  assert.equal(third.ok, false);
  assert.equal(third.capacity, 2);

  const oneLeft = removePumpTarget(two.state, 0);
  assert.deepEqual(oneLeft.pump, { on: true, level: 2, targets: [1] });

  const noneLeft = removePumpTarget(oneLeft, 1);
  assert.deepEqual(noneLeft.pump, { on: false, level: 2, targets: [] },
    'removing the last target switches the machine off');
});

test('toggling adds when absent and removes when present', () => {
  const state = farm(4);
  const added = togglePumpTarget(state, 2);
  assert.equal(added.ok, true);
  assert.equal(added.added, true);
  assert.deepEqual(added.state.pump.targets, [2]);

  const removed = togglePumpTarget(added.state, 2);
  assert.equal(removed.ok, true);
  assert.equal(removed.added, false);
  assert.deepEqual(removed.state.pump.targets, []);
});

test('the pump refuses unowned land and a dead crop', () => {
  const state = farm(1);
  assert.equal(aimPump(state, 2).reason, 'bad_plot', 'unowned');
  state.plots[0] = { ...state.plots[0], dead: true };
  assert.equal(aimPump(state, 0).reason, 'bad_plot', 'dead');
});

test('switching the pump back on resumes onto the same targets', () => {
  const state = farm(4);
  state.pump = { on: false, level: 3, targets: [1, 2] };
  const resumed = setPump(state, true);
  assert.deepEqual(resumed.pump, { on: true, level: 3, targets: [1, 2] });
});

test('the old single-target shape is still readable', () => {
  const state = farm(4);
  state.pump = { on: true, target: 2 };
  assert.deepEqual(pumpTargetIds(state), [2]);
  assert.equal(pumpCapacity(state), 1);
});

/* --- the bill, for more than one plot -------------------------------------- */

test('every target is watered at the full rate, and every target is billed', () => {
  const state = farm(16);
  state.pump = { on: true, level: 2, targets: [0, 1] };
  const jobs = [
    { plot: plot(0), target: 50, dryRate: 0 },
    { plot: plot(1), target: 50, dryRate: 0 },
  ];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.runs.length, 2);
  assert.equal(result.watered, 100);
  // 50 units per plot at 5 water per gold is 10 gold each.
  assert.equal(result.spent, 20);
  assert.equal(result.autoOff, 'full', 'both plots reached their targets');
});

test('a target is capped at its level capacity even if more jobs are handed in', () => {
  const state = farm(16);
  state.pump = { on: true, level: 1, targets: [0, 1] };
  const jobs = [
    { plot: plot(0), target: 50, dryRate: 0 },
    { plot: plot(1), target: 50, dryRate: 0 },
  ];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.runs.length, 1, 'level 1 reaches only one plot');
  assert.equal(result.runs[0].plot.id, 0, 'in target order');
  assert.equal(result.watered, 50);
  assert.equal(result.spent, 10);
});

test('gold is spent in target order, and the later target gets nothing when it runs out', () => {
  const state = farm(16, 10);
  state.pump = { on: true, level: 2, targets: [0, 1] };
  const jobs = [
    { plot: plot(0), target: 50, dryRate: 0 },
    { plot: plot(1), target: 50, dryRate: 0 },
  ];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.autoOff, 'gold');
  assert.equal(result.spent, 10);
  assert.equal(result.runs[0].watered, 50, 'the first target is paid for');
  assert.equal(result.runs[1].watered, 0, 'the second has no gold behind it');
});

test('a target the purse cannot cover is not watered and not charged for', () => {
  const state = farm(16, 5);
  state.pump = { on: true, level: 1, targets: [0] };
  const jobs = [{ plot: plot(0), target: 50, dryRate: 0 }];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.autoOff, 'gold');
  assert.equal(result.spent, 0, 'no gold leaves the purse for water that did not land');
  assert.equal(result.watered, 0);
  assert.equal(result.runs[0].spent, 0);
});

test('one full target does not stop the pump while another still needs water', () => {
  const state = farm(16);
  state.pump = { on: true, level: 2, targets: [0, 1] };
  const jobs = [
    { plot: plot(0, 85), target: 85, dryRate: 0 },
    { plot: plot(1, 0), target: 85, dryRate: 0 },
  ];

  const result = pumpRuns(state, 0.5, jobs);
  assert.equal(result.runs[0].autoOff, 'full');
  assert.equal(result.runs[1].autoOff, null);
  assert.equal(result.autoOff, null, 'the machine as a whole keeps running');
});

test('the whole machine stops when every target is full', () => {
  const state = farm(16);
  state.pump = { on: true, level: 2, targets: [0, 1] };
  const jobs = [
    { plot: plot(0, 85), target: 85, dryRate: 0 },
    { plot: plot(1, 100), target: 85, dryRate: 0 },
  ];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.autoOff, 'full');
  assert.equal(result.spent, 0);
  assert.equal(result.watered, 0);
});

test('easy mode delivers the same water and bills nothing', () => {
  const state = farm(16, 0);
  state.difficulty = DIFFICULTY.easy;
  state.pump = { on: true, level: 2, targets: [0, 1] };
  const jobs = [
    { plot: plot(0), target: 50, dryRate: 0 },
    { plot: plot(1), target: 50, dryRate: 0 },
  ];

  const result = pumpRuns(state, 1, jobs);
  assert.equal(result.watered, 100);
  assert.equal(result.spent, 0);
  assert.equal(result.autoOff, 'full');
});

/* --- the tick and the machine together ------------------------------------- */

test('the tick waters every target, not just the first', () => {
  const now = Date.now();
  const state = farm(4);
  state.plots[0] = {
    ...state.plots[0], cropId: 'rice', plantedAt: now - HOUR, waterLevel: 0, health: 100,
  };
  state.plots[1] = {
    ...state.plots[1], cropId: 'rice', plantedAt: now - HOUR, waterLevel: 0, health: 100,
  };
  state.pump = { on: true, level: 2, targets: [0, 1] };
  state.lastTickAt = now - HOUR / 2;

  const result = tick(state, now);
  assert.ok(result.state.plots[0].waterLevel > 0, 'the first target is watered');
  assert.ok(result.state.plots[1].waterLevel > 0, 'so is the second');
  assert.ok(result.state.gold < state.gold, 'and the bill covers both');
  assert.equal(result.autoOff, null);
});

test('the tick switches the pump off once every target has reached its target', () => {
  const now = Date.now();
  const state = farm(4);
  state.plots[0] = {
    ...state.plots[0], cropId: 'rice', plantedAt: now - HOUR, waterLevel: 85, health: 100,
  };
  state.plots[1] = {
    ...state.plots[1], cropId: 'rice', plantedAt: now - HOUR, waterLevel: 85, health: 100,
  };
  state.pump = { on: true, level: 2, targets: [0, 1] };
  state.lastTickAt = now - HOUR;

  const result = tick(state, now);
  assert.equal(result.autoOff, 'full');
  assert.equal(result.state.pump.on, false, 'the toggle stops reading on while billing nothing');
});

/* --- buying the next level ------------------------------------------------- */

test('the next upgrade names its land gate, capacity and price', () => {
  const state = farm(1);
  const next = nextPumpUpgrade(state);
  assert.equal(next.level, 2);
  assert.equal(next.capacity, 2);
  assert.equal(next.requiredPlots, 4);
  assert.equal(next.price, 1_000);
  assert.equal(next.owned, 1);
  assert.equal(canUpgradePump(state), false);
});

test('the land gate is refused before the purse, because the player can act on it', () => {
  const state = farm(1, 0);
  const result = upgradePump(state);
  assert.equal(result.ok, false);
  assert.match(result.reason, /owned plots/);
  assert.doesNotMatch(result.reason, /costs/);
});

test('the price is refused when the land is there but the gold is not', () => {
  const state = farm(4, 999);
  assert.equal(canUpgradePump(state), false);
  const result = upgradePump(state);
  assert.equal(result.ok, false);
  assert.match(result.reason, /1,000/);
});

test('buying level 2 spends exactly the price and keeps the targets', () => {
  const state = farm(4, 1_000);
  state.pump = { on: true, level: 1, targets: [2] };

  const result = upgradePump(state);
  assert.equal(result.ok, true);
  assert.equal(result.level, 2);
  assert.equal(result.state.gold, 0);
  assert.deepEqual(result.state.pump, { on: true, level: 2, targets: [2] });
});

test('the five levels are bought in order, and the last one cannot be bought again', () => {
  const state = farm(16, 200_000);
  let current = state;
  let spent = 0;

  for (const expected of [2, 3, 4, 5]) {
    const result = upgradePump(current);
    assert.equal(result.ok, true, `level ${expected} should be buyable`);
    assert.equal(result.level, expected);
    spent += PUMP.levels.find((entry) => entry.level === expected).price;
    current = result.state;
  }

  assert.equal(current.pump.level, 5);
  assert.equal(current.gold, 200_000 - spent);
  assert.equal(nextPumpUpgrade(current), null);
  assert.equal(canUpgradePump(current), false);
  assert.match(upgradePump(current).reason, /already fully upgraded/);
});

test('each level has the capacity and gate the shop advertises', () => {
  assert.deepEqual(
    PUMP.levels.map((entry) => [entry.level, entry.capacity, entry.requiredPlots, entry.price]),
    [
      [1, 1, 0, 0],
      [2, 2, 4, 1_000],
      [3, 4, 8, 5_000],
      [4, 8, 12, 25_000],
      [5, 16, 16, 100_000],
    ],
  );
});
