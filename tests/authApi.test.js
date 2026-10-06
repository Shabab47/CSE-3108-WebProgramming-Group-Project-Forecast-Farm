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
    user_metadata: { farmer_name: 'Abdul Karim' },
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

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, SUPABASE_NOT_CONFIGURED);
  assert.equal(calls.length, 0, 'no request is attempted against a URL that does not exist');
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
  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.session).sort(), ['email', 'farmerName', 'status', 'userId']);
  assert.equal(result.session.status, 'authed');
  assert.equal(result.session.userId, 'uuid-1234');
  assert.equal(result.session.email, 'farmer@rice.bd');
  assert.equal(result.session.farmerName, 'Abdul Karim');
});

test('the email is normalised before it is sent', async () => {
  await signIn({ email: '  FARMER@Rice.BD ', password: 'rice2026' });

  assert.equal(calls[0].body.email, 'farmer@rice.bd');
});

test('the request carries the anon key and asks GoTrue for a password grant', async () => {
  await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.match(calls[0].url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(calls[0].init.headers.apikey, 'anon-test-key');
});

test('the password is never placed in a URL', async () => {
  await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.ok(!calls[0].url.includes('rice2026'));
});

/* --- error mapping --------------------------------------------------------- */

test('a wrong password and an unknown account are indistinguishable', async () => {
  stubFetch(() => ({ status: 400, body: { error_description: 'Invalid login credentials' } }));
  const wrongPassword = await signIn({ email: 'farmer@rice.bd', password: 'nope1234' });

  stubFetch(() => ({ status: 400, body: { error_description: 'Invalid login credentials' } }));
  const noAccount = await signIn({ email: 'nobody@rice.bd', password: 'rice2026' });

  assert.equal(wrongPassword.reason, 'invalid_credentials');
  assert.equal(noAccount.reason, wrongPassword.reason);
});

test('an unconfirmed email is refused as invalid credentials, not as its own reason', async () => {
  stubFetch(() => ({ status: 400, body: { error_description: 'Email not confirmed' } }));

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  // Its own reason would tell the caller the account exists but is unconfirmed.
  assert.equal(result.reason, 'invalid_credentials');
});

test('a taken email on sign-up maps to email_taken', async () => {
  stubFetch(() => ({ status: 422, body: { error_description: 'User already registered' } }));

  const result = await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Someone' });

  assert.equal(result.reason, 'email_taken');
});

test('an unmapped provider error never leaks its raw text', async () => {
  const weird = 'https://internal.supabase.co/debug/trace-9931';
  stubFetch(() => ({ status: 500, body: { error_description: weird } }));

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.ok(!String(result.reason).includes('supabase'), 'no URL in the reason');
  assert.ok(!String(result.reason).includes('9931'), 'no trace id in the reason');
});

test('a network failure is reported as connectivity, not as bad credentials', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.reason, 'network_request_failed');
});

test('a non-JSON response body does not throw', async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 502,
    json: async () => { throw new SyntaxError('Unexpected token <'); },
  });

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.ok(result.reason);
});

/* --- sign-up and confirmation ---------------------------------------------- */

test('sign-up sends the farmer name as metadata, not as a top-level field', async () => {
  stubFetch(() => ({ status: 200, body: { user: { id: 'uuid-1234', email: 'farmer@rice.bd' } } }));

  await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Abdul Karim' });

  assert.equal(calls[0].body.data.farmer_name, 'Abdul Karim');
  assert.ok(!('farmer_name' in calls[0].body), 'not a column GoTrue would reject');
});

test('sign-up with no session yet reports that confirmation is needed', async () => {
  // GoTrue returns 200 with no tokens when it has emailed a confirmation link.
  stubFetch(() => ({ status: 200, body: { user: { id: 'uuid-1234', email: 'farmer@rice.bd' } } }));

  const result = await signUp({ email: 'farmer@rice.bd', password: 'rice2026', farmerName: 'Abdul Karim' });

  assert.equal(result.ok, true);
  assert.equal(result.session, null);
  assert.equal(result.needsConfirmation, true);
  assert.equal(currentSession(), null, 'no session until the inbox is clicked');
});

/* --- password reset -------------------------------------------------------- */

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

/* --- password update after the emailed link -------------------------------- */

test('updating a password without a recovery session is refused', async () => {
  const result = await updatePassword({ password: 'rice2027' });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_recovery_session');
  assert.equal(calls.length, 0);
});

/* --- session lifetime ------------------------------------------------------ */

test('signing out clears the session', async () => {
  await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });
  assert.ok(currentSession());

  await signOut();

  assert.equal(currentSession(), null);
});

test('a failed restore leaves the player signed out rather than half-signed-in', async () => {
  await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });
  await signOut();

  stubFetch(() => ({ status: 401, body: { error_description: 'Invalid Refresh Token' } }));
  const restored = await restoreSession();

  assert.equal(restored, null);
  assert.equal(currentSession(), null);
});

test('a session with no user id is treated as a failure, not a blank session', async () => {
  stubFetch(() => ({ status: 200, body: { access_token: 'a', user: {} } }));

  const result = await signIn({ email: 'farmer@rice.bd', password: 'rice2026' });

  assert.equal(result.ok, false);
  assert.equal(currentSession(), null);
});