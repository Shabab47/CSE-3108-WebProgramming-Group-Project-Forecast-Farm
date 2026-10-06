/**
 * Tests for the server-side save client.
 *
 * `fetch` is stubbed, so these pass with or without the table existing. That is
 * deliberate: the migration has to be run by hand in the Supabase dashboard, and a
 * test suite that failed until someone did that would be a bad thing to hand a
 * team mid-sprint.
 *
 * What is verified here is the *request shape* — the auth headers, the upsert,
 * the "no farm yet" case — because those are what go wrong silently. A wrong
 * header or a missing `Prefer` fails as "nothing saved" with no error anywhere.
 * What is **not** verified is that the table exists or that the RLS policy
 * behaves; that needs the real project.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  countRemoteSaves,
  deleteRemoteSave,
  readRemoteSave,
  writeRemoteSave,
} from '../js/services/saveApi.js';
import { __setForTest, connection } from '../js/config/supabase.js';

const TOKEN = 'player-access-token';
const USER = '11111111-2222-3333-4444-555555555555';

let calls = [];

function stub(handler) {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    return handler(url, init) ?? { ok: true, status: 200, data: null };
  };
}

/** A minimal Response stand-in. */
const json = (status, data, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});

beforeEach(() => {
  calls = [];
  __setForTest({ url: 'https://test.supabase.co', key: 'anon-test-key' });
});

/* --- the request shape ------------------------------------------------------ */

test('a read carries the anon key and the player access token', async () => {
  stub(() => json(200, [{ state: { gold: 10 } }]));

  await readRemoteSave(TOKEN);

  // Both are needed: the anon key to reach PostgREST at all, the access token so
  // auth.uid() resolves and the RLS policy can match a row.
  assert.equal(calls[0].init.headers.apikey, 'anon-test-key');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.match(calls[0].url, /\/rest\/v1\/farm_saves\?select=state/);
});

test('a write upserts, so the first save and the hundredth use one call', async () => {
  stub(() => ({ ok: true, status: 204, json: async () => null }));

  const result = await writeRemoteSave(TOKEN, USER, { gold: 5 });

  assert.equal(result.ok, true);
  assert.match(calls[0].url, /on_conflict=user_id/, 'without this the second save hits the primary key');
  assert.match(calls[0].init.headers.Prefer, /resolution=merge-duplicates/);
  assert.equal(calls[0].body.user_id, USER);
  assert.deepEqual(calls[0].body.state, { gold: 5 });
  assert.ok(calls[0].body.updated_at, 'stamped, so a stale row is identifiable');
});

test('no service_role key appears anywhere in the request', async () => {
  stub(() => ({ ok: true, status: 204, json: async () => null }));

  await writeRemoteSave(TOKEN, USER, { gold: 5 });

  const headers = calls[0].init.headers;
  const serialised = JSON.stringify(headers) + JSON.stringify(calls[0].body);
  assert.doesNotMatch(serialised, /service_role/i);
  assert.equal(headers.apikey, connection().anonKey, 'the anon key, never anything else');
});

test('the state is sent as JSON, not as a string', async () => {
  stub(() => ({ ok: true, status: 204, json: async () => null }));

  await writeRemoteSave(TOKEN, USER, { gold: 5 });

  // The column is jsonb, so a quoted string would not fit it.
  assert.equal(typeof calls[0].body.state, 'object');
});

/* --- reading ---------------------------------------------------------------- */

test('a farm comes back as an object', async () => {
  stub(() => json(200, [{ state: { gold: 42, plots: [] } }]));

  const result = await readRemoteSave(TOKEN);

  assert.equal(result.ok, true);
  assert.equal(result.state.gold, 42);
});

test('no farm yet is null, not an error', async () => {
  // PostgREST answers 406 for maybeSingle on zero rows. That is "new player",
  // which is the most common case in the first week, and must not look like a
  // failure or the caller would show an error to a player who simply has no farm.
  stub(() => json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows' }));

  const result = await readRemoteSave(TOKEN);

  assert.equal(result.ok, true);
  assert.equal(result.state, null);
});

test('an empty array is also no farm', async () => {
  stub(() => json(200, []));

  assert.equal((await readRemoteSave(TOKEN)).state, null);
});

/* --- refusals --------------------------------------------------------------- */

test('a guest gets no_session and never touches the network', async () => {
  // A guest has no token, so auth.uid() is null and the RLS policy matches no row.
  // Trying anyway would be a guaranteed 401, and a guest farm is local-only.
  const result = await writeRemoteSave(null, 'guest', { gold: 1 });

  assert.equal(result.reason, 'no_session');
  assert.equal(calls.length, 0, 'no pointless request');
});

test('a missing table is NOT mistaken for an empty farm', async () => {
  // The distinction is the whole safety of this feature. 406 means "this player
  // has no farm yet" and the caller starts one. 404 means the migration has not
  // been run, and treating it as 406 would make the caller start a new farm and
  // then write over whatever the player actually had.
  stub(() => json(404, { message: "Could not find the table 'public.farm_saves'" }));

  const result = await readRemoteSave(TOKEN);

  assert.equal(result.ok, false, 'must stay a failure so the caller falls back');
  assert.equal(result.state, undefined, 'and must never look like a confirmed empty farm');
});

test('a network failure is a failure, not a null farm', async () => {
  // The distinction matters: null means "start a new farm" and would silently
  // overwrite whatever the player had.
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };

  const result = await readRemoteSave(TOKEN);

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'network_request_failed');
});

test('a timeout is reported as a timeout', async () => {
  const error = new Error('aborted');
  error.name = 'AbortError';
  globalThis.fetch = async () => { throw error; };

  assert.equal((await readRemoteSave(TOKEN)).reason, 'timeout');
});

test('an unconfigured project refuses before any request', async () => {
  __setForTest({ url: '', key: '' });

  assert.equal((await readRemoteSave(TOKEN)).reason, 'auth_not_configured');
  assert.equal(calls.length, 0);
});

test('writing nothing is refused rather than sending a null row', async () => {
  assert.equal((await writeRemoteSave(TOKEN, USER, null)).reason, 'nothing_to_save');
  assert.equal((await writeRemoteSave(TOKEN, '', { gold: 1 })).reason, 'nothing_to_save');
  assert.equal(calls.length, 0);
});

/* --- delete and count ------------------------------------------------------- */

test('delete targets one row and names the user', async () => {
  stub(() => ({ ok: true, status: 204, json: async () => null }));

  const result = await deleteRemoteSave(TOKEN, USER);

  assert.equal(result.ok, true);
  assert.equal(calls[0].init.method, 'DELETE');
  assert.match(calls[0].url, /user_id=eq\./);
  assert.match(calls[0].url, /11111111-2222-3333-4444-555555555555/);
});

test('a user id is url-encoded into the filter', async () => {
  // It comes from the token, so it is not attacker-controlled — but encoding it
  // anyway means a malformed id cannot inject query parameters.
  stub(() => ({ ok: true, status: 204, json: async () => null }));

  await deleteRemoteSave(TOKEN, "abc'&select=*");

  assert.ok(!calls[0].url.includes('select=*&'), 'no second parameter appeared: ' + calls[0].url);
});

test('the count reads no rows, only the total', async () => {
  stub(() => json(200, [], { 'content-range': '0-0/1' }));

  const result = await countRemoteSaves(TOKEN);

  assert.equal(result.count, 1);
  assert.match(calls[0].url, /limit=0/, 'asking for no rows, because RLS would only allow one anyway');
});
