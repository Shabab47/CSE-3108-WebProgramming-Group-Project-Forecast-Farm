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
  // **0.5 → 0.05, applying ISS-008's recommendation.** The old rate delivered
  // 1800 water/hour against heavy rain's 50/hour — the 36× that issue was filed
  // about. This delivers 180/hour, so the pump is 3.6× rain rather than 36×: still
  // the faster option, but not the only one worth having.
  //
  // At 0.05 a plot fills from empty in 2000 s, which is a real fraction of a
  // six-hour crop rather than a 200 s afterthought.
  pumpPerSecond: 0.05,
  startLevel: 0,
};

export const PUMP = {
  // **0.05 → 0.01, to keep the pump's price proportionate after the rate cut.**
  // At the old rate a full plot cost 10 gold; scaling the rate down 10× without
  // scaling the upkeep down would have made one full plot cost 100 gold, which is
  // the entire profit margin on a rice harvest.
  //
  // At 0.01 the pump delivers **5 water per gold**, so filling one plot to 100 costs
  // **20 gold** against a 200-gold rice harvest — a fifth of the margin, which is a
  // real decision without being ruinous.
  upkeepPerSecond: 0.01,
  price: 250, // not used in the MVP; the pump is pre-owned (DEC-008)
};

export const HEALTH = {
  max: 100,
  dryDrainPerHour: 5,
};

/** Simulator interval. Also how often the field redraws, so growth is visible. */
export const TICK_MS = 1000;

/**
 * Debug override: how many times faster crops grow, from `?fast=N` in the URL.
 *
 * **Rice takes six real hours.** That is correct for the game and useless for
 * looking at it — you cannot watch a crop reach stage 2, let alone harvest one, in a
 * sitting. `?fast=60` divides every grow time by sixty, so a rice cycle takes six
 * minutes and the sprite changes about every six seconds.
 *
 * It reads the URL and nothing else:
 *
 *  - **Off unless asked for.** A player who types the query gets it; nobody else does.
 *  - **Never saved.** It is not part of the state object, so it cannot leak into a
 *    save, an export, or another player's farm. Closing the tab ends it.
 *  - **Does not touch gold.** Prices and payouts are unchanged, so a sped-up farm
 *    earns exactly what a real one would — the debug flag shows you the loop, it does
 *    not make the game easier.
 *
 * Anything unparseable, zero, negative or absurd falls back to 1 rather than
 * producing a zero-length grow time.
 */
export function growthSpeed() {
  if (typeof location === 'undefined' || !location.search) return 1;

  const raw = Number(new URLSearchParams(location.search).get('fast'));
  if (!Number.isFinite(raw) || raw < 1) return 1;

  return Math.min(raw, 1000);
}

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