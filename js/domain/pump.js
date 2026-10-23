/**
 * The pump: the machine, its level, and the bill.
 *
 * ## Why this is separate from `water.js`
 *
 * `water.js` is the **medium** — evaporation, rain, and what a plot holds afterwards.
 * This is the **machine** — whether it is switched on, which squares it is watering,
 * what those squares need, and what that costs. The split is by responsibility rather
 * than by convenience.
 *
 * ## A level, and a list of targets
 *
 * `state.pump` is `{ on, level, targets }`. The level decides how many plots one pump
 * can water at once (`PUMP.levels` in `config/game.js`); `targets` is the list the
 * player has clicked. Every outlet delivers the full pump rate, so the gold bill still
 * tracks **how much water lands**, not how much land the player owns. That is the rule
 * DEC-040 was protecting, kept while letting the machine grow (DEC-058).
 *
 * An empty `targets` with `on: true` is a real state, not an invalid one: it is where
 * an auto-off leaves things. The toggle stays on so the player picks a plot and carries
 * on, rather than returning to find the pump mysteriously off with no explanation.
 */

import { DIFFICULTY, PUMP, WATER } from '../config/game.js';

/**
 * The plot ids the pump is aimed at, in order.
 *
 * Reads the current `targets` list and the older single `target`, so a save that has
 * not been through `ensurePump()` still behaves. The migration writes the new shape;
 * this is the one compatibility read that keeps a stray old object from being mistaken
 * for "not aimed at anything".
 *
 * @param {object} state
 * @returns {number[]}
 */
export function pumpTargetIds(state) {
  const pump = state?.pump;
  if (!pump || typeof pump !== 'object') return [];
  const raw = Array.isArray(pump.targets)
    ? pump.targets
    : (pump.target == null ? [] : [pump.target]);
  return raw.filter((id) => Number.isInteger(id));
}

/** The pump's current level. Unknown or missing values read as the free level 1. */
export function pumpLevelOf(state) {
  const level = state?.pump?.level;
  return PUMP.levels.some((entry) => entry.level === level) ? level : 1;
}

/** The level's entry from `PUMP.levels`. */
export function pumpLevelInfo(state) {
  return PUMP.levels.find((entry) => entry.level === pumpLevelOf(state)) ?? PUMP.levels[0];
}

/** How many plots this pump can water at once. */
export function pumpCapacity(state) {
  return pumpLevelInfo(state).capacity;
}

/**
 * Water up to one pump-capacity's worth of plots, and bill for the water delivered.
 *
 * Pure, and it takes the elapsed span as an argument rather than reading a clock, so the
 * billing is testable without a store, a timer or a `Date.now()` stub.
 *
 * **Stops each plot at its own target, not at `WATER.max`.** Filling past the point of
 * any use costs gold and buys nothing, so "water this for 30–60 minutes" is a promise the
 * game can keep. A plot already at or over its target is not watered and costs nothing —
 * which is what makes the meter worth reading before the pump is switched on.
 *
 * **The bill is for the water that actually replaced what went.** It is
 * `missing + evaporated`, not `missing` — because a pump holding a full plot is still
 * running and still replacing the water the sun takes out of it. Billing only the
 * shortfall gave free water: `missing` is zero on a plot already at its target, so
 * `water.js` pinning it there meant it never billed again, and a 300-hour hold would
 * have cost nothing.
 *
 * **Two ways it stops itself**, and both are deliberate:
 *
 * - **All targets full** — it would be charging for water past the point of any use.
 * - **An empty purse** — it bills gold continuously, and a pump that keeps running into
 *   an empty account charges for nothing.
 *
 * Gold is spent in target order. If the purse cannot cover the next target's water, the
 * pump stops before delivering to it: the plots before it get their water, and neither the
 * target that could not be paid for nor any later target is watered or billed. Charging
 * the remaining gold for water that never reached the soil was the old behaviour, and it
 * made the purse lie about what the meter got.
 *
 * @param {object} state
 * @param {number} hours elapsed, already clamped to >= 0
 * @param {{plot: object, target: number, dryRate: number}[]} jobs one entry per target,
 *   with the target and evaporation rate `water.js` derived from that plot
 * @returns {{runs: object[], watered: number, spent: number, autoOff: string|null,
 *   grossPerHour: number}} `runs` is one result per plot in job order. `autoOff` is
 *   `'gold'` or `'full'` when the whole machine stopped itself, so the caller can say
 *   why rather than leaving the player to work it out from a meter that stopped moving.
 */
