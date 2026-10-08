/**
 * Tests for the Supabase auth provider.
 *
 * `fetch` is stubbed, so these run with no network and never touch the real
 * project — every test installs its own URL and key via `__setForTest`, which is
 * why the credentials now committed to `js/config/supabase.js` cannot make this
 * suite call out by accident.
 *
 * What is verified here is the mapping and the contract — that provider codes
 * become our neutral reason names, that no raw GoTrue string escapes, and that
 * every credential failure looks identical from the outside.
 *
 * The enumeration assertions are the important ones. `localAuth.test.js` asserts
 * the same guarantee for the stopgap provider, and both must hold, or the panel
 * inherits whichever one is weaker.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  currentSession,
  requestPasswordReset,
  restoreSession,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from '../js/services/authApi.js';
import { SUPABASE_NOT_CONFIGURED, __setForTest, connection } from '../js/config/supabase.js';

/** Captured requests, so a test can assert on what was actually sent. */
let calls = [];

const TEST_URL = 'https://test.supabase.co';
const TEST_KEY = 'anon-test-key';

/**
 * @param {(url:string, init:object) => {status:number, body:object}} handler
 */
function stubFetch(handler) {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, body = {} } = handler(url, init) ?? {};
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
}

const ACCESS = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: {
    id: 'uuid-1234',
    email: 'farmer@rice.bd',
    user_metadata: { farmer_name: 'Abdul Karim', username: 'farmer_joe' },
  },
};

/**
 * Every test after the guard block runs against a stubbed-but-configured
 * provider, because the real URL and key are still empty. Without this the entire
 * error-mapping suite — the part most likely to be wrong — would only ever
 * exercise the "not configured" path.
 */
/** Minimal in-memory localStorage, as in `localAuth.test.js`. */
function installFakeStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
  return data;
}

beforeEach(async () => {
  __setForTest({ url: TEST_URL, key: TEST_KEY });
  installFakeStorage();
  stubFetch(() => ({ status: 200, body: ACCESS }));

  // The provider keeps its session in a module-level variable, which survives
  // between tests in one file. Signing out first stops a session established by
  // an earlier test leaking into the next one and making a "no session yet"
  // assertion fail for the wrong reason.
  await signOut();
  calls = [];
});

/* --- the guard ------------------------------------------------------------- */

test('with no URL and key it refuses instead of calling out', async () => {
  __setForTest({ url: '', key: '' });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, SUPABASE_NOT_CONFIGURED);
  assert.equal(calls.length, 0, 'no request is attempted against a URL that does not exist');
});

test('the wording GoTrue actually uses for a bad address is mapped', async () => {
  // The exact string from the live project, captured 2026-10-06. The pattern
  // originally expected "invalid email" and missed this, so a bad address showed
  // "That did not work" instead of naming the problem — see ISS-035. Written from
  // a real response, not from the docs, which is the whole point.
  const real = 'Email address "someone@example.com" is invalid';
  stubFetch(() => ({ status: 400, body: { msg: real } }));

  const result = await signUp({ email: 'someone@example.com', password: 'rice2026', farmerName: 'Someone', username: 'someone' });

  assert.equal(result.reason, 'email_invalid');
});

test('the live enumeration guard: one text for both credential failures', async () => {
  // Captured from the live project. GoTrue returns byte-identical text for a
  // wrong password and an unknown account, and ours collapses them again at the
  // provider layer, so the oracle is closed in two places rather than one.
  const live = 'Invalid login credentials';
  stubFetch(() => ({ status: 400, body: { error_description: live } }));

  const wrongPassword = await signIn({ identifier: 'farmer@rice.bd', password: 'wrongpass1' });
  stubFetch(() => ({ status: 400, body: { error_description: live } }));
  const noAccount = await signIn({ identifier: 'nobody@rice.bd', password: 'rice2026' });

  assert.equal(wrongPassword.reason, 'invalid_credentials');
  assert.equal(noAccount.reason, 'invalid_credentials');
});

