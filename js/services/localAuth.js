/**
 * LOCAL auth provider — a stopgap, not the real thing.
 *
 * The real provider is `js/services/authApi.js`, owned by Shabab, calling the
 * Supabase REST API with plain `fetch()` (no supabase-js, per DEC-002). This
 * file exists so `loginPanel.js` has something to run against before that
 * lands, and it deliberately implements the **same contract**:
 *
 *   signIn({email, password})           → Promise<{ok:true, session} | {ok:false, reason}>
 *   signUp({email, password, farmerName}) → same
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
import { normaliseEmail, normaliseName } from '../utils/normalize.js';
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

function makeSession({ userId, email, farmerName }) {
  return { status: 'authed', userId, email, farmerName };
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

export async function signIn({ email, password }) {
  const key = normaliseEmail(email);
  const accounts = read(ACCOUNTS_KEY, {});
  const account = accounts[key];

  // Both branches return the same reason on purpose: telling them apart would
  // confirm which emails have accounts. authErrors.js neutralises it too, and
  // both layers are deliberate.
  const refused = { ok: false, reason: 'invalid_credentials' };
  if (!account) return refused;

  const hash = await derive(password, fromBase64(account.salt));
  if (!matches(hash, account.hash)) return refused;

  const session = makeSession(account);
  persist(session);
  log.info('signed in', key);
  return { ok: true, session };
}

export async function signUp({ email, password, farmerName }) {
  const key = normaliseEmail(email);
  const accounts = read(ACCOUNTS_KEY, {});

  // Specific on sign-up: the player typed this address, so it helps them and
  // reveals nothing they did not already know.
  if (accounts[key]) return { ok: false, reason: 'email_taken' };

  const salt = crypto.getRandomValues(new Uint8Array(HASH.saltBytes));
  const account = {
    userId: crypto.randomUUID(),
    email: key,
    farmerName: normaliseName(farmerName),
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