export function pumpRuns(state, hours, jobs = []) {
  const pump = state.pump ?? {};
  const grossPerHour = WATER.pumpPerSecond * 3600;
  const empty = { runs: [], watered: 0, spent: 0, autoOff: null, grossPerHour };

  if (!pump.on || hours <= 0) return empty;

  const seen = new Set();
  const valid = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const plot = job?.plot;
    if (!plot || plot.dead || seen.has(plot.id)) continue;
    seen.add(plot.id);
    valid.push(job);
  }
  if (valid.length === 0) return empty;

  // The machine can only reach its level's capacity, whatever a hand-edited save or a
  // caller puts in the job list. `aimPump` refuses at the edge; this is the second lock
  // on the same door, and the one the tick actually passes through.
  const usable = valid.slice(0, pumpCapacity(state));

  let remainingGold = state.gold ?? 0;
  let watered = 0;
  let spent = 0;
  let goldOut = false;
  const runs = [];

  for (const job of usable) {
    const { plot } = job;
    const target = Number.isFinite(job.target) ? job.target : WATER.max;
    const dryRate = Number.isFinite(job.dryRate) ? job.dryRate : 0;
    const missing = Math.max(0, target - (plot.waterLevel ?? 0));
    const capacity = grossPerHour * hours;

    // A plot already at its target is not watered and is not billed. The bill is for
    // water that actually lands, and `water.js` clamps the level to the crop's target;
    // once `missing` is zero there is nowhere for the pump's output to go.
    if (missing <= 0) {
      runs.push({ plot, watered: 0, spent: 0, autoOff: 'full', needed: 0, grossPerHour });
      continue;
    }

    const delivered = Math.min(missing + dryRate * hours, capacity);

    // Rounded to whole cents before it is compared against the purse. A bill of
    // 0.4999999999 gold is not "more than half a gold", and letting binary floating
    // point decide whether the player can afford to run the pump is not a rule.
    const gross = Math.round((delivered / WATER.pumpPerSecond) * PUMP.upkeepPerSecond * 100) / 100;

    // **Easy mode runs the pump for nothing.** The water is still delivered — `watered`
    // is unchanged, so the meter still fills — it is simply not billed. The decision
    // lives here because this is the module that owns what the pump costs.
    const cost = state.difficulty === DIFFICULTY.easy ? 0 : gross;

    if (cost > remainingGold) {
      // The purse cannot cover this target's water. Stop before delivering it rather than
      // taking the last few gold for a fraction of the interval that `water.js`, which
      // settles an auto-stopped run as unpumped, would then not apply. What is returned
      // is what actually happened: no water, no charge, and the machine switches off.
      runs.push({
        plot,
        watered: 0,
        spent: 0,
        autoOff: 'gold',
        needed: missing,
        grossPerHour,
      });
      goldOut = true;
      break;
    }

    runs.push({
      plot,
      watered: delivered,
      spent: cost,
      // "Full" means it reached the target *and* replaced what dried while getting
      // there — not merely that the shortfall was covered.
      autoOff: missing + dryRate * hours <= capacity ? 'full' : null,
      needed: missing,
      grossPerHour,
    });
    watered += delivered;
    spent += cost;
    remainingGold -= cost;
  }

  const autoOff = goldOut
    ? 'gold'
    : (runs.length > 0 && runs.every((entry) => entry.autoOff === 'full') ? 'full' : null);

  return { runs, watered, spent, autoOff, grossPerHour };
}

