/**
 * The farm's crop rules: planting, growth and harvesting.
 *
 * Pure, like everything in `js/domain/`: state in, `{ok, state}` out, nothing
 * touched. `store.apply` is the only writer of game state, so this file decides what
 * an action *is* and `main.js` decides what happens next (a toast, and a save).
 *
 * Buying land is not here — it is `domain/land.js`, which is a separate concern with
 * its own reasons. And *what a click means* is `ui/plotClick.js`, because that is a
 * question about the interface, not about the rules.
 *
 * Refusal reasons are sentences rather than codes, because `store.apply` emits the
 * reason verbatim as a `toast` and a raw code reaching a player is worse than no
 * message at all. `docs/crops.md` explains the maths these rules implement.
 *
 * Three rules are enforced here rather than in the UI, because the UI is not the only
 * thing that can call this:
 *
 *  1. **You cannot plant land you do not own.** The locked plots are drawn with a
 *     padlock, but a hand-edited save or a stale click must not bypass that.
 *  2. **You cannot plant a plot that already has a crop**, and a dead one has to be
 *     cleared before the ground can be used again (ISS-006).
 *  3. **A harvest only pays out once the crop is actually ready.** Readiness is
 *     `progress >= 1`, deliberately *not* `stage === 5` — the final sprite is held
 *     for a whole hour, so judging by the picture would let a player pull a rice
 *     crop an hour early.
 */

import { cropOf, harvestValue } from '../config/crops.js';
import { HEALTH } from '../config/game.js';
import { isSeedUnlocked } from '../utils/seedUnlocks.js';
import { harvestsIn } from '../land_squares/index.js';
import { verdictFor } from './weather.js';

export const FARM_REASONS = {
  unknownPlot: 'That is not one of your plots.',
  unknownCrop: 'There is no such seed.',
  notOwned: 'That land is not yours yet. Buy it first.',
  occupied: 'Something is already growing there.',
  deadPlot: 'That crop is dead. Clear the plot before planting again.',
  noSeed: (name) => `You have no ${name} seed. Buy some from the shop.`,
  lockedSeed: (name) => `That seed is still locked. Own more land to unlock ${name}.`,
  notReady: 'That crop is not ready yet.',
  deadCrop: 'That crop is dead. Clear the plot to free the ground.',
  nothingPlanted: 'There is nothing growing there.',
};

/** The plot with this id, or null. */
function plotAt(state, plotId) {
  return state?.plots?.find((plot) => plot.id === plotId) ?? null;
}

/**
 * Replace one plot, leaving the array and every other plot untouched.
 *
 * Copy on write: the whole reason state is a plain object is that a domain function
 * can hand back a new one without anybody holding a reference to the old, so a failed
 * action leaves the player's farm byte-identical.
 */
function withPlot(state, plotId, change) {
  return {
    ...state,
    plots: state.plots.map((plot) => (plot.id === plotId ? { ...plot, ...change } : plot)),
  };
}

/** `now` on the game's clock, debug time-skips included. Never `Date.now()` here. */
function gameNow(state) {
  return Date.now() + (state?.clock?.timeOffsetMs ?? 0);
}

/**
 * Sow a seed on one of your own plots, spending the seed.
 *
 * **The weather is judged here, once, and that is the whole model.** A planting is
 * measured against the next six hours of forecast at the moment the seed goes in, and
 * the result is stored on the plot as `forecast`. There is no per-hour tick and no
 * `simulator.js`: every crop takes 4–8 hours to grow, so the window covers its whole
 * life, and a consequence the player could see before committing is worth more than
 * one that arrives overnight.
 *
 * `forecast: null` is recorded when there is no forecast to judge by, so a crop sown
 * without one is honest about it rather than looking untouched.
 *
 * @param {object} state
 * @param {number} plotId
 * @param {string} cropId
 * @returns {{ok:true, state:object}|{ok:false, reason:string}}
 */
