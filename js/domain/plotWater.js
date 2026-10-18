/**
 * One plot's water: what it should hold, and where it is.
 *
 * ## Why this is separate from `water.js`
 *
 * `water.js` is the **tick** — it advances every plot from the clock, the sky and the
 * pump. This is the **vocabulary**: the target a crop aims for, the band around it, the
 * four states between, and the rates the meter reads out. Pure functions over a plot,
 * no state, no clock, no store.
 *
 * The split is by responsibility and it happens to break a cycle. The tick needs the
 * band, the band needs the target, and the estimate needs the rates; all of those are
 * questions about a single plot, so they live together here and `water.js` imports them.
 * Nothing here imports `water.js`, so there is no cycle to untangle later.
 *
 * ## The one rule that holds the two together
 *
 * **A level is a reading; a band is a judgement about it.** `waterState()` turns one into
 * the other, and every consumer — the meter, the panel, the warnings, the damage latch
 * — goes through it rather than comparing numbers of its own. That is why 40 water is
 * `optimal` for wheat and `low` for rice without anybody special-casing a crop.
 */

import { OPTIMAL, WATER } from '../config/game.js';
import { cropOf } from '../config/crops.js';
import {
  EVAPORATION_PER_HOUR,
  RAIN_WATER_PER_HOUR,
  rateFor,
} from '../config/weatherEvents.js';
import { costOf } from './pump.js';

/* --- the target: what this plot should hold ---------------------------------- */

/**
 * The water a plot is aiming for.
 *
 * `target = base + perNeed × waterNeed`, so **the thirsty crop wants more and the
 * hardy one wants less** — rice 85, corn 70, wheat 55. This is the payoff for
 * `waterNeed` being a number rather than a word: before this it only scaled how fast
 * a crop dried, and now it also decides what "done" looks like.
 *
 * Bare soil gets a flat `OPTIMAL.bareTarget`, because there is no crop to want
 * anything and the ground sprite switches at its own threshold regardless.
 *
 * @param {object} plot
 * @returns {number} 0 for a plot with no crop and no water need
 */
export function targetFor(plot) {
  const crop = cropOf(plot?.cropId);
  if (typeof crop?.waterNeed !== 'number') return OPTIMAL.bareTarget;
  return Math.round(OPTIMAL.base + OPTIMAL.perNeed * crop.waterNeed);
}

/**
 * The comfortable band for a plot, as `[floor, target]`.
 *
 * `slack` is a **fraction of the target**, so the give scales with how much water the
 * crop wants at all: rice has 21 units of room to be a bit low, wheat only 14. That
 * is the right shape — a thirsty crop can afford to sag, a hardy one cannot.
 *
 * @param {object} plot
 * @returns {{floor: number, target: number}}
 */
export function bandFor(plot) {
  const target = targetFor(plot);
  return { floor: Math.round(target * (1 - OPTIMAL.slack)), target };
}

/**
 * Where a plot's water sits relative to its band.
 *
 * Five states, because the interesting one is the middle: `low` is the plot that is
 * not in trouble yet but is going to be, and it is the state the meter exists to
 * let a player act on *before* anything is lost.
 *
 * @param {object} plot
 * @returns {'dry'|'low'|'optimal'|'saturated'}
 */
export function waterState(plot) {
  const level = plot?.waterLevel ?? 0;
  const { floor, target } = bandFor(plot);
  if (level <= 0) return 'dry';
  if (level < floor) return 'low';
  if (level <= target) return 'optimal';
  return 'saturated';
}
/**
 * How fast one plot dries and fills, in units per hour.
 *
 * Two halves that are deliberately not symmetric:
 *
 * - **Drying scales with the crop's `waterNeed`.** Rice is 0.9 and wheat 0.5, so the
 *   thirsty crop needs the pump more often — which is the whole reason `waterNeed`
 *   exists as a number rather than a word. **Bare soil counts as `1`** and so dries
 *   fastest, per `docs/crops.md`.
 * - **Rain does not.** Rain falls on the plot, not on the crop, so every plot fills at
 *   the event's rate regardless of what is growing in it.
 *
 * The formula is the one in `docs/crops.md`, and the table's Evaporation column is a
 * **multiplier** on `WATER.baseDecayPerHour`, not an absolute rate:
 *
 * ```
 * water lost per hour = WATER.baseDecayPerHour * waterNeed * event.evaporation
 * ```
 *
 * That distinction is the difference between a plot drying in 8 hours of sun (the spec's
 * 12/h, roughly one crop life) and one drying in 133 hours (the same table read as an
 * absolute rate), and only the first makes watering a decision.
 *
 * @param {object} plot
 * @param {string} eventId
 * @returns {{dry: number, rain: number}} units per hour
 */
