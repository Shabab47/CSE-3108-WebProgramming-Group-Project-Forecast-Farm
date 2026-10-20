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
import { avatarArt } from '../js/ui/avatarArt.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'a@b.bd', farmerName: 'Test' };

test('the preset list has distinct ids, and an id is checked exactly', () => {
  assert.deepEqual(
    AVATARS.map((avatar) => avatar.id),
    ['farmer1', 'farmer2', 'farmer3', 'farmer4'],
  );
  assert.equal(new Set(AVATARS.map((avatar) => avatar.id)).size, 4, 'no duplicate id');
  assert.equal(isAvatarId('farmer1'), true);
  assert.equal(isAvatarId('farmer2'), true);
  assert.equal(isAvatarId('farmer3'), true);
  assert.equal(isAvatarId('farmer4'), true);
  assert.equal(isAvatarId('farmer5'), false);
  assert.equal(isAvatarId(''), false);
  assert.equal(isAvatarId(null), false, 'null is the default, not a preset');
});

test('every listed preset has inline art with no duplicated element ids', () => {
  const ids = new Set();

  for (const { id } of AVATARS) {
    const art = avatarArt(id);
    assert.ok(art, `${id} has no SVG`);
    assert.match(art.trimStart(), /^<svg[\s>]/, `${id} is not an inline SVG`);

    for (const match of art.matchAll(/\bid="([^"]+)"/g)) {
      assert.equal(ids.has(match[1]), false, `duplicate SVG id "${match[1]}"`);
      ids.add(match[1]);
    }
  }
});

test('the third preset no longer carries its stray black bars or clip wrapper', () => {
  const art = avatarArt('farmer3');

  assert.doesNotMatch(art, /<rect\b[^>]*fill="black"/i, 'the six bars are gone');
  assert.equal(art.includes('clip0_3_11'), false, 'the redundant clipPath is gone');
});

test('repeating a preset gives each copy unique SVG ids', () => {
  const ids = (art) => [...art.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

  for (const { id } of AVATARS) {
    const copies = [avatarArt(id), avatarArt(id)];
    const [firstIds, secondIds] = copies.map(ids);
    if (!firstIds.length && !secondIds.length) continue;

    assert.equal(
      firstIds.some((name) => secondIds.includes(name)),
      false,
      `${id} repeated an id across two renders`,
    );
    for (const [art, names] of [[copies[0], firstIds], [copies[1], secondIds]]) {
      for (const name of names) {
        assert.ok(art.includes(`url(#${name})`), `${id} lost the reference to ${name}`);
      }
    }
  }
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
  for (const id of ['farmer1', 'farmer2', 'farmer3', 'farmer4']) {
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
