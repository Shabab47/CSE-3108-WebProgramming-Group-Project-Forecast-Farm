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

import { DIFFICULTY, HEALTH, WATER } from '../config/game.js';
import { classifyHour } from '../config/weatherEvents.js';
import { indexOfHour } from './weather.js';
import { harvestsIn } from '../land_squares/index.js';
import { pumpRuns, pumpTargetIds } from './pump.js';
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

/**
 * Is this plot one that nothing is allowed to hurt?
 *
 * True only in easy mode, and only for a crop that has finished growing — which is what
 * `harvestsIn().ready` answers. Kept as its own function rather than inlined at the call
 * site because "ripe **and** easy" is a rule with two halves, and a rule written twice is
 * a rule that will be written one way in one place and another way in the other.
 *
 * The readiness half is what makes this narrow on purpose: `harvestsIn` also reports
 * `ready: false` for a dead crop, so a dead crop is never "protected" — it is already
 * past saving, and `clearPlot` is how it leaves.
 *
 * @param {object} state
 * @param {object} plot
 * @param {number} now
 * @returns {boolean}
 */
export function isProtected(state, plot, now) {
  if (state?.difficulty !== DIFFICULTY.easy) return false;
  if (!plot?.cropId || plot.dead) return false;
  return harvestsIn(plot, now).ready;
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
 * The pump waters every plot in `pump.targets`, up to the machine's level capacity.
 * Every outlet delivers the same rate, so the bill scales with how much water lands
 * rather than with how much land the player owns (DEC-040, extended by DEC-058).
 *
 * **The pump auto-stops at zero gold and when every target is full.** A pump that keeps
 * billing into an empty purse, or past the last useful drop, is charging for nothing.
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
  // `plantedAt` and `damageAt` are game time, so the latch is stamped on the same
  // clock the crop was planted on. `lastTickAt` stays wall time: the debug offset
  // moves growth and this timestamp together, but not the water the sky delivered.
  const at = now + (state?.clock?.timeOffsetMs ?? 0);

  // The machine's business — is it on, which plots are targeted, what does that cost —
  // is `pump.js`, and each target and its evaporation rate are handed in rather than
  // looked up there: the pump imports nothing from this file, so there is no cycle and
  // each module knows exactly what it depends on.
  const jobs = [];
  for (const id of pumpTargetIds(state)) {
    const plot = state.plots.find((p) => p.id === id);
    if (!plot) continue;
    jobs.push({ plot, target: targetFor(plot), dryRate: ratesFor(plot, eventId).dry });
  }
  const run = pumpRuns(state, hours, jobs);
  const pumped = new Map(run.runs.map((entry) => [entry.plot.id, entry]));

  const plots = state.plots.map((plot) => {
    // **Easy mode: a ripe crop is untouchable.**
    //
    // Returned before anything below touches it, so it cannot dry, cannot latch damage,
    // cannot lose health and cannot die. Its water meter holds where it was, too: with
    // nothing left to protect from, there is no dryness to track on a ripe crop, and the
    // meter comes back to life the moment the plot is harvested and replanted.
    //
    // **Ripe only, and that is the whole scope.** A crop still growing is *not* exempt:
    // it dries, damages and dies in easy mode exactly as it does in normal. What easy
    // removes is the pressure on someone who has already finished waiting — a ripe crop
    // stops being a countdown to a silently shrinking payout. See `DIFFICULTY` in
    // `js/config/game.js`, and the settings card, which says so in as many words.
    if (isProtected(state, plot, now)) return plot;

    const rates = ratesFor(plot, eventId);
    const before = plot.waterLevel ?? 0;
    const pumpRun = pumped.get(plot.id);
    const isPumped = Boolean(pumpRun) && pumpRun.autoOff !== 'gold';

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
      const net = pumpRun.grossPerHour + rates.rain - rates.dry;
      level = Math.min(
        targetFor(plot),
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
    // **Only plots with a crop can latch damage.** Bare soil has no crop to damage,
    // and a plot that was bare when damage latched must not carry that damage into a
    // newly planted crop. See test "a plot with no crop cannot be damaged".
    const window = isPumped
      ? pumpedWindow(plot, bandFor(plot), pumpRun.grossPerHour, rates, hours)
      : timeOutsideBand(plot, bandFor(plot), before, level, hours);
    const damaged = plot.cropId != null
      ? applyDamage({ ...plot, health, dead: died || plot.dead }, damageFor(plot, window), at)
      : { ...plot, health, dead: died || plot.dead };

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
  const pump = state.pump ?? { on: false, level: 1, targets: [] };

  return {
    state: {
      ...state,
      plots,
      gold: Math.max(0, (state.gold ?? 0) - run.spent),
      // **The pump stops itself when every target is full and at an empty purse** — the
      // two reasons it would otherwise be charging for water nobody can use. An empty
      // purse cannot restart itself, and full targets have nothing left to deliver, so
      // neither leaves the toggle reading "on" while billing nothing. That was a lie the
      // meter used to tell: the point sat at its target and the gold kept falling.
      //
      // Both auto-offs are the same event to the player — the machine did its job — so the
      // `autoOff` code is returned either way and `farmActions` says which.
      pump: run.autoOff ? { ...pump, on: false } : pump,
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