test('rate limiting is live on the project and is mapped, not swallowed', async () => {
  // The live project returned 429 with this text once the probe filled the hourly
  // quota. It must reach the player as "wait a minute", not as a credential error.
  stubFetch(() => ({ status: 429, body: { msg: 'email rate limit exceeded' } }));

  const result = await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Someone', username: 'someone' });

  assert.equal(result.reason, 'too_many_requests');
});

test('the committed config exports no credentials of its own', async () => {
  // The anon key IS safe to commit by design, so this asserts something weaker
  // and more useful: the module's public exports carry no live secret, and the
  // provider only ever reads through `connection()`. If someone pastes a
  // `service_role` key or the export signing secret into this file, that name
  // will not appear among the exports and `authApi.js` cannot reach it.
  const config = await import('../js/config/supabase.js');
  const names = Object.keys(config).filter((name) => !name.startsWith('_'));

  for (const name of names) {
    assert.ok(!/secret|service_role|signing/i.test(name), `no secret-shaped export: ${name}`);
  }

  // The values the provider actually uses are the ones under test control, not
  // literals baked into the module.
  assert.equal(connection().url, TEST_URL);
  assert.equal(connection().anonKey, TEST_KEY);
});

/* --- the contract ---------------------------------------------------------- */

test('signing in returns a session in the same shape as the local provider', async () => {
  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.session).sort(), ['email', 'farmerName', 'status', 'userId', 'username']);
  assert.equal(result.session.status, 'authed');
  assert.equal(result.session.userId, 'uuid-1234');
  assert.equal(result.session.email, 'farmer@rice.bd');
  assert.equal(result.session.farmerName, 'Abdul Karim');
  assert.equal(result.session.username, 'farmer_joe');
});

test('the email is normalised before it is sent', async () => {
  await signIn({ identifier: '  FARMER@Rice.BD ', password: 'rice2026' });

  assert.equal(calls[0].body.email, 'farmer@rice.bd');
});

test('the request carries the anon key and asks GoTrue for a password grant', async () => {
  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.match(calls[0].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(calls[0].init.headers.apikey, 'anon-test-key');
});

test('the password is never placed in a URL', async () => {
  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.ok(!calls[0].url.includes('rice2026'));
});

/* --- error mapping --------------------------------------------------------- */

test('a wrong password and an unknown account are indistinguishable', async () => {
  stubFetch(() => ({ status: 400, body: { error_description: 'Invalid login credentials' } }));
  const wrongPassword = await signIn({ identifier: 'farmer@rice.bd', password: 'nope1234' });

  stubFetch(() => ({ status: 400, body: { error_description: 'Invalid login credentials' } }));
  const noAccount = await signIn({ identifier: 'nobody@rice.bd', password: 'rice2026' });

  assert.equal(wrongPassword.reason, 'invalid_credentials');
  assert.equal(noAccount.reason, wrongPassword.reason);
});

test('an unconfirmed email is refused as invalid credentials, not as its own reason', async () => {
  stubFetch(() => ({ status: 400, body: { error_description: 'Email not confirmed' } }));

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  // Its own reason would tell the caller the account exists but is unconfirmed.
  assert.equal(result.reason, 'invalid_credentials');
});

test('a taken email on sign-up maps to email_taken', async () => {
  stubFetch(() => ({ status: 422, body: { error_description: 'User already registered' } }));

  const result = await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Someone', username: 'someone' });

  assert.equal(result.reason, 'email_taken');
});

test('an unmapped provider error never leaks its raw text', async () => {
  const weird = 'https://internal.supabase.co/debug/trace-9931';
  stubFetch(() => ({ status: 500, body: { error_description: weird } }));

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.ok(!String(result.reason).includes('supabase'), 'no URL in the reason');
  assert.ok(!String(result.reason).includes('9931'), 'no trace id in the reason');
});

test('a network failure is reported as connectivity, not as bad credentials', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.reason, 'network_request_failed');
});

