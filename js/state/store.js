/**
 * The game state store.
 *
 * The single writer of game state. Persistence lives in `saveFile.js`, which is
 * the only other module that touches localStorage for game data. Saves are per
 * user: `forecastFarm.save.v1:<userId>`, so two people on one machine do not
 * share a farm.
 */

import { createLog } from '../utils/log.js';
import { SAVE_DEBOUNCE_MS } from '../config/game.js';
import { importFromText } from './transfer.js';
import { buildInitialState, normaliseSession } from './initialState.js';
import { deleteSave, readSave, writeSave } from './saveFile.js';
import { exportFilename, exportToText } from './transfer.js';

const log = createLog('store');

let state = null;
let userId = null;
let saveTimer = null;

/**
 * The server-side save, when there is one.
 *
 * Injected rather than imported, because `check-imports.mjs` stops `state/`
 * importing `services/` — the token lives in the auth provider and cannot cross
 * that line. `js/main.js` builds it and hands it in at `init()`.
 *
 * Shape: `{ read(): Promise<{ok, state}|{ok:false, reason}>, write(state) }`.
 * `userId` is already known here, so it is not a parameter.
 *
 * localStorage stays as the offline cache underneath it. The server is the
 * authority when it answers; when it does not — offline, table missing, timeout
 * — play continues from the cache rather than failing. See
 * `supabase/migrations/001_farm_saves.sql`.
 */
let remote = null;

const subscribers = new Set();
const busListeners = new Map();

/* --- reads --------------------------------------------------------------- */

/** The current state. Null until `init` has run. */
export function getState() {
  return state;
}

/**
 * Subscribe to state changes.
 *
 * The listener is called once immediately with the current state, so a panel
 * never has to render itself separately before its first update.
 *
 * @param {(state: object|null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(fn) {
  subscribers.add(fn);
  fn(state);
  return () => subscribers.delete(fn);
}

function notify() {
  for (const fn of subscribers) {
    try {
      fn(state);
    } catch (error) {
      log.error('subscriber threw -', error.message);
    }
  }
}

/* --- event bus -----------------------------------------------------------
 * Transient messages that are not state: toasts, one-shot signals. */

export function on(name, fn) {
  if (!busListeners.has(name)) busListeners.set(name, new Set());
  busListeners.get(name).add(fn);
  return () => busListeners.get(name)?.delete(fn);
}

export function emit(name, payload) {
  for (const fn of busListeners.get(name) ?? []) {
    try {
      fn(payload);
    } catch (error) {
      log.error(`listener for "${name}" threw -`, error.message);
    }
  }
}

/* --- writes -------------------------------------------------------------- */

/**
 * Run a pure domain function against the state and commit its result.
 *
 * A domain function returns `{ ok: true, state }` or `{ ok: false, reason }`.
 * On failure nothing changes and a `toast` carrying the reason is emitted, so
 * every caller gets the same error handling for free.
 */
export function apply(fn, ...args) {
  if (!state) return { ok: false, reason: 'store not initialised' };

  let result;
  try {
    result = fn(state, ...args);
  } catch (error) {
    log.error('domain function threw -', error.message);
    emit('toast', { message: 'Something went wrong. Please try again.', tone: 'error' });
    return { ok: false, reason: 'exception' };
  }

  if (!result?.ok) {
    const reason = result?.reason ?? 'Unknown error';
    emit('toast', { message: reason, tone: 'error' });
    return { ok: false, reason };
  }

  state = result.state;
  notify();
  save();
  return { ok: true };
}

/**
 * Build the initial state: load this user's save if there is one, otherwise start
 * a brand new farm. Either way the session goes into state.
 *
 * `remote` is the server-side save, if the game has one. When given, it is
 * consulted first and localStorage is the fallback; when omitted — a guest, a
 * test, or the local provider — behaviour is exactly as before.
 *
 * The two-step matters: the server is the authority, but a player whose network
 * dropped mid-session keeps playing from their last local copy rather than losing
 * the farm. It is written back on the next successful save.
 *
 * @param {{status:string, userId:string, email:string, farmerName:string}|null} session
 * @param {(session: object|null) => object} [build] injectable for tests
 * @param {{read:Function, write:Function}|null} [server] injected by main.js
 * @returns {{state: object, loaded: boolean, fromServer: boolean}}
 */
