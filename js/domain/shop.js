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

import { cropOf, requiredPlotsFor } from '../config/crops.js';
import { isSeedUnlocked, ownedPlots } from '../utils/seedUnlocks.js';
import { formatGold } from '../utils/formatGold.js';

/** Quantities the shop offers, cheapest decision first. */
export const BUY_STEPS = [1, 5, 10];

export const SHOP_REASONS = {
  unknownCrop: 'There is no such seed in the shop.',
  badQuantity: 'Pick how many seeds you want before buying.',
  locked: (name, need, owned) =>
    `${name} unlocks when you own ${need} plots (you own ${owned}). Buy more land first.`,
  // The purse is formatted for the message only — the comparison in `buySeeds` is
  // between exact numbers, so a purse of 99.9933 is still short of 100.
  tooExpensive: (cost, gold) =>
    `That costs ${formatGold(cost)} gold and you have ${formatGold(gold)}.`,
};

/**
 * Buy seed packets for one crop.
 *
 * Two refusals that matter, in the order the player can act on them: nonsense
 * first, then land-lock (buy more plots), then the purse. The UI greys the
 * buttons with `canAfford` but the rule is the authority — a stale button or
 * a hand-edited save must not bypass it.
 *
 * Land is the *only* unlock gate (DEC-041 as fixed): `available` is ignored
 * here on purpose. Every crop has its seed packet and its numbers, and a 4-plot
 * farm that earned its unlock must be able to spend it — even on a crop whose
 * field art is still missing, which `fieldSpriteFor()` draws as tinted rice so
 * nothing 404s and nothing bricks.
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

  const owned = ownedPlots(state);
  const need = requiredPlotsFor(cropId);
  if (owned < need) return { ok: false, reason: SHOP_REASONS.locked(crop.name, need, owned) };

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
/**
 * What a seed sells for, as a fraction of what it cost.
 *
 * Sold in one place so the shop's button label and the rule that credits the
 * gold cannot disagree. Changing this number changes the economy, which is a
 * decision, not a tweak — hence a constant rather than a literal in each file.
 */
export const SELL_RATE = 0.75;

export const SELL_REASONS = {
  unknownCrop: 'There is no such seed to sell.',
  badQuantity: 'Pick how many seeds you want before selling.',
  notEnoughSeeds: (have, need) =>
    `You only have ${have} seed${have === 1 ? '' : 's'} but tried to sell ${need}.`,
};

/**
 * Sell seeds back to the shop for `SELL_RATE` of what they cost.
 *
 * No land-lock here, and that is deliberate: buying checks the unlock because a
 * locked crop is a crop you cannot plant, but the gate is on *buying* land, not
 * on holding seeds. A player who bought seeds and then, for any reason, cannot
 * plant them should not be stuck holding them forever.
 *
 * @param {object} state
 * @param {string} cropId
 * @param {number} quantity whole number of seeds, at least 1
 * @returns {{ok:true, state:object, payout:number}|{ok:false, reason:string}}
 */
export function sellSeeds(state, cropId, quantity = 1) {
  const crop = cropOf(cropId);
  if (!crop) return { ok: false, reason: SELL_REASONS.unknownCrop };

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: SELL_REASONS.badQuantity };
  }

  // A save from before seeds were tracked has no bag, so it simply holds nothing
  // to sell rather than throwing.
  const bag = state.inventory?.seeds ?? {};
  const have = bag[cropId] ?? 0;
  if (have < quantity) {
    return { ok: false, reason: SELL_REASONS.notEnoughSeeds(have, quantity) };
  }

  const payout = Math.round(crop.seedPrice * quantity * SELL_RATE);

  const seeds = { ...bag };
  const left = have - quantity;
  // Drop the key rather than leaving a zero behind, so "have any seeds of this
  // crop" stays one truth wherever it is read.
  if (left === 0) {
    delete seeds[cropId];
  } else {
    seeds[cropId] = left;
  }

  return {
    ok: true,
    payout,
    cropId,
    quantity,
    state: {
      ...state,
      gold: (state.gold ?? 0) + payout,
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
  if (!crop) return false;
  if (!isSeedUnlocked(state, cropId)) return false;
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  return crop.seedPrice * quantity <= (state?.gold ?? 0);
}