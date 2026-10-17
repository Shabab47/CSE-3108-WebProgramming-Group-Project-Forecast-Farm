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
import {
  DRY_WATER,
  EVAPORATION_PER_HOUR,
  RAIN_WATER_PER_HOUR,
  classifyHour,
  eventRank,
  rateFor,
} from '../config/weatherEvents.js';
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
 * @returns {{state: object, spent: number, watered: number, autoOff: string|null, deaths: object[]}}
 *   `autoOff` is `'gold'` or `'full'` when the pump stopped itself, so the caller can
 *   say why rather than leaving the player to work it out. `deaths` lists crops that
 *   reached 0 health this tick, so the caller can tell the player instead of leaving
 *   them to find greyed-out ground.
 */
export function tick(state, now = Date.now()) {
  const hours = elapsedHours(state, now);
  if (hours <= 0) return { state, spent: 0, watered: 0, autoOff: null, deaths: [] };

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

    // **Dryness damages health.** This is the mechanism behind "your crops are in
    // drought", and it is the second way weather reaches a crop — the first being the
    // verdict at sowing. It is the only path by which a planted crop can reach 0, since
    // the sowing verdict is floored at `WEATHER_HEALTH_FLOOR` on purpose.
    //
    // **Rounded to a whole point, because this is persisted.** The tick runs once a
    // second and multiplies two fractions, so unrounded it lands on values like
    // `39.99999861111111` — which then go into the save, and drift accumulates over a
    // long farm. Health is 0-100 and always was.
    const health = plot.health > 0
      ? Math.max(0, Math.round(plot.health - dryDamage(plot, hours, level)))
      : plot.health;

    // **Health 0 marks the crop `dead`.** Until this, nothing in the codebase ever set
    // `dead: true` — the dead sprite in `plotLayers.js`, the `plot--dead` class in
    // `farmView.js`, the fifth click case in `plotClick.js` and the `<cropId>_drought_
    // killed.png` assets were all wired and waiting for a writer that did not exist.
    // Dryness is the writer, and this is the only place it should be: a domain function
    // that owns the rule, rather than three readers inferring it.
    //
    // Only crops die. Bare soil at 0 health is not a thing to clear.
    const died = plot.cropId != null && !plot.dead && health <= 0;
    if (level === before && health === plot.health && !died) return plot;

    // Water is rounded to a tenth for the same reason as health: this is saved every
    // second, and it is drawn as a percentage. `0.1` is finer than a player can see and
    // coarse enough not to drift.
    return {
      ...plot,
      waterLevel: Math.round(level * 10) / 10,
      health,
      dead: died || plot.dead,
    };
  });

  const deaths = plots.filter((p, i) => p.dead && !state.plots[i].dead && p.cropId != null);

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
    deaths,
  };
}

/**
 * Health lost to dryness over `hours`.
 *
 * Per `docs/weather-events.md` "Dry drain and death": a plot at **`waterLevel == 0`**
 * loses `HEALTH.dryDrainPerHour` (5) on top of the matrix rating, **whether or not a crop
 * is planted**. Zero, not "below the dry line" — the `< 30` conditional in that document
 * belongs to the **drought matrix row**, which is applied at sowing by `verdictFor()`, not
 * to the drain here. Conflating the two would have drained health on plots that were
 * merely thirsty.
 *
 * Health on bare soil is harmless: `farm.plant()` overwrites it at sowing, and only a
 * planted plot's health is ever paid out.
 *
 * `HEALTH.dryDrainPerHour` was defined from the start and read by nothing. This is its
 * first reader, which is what makes it the *only* way a crop can die of anything other
 * than the weather forecast at planting.
 *
 * @param {object} plot
 * @param {number} hours
 * @param {number} endLevel water after this tick
 * @returns {number}
 */
function dryDamage(plot, hours, endLevel) {
  if (endLevel > 0) return 0;
  return HEALTH.dryDrainPerHour * hours;
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
 * Two kinds, and they need different words: **dry** is about water and the pump answers
 * it; **drought** is the weather doing it. A single boolean would let the notification
 * say "use the pump" about a heatwave, which the pump cannot fix — the pump adds water,
 * it does not lower the temperature.
 *
 * @param {object} plot
 * @param {string} eventId
 * @returns {{dry: boolean, heat: boolean, drought: boolean}}
 */
export function plotTrouble(plot, eventId) {
  const level = plot.waterLevel ?? 0;
  return {
    dry: level < DRY_WATER,
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