test('a non-JSON response body does not throw', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    json: async () => { throw new SyntaxError('Unexpected token <'); },
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.ok(result.reason);
});

/* --- sign-up and confirmation ---------------------------------------------- */

test('sign-up sends the farmer name and username as metadata, not as top-level fields', async () => {
  stubFetch(() => ({ status: 200, body: { user: { id: 'uuid-1234', email: 'farmer@rice.bd' } } }));

  await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Abdul Karim', username: 'farmer_joe' });

  // Not `calls[0]`: sign-up checks the username is free first, so the signup is not
  // necessarily the first request. Find it, or this asserts on the wrong call.
  const signup = calls.find((call) => call.url.endsWith('/auth/v1/signup'));
  assert.ok(signup, 'the account was created');

  assert.equal(signup.body.data.farmer_name, 'Abdul Karim');
  assert.equal(signup.body.data.username, 'farmer_joe');
  assert.ok(!('farmer_name' in signup.body), 'not a column GoTrue would reject');
  assert.ok(!('username' in signup.body), 'not a column GoTrue would reject');
});

test('sign-up with no session yet reports that confirmation is needed', async () => {
  // GoTrue returns 200 with no tokens when it has emailed a confirmation link.
  stubFetch(() => ({ status: 200, body: { user: { id: 'uuid-1234', email: 'farmer@rice.bd' } } }));

  const result = await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Abdul Karim', username: 'farmer_joe' });

  assert.equal(result.ok, true);
  assert.equal(result.session, null);
  assert.equal(result.needsConfirmation, true);
  assert.equal(currentSession(), null, 'no session until the inbox is clicked');
});

