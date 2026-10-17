/**
 * What a click on a plot means.
 *
 * One function, and it is the only place that answers the question. `main.js` asks it
 * instead of working the cases out inline, because the switch that maps an answer onto
 * an action is already six lines and re-deriving the answer beside it would be a
 * second copy of the same rules to keep in step. The field view asks it too, so a plot
 * drawn as buyable and a plot that is buyable cannot disagree — DEC-036's whole point.
 *
 * It lives in `js/ui/` rather than `js/domain/` because it is a question about the
 * interface, not about the rules: "what should happen when the player clicks here" has
 * no answer until you know what a click *is*. The rules it defers to are
 * `domain/farm.js` (crops) and `domain/land.js` (buying).
 */

import { harvestsIn, isNextUnlockable } from '../land_squares/index.js';

/**
 * @param {object} state
 * @param {number} plotId
 * @returns {'harvest'|'plant'|'clear'|'buy'|'locked'|'select'}
 */
export function plotAction(state, plotId) {
  const plot = state?.plots?.find((candidate) => candidate.id === plotId);
  if (!plot) return 'locked';

  if (!plot.owned) {
    return isNextUnlockable(state, plotId) ? 'buy' : 'locked';
  }

  if (plot.cropId) {
    if (plot.dead) return 'clear';
    // On the game's clock, so a debug time-skip can make a crop harvestable. Read the
    // same way `domain/farm.js` reads it — the sprite and the payout have to agree.
    const now = Date.now() + (state?.clock?.timeOffsetMs ?? 0);
    return harvestsIn(plot, now).ready ? 'harvest' : 'select';
  }

  // **An empty plot is always `plant`, even with an empty seed bag.** The picker copes
  // with having nothing to offer — it says so and offers the shop — whereas a click
  // that silently does nothing leaves the player with no idea the plot is theirs to
  // use. An empty bag is a reason to *tell them*, not a reason to ignore the click.
  return 'plant';
}