export function plant(state, plotId, cropId) {
  const plot = plotAt(state, plotId);
  if (!plot) return { ok: false, reason: FARM_REASONS.unknownPlot };

  const crop = cropOf(cropId);
  if (!crop) return { ok: false, reason: FARM_REASONS.unknownCrop };

  if (!plot.owned) return { ok: false, reason: FARM_REASONS.notOwned };
  if (plot.dead) return { ok: false, reason: FARM_REASONS.deadPlot };
  if (plot.cropId) return { ok: false, reason: FARM_REASONS.occupied };

  // A stale picker or a hand-edited bag must not plant a seed the farm has not
  // unlocked yet — buying is gated, so sowing is gated the same way.
  if (!isSeedUnlocked(state, cropId)) {
    return { ok: false, reason: FARM_REASONS.lockedSeed(crop.name) };
  }

  const seeds = state.inventory?.seeds ?? {};
  if ((seeds[cropId] ?? 0) < 1) return { ok: false, reason: FARM_REASONS.noSeed(crop.name) };

  const now = gameNow(state);
  const verdict = verdictFor({
    cropId,
    weather: state.weather,
    location: state.location,
    now,
  });

  // Planting and spending the seed are one indivisible change: there is no state in
  // which the seed has left the bag but the plot has not been sown, or the reverse.
  return {
    ok: true,
    state: {
      ...withPlot(state, plotId, {
        cropId,
        plantedAt: now,
        health: verdict.ok ? verdict.verdict.health : HEALTH.max,
        forecast: verdict.ok ? verdict.verdict : null,
        dead: false,
      }),
      inventory: {
        ...state.inventory,
        seeds: { ...seeds, [cropId]: seeds[cropId] - 1 },
      },
    },
  };
}

/**
 * Bring in a crop that is ready, and get paid for it.
 *
 * Payout is `yield * sellPrice * (health / 100)` — the 2× the seed cost at full
 * health, eroded by weather through `health`. Below 50% health a harvest no longer
 * pays for the seed that produced it, which is the whole risk model of the game.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok:true, state:object, gold:number}|{ok:false, reason:string}}
 */
export function harvest(state, plotId) {
  const plot = plotAt(state, plotId);
  if (!plot) return { ok: false, reason: FARM_REASONS.unknownPlot };
  if (!plot.owned) return { ok: false, reason: FARM_REASONS.notOwned };
  if (!plot.cropId) return { ok: false, reason: FARM_REASONS.nothingPlanted };

  const crop = cropOf(plot.cropId);
  if (!crop) return { ok: false, reason: FARM_REASONS.unknownCrop };

  if (plot.dead) return { ok: false, reason: FARM_REASONS.deadCrop };

  const grown = harvestsIn(plot, gameNow(state));
  if (!grown.ready) return { ok: false, reason: FARM_REASONS.notReady };

  const quality = clamp01(plot.health / HEALTH.max);
  const gold = Math.round(harvestValue(plot.cropId) * quality);

  // The crop goes into the harvest bag as well as being paid for. Quality is averaged
  // into the existing stack, so selling part of a pile and then adding more does not
  // distort the average — see `docs/crops.md`.
  const bag = state.inventory?.harvest ?? {};
  const existing = bag[plot.cropId];
  const totalUnits = (existing?.units ?? 0) + crop.yield;
  const totalQuality = (existing?.qualitySum ?? 0) + crop.yield * quality;

  return {
    ok: true,
    gold,
    state: {
      ...withPlot(state, plotId, { cropId: null, plantedAt: null, dead: false }),
      gold: (state.gold ?? 0) + gold,
      inventory: {
        ...state.inventory,
        harvest: {
          ...bag,
          [plot.cropId]: {
            units: totalUnits,
            qualitySum: totalQuality,
            quality: totalQuality / totalUnits,
          },
        },
      },
    },
  };
}

/**
 * Clear a plot back to bare soil.
 *
 * Exists because a dead crop can never become ready, so without this a dead plot
 * would be stuck forever: `plant` refuses an occupied plot and `harvest` refuses a
 * dead one, and the ground would be unusable for the rest of the save's life.
 * ISS-006.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok:true, state:object}|{ok:false, reason:string}}
 */
export function clearPlot(state, plotId) {
  const plot = plotAt(state, plotId);
  if (!plot) return { ok: false, reason: FARM_REASONS.unknownPlot };
  if (!plot.owned) return { ok: false, reason: FARM_REASONS.notOwned };
  if (!plot.cropId) return { ok: false, reason: FARM_REASONS.nothingPlanted };

  return {
    ok: true,
    state: withPlot(state, plotId, { cropId: null, plantedAt: null, dead: false }),
  };
}

function clamp01(value) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
}
