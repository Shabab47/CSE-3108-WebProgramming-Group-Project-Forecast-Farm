/**
 * Water: the pump, the rain, and the drying.
 *
 * ## Why this is a module and not part of `farm.js`
 *
 * `farm.js` sows and harvests. This is the third thing — the one that makes a crop
 * worth planting — and it is a different responsibility with different inputs: the
 * clock, the weather, and the gold balance rather than the bag.
 *
 * ## Why everything is computed over *elapsed* time
 *
 * Nothing here runs on a timer that can be missed. `tick(state)` is given how long
 * it is and derives the change from that, so a tab that was closed for six hours
 * dries and waters exactly as it would have while open. A per-second `setInterval`
 * would silently under-apply after a sleep, and a farm that stops evaporating while
 * you are asleep is not a farm — it is a bug with good PR.
 *
 * `lastTickAt` on the state is what makes that work, and it already existed.
 */

import { HEALTH, PUMP, WATER } from '../config/game.js';
import { cropOf } from '../config/crops.js';
import { EVAPORATION_PER_HOUR, RAIN_WATER_PER_HOUR, rateFor } from '../config/weatherEvents.js';
import { classifyHour, eventRank } from '../config/weatherEvents.js';
import { indexOfHour } from './weather.js';

/**
 * The weather in the hour containing `now`, as an event id.
 *
 * The **current** hour rather than the next six: water is happening now, so it is
 * judged by what is happening now. `verdictFor()` looks forward because it decides a
 * planting; this looks at the present because it is settling a bill.
 *
 * @param {object} state
 * @param {number} now
 * @returns {string} an event id, or `'cloudy'` when there is no forecast
 */
export function currentEvent(state, now) {
  const hourly = state?.weather?.hourly;
  if (!hourly?.time?.length) return 'cloudy';
  const index = indexOfHour(hourly.time, now);
  return classifyHour({
    weatherCode: hourly.weatherCode?.[index],
    temperature: hourly.temperature?.[index],
    humidity: hourly.humidity?.[index],
    windSpeed: hourly.windSpeed?.[index],
    precipitationProbability: hourly.precipitationProbability?.[index],
  });
}

/**
 * How fast one plot dries and fills, in units per hour.
 *
 * Two halves that are deliberately not symmetric:
 *
 * - **Drying scales with the crop's `waterNeed`.** Rice is 0.9 and wheat 0.5, so the
 *   thirsty crop needs the pump more often — which is the whole reason `waterNeed`
 *   exists as a number rather than a word.
 * - **Rain does not.** Rain falls on the plot, not on the crop, so every planted
 *   plot fills at the event's rate regardless of what is growing in it.
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
    dry: plot.cropId ? evaporation * thirst : evaporation * 0.5,
    rain: rateFor(RAIN_WATER_PER_HOUR, eventId),
  };
}

/** One plot's water after `hours`, before any pumping. */
function settlePlot(plot, eventId, hours) {
  if (hours <= 0) return plot.waterLevel ?? 0;

  const { dry, rain } = ratesFor(plot, eventId);
  // Rain and evaporation are applied in that order and **not** simply summed: a rainy
  // hour has zero evaporation in the tables, so the order only matters at the edges
  // of a rain band, and applying rain last is the reading a player expects — it is
  // raining, the ground is wet.
  const dried = (plot.waterLevel ?? 0) - dry * hours;
  const wet = dried + rain * hours;

  return Math.max(0, Math.min(WATER.max, wet));
}

/**
 * Advance every plot's water to `now`, and bill for a pump that ran.
 *
 * The pump waters **one plot at a time** — `pump.target` — because a per-second cost
 * across sixteen plots would make the bill scale with how much land you own rather
 * than with how thirsty you are, which is the wrong incentive.
 *
 * **The pump auto-stops at zero gold and at a full plot.** A pump that keeps billing
 * into an empty purse, or past 100 water, is charging for nothing.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {{state: object, spent: number, watered: number, autoOff: string|null}}
 *   `autoOff` is `'gold'` or `'full'` when the pump stopped itself, so the caller can
 *   say why rather than leaving the player to work it out.
 */
