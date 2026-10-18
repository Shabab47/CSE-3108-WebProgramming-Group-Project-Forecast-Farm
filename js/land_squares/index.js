/**
 * The sixteen land segments, and what can be done to them.
 *
 * One file per segment in this folder, each holding that segment's identity. This
 * module assembles them into the array the farm renders and owns the few operations
 * that are about the *field* rather than about any one plot: which segment a new
 * farm starts with, and how far a planted one has to go.
 *
 * ## Why the segments own nothing mutable
 *
 * A plot's crop, water, health and lock state change every second of play. They live
 * in `state.plots` and are written to the save file; see `s1.js` for why they cannot
 * live in a module. What this folder owns is the part that never changes — where a
 * segment is, and which one is free.
 *
 * ## The free segment
 *
 * `STARTER_PLOT_ID` is segment 1: the back corner, `z = col + row = 0`, so it is the
 * furthest diamond from the camera and nothing paints over it. Every farm starts
 * owning it and it is never for sale. That is the whole of the player's opening — one
 * plot, no land to buy, and the first harvest pays for the second plot.
 *
 * It is defined in `config/field.js` rather than here, because the price ladder lives
 * there and the two have to agree.
 */

import { PLOT_PRICES, STARTER_PLOT_ID, UNLOCK_ORDER } from '../config/field.js';
import { cropOf, growthProgress, growthStage } from '../config/crops.js';
import { growthSpeed } from '../config/game.js';

import { PLOT_1, createPlot1 } from './s1.js';
import { PLOT_2, createPlot2 } from './s2.js';
import { PLOT_3, createPlot3 } from './s3.js';
import { PLOT_4, createPlot4 } from './s4.js';
import { PLOT_5, createPlot5 } from './s5.js';
import { PLOT_6, createPlot6 } from './s6.js';
import { PLOT_7, createPlot7 } from './s7.js';
import { PLOT_8, createPlot8 } from './s8.js';
import { PLOT_9, createPlot9 } from './s9.js';
import { PLOT_10, createPlot10 } from './s10.js';
import { PLOT_11, createPlot11 } from './s11.js';
import { PLOT_12, createPlot12 } from './s12.js';
import { PLOT_13, createPlot13 } from './s13.js';
import { PLOT_14, createPlot14 } from './s14.js';
import { PLOT_15, createPlot15 } from './s15.js';
import { PLOT_16, createPlot16 } from './s16.js';

/**
 * Every segment, in id order. The objects are the immutable descriptors the segment
 * files export, shared rather than copied — nothing here may mutate one.
 */
export const SEGMENTS = [
  PLOT_1, PLOT_2, PLOT_3, PLOT_4, PLOT_5, PLOT_6, PLOT_7, PLOT_8,
  PLOT_9, PLOT_10, PLOT_11, PLOT_12, PLOT_13, PLOT_14, PLOT_15, PLOT_16,
];

const BUILDERS = [
  createPlot1, createPlot2, createPlot3, createPlot4, createPlot5, createPlot6,
  createPlot7, createPlot8, createPlot9, createPlot10, createPlot11, createPlot12,
  createPlot13, createPlot14, createPlot15, createPlot16,
];

/** How many segments the field has. */
export const PLOT_COUNT = SEGMENTS.length;

/** The segment every farm starts with, and the only one never for sale. */
export function starterPlot() {
  return SEGMENTS[STARTER_PLOT_ID];
}

/** The segment descriptor for an id, or undefined. */
export function segmentOf(plotId) {
  return SEGMENTS.find((segment) => segment.id === plotId);
}

/**
 * A brand new field: sixteen plots, one of them already owned.
 *
 * Each call builds sixteen **new** objects. Two calls share nothing, so a second
 * farm — a second player, a test, a reset — cannot reach into the first one.
 *
 * @returns {object[]} sixteen plots, id 0..15, empty and dry
 */
export function buildPlots() {
  return BUILDERS.map((create) => withDamage(create()));
}

/**
 * Stamp `damage` onto a plot that predates the field.
 *
 * **One place, not sixteen.** `createPlotN()` lives in sixteen separate files and the
 * field is the same shape for all of them, so editing all sixteen would be sixteen
 * chances to forget one — and a plot without the field reads as `undefined` rather than
 * `null`, which is a distinction `damageSprite()` and the meter both have to care about.
 *
 * It is also the migration, not just an initialiser: a save written before damage
 * existed has plots without the field, and `store.js` routes restores through here so
 * old farms gain it rather than arriving undefined. Readers tolerate its absence
 * anyway (`plot?.damage`), so this is belt and braces on purpose.
 *
 * `null` means "no damage yet", which is distinct from `false` and from a missing
 * field: the damage that *is* possible is a string from `DAMAGE.STATES`.
 *
 * @param {object} plot
 * @returns {object}
 */
