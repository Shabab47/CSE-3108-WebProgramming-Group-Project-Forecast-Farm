/**
 * The shop's rules.
 *
 * Pure, like everything in `js/domain/`: state in, `{ok, state}` out, nothing
 * touched. `store.apply` is the only writer of game state, so this file decides
 * what a purchase *is* and `shop-main.js` decides what happens next (a toast, and
 * a save).
 *
 * Two rules are enforced here rather than in the UI, because the UI is not the
 * only thing that can call this:
 *
 *  1. **You cannot buy a crop you cannot plant.** The shop lists all five crops
 *     with their prices, so a hand-edited save or a stale button must not sell a
 *     seed that has nowhere to go.
 *  2. **A purchase never takes gold the player does not have.** The buttons
 *     disable themselves when the gold is short, which is a courtesy; this is the
 *     rule.
 *
 * Refusal reasons are sentences rather than codes. `store.apply` emits the reason
 * verbatim as a `toast`, and a raw code reaching a player is worse than no
 * message at all. The tests assert on these strings, so a rewording that improves
 * the game can be made in one place.
 */

import { cropOf } from '../config/crops.js';

/** Quantities the shop offers, cheapest decision first. */
export const BUY_STEPS = [1, 5, 10];

export const SHOP_REASONS = {
  unknownCrop: 'There is no such seed in the shop.',
  badQuantity: 'Pick how many seeds you want before buying.',
  unavailable: (name) => `${name} is not available to plant yet. Its art is still being drawn.`,
  tooExpensive: (cost, gold) => `That costs ${cost} gold and you have ${gold}.`,
};

/**
 * Buy seed packets for one crop.
 *
 * @param {object} state
 * @param {string} cropId
 * @param {number} quantity whole number of packets, at least 1
 * @returns {{ok:true, state:object, cost:number}|{ok:false, reason:string}}
 */
export function buySeeds(state, cropId, quantity = 1) {
  const crop = cropOf(cropId);
  if (!crop) return { ok: false, reason: SHOP_REASONS.unknownCrop };

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: SHOP_REASONS.badQuantity };
  }

  if (!crop.available) return { ok: false, reason: SHOP_REASONS.unavailable(crop.name) };

  const cost = crop.seedPrice * quantity;
  if (cost > state.gold) return { ok: false, reason: SHOP_REASONS.tooExpensive(cost, state.gold) };

  // A save from before seeds were tracked has no bag, so fall back to an empty one
  // rather than refusing an otherwise valid purchase.
  const bag = state.inventory?.seeds ?? {};
  const seeds = { ...bag, [cropId]: (bag[cropId] ?? 0) + quantity };

  return {
    ok: true,
    cost,
    state: {
      ...state,
      gold: state.gold - cost,
      inventory: { ...state.inventory, seeds },
    },
  };
}

/**
 * Whether a quantity can be afforded right now.
 *
 * Separate from `buySeeds` so the shop can grey out a button without asking the
 * rule to refuse and toast about it. The two must agree: a button that is enabled
 * and then refuses is a bug, and so is a button that is disabled but would have
 * worked.
 */
export function canAfford(state, cropId, quantity = 1) {
  const crop = cropOf(cropId);
  if (!crop || !crop.available) return false;
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  return crop.seedPrice * quantity <= (state?.gold ?? 0);
}