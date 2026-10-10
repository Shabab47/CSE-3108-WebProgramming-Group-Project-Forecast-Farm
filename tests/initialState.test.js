/**
 * Tests for the fresh-farm builder. `node --test tests/`
 *
 * The field geometry assertions here are the ones worth catching early: a
 * mistake in `zoneOf` would paint the wrong zone on every plot forever.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildInitialState, buildPlots, normaliseSession, zoneOf } from '../js/state/initialState.js';
import { FIELD, PLOT_PRICES } from '../js/config/field.js';
import { START_GOLD } from '../js/config/game.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'abdul@rice.bd', farmerName: 'Abdul Karim' };

test('a fresh farm has sixteen unowned plots', () => {
  const plots = buildPlots();
  assert.equal(plots.length, FIELD.size * FIELD.size);
  assert.equal(plots.length, 16);
  assert.ok(plots.every((plot) => plot.owned === false && plot.cropId === null));
});

test('plot ids are row-major and unique', () => {
  const plots = buildPlots();
  assert.deepEqual(
    plots.map((plot) => plot.id),
    [...Array(16).keys()],
  );
  assert.equal(plots[0].col, 0);
  assert.equal(plots[0].row, 0);
});

test('each zone is a 2x2 corner and all four are covered', () => {
  const plots = buildPlots();
  const counts = plots.reduce((acc, plot) => ({ ...acc, [plot.zone]: (acc[plot.zone] ?? 0) + 1 }), {});
  assert.deepEqual(counts, { A: 4, B: 4, C: 4, D: 4 });
});

test('zoneOf maps corners as documented', () => {
  assert.equal(zoneOf(0, 0), 'A'); // top
  assert.equal(zoneOf(3, 0), 'B'); // right
  assert.equal(zoneOf(0, 3), 'C'); // left
  assert.equal(zoneOf(3, 3), 'D'); // bottom
});

test('the first plot is free and every price after doubles', () => {
  assert.equal(PLOT_PRICES[0], 0, 'the first plot is free');
  assert.equal(PLOT_PRICES[1], 100);

  // Every plot after the free one costs exactly twice the last (DEC-009).
  for (let i = 2; i < PLOT_PRICES.length; i += 1) {
    assert.equal(PLOT_PRICES[i], PLOT_PRICES[i - 1] * 2);
  }
});

test('a new farm starts with the documented gold and nothing owned', () => {
  const state = buildInitialState(SESSION);

  assert.equal(state.version, 1);
  assert.equal(state.gold, START_GOLD);
  assert.equal(state.session.email, SESSION.email);
  assert.equal(state.session.status, 'authed');
  assert.equal(state.plots.filter((plot) => plot.owned).length, 0);
  assert.equal(state.inventory.seeds.rice, 0);
  assert.equal(state.pump.on, false);
  assert.equal(state.weather, null);
  assert.equal(state.clock.timeOffsetMs, 0);
});

test('a malformed session is coerced, never passed through', () => {
  // `session` is read by the boot gate. Anything unrecognisable becomes null
  // rather than something the gate would have to guess at.
  assert.equal(normaliseSession(null), null);
  assert.equal(normaliseSession('nonsense'), null);
  assert.equal(normaliseSession({ status: 'weird' }), null);

  const guest = normaliseSession({ status: 'guest', userId: 'guest' });
  assert.deepEqual(guest, { status: 'guest', userId: 'guest', email: '', farmerName: '', username: '' });
});

test('the default location is Dhaka with a timezone', () => {
  const state = buildInitialState(SESSION);
  assert.equal(state.location.name, 'Dhaka');
  assert.equal(state.location.tz, 'Asia/Dhaka');
  assert.ok(Number.isFinite(state.location.lat));
  assert.ok(Number.isFinite(state.location.lon));
});

test('each plot starts dry, healthy and alive', () => {
  for (const plot of buildPlots()) {
    assert.equal(plot.waterLevel, 0);
    assert.equal(plot.health, 100);
    assert.equal(plot.dead, false);
    assert.equal(plot.plantedAt, null);
  }
});