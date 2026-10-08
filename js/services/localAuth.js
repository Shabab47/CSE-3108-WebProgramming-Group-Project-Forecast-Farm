/**
 * LOCAL auth provider — a stopgap, not the real thing.
 *
 * The real provider is `js/services/authApi.js`, owned by Shabab, calling the
 * Supabase REST API with plain `fetch()` (no supabase-js, per DEC-002). This
 * file exists so `loginPanel.js` has something to run against before that
 * lands, and it deliberately implements the **same contract**:
 *
 *   signIn({identifier, password})           → Promise<{ok:true, session} | {ok:false, reason}>
 *   signUp({email, password, farmerName, username}) → same
 *   signOut()                           → Promise<{ok:true}>
 *   currentSession()                    → session | null
 *
 * When authApi.js arrives, delete this file and change one import in
 * `auth-main.js`. Nothing in `js/ui/` changes.
 *
 * Known deviation, logged as ISS-027: this writes to localStorage, which
 * breaks the "only state/store.js touches storage" rule. It is a dev provider,
 * it holds nothing but a hash, and it goes away — but it is a second writer and
 * should not survive into a release.
 *
 * NO RATE LIMITING here on purpose: the real backend rate-limits. This only
 * surfaces what it is given.
 */

import { createLog } from '../utils/log.js';
import { normaliseEmail, normaliseName, normaliseUsername } from '../utils/normalize.js';
import { AUTH_KEYS, HASH } from '../config/auth.js';

const log = createLog('localAuth');

const ACCOUNTS_KEY = AUTH_KEYS.accounts;
const SESSION_KEY = AUTH_KEYS.session;

/* --- storage, always guarded (localStorage throws in some private modes) --- */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    log.warn('read failed -', error.message);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    log.warn('write failed -', error.message);
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    log.warn('clear failed -', error.message);
  }
}

/* --- password hashing ------------------------------------------------------ */

const encoder = new TextEncoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: HASH.iterations, hash: HASH.hash },
    material,
    HASH.keyBits,
  );
  return toBase64(new Uint8Array(bits));
}

