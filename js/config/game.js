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

/* --- network ---------------------------------------------------------------- */

/**
 * Deadline for every auth request.
 *
 * Added with ISS-049. A `fetch` with no signal hangs forever on a half-open
 * connection, and `gotrue.js` sits on the boot path — so a hang meant the 15 s
 * race in `restoreSession()` fired and reported a logout that had not happened.
 *
 * Matches the deadline `saveApi.js` and `authApi.rest()` already use, so one
 * number governs how long the game waits on the server anywhere.
 */
export const AUTH_TIMEOUT_MS = 10_000;

/**
 * Last-resort ceiling on session restore, deliberately above `AUTH_TIMEOUT_MS`.
 *
 * A backstop, not the primary defence: `authApi.rest()` and `gotrue.post()` each
 * have their own deadline, so this only fires if a future change breaks that
 * assumption. Never delete it — without it a hang means `restoreSession()` never
 * settles, `start()` never reaches `location.replace(LOGIN_URL)`, and the player
 * is left on a permanently blank page.
 */
export const RESTORE_HARD_LIMIT_MS = 15_000;

/**
 * How long to wait before retrying a queued server save after a failure.
 *
 * Without this the 10 s autosave interval re-fires a request that is certain to
 * fail for as long as the connection is down, which wastes requests and tells the
 * player nothing. See ISS-050.
 */
export const SAVE_RETRY_BACKOFF_MS = 30_000;