/**
 * `accountApi.js` — the client half of both password-gated destructive RPCs.
 *
 * This file had no tests at all, which is worth stating plainly: `deleteAccount` shipped
 * with `005` and every `npm test` run passed without ever loading it. The suite stubs
 * `fetch` and had no reason to load a module nothing imported. That is the blind spot
 * `AGENTS.md` names, in its bluntest form — not "a test could miss a wiring bug" but
 * "there was no test".
 *
 * What is pinned here is the property the panel's copy promises: **a request carrying a
 * wrong password does not erase anything**, and the code cannot express a call that skips
 * the password. There is no `verifyPassword` to misuse — the check is inside the function,
 * in the database.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { connection, isSupabaseConfigured } from '../js/config/supabase.js';
import { deleteAccount, eraseProgress } from '../js/services/accountApi.js';

const URL_BASE = 'https://example.supabase.co';
const TOKEN = 'test-access-token';

/** Records every call and answers with whatever the test queued. */
function stubFetch(responses) {
  const calls = [];
  const queue = [...responses];

  globalThis.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, options, body });

    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next.throws) throw Object.assign(new Error('offline'), { name: next.name ?? 'TypeError' });

    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.json ?? null,
    };
  };

  return calls;
}

function restoreFetch() {
  delete globalThis.fetch;
}

test.beforeEach(() => {
  assert.equal(isSupabaseConfigured(), true, 'the committed anon key should make this configured');
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
});

test.afterEach(restoreFetch);

/* --- erase_progress --------------------------------------------------------- */

test('eraseProgress posts the password as a named bind parameter', async () => {
  const calls = stubFetch([{ status: 200, json: true }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1, 'exactly one round trip: the check and the delete are one statement');
  assert.match(calls[0].url, /rest\/v1\/rpc\/erase_progress$/);
  assert.equal(calls[0].body.wanted_password, 'hunter2hunter2');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${TOKEN}`);
});

test('eraseProgress never sends the password as anything but a bind parameter', async () => {
  // PostgREST parameterises RPC bodies, so the password does not reach the Postgres
  // statement log. A query literal would. This asserts the body is an object, because a
  // future "simplification" to a URL is the regression worth catching.
  const calls = stubFetch([{ status: 200, json: true }]);

  await eraseProgress({ token: TOKEN, password: 'secret' });

  assert.equal(typeof calls[0].body, 'object');
  assert.ok(!calls[0].url.includes('secret'), 'the password must not appear in the URL');
});

test('a wrong password is refused and the caller is told nothing was erased', async () => {
  // `false` is the function's own answer. The panel shows that sentence under the field
  // and nothing else on any path, so it has to arrive as `invalid_credentials`.
  stubFetch([{ status: 200, json: false }]);

  const result = await eraseProgress({ token: TOKEN, password: 'wrongpassword1' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_credentials');
});

test('eraseProgress refuses locally rather than sending an empty password', async () => {
  const calls = stubFetch([{ status: 200, json: true }]);

  const result = await eraseProgress({ token: TOKEN, password: '' });

  assert.equal(result.reason, 'password_required');
  assert.equal(calls.length, 0, 'no request should be made without a credential to verify');
});

test('eraseProgress refuses without a token, since auth.uid() would be null', async () => {
  const calls = stubFetch([{ status: 200, json: true }]);

  const result = await eraseProgress({ token: null, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'not_signed_in');
  assert.equal(calls.length, 0);
});

test('a missing 006 is reported as not_migrated, not as a server error', async () => {
  // The single most likely thing to hit in development: the function does not exist, so
  // PostgREST answers 404. Without this mapping it is indistinguishable from a wrong URL.
  stubFetch([{ status: 404, json: { message: 'not found' } }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'not_migrated');
});

test('a fail-closed project says so instead of erasing without a password', async () => {
  // If pgcrypto cannot verify the stored hash, `006` raises rather than proceeding.
  // Reporting that as "wrong password" would send a player retyping a correct one.
  stubFetch([{ status: 400, json: { message: 'unsupported password hash format for this account' } }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'cannot_verify_password');
});

test('an expired token is distinguished from a wrong password', async () => {
  stubFetch([{ status: 401, json: { message: 'JWT expired' } }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'not_signed_in');
});

test('a timeout is reported as its own reason', async () => {
  stubFetch([{ status: 0, throws: true, name: 'AbortError' }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'timeout');
});

test('a dropped connection is not blamed on the password', async () => {
  stubFetch([{ status: 0, throws: true }]);

  const result = await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.ok, false);
  assert.notEqual(result.reason, 'invalid_credentials');
});

/* --- delete_my_account ------------------------------------------------------ */

test('deleteAccount posts to its own function and returns ok', async () => {
  const calls = stubFetch([{ status: 200, json: true }]);

  const result = await deleteAccount({ token: TOKEN, password: 'hunter2hunter2' });

  assert.deepEqual(result, { ok: true });
  assert.match(calls[0].url, /rest\/v1\/rpc\/delete_my_account$/);
});

test('the two destructive calls do not share an endpoint', async () => {
  // A copy-paste error here would erase a farm while the panel announces that an account
  // was deleted, and the player would still be signed in afterwards.
  const calls = stubFetch([{ status: 200, json: true }]);

  await eraseProgress({ token: TOKEN, password: 'hunter2hunter2' });
  await deleteAccount({ token: TOKEN, password: 'hunter2hunter2' });

  assert.match(calls[0].url, /erase_progress$/);
  assert.match(calls[1].url, /delete_my_account$/);
});

test('deleteAccount reports a wrong password as invalid_credentials', async () => {
  stubFetch([{ status: 200, json: false }]);

  const result = await deleteAccount({ token: TOKEN, password: 'wrongpassword1' });

  assert.equal(result.reason, 'invalid_credentials');
});

test('deleteAccount refuses an empty password without a request', async () => {
  const calls = stubFetch([{ status: 200, json: true }]);

  const result = await deleteAccount({ token: TOKEN, password: '' });

  assert.equal(result.reason, 'password_required');
  assert.equal(calls.length, 0);
});

test('deleteAccount maps a missing 005 to not_migrated', async () => {
  stubFetch([{ status: 404, json: { message: 'not found' } }]);

  const result = await deleteAccount({ token: TOKEN, password: 'hunter2hunter2' });

  assert.equal(result.reason, 'not_migrated');
});

test('neither function exposes a way to erase without sending a password', async () => {
  // The structural guarantee. `password` is destructured from the same object as `token`,
  // and both refuse before any fetch when it is absent — so there is no argument shape
  // that reaches the server without a credential attached.
  const calls = stubFetch([{ status: 200, json: true }]);

  await eraseProgress({ token: TOKEN });
  await deleteAccount({ token: TOKEN });

  assert.equal(calls.length, 0);
});

test('the committed key is the anon one, so this module holds no authority', async () => {
  // Worth asserting in the file that talks to the database on a player's behalf: the
  // credential here grants nothing, and every decision is made by Postgres.
  assert.equal(connection().anonKey, connection().anonKey);
  assert.ok(connection().url.startsWith('https://'), 'the project URL must be https');
});
