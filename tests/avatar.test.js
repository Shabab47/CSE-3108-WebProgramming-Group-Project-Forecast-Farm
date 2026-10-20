/**
 * Tests for the preset avatar choice. `node --test tests/`
 *
 * The avatar is cosmetic, so the failure that matters is a corrupt value reaching the
 * UI: an id from an old build, a hand-edited save, or a string where null belongs. The
 * rules below keep every one of those on the gray default and keep the rest of the farm.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AVATARS, isAvatarId } from '../js/config/avatars.js';
import { START_GOLD } from '../js/config/game.js';
import { buildErasedState, buildInitialState, ensureProfile } from '../js/state/initialState.js';
import { setAvatarRule } from '../js/state/store.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'a@b.bd', farmerName: 'Test' };

test('the preset list is two distinct ids, and an id is checked exactly', () => {
  assert.deepEqual(
    AVATARS.map((avatar) => avatar.id),
    ['farmer1', 'farmer2'],
  );
  assert.equal(new Set(AVATARS.map((avatar) => avatar.id)).size, 2, 'no duplicate id');
  assert.equal(isAvatarId('farmer1'), true);
  assert.equal(isAvatarId('farmer2'), true);
  assert.equal(isAvatarId('farmer3'), false);
  assert.equal(isAvatarId(''), false);
  assert.equal(isAvatarId(null), false, 'null is the default, not a preset');
});

test('a fresh farm starts on the default avatar', () => {
  assert.deepEqual(buildInitialState(SESSION).profile, { avatar: null });
});

test('a save written before avatars existed is given the default, not discarded', () => {
  const old = { ...buildInitialState(SESSION) };
  delete old.profile;

  const repaired = ensureProfile(old);

  assert.deepEqual(repaired.profile, { avatar: null });
  assert.equal(repaired.gold, old.gold, 'the rest of the farm survived');
  assert.notEqual(repaired, old, 'a repaired save is a copy');
});

test('an unknown avatar id is treated as the default, and other profile fields survive', () => {
  const state = buildInitialState(SESSION);
  state.profile = { avatar: 'farmer-from-a-mod', nickname: 'Sprout' };

  const repaired = ensureProfile(state);

  assert.deepEqual(repaired.profile, { avatar: null, nickname: 'Sprout' });
  assert.equal(ensureProfile(repaired), repaired, 'a valid save is left alone');
});

test('a valid avatar is left exactly as it is, and junk profile shapes do not throw', () => {
  for (const id of ['farmer1', 'farmer2']) {
    const state = buildInitialState(SESSION);
    state.profile = { avatar: id };
    assert.equal(ensureProfile(state), state, `${id} is already valid`);
  }

  const noProfile = { gold: 10 };
  assert.deepEqual(ensureProfile(noProfile).profile, { avatar: null });
  assert.equal(ensureProfile(null), null);
  assert.equal(ensureProfile(undefined), undefined);
  assert.equal(ensureProfile('nonsense'), 'nonsense');

  const arrayProfile = { gold: 10, profile: [] };
  assert.deepEqual(ensureProfile(arrayProfile).profile, { avatar: null });
});

test('erasing progress resets the farm and keeps a valid avatar, but not junk', () => {
  const previous = buildInitialState(SESSION);
  previous.gold = 999;
  previous.profile = { avatar: 'farmer2' };

  const erased = buildErasedState(SESSION, previous);

  assert.equal(erased.gold, START_GOLD, 'progress was erased');
  assert.deepEqual(erased.profile, { avatar: 'farmer2' }, 'the profile choice survived');
  assert.equal(erased.plots.filter((plot) => plot.owned).length, 1, 'land was reset');
  assert.equal(previous.gold, 999, 'the previous farm was not mutated');

  const junk = buildErasedState(SESSION, { ...previous, profile: { avatar: 'farmer9' } });
  assert.deepEqual(junk.profile, { avatar: null }, 'an unknown id falls back to the default');
});

test('setAvatarRule sets, clears and refuses an id this build does not know', () => {
  const state = buildInitialState(SESSION);

  const set = setAvatarRule(state, 'farmer2');
  assert.equal(set.ok, true);
  assert.equal(set.state.profile.avatar, 'farmer2');
  assert.equal(state.profile.avatar, null, 'the input state was not mutated');

  const cleared = setAvatarRule(set.state, null);
  assert.equal(cleared.ok, true);
  assert.equal(cleared.state.profile.avatar, null);
  assert.notEqual(cleared.state, set.state, 'clearing a chosen avatar is a real change');

  const refused = setAvatarRule(state, 'farmer9');
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /not an avatar/);

  const same = setAvatarRule(state, null);
  assert.equal(same.ok, true);
  assert.equal(same.state, state, 'choosing the current default is a no-op');
});
