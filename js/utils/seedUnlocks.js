/**
 * Seed unlocks: how far the farm has grown, and which seeds that opens.
 *
 * The rule the shop and the field both read: rice from the first plot, then
 * one new seed every four plots owned (DEC-041). It lives here rather than in
 * either domain module because the layer rules forbid one domain module from
 * importing another, and both need the same answer — `domain/shop.js` to
 * refuse a too-early purchase, `domain/farm.js` to refuse sowing one, and the
 * UI to say why a card is dimmed.
 *
 * Imports only `config`, so every layer that may read `utils` may read this.
 */

import { requiredPlotsFor } from '../config/crops.js';

/** How many plots the farm owns — the progression counter seed unlocks read. */
export function ownedPlots(state) {
  return (state?.plots ?? []).filter((plot) => plot.owned).length;
}

/**
 * Whether the seed counter has reached this crop yet.
 *
 * Pure land gate, separate from `available` (art): a crop needs *both* to be
 * bought, and each half reports its own refusal so the player knows which to
 * work toward — more land, or nothing to do but wait for art.
 */
export function isSeedUnlocked(state, cropId) {
  return ownedPlots(state) >= requiredPlotsFor(cropId);
}
