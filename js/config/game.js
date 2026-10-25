/**
 * Game-wide balance and timing constants.
 *
 * Placeholder values, per README assumption 4. Everything here is read by both
 * the domain rules and the simulator, so it lives in config rather than being
 * spread across the code that happens to use it.
 */

export const START_GOLD = 200;

export const WATER = {
  /**
   * **100 → 120, to make over-watering a real state.**
   *
   * At 100 there was no way to over-water: rain and the pump both clamped to the
   * same number that meant "perfectly watered", so *full* and *optimal* were the
   * same thing and the meter had nothing to aim at. The headroom above 100 is what
   * makes waterlogging reachable — rain can push a plot past its target, and
   * sustained saturation is the only thing that causes water damage.
   *
   * The target sits well below this (85 for the thirstiest crop), so the extra 20
   * is reachable but not trivially so.
   */
  max: 120,
  wateredThreshold: 40, // ground renders "watered" at or above this
  baseDecayPerHour: 8,
  // **0.05 → 0.028.** The rate is set by `OPTIMAL`, not by feel: a plot must take
  // **30–60 real minutes** to reach its target, which is roughly a tenth of a crop's
  // life. At 100.8 water/hour, and counting the evaporation happening the whole time
  // it fills (net 89.2/h on rice in sun), that is **58 min for rice, 36 for wheat,
  // 46 for corn** — inside the window, and only because the evaporation term is in
  // the calculation. Ignoring it puts rice at 57 *looking* fine while the honest
  // figure is 65, and the panel would be quoting a number the pump does not deliver.
  //
  // This also improves ISS-008 again: 100.8/hour against heavy rain's 50/hour is
  // **2×**, where it was 3.6× and before that 36×. Rain is free but you do not choose
  // when it arrives; the pump costs gold and is always there. That trade is the game.
  pumpPerSecond: 0.028,
  startLevel: 0,
};

/**
 * The water a plot should hold, per crop.
 *
 * `target = base + perNeed × crop.waterNeed`, which turns a number that used to
 * only scale evaporation into the thing the player is actually aiming for.
 *
 * | crop | waterNeed | target |
 * | :--- | ---: | ---: |
 * | rice | 0.9 | **85** |
 * | corn | 0.7 | 70 |
 * | wheat, potato, tomato | 0.5 | **55** |
 * | bare soil | — | 60 |
 *
 * **Why a band and not a line.** `slack` is a fraction of the target, so the
 * comfortable zone scales with how much water the crop wants at all: rice has 21
 * units of give, wheat only 14. That is right — a thirsty crop can afford to be
 * a bit low, a hardy one cannot.
 *
 * **The pump stops at the target**, not at `max`. Filling past the point of any use
 * costs gold and buys nothing, so "water this plot for 30–60 minutes" is a promise
 * the game can actually keep.
 */
export const OPTIMAL = {
  base: 17.5,
  perNeed: 75,
  /** Fraction of the target below which the crop is no longer comfortable. */
  slack: 0.25,
  /** Bare soil, which has no crop to want anything. */
  bareTarget: 60,
};

export const PUMP = {
  // **0.01 → 0.0056, holding 5 water per gold.** `pumpPerSecond / upkeepPerSecond` is
  // the price of a litre, and it has to move with the rate or the balance means
  // nothing: holding 0.01 would have made a full rice watering 24 gold, a quarter of
  // the harvest margin, for the same water.
  //
  // At 5 water per gold a full rice watering to 85 costs **17 gold** against a
  // 200-gold harvest, and a top-up from the dry line costs 11. Real, not ruinous.
  upkeepPerSecond: 0.0056,

  /**
   * The five pump levels, and what each buys.
   *
   * `capacity` is how many plots one pump can water at once. Every outlet delivers
   * the same rate, so upgrading widens what the machine can reach rather than making
   * water cheaper or faster. That keeps the per-litre price honest: the bill still
   * tracks how much water actually lands, not how much land the player owns.
   *
   * `requiredPlots` is the land gate — the same progression counter seed unlocks read
   * (`utils/seedUnlocks.js`), including the free starter plot. Level 1 is the
   * machine every new farm already owns, so its gate and price are both zero.
   *
   * The prices are deliberately steep at the top: 1,000 / 5,000 / 25,000 / 100,000.
   * A pump that can water sixteen plots at once is a late-game convenience, not a
   * purchase that competes with the next seed packet.
   */
  levels: [
    { level: 1, capacity: 1, requiredPlots: 0, price: 0 },
    { level: 2, capacity: 2, requiredPlots: 4, price: 1_000 },
    { level: 3, capacity: 4, requiredPlots: 8, price: 5_000 },
    { level: 4, capacity: 8, requiredPlots: 12, price: 25_000 },
    { level: 5, capacity: 16, requiredPlots: 16, price: 100_000 },
  ],
};

export const HEALTH = {
  max: 100,
  dryDrainPerHour: 5,
};

