/**
 * The pump: the machine, and the bill.
 *
 * ## Why this is separate from `water.js`
 *
 * `water.js` is the **medium** — evaporation, rain, and what a plot holds afterwards.
 * This is the **machine** — whether it is switched on, which square it is pointed at,
 * and what that costs. The split is by responsibility rather than by convenience, and it
 * happened to match a filename `docs/team/ownership.md` had been listing for this exact
 * file all along.
 *
 * ## Why the target arrives as an argument
 *
 * `pumpRun` needs to know where to stop, and that number is derived from the crop. It
 * does **not** import `water.js` to find out: `water.js` imports this module for
 * `pumpRun`, so importing back would be a cycle. Instead the caller passes the target
 * in, which also makes the function honest about what it depends on — it bills, it
 * delivers, it stops, and it knows nothing about crops.
 *
 * ## One plot at a time
 *
 * `state.pump` is `{ on, target }`. `target` is a plot id and it is **one** of them, not
 * a list, because a per-second gold bill that scaled with the number of plots would
 * price water by **how much land you own** rather than **how thirsty you are**. That is
 * the wrong incentive, and it would make buying land a decision about pump bills
 * instead of about crops.
 *
 * `target: null` while `on: true` is a real state, not an invalid one: it is where an
 * auto-off leaves things. The toggle stays on so the player picks a plot and carries
 * on, rather than returning to find the pump mysteriously off with no explanation.
 */

import { PUMP, WATER } from '../config/game.js';

/**
 * The pump as it actually stood at the start of `hours`, and what that cost.
 *
 * Pure, and it takes the elapsed span as an argument rather than reading a clock, so the
 * billing is testable without a store, a timer or a `Date.now()` stub.
 *
 * **Stops at the crop's target, not at `WATER.max`.** Filling past the point of any use
 * costs gold and buys nothing, so "water this for 30–60 minutes" is a promise the game
 * has to be able to keep. A plot already at or over its target is not watered at all and
 * costs nothing — which is what makes the meter worth reading before you switch it on.
 *
 * **Two ways it stops itself**, and both are deliberate:
 *
 * - **A full plot** — it would be charging for water past the point of any use.
 * - **An empty purse** — it bills gold continuously, and a pump that keeps running into
 *   an empty account charges for nothing.
 *
 * **The bill is for the water that actually replaced what went.** It is
 * `missing + evaporated`, not `missing` — because a pump holding a full plot is still
 * running and still replacing the 10.8/h the sun takes out of it. Billing only the
 * shortfall gave free water: `missing` is zero on a plot already at its target, so
 * `water.js` pinning it there meant it never billed again, and a 300-hour hold would
 * have cost nothing.
 *
 * @param {object} state
 * @param {number} hours elapsed, already clamped to >= 0
 * @param {number} target where to stop, from `targetFor(plot)`
 * @param {number} dryRate units/hour evaporation at this plot right now, so the bill
 *   covers replacement and not just top-up
 * @returns {{plot: object|null, watered: number, spent: number, autoOff: string|null, needed: number, grossPerHour: number}}
 *   `autoOff` is `'gold'` or `'full'`, so the caller can say *why* rather than leaving
 *   the player to work it out from a meter that stopped moving. `needed` is how much
 *   water was missing, which is what the panel turns into "22 min to optimal".
 *   `grossPerHour` is handed back so `water.js` can model the fill as a **rate against
 *   evaporation** rather than as one lump at the end of the window.
 */
export function pumpRun(state, hours, target = WATER.max, dryRate = 0) {
  const pump = state.pump ?? { on: false, target: null };
  const id = pump.on ? pump.target : null;
  const plot = id == null ? null : state.plots.find((p) => p.id === id);
  const grossPerHour = WATER.pumpPerSecond * 3600;

  // It only runs if it has somewhere to run. A dead crop cannot be watered, and `target`
  // pointing at one means the player switched plots rather than moving the pump.
  if (!plot || plot.dead || hours <= 0) {
    return { plot: null, watered: 0, spent: 0, autoOff: null, needed: 0, grossPerHour };
  }

  const missing = Math.max(0, target - (plot.waterLevel ?? 0));
  const capacity = grossPerHour * hours;
  const delivered = Math.min(missing + dryRate * hours, capacity);

  // Rounded to whole cents before it is compared against the purse. A bill of
  // 0.4999999999 gold is not "more than half a gold", and letting binary floating point
  // decide whether the player can afford to switch the pump on is not a rule.
  const spent = Math.round((delivered / WATER.pumpPerSecond) * PUMP.upkeepPerSecond * 100) / 100;

  if (spent > (state.gold ?? 0)) {
    // Ran out mid-interval. Deliver only what the remaining gold actually pays for —
    // what happened, not what was attempted.
    const affordable = ((state.gold ?? 0) / PUMP.upkeepPerSecond) * WATER.pumpPerSecond;
    return {
      plot,
      watered: Math.max(0, Math.min(delivered, affordable)),
      spent: state.gold ?? 0,
      autoOff: 'gold',
      needed: missing,
      grossPerHour,
    };
  }

  return {
    plot,
    watered: delivered,
    spent,
    // "Full" means it reached the target *and* replaced what dried while getting
    // there — not merely that the shortfall was covered.
    autoOff: missing + dryRate * hours <= capacity ? 'full' : null,
    needed: missing,
    grossPerHour,
  };
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
 * Turn the pump on or off, keeping its aim.
 *
 * Switching it back on resumes onto the same plot rather than making the player re-aim,
 * so the toggle is not a punishment for tapping it.
 *
 * @param {object} state
 * @param {boolean} on
 * @returns {object} state
 */
export function setPump(state, on) {
  return { ...state, pump: { ...(state.pump ?? {}), on: Boolean(on) } };
}

/**
 * Point the pump at one plot and start it.
 *
 * Refuses land the player does not own and land with a dead crop: a pump pointed at a
 * padlocked square would bill gold for water nobody can use, which is the one thing a
 * meter that says "running" must never do.
 *
 * A running pump **claims the plot click** before any other handler, because watering is
 * what the player is doing and a planted plot is the most common thing to want to water.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok: true, state: object}|{ok: false, reason: string}}
 */
export function aimPump(state, plotId) {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot || !plot.owned || plot.dead) return { ok: false, reason: 'bad_plot' };

  return {
    ok: true,
    state: {
      ...state,
      pump: { ...(state.pump ?? { on: false }), on: true, target: plotId },
    },
  };
}