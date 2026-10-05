/**
 * Game-wide balance and timing constants.
 *
 * Placeholder values, per README assumption 4. Everything here is read by both
 * the domain rules and the simulator, so it lives in config rather than being
 * spread across the code that happens to use it.
 */

export const START_GOLD = 200;

export const WATER = {
  max: 100,
  wateredThreshold: 40, // ground renders "watered" at or above this
  baseDecayPerHour: 8,
  pumpPerSecond: 0.5, // see ISS-008 -- recommended 0.05, team decision pending
  startLevel: 0,
};

export const PUMP = {
  upkeepPerSecond: 0.05,
  price: 250, // not used in the MVP; the pump is pre-owned (DEC-008)
};

export const HEALTH = {
  max: 100,
  dryDrainPerHour: 5,
};

/** Simulator interval. */
export const TICK_MS = 1000;

/** Autosave interval, and the gap after which a reload counts as "offline". */
export const AUTOSAVE_MS = 10000;
export const OFFLINE_THRESHOLD_MS = 60000;

/** Writes coalesce over this window, so the 1 Hz tick does not hammer storage. */
export const SAVE_DEBOUNCE_MS = 800;

/** Save payload version. */
export const STATE_VERSION = 1;