/** Constant-time, so a partial match leaks nothing through timing. */
function matches(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* --- session shaping -------------------------------------------------------
 * Mirrors the state shape in the plan: { status, userId, email, farmerName }.
 * `uid` is the local uuid here; Supabase will supply auth.uid() instead. */

function makeSession({ userId, email, farmerName, username }) {
  return { status: 'authed', userId, email, farmerName, username };
}

const GUEST = {
  status: 'guest',
  userId: 'guest',
  email: '',
  farmerName: 'Guest farmer',
};

function persist(session) {
  if (session.status === 'guest') {
    // Guests get a save in this browser only, and no session to restore later.
    remove(SESSION_KEY);
    return true;
  }
  return write(SESSION_KEY, session);
}

/* --- the contract ---------------------------------------------------------- */

/** @returns {object|null} */
export function currentSession() {
  const session = read(SESSION_KEY, null);
  if (!session || session.status !== 'authed' || !session.userId) return null;
  return session;
}

export async function signIn({ identifier, password }) {
  const id = String(identifier ?? '').trim();
  const accounts = read(ACCOUNTS_KEY, {});

  // Look up by email or username
  let account = null;
  if (id.includes('@')) {
    account = accounts[normaliseEmail(id)] ?? null;
  } else {
    const usernameKey = normaliseUsername(id);
    for (const acc of Object.values(accounts)) {
      if (acc.username === usernameKey) {
        account = acc;
        break;
      }
    }
  }

  // Both branches return the same reason on purpose: telling them apart would
  // confirm which emails have accounts. authErrors.js neutralises it too, and
  // both layers are deliberate.
  const refused = { ok: false, reason: 'invalid_credentials' };
  if (!account) return refused;

  const hash = await derive(password, fromBase64(account.salt));
  if (!matches(hash, account.hash)) return refused;

  const session = makeSession(account);
  persist(session);
  log.info('signed in', id);
  return { ok: true, session };
}

export async function signUp({ email, password, farmerName, username }) {
  const key = normaliseEmail(email);
  const usernameKey = normaliseUsername(username);
  const accounts = read(ACCOUNTS_KEY, {});

  // Specific on sign-up: the player typed this address, so it helps them and
  // reveals nothing they did not already know.
  if (accounts[key]) return { ok: false, reason: 'email_taken' };

  // Username must be unique across all accounts
  for (const acc of Object.values(accounts)) {
    if (acc.username === usernameKey) return { ok: false, reason: 'username_taken' };
  }

  const salt = crypto.getRandomValues(new Uint8Array(HASH.saltBytes));
  const account = {
    userId: crypto.randomUUID(),
    email: key,
    farmerName: normaliseName(farmerName),
    username: usernameKey,
    salt: toBase64(salt),
    hash: await derive(password, salt),
    confirmed: true,
    createdAt: Date.now(),
  };

  accounts[key] = account;
  if (!write(ACCOUNTS_KEY, accounts)) return { ok: false, reason: 'storage_unavailable' };

  const session = makeSession(account);
  persist(session);
  log.info('registered', key);
  return { ok: true, session };
}

export async function signOut() {
  remove(SESSION_KEY);
  return { ok: true };
}

/** Continue without an account. Local save only; export stays disabled. */
export function signInAsGuest() {
  persist(GUEST);
  return { ok: true, session: GUEST };
}

/* --- the two calls this provider cannot make ---------------------------------
 * Part of the contract, so `js/auth-main.js` can pass them without checking, and
 * so the panel gets an honest answer instead of a TypeError.
 *
 * There is nowhere to send a reset link from: accounts live in this browser's
 * localStorage and no server exists (ISS-032). Reporting `reset_unavailable` is
 * the point — returning a fake success would tell a player an email is on its way
 * that will never arrive, and letting the call throw would blame their network.
 */

/**
 * Delete this account, now, if the password is right.
 *
 * **The password is verified here, in the same call that deletes**, which is the point.
 * On the Supabase provider `delete_my_account()` does both server-side. An earlier
 * version checked the password in the browser and asked the database only to delete —
 * which meant the check could simply be skipped by calling the delete directly. Doing
 * both together means neither provider has a delete that a token alone can perform.
 *
 * The comparison is the existing PBKDF2 derivation against the stored hash, so it costs
 * the same work as signing in does. A wrong password returns before anything is
 * written, so the account is untouched.
 *
 * **This deletes rather than schedules.** A countdown would have nowhere to live here:
 * the accounts table *is* the account, so the record of a scheduled deletion would go
 * with the session the moment the player was signed out, and a sign-out-and-return would
 * reset the timer forever. A countdown that cannot be trusted is worse than none.
 *
 * This provider is the stopgap that ships only if `authApi.js` fails to load (ISS-027),
 * so the divergence is confined to a path nobody should be on. Both providers now
 * promise the same thing to the player, which is what the settings page says.
 *
 * @param {string} password what the player typed
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function deleteAccountData({ password } = {}) {
  const session = currentSession();
  if (!session) return { ok: false, reason: 'not_signed_in' };
  if (!password) return { ok: false, reason: 'password_required' };

  const accounts = read(ACCOUNTS_KEY, {});
  const account = accounts[session.email];
  if (!account) return { ok: false, reason: 'invalid_credentials' };

  // The same constant-time comparison `signIn` uses, against the same stored salt. A
  // wrong password returns here, before the write below, so nothing is removed.
  const hash = await derive(password, fromBase64(account.salt));
  if (!matches(hash, account.hash)) {
    log.info('account deletion refused, wrong password');
    return { ok: false, reason: 'invalid_credentials' };
  }

  delete accounts[session.email];
  if (!write(ACCOUNTS_KEY, accounts)) {
    // Nothing was removed, so the session stays: leaving the player signed in to an
    // account that is still there is honest, and they can try again.
    return { ok: false, reason: 'storage_unavailable' };
  }

  remove(SESSION_KEY);
  log.info('account deleted', session.email);
  return { ok: true };
}

/**
 * That this provider deletes accounts itself, rather than calling a server RPC.
 *
 * Read by `js/settings-main.js` to choose between `deleteAccountData()` and
 * `accountApi.deleteAccount()`. A named flag rather than a comparison against
 * `loadProvider()`'s return value, because "which provider am I" is a fact about the
 * provider and belongs in it.
 */
export const deletesAccountsInPlace = true;

export async function requestPasswordReset() {
  log.warn('password reset is not available on the local provider');
  return { ok: false, reason: 'reset_unavailable' };
}

export async function updatePassword() {
  log.warn('password update is not available on the local provider');
  return { ok: false, reason: 'reset_unavailable' };
}