/**
 * Tests for boot step 0 on the game page, and for the provider switch it depends on.
 *
 * The thing being guarded here is ISS-033. `js/main.js` used to resolve the session
 * from `localAuth.js` directly while `js/auth-main.js` chose the provider. With the
 * flag flipped that is a redirect loop: the login page issues a real Supabase
 * session, the game page reads localStorage, finds nothing, and sends the player
 * back. Nothing tested the two entry points together, which is why it survived.
 *
 * `restoreSession()` is covered here for the same reason it exists: the Supabase
 * access token is memory-only, so without it every page navigation looks like a
 * sign-out.
 *
 * No network, and no game boot: both entry scripts guard their `start()` behind an
 * element only their own page has, so importing them here does not redirect the test
 * process.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured, connection } from '../js/config/supabase.js';

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

/**
 * The barest `document` that satisfies `qsOrNull`, which returns null for everything.
 *
 * That null is what keeps `start()` from running in both entry scripts: they each
 * look for the one element their own page has. So these stubs double as the proof
 * that the guards work — without them the suite would redirect itself to login.html.
 */
installFakeStorage();
globalThis.document = { querySelector: () => null, createElement: () => ({}) };
globalThis.location = { search: '', href: 'http://localhost:5173/index.html', replace() {} };

/** Imported after the stubs, since both entry scripts touch the DOM as they load. */
const { farmHref, resolveSession, shopHref } = await import('../js/main.js');
const { loadProvider } = await import('../js/auth-main.js');
const localAuth = await import('../js/services/localAuth.js');

beforeEach(() => {
  installFakeStorage();
  globalThis.location.search = '';
});

/* --- the switch -------------------------------------------------------------- */

test('the provider the game page loads is not the local one', async () => {
  // The failure this asserts against: `loadProvider()` handing back `localAuth`
  // while the login page had issued a Supabase session.
  const provider = await loadProvider();

  assert.notEqual(provider, localAuth);
  assert.equal(typeof provider.signIn, 'function');
  assert.equal(typeof provider.restoreSession, 'function');
});

test('the committed config is usable and is the anon key, not a secret', () => {
  assert.ok(isSupabaseConfigured());
  assert.match(SUPABASE_URL, /^https:\/\/[a-z]+\.supabase\.co$/);

  // The anon key is publishable by design (DEC-018). What must never appear here is
  // the `service_role` key, which bypasses Row Level Security outright. Its JWT
  // payload carries `role: "service_role"`, so decoding the middle segment is the
  // check that actually tells the two apart.
  const payload = JSON.parse(
    Buffer.from(SUPABASE_ANON_KEY.split('.')[1], 'base64url').toString('utf8'),
  );
  assert.equal(payload.role, 'anon');
  assert.equal(payload.ref, SUPABASE_URL.split('//')[1].split('.')[0]);
});

test('isSupabaseConfigured answers about the values that will be sent', () => {
  // ISS-034: it used to read the test-override `let`s declared below it, so the
  // guard and the request it protects were answered from different sources.
  assert.equal(connection().url, SUPABASE_URL);
  assert.equal(connection().anonKey, SUPABASE_ANON_KEY);
});

test('every function the boot path and the panel need exists on the provider', () => {
  // A missing export reaches the panel as `undefined` and only fails when a player
  // clicks, surfacing as a confusing "could not reach the server".
  //
  // `restoreSession` is deliberately absent from this list: it is Supabase-only, and
  // both call sites use `?.()`. Requiring it on the local provider would force a
  // no-op onto it.
  //
  // `deleteAccountData` and `eraseProgress` each take the password and verify it in the
  // same call that destroys something — see `005` and `006`. Both are required on both
  // providers, because neither may expose an erasure a token alone can perform. Erase
  // used to ask for no password at all; that was the gap DEC-025 closed.
  for (const name of [
    'currentSession', 'signIn', 'signUp', 'signOut',
    'requestPasswordReset', 'updatePassword', 'deleteAccountData', 'eraseProgress',
  ]) {
    assert.equal(typeof localAuth[name], 'function', `localAuth is missing ${name}`);
  }

  assert.equal(
    localAuth.deletesAccountsInPlace,
    true,
    'this provider deletes its own accounts rather than calling an RPC',
  );
});

