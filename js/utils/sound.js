/** Sound effects for the game.
 *
 * Plays a short .mp3 per key. Nothing blocks on audio: if the browser lacks
 * `Audio`, or a file 404s, the game carries on silently.
 *
 * The pump keeps a live loop handle so it can start/stop cleanly.
 *
 * Layering: imports only `config` (the `sfx()` path builder). Logs through
 * `utils/log.js` scope `sound`. Never touches the DOM.
 */

import { createLog } from './log.js';
import { sfx } from '../config/assets.js';
import { SFX_VOLUMES } from '../config/game.js';

const log = createLog('sound');

const HAVE_AUDIO = typeof Audio !== 'undefined';

/** One-shot effects already loaded, keyed by file name, so repeats don't
 *  re-fetch and can overlap themselves. */
const oneshot = new Map();

/** The pump loop handle, or null. */
let pumpLoop = null;

/** Play a one-shot effect by file name, e.g. `play('plant.mp3')`. */
export function play(key) {
  if (!HAVE_AUDIO) return;
  const url = sfx(key);
  let audio = oneshot.get(key);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    oneshot.set(key, audio);
  }
  // Restart from the start so rapid repeats still hear something.
  audio.currentTime = 0;
  // Per-effect volume, defaulting to full. Applied every call so a runtime
  // `setSfxVolume()` takes effect on the next play without re-creating the track.
  audio.volume = SFX_VOLUMES[key] ?? 1.0;
  const promise = audio.play();
  if (promise) {
    promise.catch((error) => {
      log.warn(`could not play ${key} -`, error.message);
    });
  }
}

/** Start the pump: plays `pump_running1.mp3` once. Idempotent while already
 * playing. */
export function startPumpLoop() {
  if (!HAVE_AUDIO) return;
  if (isPumpLooping()) return; // already running

  const start = new Audio(sfx('pump_running1.mp3'));
  start.volume = SFX_VOLUMES['pump_running1.mp3'] ?? 0.04;
  start.play().catch(() => {});
  log.info('pump start sound played');
}

/** Stop the pump start sound. Safe to call when nothing is playing. */
export function stopPumpLoop() {
  // No loop to stop; the start sound is a one-shot with no persistent handle.
  // Idempotent -- calling multiple times is harmless.
  log.info('pump stop called (no loop active)');
}

/** Whether the pump loop is currently playing. */
export function isPumpLooping() {
  return false;
}

/** Set the playback volume for one SFX key (0.0 = silent, 1.0 = full).
 *
 * Clamped to [0, 1]. Takes effect on the next `play(key)` and on any cached
 * track already loaded, so a running pump loop changes volume immediately.
 */
export function setSfxVolume(key, volume) {
  SFX_VOLUMES[key] = Math.max(0, Math.min(1, Number(volume)));
  const audio = oneshot.get(key);
  if (audio) audio.volume = SFX_VOLUMES[key];
}
