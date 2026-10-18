/**
 * Tests for the difficulty setting. `node --test tests/`
 *
 * Two rules, and the whole file exists to prove neither is quietly ignored:
 *
 *  1. **Easy protects a ripe crop** — it cannot dry, damage, lose health or die.
 *  2. **Easy protects nothing else** — a crop still growing is as vulnerable as it ever
 *     was, and the pump is free everywhere.
 *
 * Rule 2 is the one that will rot. An exemption written as "return the plot untouched"
 * rather than "skip when ripe" would pass every test below while making growing crops
 * invulnerable too, which is a different game from the one the setting describes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DIFFICULTY, DEFAULT_DIFFICULTY, isDifficulty } from '../js/config/game.js';
import { buildInitialState, ensureDifficulty } from '../js/state/initialState.js';
import { setDifficultyRule } from '../js/state/store.js';
import { tick, isProtected } from '../js/domain/water.js';
import { pumpRun } from '../js/domain/pump.js';
import { harvest } from '../js/domain/farm.js';
import { harvestValue } from '../js/config/crops.js';
import { cropOf } from '../js/config/crops.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'a@b.bd', farmerName: 'Test' };
const HOUR = 3_600_000;

/** A farm with one ripe rice crop, `level` water, in the given difficulty. */
function ripeFarm(difficulty, { level = 85, gold = 500, health = 100, damage = null } = {}) {
  const now = Date.now();
  const rice = cropOf('rice');
  return {
    version: 1,
    gold,
    difficulty,
    pump: { on: false, target: null },
    plots: [{
      id: 0,
      owned: true,
      dead: false,
      waterLevel: level,
      cropId: 'rice',
      health,
      damage,
      // Planted one hour longer than it needs, so `progress >= 1` at any `now`.
      plantedAt: now - (rice.growHours + 1) * HOUR,
    }],
    weather: null,
    lastTickAt: now,
  };
}

/** A farm with one crop planted this instant, so nowhere near ripe. */
function growingFarm(difficulty, { level = 0 } = {}) {
  const now = Date.now();
  return {
    version: 1,
    gold: 500,
    difficulty,
    pump: { on: false, target: null },
    plots: [{
      id: 0, owned: true, dead: false, waterLevel: level, cropId: 'corn',
      health: 100, damage: null, plantedAt: now,
    }],
    weather: null,
    lastTickAt: now,
  };
}

/** Run `hours` of one-hour ticks. */
function run(state, hours) {
  let s = state;
  let t = state.lastTickAt;
  for (let i = 0; i < hours; i++) {
    s = tick(s, t).state;
    t += HOUR;
  }
  return s;
}

test('easy mode protects a ripe crop from everything', () => {
  const after = run(ripeFarm(DIFFICULTY.easy), 48).plots[0];

  assert.equal(after.health, 100, 'health is untouched after two days');
  assert.equal(after.dead, false, 'and it did not die');
  assert.equal(after.damage, null, 'no damage latched');
});

test('normal mode still lets a ripe crop rot, which is what makes easy mean something', () => {
  const after = run(ripeFarm(DIFFICULTY.normal), 48).plots[0];

  assert.ok(after.health < 100, `health fell (${after.health})`);
  assert.equal(after.damage, 'dry', 'and damage latched as it always did');
  assert.equal(after.dead, true, 'so it dies — the thing easy mode prevents');
});

test('a ripe crop in easy mode is worth its full value however long it waits', () => {
  // The bug this whole feature answers: a ripe crop used to decay with no readout, so the
  // payout shrank silently. In easy mode it must not shrink at all.
  const easy = run(ripeFarm(DIFFICULTY.easy), 48);
  const result = harvest(easy, 0);

  assert.equal(result.ok, true, 'and it still harvests');
  assert.equal(
    result.state.gold - easy.gold,
    harvestValue('rice'),
    'paying the full price, not a decayed one',
  );
});

test('easy mode does NOT protect a crop that has not ripened yet', () => {
  // **The boundary, and the test most likely to regress.** Corn takes 8h; planted on dry
  // soil it loses health long before it ripens. If this ever passes with health 100, the
  // exemption has leaked from "ripe" into "planted".
  const after = run(growingFarm(DIFFICULTY.easy), 4).plots[0];

  assert.ok(
    after.health < 100,
    `a growing crop must still be harmed, health was ${after.health}`,
  );
  assert.equal(after.damage, 'dry', 'and it still takes damage while growing');
});