export async function init(session, build = buildInitialState, server = null) {
  userId = session?.userId ?? 'anon';
  remote = server;

  let saved = null;
  let fromServer = false;

  if (remote) {
    const result = await remote.read();
    if (result.ok && result.state) {
      saved = result.state;
      fromServer = true;
    } else if (!result.ok) {
      // Not an error the player needs to see. The local copy below covers it.
      log.warn('server save unavailable, using the local copy -', result.reason);
    }
  }

  if (!saved) saved = load();

  state = saved ? adoptSession(saved, session) : build(session);

  log.info(fromServer ? 'resumed farm from server' : saved ? 'resumed farm' : 'new farm', 'for', userId);
  notify();

  // Written now, not debounced: a farm first persisted by the autosave would be
  // lost if the tab closed in the next 800 ms.
  await saveNow();
  return { state, loaded: Boolean(saved), fromServer };
}

/**
 * A resumed save keeps its farm but takes the live session. A save can be days
 * old, so its session may be a guest session or a user who has since signed out;
 * the live one is authoritative, or signing back in resurrects the old identity.
 */
function adoptSession(saved, session) {
  return { ...saved, session: normaliseSession(session) };
}

/** Drop the in-memory state. Used on sign-out. */
export function reset() {
  state = null;
  userId = null;
  remote = null;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  subscribers.clear();
  busListeners.clear();
}

/* --- persistence ---------------------------------------------------------
 * The debounce lives here rather than in `saveFile.js`, because it is about how
 * often the game mutates state, not about how a save is stored. */

/** Queue a write. The simulator ticks at 1 Hz, so writes are coalesced. */
export function save() {
  if (!state || !userId) return false;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
  return true;
}

/**
 * Write now, bypassing the debounce. Used on pagehide.
 *
 * localStorage first, always: it is synchronous, so the save is durable the
 * moment this returns even if the tab is closing and the network request will
 * not finish. The server write follows and is best-effort — if it fails, the
 * cache is still correct and the next save retries.
 */
export async function saveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!state || !userId) return false;

  const written = writeSave(userId, state);
  if (remote) {
    try {
      await remote.write(state);
    } catch (error) {
      // Never thrown out of a save. A dropped connection must not stop the game.
      log.warn('server save failed, local copy kept -', error.message);
    }
  }
  return written;
}

/** This user's save, or null when there is none worth using. */
export function load() {
  return readSave(userId);
}

/**
 * Delete this user's save.
 *
 * Both copies: the server row as well as the local cache, or signing out and back
 * in on the same machine would resurrect a farm the player just deleted.
 */
export async function clearSave() {
  deleteSave(userId);
  if (remote) {
    try {
      await remote.delete?.();
    } catch (error) {
      log.warn('could not clear the server save -', error.message);
    }
  }
}

/* --- import -----------------------------------------------------------------
 * Replacing the whole state is not `apply()`, because `apply()` takes a pure
 * domain function and a file is not one: there is no `ok:false` business rule to
 * fail, and the incoming state was not derived from the current one. So it gets
 * its own path, deliberately kept small and deliberately kept out of `apply()`.
 */

/**
 * Adopt a state built elsewhere, e.g. by importing a save file.
 *
 * Refuses unless `init()` has run, and refuses a different shape. The session is
 * re-stamped with the *live* one for the same reason `init()` does it: a file
 * carries the session that existed when it was exported, and adopting that
 * verbatim would let an imported file put a stale or forged identity in state.
 *
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function adoptState(next) {
  if (!state) return { ok: false, reason: 'store not initialised' };
  if (!next || typeof next !== 'object') return { ok: false, reason: 'nothing to import' };
  if (!Array.isArray(next.plots)) return { ok: false, reason: 'not a farm' };

  state = { ...next, session: normaliseSession(state.session) };
  log.info('adopted an imported farm for', userId);
  notify();
  // Written immediately, not debounced: the old save is still on disk and must
  // not outlive the decision to replace it.
  saveNow();
  return { ok: true };
}

/** The text for a download, and the filename to offer it under. */
export function exportPayload(now) {
  if (!state) return { ok: false, reason: 'store not initialised' };
  return {
    ok: true,
    text: exportToText(state, state.session, now),
    filename: exportFilename(now),
  };
}

/**
 * Read an exported file and hand back a state ready to adopt, rebased to now.
 *
 * Separate from `adoptState` on purpose: this only *parses and checks*, so the UI
 * can show the player whose farm it is and how old it is and get a yes or no
 * before anything on disk is replaced. An import that overwrote a farm before
 * asking would be the worst possible failure mode for the feature players reach
 * for when something has already gone wrong.
 *
 * @param {string} text
 * @param {number} now epoch ms
 */
export function readImport(text, now) {
  return importFromText(text, now);
}