export function ratesFor(plot, eventId) {
  const crop = cropOf(plot.cropId);
  const thirst = typeof crop?.waterNeed === 'number' ? crop.waterNeed : 1;
  const evaporation = rateFor(EVAPORATION_PER_HOUR, eventId);

  return {
    dry: WATER.baseDecayPerHour * thirst * evaporation,
    rain: rateFor(RAIN_WATER_PER_HOUR, eventId),
  };
}
/**
* The water level moves **linearly** over a tick — one constant drying rate in, one
 * constant filling rate out — so the start and the end determine the whole path and the
 * crossing time is exact rather than estimated. That is why this takes both levels
 * instead of a net rate: it removes a whole class of "was it above or below at the
 * start?" bugs, including the one where a plot sitting exactly on its target while the
 * rain came could not be seen to go over it.
 *
 * A plot the pump is holding is held **at** its target and never above it, so its `end`
 * equals its target and it reports nothing. That is correct rather than lucky: the pump
 * exists to stop you over-watering.
 *
 * @param {object} plot read for `cropId` only
 * @param {object} band from `bandFor(plot)`
 * @param {number} start water at the beginning of the period
 * @param {number} end water at the end of it
 * @param {number} hours
 * @returns {{belowFloor: number, aboveTarget: number}}
 */
/**
 * How long a **pumped** plot spent outside its band.
 *
 * Not `timeOutsideBand`, and the difference matters. That function assumes the level
 * moves linearly from start to end across the whole period — which is right for the
 * weather, and wrong for the pump, because the pump fills fast and then *holds*.
 *
 * Interpolating a plot from 5 water to 85 across a 30-hour catch-up says it spent 22
 * hours under its floor. It did not: the pump fills it in about forty minutes and then
 * keeps it at its target for the remaining twenty-nine and a half. Interpolating that
 * is what made a rescued crop read as a drought victim — the same defect as the death
 * message, one layer down.
 *
 * So: climb at the net rate, then flat. The bad time is the climb and nothing else, and
 * there is never any time above the target, because the pump stops *at* it.
 *
 * @param {object} plot
 * @param {object} band from `bandFor(plot)`
 * @param {number} grossPerHour what the pump delivers
 * @param {object} rates from `ratesFor(plot, eventId)`
 * @param {number} hours
 * @returns {{belowFloor: number, aboveTarget: number}}
 */
export function pumpedWindow(plot, band, grossPerHour, rates, hours) {
  if (hours <= 0 || !plot.cropId) return { belowFloor: 0, aboveTarget: 0 };

  const net = grossPerHour + rates.rain - rates.dry;
  const start = plot.waterLevel ?? 0;
  if (net <= 0 || start >= band.floor) return { belowFloor: 0, aboveTarget: 0 };

  // Time to climb clear of the floor, and never more than the period itself.
  return { belowFloor: Math.min(hours, (band.floor - start) / net), aboveTarget: 0 };
}

/** See `sideOf` below — this is the general case, for the weather and not the pump. */
export function timeOutsideBand(plot, band, start, end, hours) {
  if (hours <= 0 || !plot.cropId) return { belowFloor: 0, aboveTarget: 0 };

  return {
    belowFloor: sideOf(start, end, hours, band.floor, 'below'),
    aboveTarget: sideOf(start, end, hours, band.target, 'above'),
  };
}

/**
 * How long a level sat on one side of a line, given where it started and ended.
 *
 * `level(t) = start + (end - start) * t / hours`, so the crossing is at
 * `t = (line - start) * hours / (end - start)` and the answer follows from which side
 * each end is on. Four cases, and all four matter:
 *
 * | start | end | answer |
 * | :--- | :--- | :--- |
 * | same side as the line | — | 0 if it ends clear, the whole period if not |
 * | on the wrong side, **rising** | crosses | the time *before* it arrives |
 * | on the wrong side, **falling** | crosses | the time *after* it arrives |
 *
 * The rising case is the one that was wrong twice. A plot the pump is lifting out of a
 * drought is below the floor for the time it takes to climb out — not for the whole
 * period, and not for none of it.
 *
 * @param {number} start
 * @param {number} end
 * @param {number} hours
 * @param {number} line the floor or the target
 * @param {'below'|'above'} side which side of `line` is being counted
 * @returns {number} hours
 */
