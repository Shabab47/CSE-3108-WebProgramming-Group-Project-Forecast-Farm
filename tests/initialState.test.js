/**
 * Tests for the fresh-farm builder. `node --test tests/`
 *
 * The field geometry assertions here are the ones worth catching early: a
 * mistake in `zoneOf` would paint the wrong zone on every plot forever.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInitialState,
  buildPlots,
  ensurePlausibleDamage,
  ensurePump,
  ensureStarterPlot,
  normaliseSession,
  zoneOf,
} from '../js/state/initialState.js';
import { FIELD, PLOT_PRICES, STARTER_PLOT_ID } from '../js/config/field.js';
import { START_GOLD } from '../js/config/game.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'abdul@rice.bd', farmerName: 'Abdul Karim' };
const HOUR = 3_600_000;

test('a fresh farm has sixteen plots, and the back corner is already the player\'s', () => {
  const plots = buildPlots();
  assert.equal(plots.length, FIELD.size * FIELD.size);
  assert.equal(plots.length, 16);

  // The starter plot. Every farm opens owning one plot, so a new player can plant
  // within a minute of starting instead of staring at sixteen padlocks.
  const owned = plots.filter((plot) => plot.owned);
  assert.equal(owned.length, 1, 'exactly one plot is owned');
  assert.equal(owned[0].id, STARTER_PLOT_ID, 'and it is the starter');

  assert.ok(plots.every((plot) => plot.cropId === null), 'none of them has a crop yet');
});

test('the starter plot is the back corner, which nothing paints over', () => {
  const starter = buildPlots().find((plot) => plot.owned);

  // `utils/iso.js` paints in `z = col + row` order, so the furthest diamond from the
  // camera is (0,0) — the topmost one, with every other plot painting over it if it
  // were anywhere else. Being the free plot means it is read constantly, so it has to
  // be the one that is never occluded.
  assert.equal(starter.col, 0);
  assert.equal(starter.row, 0);
  assert.equal(starter.col + starter.row, 0, 'lowest z on the whole field');
  assert.equal(starter.zone, 'A');
  assert.equal(starter.isStarter, true);
  assert.ok(
    buildPlots().filter((p) => !p.owned).every((p) => p.isStarter === false),
    'no other plot claims to be the starter',
  );
});

test('every plot the player does not start with begins locked', () => {
  const plots = buildPlots();

  for (const plot of plots) {
    assert.equal(plot.owned, plot.id === STARTER_PLOT_ID, `plot ${plot.id}`);
  }
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

test('a new farm starts with the documented gold and one plot', () => {
  const state = buildInitialState(SESSION);

  assert.equal(state.version, 1);
  assert.equal(state.gold, START_GOLD);
  assert.equal(state.session.email, SESSION.email);
  assert.equal(state.session.status, 'authed');
  assert.equal(state.plots.filter((plot) => plot.owned).length, 1, 'the free plot');
  assert.equal(state.inventory.seeds.rice, 0);
  assert.deepEqual(state.pump, { on: false, level: 1, targets: [] },
    'a new farm owns the free level-1 pump, aimed at nothing');
  assert.equal(state.weather, null);
  assert.equal(state.clock.timeOffsetMs, 0);
});

test('an older single-target pump becomes level 1 aimed at the same plot', () => {
  const legacy = buildInitialState(SESSION);
  legacy.pump = { on: true, target: STARTER_PLOT_ID };

  const repaired = ensurePump(legacy);
  assert.equal(repaired.pump.on, true, 'a running pump stays running');
  assert.equal(repaired.pump.level, 1, 'and reads as the free machine');
  assert.deepEqual(repaired.pump.targets, [STARTER_PLOT_ID], 'aimed where it was');
  assert.equal('target' in repaired.pump, false, 'the old key is gone');
});

test('the pump repair drops duplicates, unowned plots, dead crops and excess targets', () => {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot) => ({ ...plot, owned: true }));
  state.plots[3] = { ...state.plots[3], dead: true };
  state.pump = {
    on: true,
    level: 3,
    targets: [0, 0, 3, 99, 1, 2, 4],
  };

  const repaired = ensurePump(state);
  assert.equal(repaired.pump.level, 3);
  assert.deepEqual(repaired.pump.targets, [0, 1, 2, 4],
    'level 3 waters four plots; dead, unknown and duplicate ids are removed');
});

test('a pump repair leaves an already-canonical pump as the same object', () => {
  const state = buildInitialState(SESSION);
  assert.equal(ensurePump(state), state);
});

test('a nonsense pump level falls back to the free one', () => {
  const state = buildInitialState(SESSION);
  state.pump = { on: false, level: 'five', targets: [] };
  assert.equal(ensurePump(state).pump.level, 1);
});

test('an older save with no land is given the starter plot', () => {
  // Farms saved before the starter plot existed have all sixteen plots unowned, which
  // leaves a returning player with nothing to plant on. They are repaired rather than
  // discarded — bumping STATE_VERSION would throw away every farm in the world.
  const legacy = buildInitialState(SESSION);
  legacy.plots = legacy.plots.map((plot) => ({ ...plot, owned: false }));

  const repaired = ensureStarterPlot(legacy);

  assert.equal(repaired.plots.filter((plot) => plot.owned).length, 1);
  assert.equal(
    repaired.plots.find((plot) => plot.owned).id,
    STARTER_PLOT_ID,
    'and it is the back corner',
  );
});

test('a save that already owns land is left exactly as it is', () => {
  // The dangerous case: a repair that fires on a farm which legitimately owns
  // nothing, or worse, one that hands out land on a hand-edited save.
  const owned = buildInitialState(SESSION);
  owned.plots = owned.plots.map((plot, index) => ({ ...plot, owned: index < 5 }));

  assert.equal(ensureStarterPlot(owned), owned, 'same object back — nothing was touched');

  const oneOwned = buildInitialState(SESSION);
  oneOwned.plots = oneOwned.plots.map((plot, index) => ({ ...plot, owned: index === 9 }));

  assert.equal(
    ensureStarterPlot(oneOwned).plots.filter((plot) => plot.owned).length,
    1,
    'and still owns only the one plot it had',
  );
});

test('the repair survives being handed junk', () => {
  // It runs on every single load, on state that came out of localStorage and off a
  // server, so it must not be the thing that throws on a corrupt save. `store.init`
  // calls it unconditionally.
  assert.equal(ensureStarterPlot(null), null);
  assert.equal(ensureStarterPlot(undefined), undefined);
  assert.equal(ensureStarterPlot('nonsense'), 'nonsense');
  assert.equal(ensureStarterPlot(42), 42);

  const noPlots = { gold: 10 };
  assert.equal(ensureStarterPlot(noPlots), noPlots, 'no plots array, so nothing to repair');

  // A wrong-length array is a hand-edited or half-written save. Repairing it would
  // mean inventing a plot that does not exist, so it is passed through untouched.
  const short = buildInitialState(SESSION);
  short.plots = short.plots.slice(0, 9).map((plot) => ({ ...plot, owned: false }));
  assert.equal(ensureStarterPlot(short), short, 'fifteen plots is not a field to repair');
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

/* --- damage repair --------------------------------------------------------- */

