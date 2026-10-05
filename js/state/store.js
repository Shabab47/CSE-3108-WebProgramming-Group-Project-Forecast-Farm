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
import { buildInitialState, normaliseSession } from './initialState.js';
import { deleteSave, readSave, writeSave } from './saveFile.js';

const log = createLog('store');

let state = null;
let userId = null;
let saveTimer = null;

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
 * @param {{status:string, userId:string, email:string, farmerName:string}|null} session
 * @param {(session: object|null) => object} [build] injectable for tests
 * @returns {{state: object, loaded: boolean}}
 */
export function init(session, build = buildInitialState) {
  userId = session?.userId ?? 'anon';

  const saved = load();
  state = saved ? adoptSession(saved, session) : build(session);

  log.info(saved ? 'resumed farm' : 'new farm', 'for', userId);
  notify();

  // Written now, not debounced: a farm first persisted by the autosave would be
  // lost if the tab closed in the next 800 ms.
  saveNow();
  return { state, loaded: Boolean(saved) };
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

/** Write now, bypassing the debounce. Used on pagehide. */
export function saveNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return writeSave(userId, state);
}

/** This user's save, or null when there is none worth using. */
export function load() {
  return readSave(userId);
}

/** Delete this user's save. */
export function clearSave() {
  deleteSave(userId);
}