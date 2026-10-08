/**
 * Tests for the local auth provider.
 *
 * This is the stopgap provider, not the real one — `services/authApi.js` replaces
 * it. These tests exist so the panel's contract is pinned while that swap is
 * pending, and so the enumeration guarantee is enforced at the source rather
 * than only in the message layer.
 *
 * Hashing is real Web Crypto. A test that stubbed the hash would prove nothing.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as localAuth from '../js/services/localAuth.js';
import {
  currentSession,
  requestPasswordReset,
  signIn,
  signInAsGuest,
  signOut,
  signUp,
  updatePassword,
} from '../js/services/localAuth.js';
import { AUTH_KEYS } from '../js/config/auth.js';

const VALID = { email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Abdul Karim', username: 'farmer_joe' };

function installFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };

  return data;
}

beforeEach(() => {
  installFakeStorage();
  signOut();
});

test('signing up returns a session in the documented shape', async () => {
  const result = await signUp(VALID);

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.session).sort(), ['email', 'farmerName', 'status', 'userId', 'username']);
  assert.equal(result.session.status, 'authed');
  assert.equal(result.session.email, 'farmer@rice.bd');
  assert.equal(result.session.farmerName, 'Abdul Karim');
  assert.equal(result.session.username, 'farmer_joe');
  assert.ok(result.session.userId);
});

test('the session is restored on the next page load', async () => {
  const created = await signUp(VALID);

  assert.deepEqual(currentSession(), created.session);
});

test('the same email in different case is the same account', async () => {
  await signUp(VALID);
  await signOut();

  const again = await signUp({ ...VALID, email: '  FARMER@rice.bd ' });
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'email_taken');
});

test('the same username in different case is the same account', async () => {
  await signUp(VALID);
  await signOut();

  const again = await signUp({ ...VALID, email: 'other@rice.bd', username: '  FARMER_JOE  ' });
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'username_taken');
});

test('the password is never written to storage', async () => {
  await signUp(VALID);

  const stored = localStorage.getItem(AUTH_KEYS.accounts);
  assert.ok(!stored.includes(VALID.password));
  assert.ok(!stored.includes('rice2026'), 'not even as a substring of a hash or id');
});

test('signing in works with a differently cased and padded email', async () => {
  const created = await signUp(VALID);
  await signOut();

  const result = await signIn({ identifier: '  FARMER@Rice.BD ', password: VALID.password });

  assert.equal(result.ok, true);
  assert.equal(result.session.userId, created.session.userId);
});

test('signing in works with a username', async () => {
  const created = await signUp(VALID);
  await signOut();

  const result = await signIn({ identifier: 'farmer_joe', password: VALID.password });

  assert.equal(result.ok, true);
  assert.equal(result.session.userId, created.session.userId);
});

test('signing in works with a differently cased username', async () => {
  const created = await signUp(VALID);
  await signOut();

  const result = await signIn({ identifier: '  FARMER_JOE  ', password: VALID.password });

  assert.equal(result.ok, true);
  assert.equal(result.session.userId, created.session.userId);
});

test('an unknown email and a wrong password are indistinguishable', async () => {
  await signUp(VALID);
  await signOut();

  const wrongPassword = await signIn({ identifier: VALID.email, password: 'rice2027' });
  const noAccount = await signIn({ identifier: 'nobody@rice.bd', password: VALID.password });

  // If these ever diverge, this form becomes an account-enumeration oracle.
  assert.equal(wrongPassword.reason, noAccount.reason);
  assert.equal(wrongPassword.reason, 'invalid_credentials');
  assert.equal(currentSession(), null, 'a refused attempt starts no session');
});

test('an unknown username and a wrong password are indistinguishable', async () => {
  await signUp(VALID);
  await signOut();

  const wrongPassword = await signIn({ identifier: 'farmer_joe', password: 'rice2027' });
  const noAccount = await signIn({ identifier: 'unknown_user', password: VALID.password });

  assert.equal(wrongPassword.reason, noAccount.reason);
  assert.equal(wrongPassword.reason, 'invalid_credentials');
  assert.equal(currentSession(), null, 'a refused attempt starts no session');
});

test('sign-up is allowed to be specific about a taken email', async () => {
  await signUp(VALID);

  const again = await signUp({ ...VALID, farmerName: 'Someone Else', username: 'different_user' });
  assert.equal(again.reason, 'email_taken');
});

test('sign-up is allowed to be specific about a taken username', async () => {
  await signUp(VALID);

  const again = await signUp({ ...VALID, email: 'other@rice.bd', farmerName: 'Someone Else' });
  assert.equal(again.reason, 'username_taken');
});

test('signing out clears the session but keeps the account', async () => {
  await signUp(VALID);
  await signOut();

  assert.equal(currentSession(), null);
  assert.ok(localStorage.getItem(AUTH_KEYS.accounts), 'signing out is not deleting the account');
  assert.equal((await signIn({ identifier: VALID.email, password: VALID.password })).ok, true, 'and it still signs back in');
  assert.equal((await signIn({ identifier: 'farmer_joe', password: VALID.password })).ok, true, 'and it still signs back in with username');
});

test('guest play is not a session and leaves nothing to resume', async () => {
  const result = signInAsGuest();

  assert.equal(result.session.status, 'guest');
  assert.equal(currentSession(), null, 'a guest cannot be resumed by anyone else on this machine');
  assert.equal(localStorage.getItem(AUTH_KEYS.session), null);
});

test('a guest farm is still saved, under the guest key', async () => {
  const store = await import('../js/state/store.js');
  store.init(signInAsGuest().session);
  store.saveNow();

  const key = `${AUTH_KEYS.savePrefix}guest`;
  assert.ok(localStorage.getItem(key), 'a guest gets a local save');
  assert.ok(!localStorage.getItem(key).includes('"session":{"status":"authed"'));
});

test('the local provider refuses password reset instead of faking success', async () => {
  // `js/auth-main.js` hands these two to the panel without checking they exist,
  // so they have to be part of the contract. A fake success would tell a player
  // an email is on its way that never arrives.
  assert.deepEqual(await requestPasswordReset({ email: VALID.email }), {
    ok: false,
    reason: 'reset_unavailable',
  });
  assert.deepEqual(await updatePassword({ accessToken: 'x', password: 'rice2027' }), {
    ok: false,
    reason: 'reset_unavailable',
  });
});

test('every function the panel contract needs exists on this provider', async () => {
  // A missing export reaches the panel as `undefined` and only fails when a
  // player clicks, as a confusing "could not reach the server". Assert the whole
  // contract so that gap is caught here instead.
  for (const name of [
    'currentSession', 'signIn', 'signUp', 'signOut',
    'requestPasswordReset', 'updatePassword', 'signInAsGuest',
  ]) {
    assert.equal(typeof localAuth[name], 'function', `missing contract member: ${name}`);
  }
});

test('a corrupt session blob is treated as signed out', async () => {
  await signUp(VALID);
  localStorage.setItem(AUTH_KEYS.session, '{not json');

  assert.equal(currentSession(), null);
});

test('storage that throws does not crash the provider', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };

  assert.doesNotThrow(async () => { await signUp(VALID); });
  assert.equal((await signIn({ identifier: VALID.email, password: VALID.password })).reason, 'invalid_credentials', 'degrades to refused, never throws');
});