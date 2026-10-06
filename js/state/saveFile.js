/**
 * Reading and writing the game save file.
 *
 * Split out of `store.js` to keep that file inside the ~200-line budget, and so
 * the validation rules for a save live in one readable place.
 *
 * This module, and `store.js`, are the only code in the project that touches
 * localStorage for game data. Every call is guarded: `localStorage` throws
 * outright in some private-browsing modes, and a farm game must survive that by
 * running in memory rather than dying.
 */

import { createLog } from '../utils/log.js';
import { STATE_VERSION } from '../config/game.js';
import { AUTH_KEYS } from '../config/auth.js';

const log = createLog('saveFile');

/** Where one user's save lives. */
export function saveKey(userId) {
  // The prefix comes from config rather than being spelled out here, so there is
  // one place that decides the key. The two were duplicated, and a change to one
  // would have silently orphaned every existing save.
  return userId ? `${AUTH_KEYS.savePrefix}${userId}` : null;
}

/** Write immediately. Returns false when storage refused. */
export function writeSave(userId, state) {
  const key = saveKey(userId);
  if (!key || !state) return false;

  try {
    localStorage.setItem(key, JSON.stringify({ version: STATE_VERSION, state }));
    return true;
  } catch (error) {
    log.warn('save failed -', error.message);
    return false;
  }
}

/**
 * Read a user's save, or null when there is none worth using.
 *
 * Three things count as "none": no key, unreadable storage, or a payload we
 * cannot trust. A corrupt save becomes a fresh farm rather than a blank screen —
 * the player loses progress, which is bad, but they still get to play.
 */
export function readSave(userId) {
  const key = saveKey(userId);
  if (!key) return null;

  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch (error) {
    log.warn('load failed -', error.message);
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STATE_VERSION || !parsed.state) {
      log.warn('save is version', parsed?.version, '- ignoring');
      return null;
    }
    return parsed.state;
  } catch (error) {
    log.warn('save is corrupt, starting fresh -', error.message);
    return null;
  }
}

/** Delete a user's save. */
export function deleteSave(userId) {
  const key = saveKey(userId);
  if (!key) return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    log.warn('could not clear save -', error.message);
  }
}