/**
 * The pump as it actually stood for **one** plot, and what that cost.
 *
 * Kept as the single-target view of `pumpRuns()`: the first target in order, or none.
 * The weather tests use it to price one plot without constructing a job list, and it
 * keeps the shape the rest of the codebase already understood while the pump itself
 * grew a target list.
 *
 * @returns {{plot: object|null, watered: number, spent: number, autoOff: string|null,
 *   needed: number, grossPerHour: number}}
 */
export function pumpRun(state, hours, target = WATER.max, dryRate = 0) {
  const id = pumpTargetIds(state)[0] ?? null;
  const plot = id == null ? null : state.plots.find((p) => p.id === id);
  const result = pumpRuns(state, hours, plot ? [{ plot, target, dryRate }] : []);
  const run = result.runs[0];
  if (!run) {
    return { plot: null, watered: 0, spent: 0, autoOff: null, needed: 0, grossPerHour: result.grossPerHour };
  }
  return run;
}

/**
 * What a given amount of water costs, in gold.
 *
 * Exported so a caller — a price label, the panel's estimate, a test — can quote the
 * pump without running it. The rate is **5 water per gold**, so a plot from empty to
 * rice's target of 85 costs 17 gold against a 200-gold rice harvest.
 *
 * @param {number} units
 * @returns {number} gold, to whole cents
 */
export function costOf(units) {
  const gold = (units / WATER.pumpPerSecond) * PUMP.upkeepPerSecond;
  return Math.round(gold * 100) / 100;
}

/**
 * Turn the pump on or off, keeping its level and its targets.
 *
 * Switching it back on resumes onto the same plots rather than making the player re-aim,
 * so the toggle is not a punishment for tapping it.
 *
 * @param {object} state
 * @param {boolean} on
 * @returns {object} state
 */
export function setPump(state, on) {
  return {
    ...state,
    pump: {
      on: Boolean(on),
      level: pumpLevelOf(state),
      targets: pumpTargetIds(state),
    },
  };
}

/**
 * Add one plot to the pump and start it. If the plot is already a target, this just
 * switches the machine on; removing it is `removePumpTarget()`.
 *
 * Refuses land the player does not own, land with a dead crop, and a full machine. A
 * pump pointed at a padlocked square would bill gold for water nobody can use, which is
 * the one thing a meter that says "running" must never do.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok: true, state: object, added: boolean}|{ok: false, reason: string,
 *   level?: number, capacity?: number}}
 */
export function aimPump(state, plotId) {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot || !plot.owned || plot.dead) return { ok: false, reason: 'bad_plot' };

  const targets = pumpTargetIds(state);
  const already = targets.includes(plotId);
  if (!already && targets.length >= pumpCapacity(state)) {
    return { ok: false, reason: 'pump_full', level: pumpLevelOf(state), capacity: pumpCapacity(state) };
  }

  return {
    ok: true,
    added: !already,
    state: {
      ...state,
      pump: {
        on: true,
        level: pumpLevelOf(state),
        targets: already ? targets : [...targets, plotId],
      },
    },
  };
}

/**
 * Stop watering one plot, leaving the rest of the machine alone.
 *
 * The pump switches itself off when the last target is removed: a machine that is on
 * with nowhere to water is a state the player did not ask for, and one more tap should
 * not be needed to undo it.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {object} state
 */
export function removePumpTarget(state, plotId) {
  const targets = pumpTargetIds(state).filter((id) => id !== plotId);
  return {
    ...state,
    pump: {
      on: targets.length > 0 ? Boolean(state.pump?.on) : false,
      level: pumpLevelOf(state),
      targets,
    },
  };
}

/**
 * Add if absent, remove if present.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok: true, state: object, added: boolean}|{ok: false, reason: string,
 *   level?: number, capacity?: number}}
 */
export function togglePumpTarget(state, plotId) {
  if (pumpTargetIds(state).includes(plotId)) {
    return { ok: true, state: removePumpTarget(state, plotId), added: false };
  }
  return aimPump(state, plotId);
}