function sideOf(start, end, hours, line, side) {
  const below = side === 'below';
  const startBad = below ? start < line : start > line;
  const endBad = below ? end < line : end > line;

  if (!startBad && !endBad) return 0;
  if (startBad && endBad) return hours;

  const span = end - start;
  if (span === 0) return hours;

  // Time until it reaches the line. Rising into line means the bad part is *before*
  // that; falling out of it means the bad part is *after*.
  const crossing = ((line - start) * hours) / span;
  return below === span > 0 ? crossing : hours - crossing;
}
/**
 * Minutes the pump would need to bring this plot to its target, and what that costs.
 *
 * **The read-out the whole design hangs on.** "30 to 60 minutes" is a promise, and a
 * promise nobody can see is a rumour. This is what puts the number on screen.
 *
 * It accounts for evaporation happening **while** the pump runs, because the plot is
 * being dried the whole time it is being filled. Filled at 90/h against 10.8/h of
 * evaporation the net is 79.2/h, so the honest answer is `needed / (pump ’ dry)`. The
 * naive `needed / pump` understates it by about 12% on rice in sun and rather more in
 * drought — which is exactly the weather where a player most wants the number to be
 * right, and where the sign matters most: a drought dries harder, so it takes **longer**
 * to water for, and a figure that added the dry rate instead of subtracting it said the
 * exact opposite.
 *
 * Returns null when the plot is already at its target, because then there is nothing to
 * quote and the panel should say so rather than "0 min".
 *
 * @param {object} plot
 * @param {string} eventId
 * @returns {{minutes: number, gold: number, needed: number}|null}
 */
export function minutesToOptimal(plot, eventId) {
  const needed = Math.max(0, targetFor(plot) - (plot.waterLevel ?? 0));
  if (needed <= 0) return null;

  const dry = ratesFor(plot, eventId).dry;
  const net = WATER.pumpPerSecond * 3600 - dry;
  if (net <= 0) return null;

  const minutes = Math.ceil((needed / net) * 60);

  // **The quote has to pay for the evaporation too, or it is a lie.**
  //
  // Reaching the target takes `minutes`, and for every one of those minutes the sun is
  // taking water back out — so the pump delivers `needed + dry × hours`, not `needed`.
  // Quoting `costOf(needed)` undercounted by the replacement it would go on to charge
  // for: 17 gold quoted against 19.05 actually spent on rice in full sun, a 12% gap in
  // exactly the dry, bright case where a player most needs the number to be right.
  //
  // The bill itself rounds to whole cents per tick, so the quote is built from the same
  // rounded total rather than a fresh unrounded division — otherwise the meter and the
  // bill disagree in the last decimal, which is worse than either being slightly off.
  const delivered = needed + dry * (minutes / 60);

  return {
    needed: Math.round(needed),
    minutes,
    gold: costOf(delivered),
  };
}

/**
 * The rate picture for a plot right now: what is going in, what is coming out.
 *
 * The meter shows this rather than only a bar, because "why is this falling" is the
 * question a player actually has, and the answer is two numbers and a sign. In drought
 * `net` goes negative and the player can see exactly how much more pumping they owe.
 *
 * @param {object} plot
 * @param {string} eventId
 * @returns {{in: number, out: number, net: number, minutesToFull: number|null}}
 */
export function flowFor(plot, eventId) {
  const rates = ratesFor(plot, eventId);
  const { floor, target } = bandFor(plot);
  const level = plot.waterLevel ?? 0;
  const net = rates.rain - rates.dry;

  // **Rounded to a tenth, because this is printed.** `8 * 0.9 * 0.8` is 5.760000000000001
  // and the panel was offering the player that. The same lesson as `health` in `water.js`,
  // and it arrived the same way: correct arithmetic, absurd output.
  const round = (n) => Math.round(n * 10) / 10;

  return {
    in: round(rates.rain),
    out: round(rates.dry),
    net: round(net),
    // How long until it hits the floor, and therefore when the player should care.
    minutesToFull: net < 0 && level > floor
      ? Math.ceil(((level - floor) / -net) * 60)
      : null,
  };
}