/**
 * Damage, and why it is a latch rather than a reading.
 *
 * ## The rule
 *
 * **Water is a live number; damage is a committed fact.** A plot's `waterLevel`
 * rises and falls every second, so it crosses any threshold repeatedly. A sprite
 * or a caption driven straight off it would strobe between two pictures of the
 * same crop — and `farmView.js` diffs tiles per frame, so the image `src` would
 * swap over and over. So the moment a plot crosses a damage line the damage is
 * **recorded on the plot** and never decreases.
 *
 * That is also the honest reading: a crop that has been through a real drought
 * does not un-sunburn because you watered it afterwards. And because every input
 * is ours — rain, evaporation and the pump are all numbers we add and subtract,
 * not sensors we read — a latched record is exactly reproducible on reload and in
 * an exported save.
 *
 * ## The three states
 *
 * | state | reached by | sprite |
 * | :--- | :--- | :--- |
 * | `dry` | at 0 water for long enough to matter | `<crop>_dry.png` |
 * | `waterlogged` | held saturated for long enough | `<crop>_waterlogged.png` |
 * | `dead` | health hit 0 | `<crop>_dead.png` |
 *
 * `dead` is `plot.dead`, which is a separate flag and takes priority.
 *
 * **Damage cuts the payout and never blocks the harvest.** `HEALTH.lossPerLatched`
 * is subtracted from health every time damage is latched, so a damaged crop still
 * harvests and is still worth picking — it is just worth less, permanently.
 * Blocking the harvest instead would rebuild the ISS-006 trap: a plot with nothing
 * to do until it is cleared by hand.
 *
 * The damage art is Zim's; see `cropFailureImg()` in `config/assets.js`.
 */
export const DAMAGE = {
  /** Which latched damage, if any, a plot can carry. Never two. */
  STATES: ['dry', 'waterlogged'],

  /**
   * Health removed each time damage is latched, on top of the per-hour drain.
   *
   * This is what makes damage permanent and worth avoiding rather than a cosmetic
   * label — it is subtracted from `plot.health`, which is what `harvest()` pays
   * out on.
   */
  lossPerLatched: 12,

  /**
   * Hours a plot must spend **below its optimal floor** before damage latches.
   *
   * The floor is per crop (`target × (1 - slack)`), so rice is held to 64 and wheat
   * to 41. A flat line would put wheat at "damaged" while it was still comfortably
   * optimal.
   */
  hoursBelowFloorToLatch: 1,

  /**
   * Hours a plot must hold **above its target** before waterlogging latches.
   *
   * Not instant. One shower must not cost a field — that is precisely what the
   * one-time verdict at sowing exists to prevent, and a threshold of zero would
   * undo that decision on every rain shower for the rest of the crop's life.
   */
  hoursAboveTargetToLatch: 2,
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

/**
 * Per-SFX playback volume, 0.0 (silent) to 1.0 (full).
 *
 * Applied in `js/utils/sound.js` `play()` by effect key, so a loud or repetitive
 * effect (a plot click, a UI pop, the pump's watering chime) can be turned down
 * without touching any call site. Anything not listed here plays at 1.0.
 *
 * These are balance placeholders — tune them against the real art, not in advance.
 */
export const SFX_VOLUMES = {
  /** Fired on every plot click, so it repeats a lot. */
  'click_p.mp3': 0.4,
  /** The inspector / picker open-close pop. */
  'pop.MP3': 0.0,
  /** The pump's watering chime, once per aimed plot. */
  'watering.mp3': 0.08,
  /** General UI button click. */
  'click.mp3': 0.3,
};

/**
 * How the farm treats a crop that has finished growing.
 *
 * ## The two modes
 *
 * |                | Normal          | Easy                          |
 * | :--- | :--- | :--- |
 * | ripe crop      | dries, damages, dies | cannot be harmed          |
 * | growing crop   | vulnerable      | **still vulnerable**            |
 * | pump           | costs gold      | free                            |
 *
 * **Normal is the default, and that is the important part of the decision.** Every farm
 * that exists today has no `difficulty` field in its save, so it reads as Normal — which
 * means adding this setting changes nobody's game until they go and change it. See
 * `ensureDifficulty` in `js/state/initialState.js`.
 *
 * ## Easy is narrower than its name
 *
 * **It protects a crop that has finished, and nothing else.** A crop still growing in easy
 * mode dries, takes damage and dies exactly as it does in normal — so watering still
 * matters and the pump is still the right button to press. What easy changes is the
 * pressure on a player who has already done the waiting: a ripe crop is not a countdown
 * to a shrinking payout, and the pump is free because there is no longer a risk to
 * insure against.
 *
 * That asymmetry is deliberate rather than a half-finished implementation, and it is why
 * the settings card states it in full. A player who reads "Easy" as "nothing can hurt my
 * crops" would be wrong, and the copy exists to stop that.
 *
 * **Growth is identical in both modes.** `growthProgress(cropId, elapsedHours)` takes no
 * health and no water, so a crop ripens on schedule either way. Easy never makes anything
 * faster; it only stops a ripe crop from being punished for the player's absence.
 */
export const DIFFICULTY = { easy: 'easy', normal: 'normal' };

/** Normal, so a save written before this setting existed behaves as it always has. */
export const DEFAULT_DIFFICULTY = DIFFICULTY.normal;

/** Whether a value is a difficulty this game knows about. Anything else is rejected. */
export function isDifficulty(value) {
  return value === DIFFICULTY.easy || value === DIFFICULTY.normal;
}

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