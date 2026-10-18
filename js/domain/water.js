/**
 * Water: the medium — evaporation, rain, and what a plot holds afterwards.
 *
 * ## Why this is a module and not part of `farm.js`
 *
 * `farm.js` sows and harvests. This is the third thing — the one that makes a crop
 * worth planting — and it is a different responsibility with different inputs: the
 * clock, the weather, and the gold balance rather than the bag.
 *
 * ## Why the pump is not in here
 *
 * Because it is a different responsibility, and it is a **machine** rather than a medium.
 * Whether it is on, which square it points at and what that costs is `pump.js`; this file
 * decides what a plot *holds* once the sky and the pump have both had their say.
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

import { HEALTH, OPTIMAL, WATER } from '../config/game.js';
import { cropOf } from '../config/crops.js';
import {
  EVAPORATION_PER_HOUR,
  RAIN_WATER_PER_HOUR,
  classifyHour,
  rateFor,
} from '../config/weatherEvents.js';
import { indexOfHour } from './weather.js';
import { costOf, pumpRun } from './pump.js';
import { applyDamage, damageFor } from './damage.js';

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

  // The machine's business — is it on, where is it aimed, what does that cost — is
  // `pump.js`, and the target is handed in rather than looked up there: the pump
  // imports nothing from this file, so there is no cycle and each module knows exactly
  // what it depends on.
  const aimed = state.plots.find((p) => p.id === state.pump?.target);
  const run = pumpRun(
    state,
    hours,
    aimed ? targetFor(aimed) : WATER.max,
    aimed ? ratesFor(aimed, eventId).dry : 0,
  );
  const pumpedId = run.plot ? run.plot.id : null;

  const plots = state.plots.map((plot) => {
    const rates = ratesFor(plot, eventId);
    const before = plot.waterLevel ?? 0;
    const isPumped = pumpedId !== null && plot.id === pumpedId && run.autoOff !== 'gold';

    let level;
    let dryHours;

    if (isPumped) {
      // **The pump is modelled as a rate against evaporation, not as one lump at the
      // end of the window.** This is the fix for the second half of ISS-091: delivering
      // 85 units *after* a 30-hour dry spell says the plot spent 22 hours at zero and
      // was then watered, which is not what a pump running for 30 hours does. Filled at
      // 90/h against 10.8/h of evaporation the plot simply never dips — and since 90/h
      // beats the worst possible evaporation (24/h, bare soil in drought) the net is
      // always positive, so a pumped plot is **never dry at all**.
      const net = run.grossPerHour + rates.rain - rates.dry;
      level = Math.min(
        aimed ? targetFor(plot) : WATER.max,
        WATER.max,
        Math.max(0, before + net * hours),
      );
      dryHours = 0;
    } else {
      level = settlePlot(plot, eventId, hours);

      // **Dry *duration*, not dry elapsed.** A plot at level `L` drying at `dry`/hour
      // reaches 0 at `L / dry`, so it is genuinely dry for `hours - that`, and nothing at
      // all before it. The old code charged the whole period whenever the plot *ended*
      // at 0, so a plot that got there in its last second was billed for all twelve
      // hours: away 12 h cost 60 health instead of ~14, and 20 h killed a crop in one
      // step with no chance to react.
      dryHours = rates.dry > 0
        ? Math.max(0, hours - (before / rates.dry))
        : (before <= 0 ? hours : 0);
    }

    const health = plot.health > 0
      ? Math.max(0, Math.round(plot.health - HEALTH.dryDrainPerHour * dryHours))
      : plot.health;

    // **Health 0 marks the crop `dead`.** Until this, nothing in the codebase ever set
    // `dead: true` — the dead sprite in `plotLayers.js`, the `plot--dead` class in
    // `farmView.js`, the fifth click case in `plotClick.js` and the `<cropId>_dead.png`
    // assets were all wired and waiting for a writer that did not exist. Dryness is
    // the writer, and this is the only place it should be: a domain function that owns
    // the rule, rather than three readers inferring it.
    //
    // Only crops die. Bare soil at 0 health is not a thing to clear.
    const died = plot.cropId != null && !plot.dead && health <= 0;

    // **Damage latches here**, not in a reader, and it latches off *duration* — how
    // long the plot spent outside its band — rather than off the endpoint. See
    // `damage.js` for why that distinction is the whole point.
    // **The pump gets its own window**, because a pumped plot climbs fast and then holds,
    // and interpolating it across the whole period would report a drought it did not have.
    const window = isPumped
      ? pumpedWindow(plot, bandFor(plot), run.grossPerHour, rates, hours)
      : timeOutsideBand(plot, bandFor(plot), before, level, hours);
    const damaged = applyDamage({ ...plot, health, dead: died || plot.dead },
      damageFor(plot, window));

    if (level === before
      && health === plot.health
      && damaged.damage === plot.damage
      && !died) return plot;

    // Water is rounded to a tenth for the same reason as health: this is saved every
    // second, and it is drawn as a percentage. `0.1` is finer than a player can see and
    // coarse enough not to drift.
    return {
      ...damaged,
      waterLevel: Math.round(level * 10) / 10,
    };
  });

  const deaths = plots.filter((p, i) => p.dead && !state.plots[i].dead && p.cropId != null);
  const damaged = plots.filter(
    (p, i) => p.damage && p.damage !== state.plots[i].damage && p.cropId != null,
  );
  const pump = state.pump ?? { on: false, target: null };

  return {
    state: {
      ...state,
      plots,
      gold: Math.max(0, (state.gold ?? 0) - run.spent),
      // An empty purse turns it **off**, not merely idle: it cannot restart itself, and a
      // toggle that reads "on" while billing nothing is a lie. A full plot leaves it on,
      // so the player only has to pick the next square.
      pump: run.autoOff === 'gold' ? { ...pump, on: false } : pump,
      lastTickAt: now,
    },
    spent: run.spent,
    watered: run.watered,
    autoOff: run.autoOff,
    deaths,
    damaged,
  };
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

  const net = WATER.pumpPerSecond * 3600 - ratesFor(plot, eventId).dry;
  if (net <= 0) return null;

  return {
    needed: Math.round(needed),
    minutes: Math.ceil((needed / net) * 60),
    gold: costOf(needed),
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

  return {
    in: rates.rain,
    out: rates.dry,
    net,
    // How long until it hits the floor, and therefore when the player should care.
    minutesToFull: net < 0 && level > floor
      ? Math.ceil(((level - floor) / -net) * 60)
      : null,
  };
}