function withDamage(plot) {
  return plot.damage == null ? { ...plot, damage: null } : plot;
}

/**
 * The segment a player may buy next, or null when the field is full.
 *
 * Both `UNLOCK_ORDER` and `PLOT_PRICES` are indexed by `ownedCount`, so the answer is a
 * function of how many plots are owned and nothing else — which is why two functions
 * can never disagree about which plot is next, or what it costs. See DEC-036.
 *
 * `UNLOCK_ORDER` has sixteen entries and its index 0 is the free starter, which is
 * never on offer because a farm always owns it. `ownedCount` is therefore never 0 for
 * a real farm, and index 0 is unreachable here — it exists so the two arrays line up.
 *
 * @param {object} state the game state
 * @returns {{plotId:number, price:number}|null} null once all sixteen are owned
 */
export function nextUnlockable(state) {
  const ownedCount = (state?.plots ?? []).filter((plot) => plot.owned).length;

  const plotId = UNLOCK_ORDER[ownedCount];
  if (plotId === undefined) return null;

  return { plotId, price: PLOT_PRICES[ownedCount] ?? 0 };
}

/**
 * Whether a plot is the one currently on offer.
 *
 * Kept next to `nextUnlockable` on purpose: the UI needs to distinguish *next* from
 * *locked* to decide whether a plot answers a click at all, and asking that question
 * anywhere else invites the two to disagree.
 */
export function isNextUnlockable(state, plotId) {
  return nextUnlockable(state)?.plotId === plotId;
}

/**
 * How a planted plot is doing, given the clock the game is running on.
 *
 * `now` is passed in rather than read from `Date.now()` so the caller decides what
 * "now" means — a debug time-skip, or a test, both pass their own. Growth is derived
 * from `plantedAt` every time rather than stored, which is what lets a crop keep
 * growing while the tab is closed. See `docs/crops.md`.
 *
 * `speed` is the `?fast=N` debug multiplier, and it defaults to reading the URL. It
 * lives here, as a defaulted argument, rather than in either caller, because the
 * field view and `domain/farm.js` both ask this question and **the sprite on screen
 * and the readiness that pays out have to come from the same answer**. A harvest that
 * became ready before the picture changed would be the worst bug in the game.
 *
 * @param {object} plot   a plot with `cropId` and `plantedAt`
 * @param {number} now    epoch ms, already including `state.clock.timeOffsetMs`
 * @param {number} [speed] growth multiplier; tests pass 1 to pin it
 * @returns {{planted:boolean, elapsedHours:number, progress:number, stage:number, ready:boolean, msLeft:number}}
 */
export function harvestsIn(plot, now, speed = growthSpeed()) {
  const nothing = {
    planted: false,
    elapsedHours: 0,
    progress: 0,
    stage: 1,
    ready: false,
    msLeft: 0,
  };

  if (!plot?.cropId || !plot?.plantedAt) return nothing;

  const crop = cropOf(plot.cropId);
  if (!crop) return nothing;

  const factor = Number.isFinite(speed) && speed >= 1 ? speed : 1;

  // The speed multiplies *elapsed* time, so `?fast=60` turns 30 real minutes into 30
  // hours of crop growth. It divides neither `plantedAt` nor `msLeft`, both of which
  // stay in real milliseconds — so a farm saved under `?fast` is an ordinary farm the
  // moment the tab is reloaded without it, and the debug flag never reaches a save.
  const elapsedHours = Math.max(0, (now - plot.plantedAt) / 3_600_000) * factor;
  const progress = growthProgress(plot.cropId, elapsedHours);
  const msLeft = Math.max(0, (plot.plantedAt + (crop.growHours * 3_600_000) / factor) - now);

  return {
    planted: true,
    elapsedHours,
    progress,
    stage: growthStage(plot.cropId, elapsedHours),
    // A dead crop never becomes ready, which is why `clearPlot` exists. ISS-006.
    ready: progress >= 1 && !plot.dead,
    msLeft,
  };
}
