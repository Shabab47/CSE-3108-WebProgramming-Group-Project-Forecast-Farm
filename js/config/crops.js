/**
 * The crop table — the one place the rest of the game reads crop numbers from.
 *
 * **The numbers live one folder down, in `js/crops_logics/<cropId>.js`** — one file
 * per crop, each holding that crop's prices, grow time, water need, yield, likes and
 * hates, plus its own `stageFor()`. This file is the index: it assembles those five
 * into the `CROPS` object every other module imports, and it owns the four
 * operations that are about the *set* rather than about any single crop.
 *
 * It was a single 118-line file until T-59. Splitting it put each crop's balance on
 * one screen and made a sixth crop a file to add rather than a hundred lines to
 * thread through a shared literal. The split is only worth anything if there is
 * genuinely one source of truth, so **nothing here may restate a crop number** —
 * the aggregation below copies the objects wholesale.
 *
 * `docs/crops.md` explains what each column means and why it has the value it has.
 * Nothing else should hard-code a crop name, a price or a grow time.
 */

import { RICE } from '../crops_logics/rice.js';
import { POTATO } from '../crops_logics/potato.js';
import { TOMATO } from '../crops_logics/tomato.js';
import { WHEAT } from '../crops_logics/wheat.js';
import { CORN } from '../crops_logics/corn.js';
import { progressAt, stageAt } from '../crops_logics/stageMath.js';

/**
 * Every crop, by id.
 *
 * **The objects are shared, not copied.** `cropOf()` hands back the very object the
 * crop file exports, so nothing here can drift from `js/crops_logics/` — and nothing
 * downstream may mutate one, because every caller would see it. Copy on write.
 */
export const CROPS = {
  rice: RICE,
  potato: POTATO,
  tomato: TOMATO,
  wheat: WHEAT,
  corn: CORN,
};

/**
 * Shop listing order, cheapest first.
 *
 * A list sorted by id would put corn in the middle for no reason a player would
 * understand. Ascending price is the order the wallet can afford, and it is the
 * order the prices were chosen in.
 */
export const SHOP_ORDER = ['rice', 'potato', 'tomato', 'wheat', 'corn'];

/**
 * How many plots must be owned before each seed can be bought (DEC-041).
 *
 * The shop order is the progression order: rice from the first plot, then one
 * new seed every four plots owned. A new farm owns 1 plot, so rice is
 * available immediately; a full 16-plot farm has everything.
 *
 * Kept here next to `SHOP_ORDER` so the order and the thresholds cannot drift:
 * `SHOP_ORDER[i]` unlocks at the i-th entry below.
 */
export const CROP_UNLOCK_PLOTS = {
  rice: 1,
  potato: 4,
  tomato: 8,
  wheat: 12,
  corn: 16,
};

/** Plots owned before this crop can be bought, or Infinity for an unknown id. */
export function requiredPlotsFor(cropId) {
  return Object.prototype.hasOwnProperty.call(CROP_UNLOCK_PLOTS, cropId)
    ? CROP_UNLOCK_PLOTS[cropId]
    : Infinity;
}

/** The crop, or undefined. Anything not in the table is not sold. */
export function cropOf(cropId) {
  return Object.prototype.hasOwnProperty.call(CROPS, cropId) ? CROPS[cropId] : undefined;
}

/** Every crop, in shop order. Drops an id listed here but missing from `CROPS`. */
export function shopCrops() {
  return SHOP_ORDER.map(cropOf).filter(Boolean);
}

/**
 * What one packet is worth at full health, before any quality multiplier.
 *
 * Kept here so the rule and the table cannot drift: the harvest maths in
 * `docs/crops.md` is `yield * sellPrice * quality`, and this is the first half of
 * it.
 */
export function harvestValue(cropId) {
  const crop = cropOf(cropId);
  return crop ? crop.yield * crop.sellPrice : 0;
}

/**
 * Which sprite a crop planted `elapsedHours` ago should show, 1..5.
 *
 * Delegates to the shared formula in `crops_logics/stageMath.js` rather than to each
 * crop's own `stageFor()`. Both reach the same answer for every crop, and this one
 * has the virtue of working for a crop id that is not in the table — which is what a
 * hand-edited save hands over. See `stageMath.js` for why the count is five sprites
 * and not six hours.
 */
export function growthStage(cropId, elapsedHours) {
  const crop = cropOf(cropId);
  if (!crop) return 1;
  return stageAt(elapsedHours, crop.growHours);
}

/**
 * How far through its grow time a crop is, 0..1.
 *
 * Readiness is `progress >= 1`, which is deliberately **not** `stage === 5`: the last
 * sprite is held for a whole hour, so a crop at 5h05m of a 6h rice already looks
 * finished and is not yet harvestable. Judging readiness by the sprite would let a
 * player pull a crop an hour early.
 */
export function growthProgress(cropId, elapsedHours) {
  const crop = cropOf(cropId);
  if (!crop) return 0;
  return progressAt(elapsedHours, crop.growHours);
}