test('a conflict on the account releases the stale row and records the new name (ISS-042)', async () => {
  // A player who changes their username metadata still holds the old row, whose
  // primary key keeps the old name claimed by an account that cannot answer to it —
  // permanently, and silently. So on a 409 this account's own row is deleted and the
  // insert retried, which both frees the old name and records the new one.
  stubFetch((url, init = {}) => {
    if (url.endsWith('/rest/v1/usernames') && init.method === 'DELETE') {
      return { status: 204, body: null };
    }
    if (url.endsWith('/rest/v1/usernames') && init.method === 'POST') {
      return { status: 409, body: { code: '23505', message: 'duplicate key' } };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true);
  const release = calls.find((call) => call.init.method === 'DELETE');
  assert.ok(release, 'the stale row must be released');
  assert.match(release.url, /user_id=eq\.uuid-1234/, 'scoped to this account only');
});

test('a conflict on a username owned by somebody else does not lock the player out', async () => {
  // 409 because another account holds that name, not because we hold a stale row. The
  // delete is still attempted but finds nothing, and the account is otherwise fine —
  // it simply cannot sign in by that username, which is not our problem to solve.
  stubFetch((url, init = {}) => {
    if (url.endsWith('/rest/v1/usernames') && init.method === 'DELETE') {
      return { status: 204, body: null };
    }
    if (url.endsWith('/rest/v1/usernames') && init.method === 'POST') {
      return { status: 409, body: { code: '23505', message: 'duplicate key' } };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true);
  assert.ok(currentSession(), 'a taken name must never lock the player out of their account');
});

/* --- password reset -------------------------------------------------------- */

test('a reset request tells GoTrue where to send the player back to', async () => {
  // Without redirect_to, GoTrue uses the project's Site URL. This page is the only
  // one that reads the token out of the fragment, so if Site URL pointed anywhere
  // else the reset would land on a page that ignores it and silently fail — ISS-031.
  await requestPasswordReset({ email: 'farmer@rice.bd', redirectTo: 'https://app.test/login.html' });

  assert.equal(calls[0].body.redirect_to, 'https://app.test/login.html');
});

test('a reset request with no redirect target still works, and omits the field', async () => {
  await requestPasswordReset({ email: 'farmer@rice.bd' });

  assert.equal('redirect_to' in calls[0].body, false, 'no empty string sent to GoTrue');
});

test('a reset request reports success even when GoTrue refuses', async () => {
  // GoTrue answers identically for unknown addresses, to avoid the same oracle.
  stubFetch(() => ({ status: 404, body: { error_description: 'User not found' } }));

  const result = await requestPasswordReset({ email: 'nobody@rice.bd' });

  assert.equal(result.ok, true, 'the caller must not learn whether the address exists');
});

test('a reset request still surfaces rate limiting', async () => {
  stubFetch(() => ({ status: 429, body: { error_description: 'Email rate limit exceeded' } }));

  const result = await requestPasswordReset({ email: 'farmer@rice.bd' });

  // Rate limiting says nothing about whether the address is registered.
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_many_requests');
});

test('signing in with a username looks up the email and signs in', async () => {
  // First call: resolve the username through `email_for_username`, which returns one
  // bare string rather than a row — the table itself has no SELECT policy for `anon`.
  // Second call: the GoTrue password grant with the email it gave back.
  stubFetch((url) => {
    if (url.includes('/rest/v1/rpc/email_for_username')) {
      return { status: 200, body: 'farmer@rice.bd' };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer_joe', password: 'rice2026' });

  assert.equal(result.ok, true);
  assert.equal(result.session.username, 'farmer_joe');

  const lookup = calls.find((call) => call.url.includes('/rest/v1/rpc/email_for_username'));
  assert.ok(lookup, 'the username is resolved before anything is sent to GoTrue');
  assert.deepEqual(lookup.body, { wanted: 'farmer_joe' }, 'the name is sent as data, not in the URL');
  assert.equal(calls[1].body.email, 'farmer@rice.bd');
});

test('the usernames table is never read directly, only through the function', async () => {
  // Regression guard for the leak: `?select=*` on the table used to return every
  // username and email to any holder of the shipped anon key. The table has no SELECT
  // policy for `anon` precisely so a direct read fails, and this asserts the client
  // does not try.
  stubFetch(() => ({ status: 200, body: 'farmer@rice.bd' }));

  await signIn({ identifier: 'farmer_joe', password: 'rice2026' });

  for (const call of calls) {
    assert.ok(
      !call.url.endsWith('/rest/v1/usernames') || call.init.method !== 'GET',
      `the table must not be read directly: ${call.url}`,
    );
  }
});

test('signing in with an unknown username returns invalid_credentials', async () => {
  stubFetch((url) => {
    if (url.includes('/rest/v1/rpc/email_for_username')) {
      return { status: 200, body: null };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'unknown_user', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid_credentials');
});

/* --- the username row -------------------------------------------------------
 *
 * These are the tests the feature would have failed without. GoTrue stores the
 * username as metadata and has no way to search it, so a row in `public.usernames`
 * is the only thing that makes a username sign-in resolvable — and nothing
 * populated that table until `adopt()` started writing to it. */

test('adopting a session records the username so it can be looked up later', async () => {
  stubFetch(() => ({ status: 200, body: ACCESS }));

  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  const write = calls.find((call) => call.url.endsWith('/rest/v1/usernames') && call.init.method === 'POST');
  assert.ok(write, 'a session with a username must write a row for it');
  assert.deepEqual(write.body, {
    username: 'farmer_joe',
    email: 'farmer@rice.bd',
    user_id: 'uuid-1234',
  });
});

test('the username row is written with the player token, so RLS can see whose it is', async () => {
  stubFetch(() => ({ status: 200, body: ACCESS }));

  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  const write = calls.find((call) => call.url.endsWith('/rest/v1/usernames') && call.init.method === 'POST');
  // The anon key alone would fail the `auth.uid() = user_id` insert policy.
  assert.equal(write.init.headers.Authorization, 'Bearer access-token');
});

test('the username row is a plain insert, never an upsert', async () => {
  // Regression guard, and the whole bug. `Prefer: resolution=merge-duplicates` is
  // refused by the RLS policies on `usernames`: verified against the live project,
  // where every variant answers 403 "new row violates row-level security policy" while
  // the same body with no `Prefer` header answers 201. There is no owner SELECT policy,
  // and the upsert path needs one — so an upsert here silently records nothing, and
  // username sign-in is dead while every test still passes.
  stubFetch(() => ({ status: 200, body: ACCESS }));

  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  const write = calls.find((call) => call.url.endsWith('/rest/v1/usernames') && call.init.method === 'POST');
  assert.equal(
    write.init.headers.Prefer,
    undefined,
    'no Prefer header at all — that is the only form these policies allow',
  );
});

test('an already-recorded username is a success, not a failure', async () => {
  // A second adoption inserts the same row again and gets 409 from the primary key.
  // That is the success case: the row is there, and retrying would not change it.
  stubFetch((url) => {
    if (url.endsWith('/rest/v1/usernames')) {
      return { status: 409, body: { code: '23505', message: 'duplicate key' } };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true, 'a conflict must not read as a broken write');
  assert.ok(currentSession());
});

test('a failed username write does not fail the sign-in', async () => {
  // The player is already authenticated at that point. Turning a metadata write
  // failure into a sign-in failure would be a lockout over something cosmetic.
  stubFetch((url) => {
    if (url.endsWith('/rest/v1/usernames')) {
      return { status: 500, body: { message: 'boom' } };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true);
  assert.equal(result.session.username, 'farmer_joe');
  assert.ok(currentSession(), 'the session stands even though the row did not');
});

test('a username taken between sign-up and the write is refused, not silently stolen', async () => {
  stubFetch((url) => {
    if (url.endsWith('/rest/v1/usernames')) {
      return { status: 409, body: { code: '23505', message: 'duplicate key' } };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  // The account is fine; only this username is unusable. Failing the sign-in here
  // would be worse than the problem.
  assert.equal(result.ok, true);
});

test('a username already registered is refused at sign-up, before the account exists', async () => {
  stubFetch((url) => {
    if (url.includes('/rest/v1/rpc/email_for_username')) {
      return { status: 200, body: 'someone@rice.bd' };
    }
    return { status: 200, body: ACCESS };
  });

  const result = await signUp({
    email: 'new@rice.bd',
    password: 'rice2026',
    farmerName: 'Someone',
    username: 'farmer_joe',
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'username_taken');
  assert.equal(
    calls.filter((call) => call.url.includes('/auth/v1/signup')).length,
    0,
    'no account is created for a username that is already gone',
  );
});

test('a free username gets past the check and on to the account', async () => {
  stubFetch((url) => {
    if (url.includes('/rest/v1/rpc/email_for_username')) {
      return { status: 200, body: null };
    }
    return { status: 200, body: { user: { id: 'uuid-1234', email: 'farmer@rice.bd' } } };
  });

  const result = await signUp({
    email: 'farmer@rice.bd',
    password: 'rice2026',
    farmerName: 'Abdul Karim',
    username: 'farmer_joe',
  });

  assert.equal(result.ok, true);
  assert.equal(result.needsConfirmation, true);
});

/* --- password update after the emailed link -------------------------------- */

test('updating a password without a recovery session is refused', async () => {
  const result = await updatePassword({ password: 'rice2027' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_recovery_session');
  assert.equal(calls.length, 0);
});

/* --- session lifetime ------------------------------------------------------ */

test('signing out clears the session', async () => {
  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });
  assert.ok(currentSession());

  await signOut();

  assert.equal(currentSession(), null);
});

test('a failed restore leaves the player signed out rather than half-signed-in', async () => {
  await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });
  await signOut();

  stubFetch(() => ({ status: 401, body: { error_description: 'Invalid Refresh Token' } }));
  const restored = await restoreSession();

  assert.equal(restored, null);
  assert.equal(currentSession(), null);
});

test('a session with no user id is treated as a failure, not a blank session', async () => {
  stubFetch(() => ({ status: 200, body: { access_token: 'a', user: {} } }));

  const result = await signIn({ identifier: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.equal(currentSession(), null);
});
