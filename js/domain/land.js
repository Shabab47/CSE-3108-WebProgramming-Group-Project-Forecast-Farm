/**
 * Buying land.
 *
 * Split out of `domain/farm.js` so that file holds the crops and this one holds the
 * property — they share almost nothing but the shape of a plot, and they fail for
 * different reasons. A crop that will not grow and a plot that will not sell are
 * different bugs and should not be found in the same place.
 *
 * Pure, like everything in `js/domain/`: state in, `{ok, state}` out.
 *
 * Two rules are enforced here rather than in the UI, because the UI is not the only
 * thing that can call this:
 *
 *  1. **You can only buy the plot that is next.** Not any unowned plot, and never the
 *     free one — the starter plot is not for sale at any point in the game.
 *  2. **A purchase never takes gold the player does not have.** The price tag greys
 *     itself out when the gold is short, which is a courtesy; this is the rule.
 *
 * Which plot is next, and what it costs, is `nextUnlockable()` in
 * `js/land_squares/index.js` — the single place that decides, indexed by `ownedCount`
 * against the same `UNLOCK_ORDER` and `PLOT_PRICES` the UI reads to draw the tag. A
 * plot that *looks* buyable and a plot that *is* buyable therefore cannot disagree.
 * See DEC-036.
 */

import { STARTER_PLOT_ID } from '../config/field.js';
import { isNextUnlockable, nextUnlockable } from '../land_squares/index.js';

export const LAND_REASONS = {
  unknownPlot: 'That is not one of your plots.',
  fieldFull: 'You already own every plot on the field.',
  notNext: 'That plot is not the next one to unlock.',
  alreadyOwned: 'You already own that plot.',
  forSale: 'That is your first plot. You will never need to buy it.',
  tooExpensive: (cost, gold) => `That costs ${cost} gold and you have ${gold}.`,
};

/** The plot with this id, or null. */
function plotAt(state, plotId) {
  return state?.plots?.find((plot) => plot.id === plotId) ?? null;
}

/**
 * Buy the next plot in the unlock order (DEC-036).
 *
 * Price comes from `PLOT_PRICES[ownedCount]`, so it depends on how much land the
 * player already has and not on which plot they clicked — which is what gives the
 * whole field a single "next price" instead of sixteen.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok:true, state:object, price:number}|{ok:false, reason:string}}
 */
export function buyPlot(state, plotId) {
  const plot = plotAt(state, plotId);
  if (!plot) return { ok: false, reason: LAND_REASONS.unknownPlot };

  if (plot.owned) {
    return {
      ok: false,
      reason: plot.id === STARTER_PLOT_ID ? LAND_REASONS.forSale : LAND_REASONS.alreadyOwned,
    };
  }

  const offer = nextUnlockable(state);
  if (!offer) return { ok: false, reason: LAND_REASONS.fieldFull };

  // Order before price. A player who clicked a plot that is not next should be told
  // that, not told they are poor — being 400 gold short on the *right* plot is a
  // different message and a different thing to go and do about it.
  if (!isNextUnlockable(state, plotId)) return { ok: false, reason: LAND_REASONS.notNext };

  const gold = state.gold ?? 0;
  if (offer.price > gold) {
    return { ok: false, reason: LAND_REASONS.tooExpensive(offer.price, gold) };
  }

  return {
    ok: true,
    price: offer.price,
    state: {
      ...state,
      gold: gold - offer.price,
      plots: state.plots.map((candidate) =>
        candidate.id === plotId ? { ...candidate, owned: true } : candidate,
      ),
    },
  };
}

/**
 * Whether a buy would succeed right now, so the UI can grey the plot out.
 *
 * Separate from `buyPlot` so the field can decide what to draw without asking the
 * rule to refuse and toast about it. The two must agree: a plot drawn as buyable and
 * then refused is a bug, and so is one greyed out that would have worked.
 */
export function canBuyPlot(state, plotId) {
  const plot = plotAt(state, plotId);
  if (!plot || plot.owned) return false;
  if (!isNextUnlockable(state, plotId)) return false;
  return (nextUnlockable(state)?.price ?? Infinity) <= (state?.gold ?? 0);
}