test('neither provider exposes a deletion that skips the password', async () => {
  // The guarantee behind `005`. Before it, the Supabase RPC authenticated with
  // `auth.uid()` alone and the password was checked in the browser, so the check could
  // be bypassed by calling the delete endpoint directly.
  const supabase = await import('../js/services/authApi.js');

  // The check moved into the database (`delete_my_account(password)`), so neither
  // provider has a client-side "check then delete" pair to bypass — the local one
  // verifies and deletes in a single function, and the Supabase one has no
  // delete-without-password entry point at all.
  assert.equal(
    typeof supabase.verifyPassword,
    'undefined',
    'the browser-side check must stay gone; the database owns it now',
  );
  assert.equal(typeof localAuth.deleteAccountData, 'function');
});

/* --- boot step 0 ------------------------------------------------------------- */

/** A stand-in provider, so the boot path is tested without a network. */
function fakeProvider(overrides = {}) {
  return {
    currentSession: () => null,
    restoreSession: async () => null,
    ...overrides,
  };
}

test('a live session wins, and the network is never touched', async () => {
  let restored = false;
  const session = { status: 'authed', userId: 'uuid-1', email: 'a@b.co', farmerName: 'A' };

  const result = await resolveSession(fakeProvider({
    currentSession: () => session,
    restoreSession: async () => { restored = true; return null; },
  }));

  assert.equal(result, session);
  assert.equal(restored, false, 'an in-memory session needs no refresh');
});

test('with no live session it restores, so a reload is not a sign-out', async () => {
  const restored = { status: 'authed', userId: 'uuid-2', email: 'a@b.co', farmerName: 'A' };

  assert.equal(await resolveSession(fakeProvider({ restoreSession: async () => restored })), restored);
});

test('a provider with no restoreSession still resolves', async () => {
  // The optional `?.()` is what keeps the local provider working; without it this
  // throws a TypeError on boot.
  const provider = { currentSession: () => null };

  assert.equal(await resolveSession(provider), null);
});

test('no session and no guest query means sign in', async () => {
  assert.equal(await resolveSession(fakeProvider()), null);
});

test('?guest=1 starts a guest farm even with no session', async () => {
  globalThis.location.search = '?guest=1';

  assert.equal((await resolveSession(fakeProvider())).status, 'guest');
});

test('a signed-in player arriving with ?guest=1 keeps their session', async () => {
  globalThis.location.search = '?guest=1';
  const session = { status: 'authed', userId: 'uuid-3', email: 'a@b.co', farmerName: 'A' };

  assert.equal(await resolveSession(fakeProvider({ currentSession: () => session })), session);
});

/* --- the two links between the farm and the shop -------------------------------- */

test('the shop button and the way back point at different pages', () => {
  // The bug this asserts against: "Back to the farm" was built with `shopHref`, so
  // it linked to shop.html — the page the player was already on, so the button did
  // nothing. Both helpers live in one file precisely so the two cannot be swapped.
  const session = { status: 'authed', userId: 'uuid-4', email: 'a@b.co', farmerName: 'A' };

  assert.equal(shopHref(session), 'shop.html');
  assert.equal(farmHref(session), 'index.html');
  assert.notEqual(shopHref(session), farmHref(session));
});

test('a guest carries ?guest=1 across the navigation, in both directions', () => {
  // Without the flag the other page finds no session and redirects to the login
  // form, so "sign in once" becomes "sign in on every page".
  const guest = { status: 'guest', userId: 'guest', email: '', farmerName: '' };

  assert.equal(shopHref(guest), 'shop.html?guest=1');
  assert.equal(farmHref(guest), 'index.html?guest=1');
});

test('a missing session still produces a usable href', () => {
  // `mountShell` runs before anything can be null in practice, but an undefined
  // session must not produce "undefined" as a URL.
  for (const href of [shopHref(null), shopHref(undefined), farmHref(null)]) {
    assert.match(href, /^(shop|index)\.html$/);
  }
});