test('a pre-fix damage latch is cleared once, because it has no timestamp', () => {
  // ISS-114. Before `damageAt`, a save could not tell a latch earned by this crop from
  // one inherited from the previous crop, so every timestamp-less latch is cleared
  // once — DEC-054.
  const state = buildInitialState(SESSION);
  state.plots[0] = {
    ...state.plots[0],
    cropId: 'rice',
    plantedAt: Date.now() - 6 * HOUR,
    damage: 'dry',
  };

  const repaired = ensurePlausibleDamage(state);

  assert.notEqual(repaired, state);
  assert.equal(repaired.plots[0].damage, null, 'the stale sprite is gone');
  assert.equal(repaired.plots[0].damageAt, null);
  assert.equal(ensurePlausibleDamage(repaired), repaired, 'and the repair is idempotent');
});

test('a timestamped latch is kept only when the crop lived its hold', () => {
  const plantedAt = Date.now() - 3 * HOUR;
  const state = buildInitialState(SESSION);
  state.plots[0] = {
    ...state.plots[0],
    cropId: 'rice',
    plantedAt,
    damage: 'dry',
    damageAt: plantedAt + HOUR,
  };

  assert.equal(ensurePlausibleDamage(state), state, 'a real dry latch survives');

  const tooSoon = {
    ...state,
    plots: [
      { ...state.plots[0], damage: 'waterlogged', damageAt: plantedAt + HOUR },
      ...state.plots.slice(1),
    ],
  };
  const repaired = ensurePlausibleDamage(tooSoon);

  assert.notEqual(repaired, tooSoon);
  assert.equal(repaired.plots[0].damage, null, 'waterlogging needs two hours of crop');
  assert.equal(repaired.plots[0].damageAt, null);
});

test('damage on bare soil is cleared, whatever the timestamp says', () => {
  const state = buildInitialState(SESSION);
  state.plots[0] = {
    ...state.plots[0],
    cropId: null,
    plantedAt: null,
    damage: 'dry',
    damageAt: Date.now(),
  };

  const repaired = ensurePlausibleDamage(state);

  assert.equal(repaired.plots[0].damage, null, 'there is no crop to damage');
  assert.equal(repaired.plots[0].damageAt, null);
});

test('a healthy farm is left exactly as it is', () => {
  const state = buildInitialState(SESSION);
  assert.equal(ensurePlausibleDamage(state), state);
});

test('the damage repair tolerates junk without throwing', () => {
  assert.equal(ensurePlausibleDamage(null), null);
  assert.equal(ensurePlausibleDamage('not a farm'), 'not a farm');
  const empty = {};
  assert.equal(ensurePlausibleDamage(empty), empty);
});