export function tick(state, now = Date.now()) {
  const hours = elapsedHours(state, now);
  if (hours <= 0) return { state, spent: 0, watered: 0, autoOff: null };

  const eventId = currentEvent(state, now);
  let spent = 0;
  let watered = 0;
  let autoOff = null;

  const pump = state.pump ?? { on: false, target: null };
  const targetId = pump.on ? pump.target : null;
  const target = targetId == null ? null : state.plots.find((p) => p.id === targetId);

  // The pump only runs if it has somewhere to run. `target: null` is the state after
  // an auto-off, and the toggle stays on so the player can pick a plot and carry on.
  const pumping = Boolean(pump.on && target && !target.dead);

  const seconds = hours * 3600;
  if (pumping) {
    const needed = WATER.max - (target.waterLevel ?? 0);
    const wanted = WATER.pumpPerSecond * seconds;
    const delivered = Math.min(needed, wanted);
    watered = delivered;
    spent = Math.round((delivered / WATER.pumpPerSecond) * PUMP.upkeepPerSecond * 100) / 100;

    if (spent > (state.gold ?? 0)) {
      // Ran dry mid-second. Deliver only what the remaining gold pays for, which is
      // what actually happened rather than what was attempted.
      const affordable = (state.gold ?? 0) / PUMP.upkeepPerSecond * WATER.pumpPerSecond;
      watered = Math.max(0, Math.min(delivered, affordable));
      spent = state.gold ?? 0;
      autoOff = 'gold';
    } else if (needed <= wanted) {
      autoOff = 'full';
    }
  }

  const plots = state.plots.map((plot) => {
    let level = settlePlot(plot, eventId, hours);

    // Pumped plots are topped up *after* the weather, so a pump running through rain
    // does not appear to lose the race.
    if (pumping && plot.id === targetId && autoOff !== 'gold') {
      level = Math.min(WATER.max, level + watered);
    }

    const before = plot.waterLevel ?? 0;
    if (level === before) return plot;

    // **Dryness damages health.** This is the mechanism behind "your crops are in
    // drought", and it is the second way weather reaches a crop — the first being the
    // verdict at sowing.
    const health = plot.cropId && plot.health > 0
      ? Math.max(0, plot.health - dryDamage(plot, eventId, hours, level))
      : plot.health;

    return { ...plot, waterLevel: level, health };
  });

  return {
    state: {
      ...state,
      plots,
      gold: Math.max(0, (state.gold ?? 0) - spent),
      pump: autoOff === 'gold' ? { ...pump, on: false } : pump,
      lastTickAt: now,
    },
    spent,
    watered,
    autoOff,
  };
}

/**
 * Health lost to dryness over `hours`.
 *
 * Only while the plot ends up **below** `DRY_WATER`, and only at `HEALTH.dryDrainPerHour`.
 * The `HEALTH.dryDrainPerHour` constant existed from the start and was read by
 * nothing; this is its first reader.
 */
function dryDamage(plot, eventId, hours, endLevel) {
  if (!plot.cropId || endLevel >= 30) return 0;
  const heat = rateFor(EVAPORATION_PER_HOUR, eventId) >= 3 ? 1.5 : 1;
  return HEALTH.dryDrainPerHour * hours * heat;
}

/**
 * Hours since `lastTickAt`.
 *
 * Clamped at zero: a save whose `lastTickAt` is in the future (a hand-edited file, a
 * clock change) must not dry the farm backwards.
 *
 * @param {object} state
 * @param {number} now
 * @returns {number}
 */
export function elapsedHours(state, now) {
  const last = state?.lastTickAt;
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, (now - last) / 3_600_000);
}

/**
 * Is this plot in trouble right now?
 *
 * Two kinds, and they need different words: **dry** is about water and the pump
 * answers it; **drought** is the weather doing it. A single boolean would let the
 * notification say "use the pump" about a heatwave, which the pump cannot fix.
 *
 * @param {object} plot
 * @param {string} eventId
 * @returns {{dry: boolean, heat: boolean, drought: boolean}}
 */
export function plotTrouble(plot, eventId) {
  const level = plot.waterLevel ?? 0;
  return {
    dry: level < 30,
    heat: eventRank(eventId) <= 2,
    drought: eventId === 'drought',
  };
}

/* --- the controls ----------------------------------------------------------- */

/** Turn the pump on or off. `target` is kept, so switching back on resumes. */
export function setPump(state, on) {
  return { ...state, pump: { ...(state.pump ?? {}), on: Boolean(on) } };
}

/**
 * Point the pump at one plot, and start it.
 *
 * Refuses a plot the player does not own or that is dead — a pump pointed at a
 * locked square would bill gold for water nobody can use.
 */
export function aimPump(state, plotId) {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot || !plot.owned || plot.dead) return { ok: false, reason: 'bad_plot' };

  return {
    ok: true,
    state: { ...state, pump: { ...(state.pump ?? { on: false }), on: true, target: plotId } },
  };
}