test('easy mode does not protect a growing crop in normal mode either — same rules', () => {
  const easy = run(growingFarm(DIFFICULTY.easy), 4).plots[0];
  const normal = run(growingFarm(DIFFICULTY.normal), 4).plots[0];

  assert.equal(
    easy.health,
    normal.health,
    'before ripening, the mode makes no difference at all',
  );
});

test('the pump is free in easy mode but still delivers water', () => {
  const plot = { id: 0, owned: true, dead: false, waterLevel: 10, cropId: 'rice' };

  const easy = pumpRun(
    { gold: 500, difficulty: DIFFICULTY.easy, pump: { on: true, target: 0 }, plots: [plot] },
    1, 85, 10.8,
  );
  const normal = pumpRun(
    { gold: 500, difficulty: DIFFICULTY.normal, pump: { on: true, target: 0 }, plots: [plot] },
    1, 85, 10.8,
  );

  assert.ok(easy.watered > 0, 'the plot is still watered');
  assert.equal(easy.spent, 0, 'and it costs nothing');

  assert.ok(normal.spent > 0, 'normal still bills');
  assert.equal(normal.watered, easy.watered, 'for exactly the same water');
});

test('isProtected is false for normal, for bare soil, and for a dead crop', () => {
  const now = Date.now();
  const ripe = { cropId: 'rice', dead: false, plantedAt: now - 10 * HOUR };

  assert.equal(isProtected({ difficulty: DIFFICULTY.easy }, ripe, now), true);
  assert.equal(isProtected({ difficulty: DIFFICULTY.normal }, ripe, now), false);
  assert.equal(isProtected({ difficulty: DIFFICULTY.easy }, { ...ripe, dead: true }, now), false,
    'a dead crop is past saving, not protected');
  assert.equal(isProtected({ difficulty: DIFFICULTY.easy }, { cropId: null }, now), false,
    'bare soil has no crop to protect');
});

test('normal is the default, so adding the setting changes nobody existing farm', () => {
  assert.equal(DEFAULT_DIFFICULTY, DIFFICULTY.normal);
  assert.equal(buildInitialState(SESSION).difficulty, DIFFICULTY.normal);
});

test('a save written before difficulty existed reads as normal, and is not discarded', () => {
  // The reason this does not bump STATE_VERSION: a version bump is how this codebase
  // throws every farm away, and one new key is not worth that.
  const old = { ...buildInitialState(SESSION) };
  delete old.difficulty;

  const repaired = ensureDifficulty(old);

  assert.equal(repaired.difficulty, DIFFICULTY.normal, 'the behaviour they always had');
  assert.notEqual(repaired, old, 'so the write-back has something to store');
  assert.equal(old.difficulty, undefined, 'and the original is not mutated');
});

test('a save with a nonsense difficulty is repaired rather than trusted', () => {
  // A hand-edited save, or an import from a future version. A farm whose difficulty is
  // "impossible" should not be one where the setting silently does nothing.
  const junk = ensureDifficulty({ ...buildInitialState(SESSION), difficulty: 'brutal' });

  assert.equal(junk.difficulty, DIFFICULTY.normal);
  assert.equal(ensureDifficulty({ difficulty: DIFFICULTY.easy }).difficulty, DIFFICULTY.easy,
    'and a real one is left alone');
});

test('setDifficulty writes the mode and refuses anything it does not know', () => {
  const state = buildInitialState(SESSION);

  const ok = setDifficultyRule(state, DIFFICULTY.easy);
  assert.equal(ok.ok, true);
  assert.equal(ok.state.difficulty, DIFFICULTY.easy);
  assert.equal(state.difficulty, DIFFICULTY.normal, 'and it does not mutate the original');

  const bad = setDifficultyRule(state, 'impossible');
  assert.equal(bad.ok, false);
  assert.equal(bad.state, undefined, 'a refusal writes nothing');

  assert.equal(isDifficulty(DIFFICULTY.easy), true);
  assert.equal(isDifficulty('brutal'), false);
});

test('switching to easy does not repair a crop that is already damaged', () => {
  // Deliberate. A setting that quietly handed back health would be a bonus rather than a
  // difficulty, and the player did not ask for one. This test exists so that if someone
  // decides otherwise later, they have to change it deliberately.
  const damaged = ripeFarm(DIFFICULTY.easy, { health: 40, damage: 'dry' });
  const after = run(damaged, 24).plots[0];

  assert.equal(after.health, 40, 'health is left where it was');
  assert.equal(after.damage, 'dry', 'and the damage stays latched');
});