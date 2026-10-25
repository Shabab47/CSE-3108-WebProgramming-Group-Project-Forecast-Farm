/**
 * Growth arithmetic, shared by all five crops.
 *
 * This is a helper, not a crop — it holds no crop data and knows nothing about rice
 * or wheat. It exists so the formula has **one** home: `config/crops.js` assembles
 * the crops, the picker reads them, and all five of them ask this module how far
 * along they are. Copy the formula into each crop and the fifth one is wrong within
 * a month.
 *
 * ## The rule
 *
 * ```
 * hoursElapsed = (now - plantedAt) / 3_600_000
 * hoursElapsed = clamp(hoursElapsed, 0, growHours)   // never negative, never past done
 * period       = growHours / 4                        // four growing sprites, evenly spaced
 * stage        = hoursElapsed >= growHours ? 5 : min(floor(hoursElapsed / period) + 1, 4)
 * ```
 *
 * **The stage advances on the hour and is stable in between.** The field re-renders
 * every second, but the sprite only changes when a whole hour has passed, so the art
 * does not flicker and the number on screen means something a player can hold on to.
 *
 * ## Why `STAGE_COUNT` is 5 and not `growHours`
 *
 * Rice takes six hours and there are five sprites. So the last hour holds stage 5:
 * a crop planted at 14:00 reaches `rice_5.png` at 19:00 and stays there until 20:00.
 * The alternative — five stages spread over six hours — gives every stage an uneven,
 * arbitrary slice of time and still lands on the same five files.
 *
 * `min(..., STAGE_COUNT)` is the load-bearing part. When `assets/images/crops/rice/rice_6.png`
 * lands, widen this one number and hour six picks up the new sprite on its own: no
 * crop file, no UI, and no formula changes. Until then it is what stops
 * `cropStageImg(cropId, 6)` building a URL that 404s and leaving a blank diamond at
 * the exact moment the player most wants to see the payoff.
 *
 * The stage is **never stored**, so growth keeps running while the tab is closed and
 * nothing has to be migrated when the formula changes. See `docs/crops.md`.
 */

/** Growth sprites that exist per crop, `rice_1.png` through `rice_5.png`. */
export const STAGE_COUNT = 5;

/**
 * The game's clock: **one real hour of play is half a month of crop growth.**
 *
 * A crop's `growHours` is its minimum real-life growing time in months divided by
 * this number, so rice (about 3 months) takes 6 real hours and an early potato,
 * tomato or sweet corn (about 2 months) takes 4. Change the scale here and every
 * crop follows; change a crop's `realMonths` and only that crop moves.
 */
export const MONTHS_PER_HOUR = 0.5;

/** Real-life months of growth -> real hours of play, under `MONTHS_PER_HOUR`. */
export function hoursForMonths(months) {
  return months / MONTHS_PER_HOUR;
}

/** Sprites that show a crop still growing; the last one (ripe) is reserved for harvest. */
export const GROWING_STAGES = STAGE_COUNT - 1;

/** The stages there are, so a caller can say "one of five" without hard-coding it. */
export const STAGES = [1, 2, 3, 4, 5];

/**
 * Which sprite a crop planted `elapsedHours` ago should be showing.
 *
 * @param {number} elapsedHours hours since planting; negatives and past-maturity both clamp
 * @param {number} growHours    the crop's full grow time
 * @returns {number} 1..STAGE_COUNT
 */
export function stageAt(elapsedHours, growHours) {
  if (!Number.isFinite(elapsedHours) || !Number.isFinite(growHours) || growHours <= 0) {
    return 1;
  }

  const clamped = Math.min(Math.max(elapsedHours, 0), growHours);

  // Ripe sprite only once the crop can actually be harvested.
  if (clamped >= growHours) return STAGE_COUNT;

  // The four growing sprites split the grow time evenly: a 6 h crop swaps every
  // 1.5 h, a 4 h crop every 1 h.
  const period = growHours / GROWING_STAGES;
  return Math.min(Math.floor(clamped / period) + 1, GROWING_STAGES);
}

/**
 * Which sprite to draw when a crop's stages do not start on consecutive hours.
 *
 * `stageAt()` spreads five sprites evenly over the grow time, so a six-hour crop
 * holds its last sprite for two hours. Most crops accept that. Tomato does not: it
 * holds **stage 4** for hours 3–5 and saves `tomato_5.png` for the final hour, so the
 * ripe picture is not on screen for two hours before the crop can actually be picked.
 *
 * The schedule is a crop's own data (`stageHours` in its file), not a branch here, so
 * adding a sixth crop with an unusual cadence is still a data change. Hours before the
 * first entry, and non-finite input, fall back to stage 1 exactly as `stageAt()` does.
 *
 * @param {number} elapsedHours hours since planting; negatives clamp to 0
 * @param {number[]} starts ascending hour at which each stage begins, e.g. `[0, 1, 2, 3, 5]`
 * @returns {number} 1..STAGE_COUNT
 */
export function stageFromHours(elapsedHours, starts) {
  if (!Array.isArray(starts) || starts.length === 0) return 1;
  if (!Number.isFinite(elapsedHours)) return 1;

  const elapsed = Math.max(elapsedHours, 0);
  let stage = 1;

  for (let i = 0; i < starts.length; i += 1) {
    if (elapsed >= starts[i]) stage = i + 1;
    else break;
  }

  return Math.min(stage, STAGE_COUNT);
}

/**
 * How far through its grow time a crop is, 0..1.
 *
 * Separate from `stageAt` because "how far along is it" is a different question
 * from "which picture do I draw", and the harvest rule needs the first one: a crop is
 * ready at `progress >= 1`, which is *not* the same test as `stage === STAGE_COUNT`,
 * since the final sprite is held for the whole last hour.
 *
 * @param {number} elapsedHours
 * @param {number} growHours
 * @returns {number} 0..1
 */
export function progressAt(elapsedHours, growHours) {
  if (!Number.isFinite(elapsedHours) || !Number.isFinite(growHours) || growHours <= 0) {
    return 0;
  }
  return Math.min(Math.max(elapsedHours / growHours, 0), 1);
}
