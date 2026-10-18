/**
 * Water: the medium — evaporation, rain, and what a plot holds afterwards.
 *
 * ## What lives here and what does not
 *
 * This is the **tick**: it advances every plot from the clock, the sky and the pump, and
 * it is the only writer of `waterLevel`, `health`, `damage` and `dead`.
 *
 * The **vocabulary** — the target, the band, the four states, the rates — is in
 * `plotWater.js`, because those are questions about a single plot rather than about a
 * whole farm. Importing them from here is what keeps that split from becoming a cycle.
 *
 * The **machine** — whether the pump is on, where it points, what it costs — is
 * `pump.js`. And the **committed** half, damage that never clears, is `damage.js`.
 *
 * ## Why everything is computed over *elapsed* time
 *
 * Nothing here runs on a timer that can be missed. `tick(state)` is given how long it
 * is and derives the change from that, so a tab that was closed for six hours dries and
 * waters exactly as it would have while open. A per-second `setInterval` would silently
 * under-apply after a sleep, and a farm that stops evaporating while you are asleep is
 * not a farm — it is a bug with good PR.
 *
 * `lastTickAt` on the state is what makes that work, and it already existed.
 */

import { HEALTH, WATER } from '../config/game.js';
import { classifyHour } from '../config/weatherEvents.js';
import { indexOfHour } from './weather.js';
import { pumpRun } from './pump.js';
import { bandFor, pumpedWindow, ratesFor, targetFor, timeOutsideBand } from './plotWater.js';
import { applyDamage, damageFor } from './damage.js';

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

