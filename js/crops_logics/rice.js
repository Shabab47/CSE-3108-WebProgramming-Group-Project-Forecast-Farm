/**
 * Rice — the cheapest seed, and the only crop with art.
 *
 * One file per crop. Each holds that crop's numbers and its growth arithmetic, and
 * nothing else in `js/` hard-codes a crop name, a price or a grow time.
 * `config/crops.js` assembles these five into the table the rest of the game reads.
 * Adding a sixth crop means adding a file here and one id to `SHOP_ORDER`.
 *
 * **`docs/crops.md` explains what each number means and why it has the value it
 * has.** This file is the data that document describes.
 *
 * Two numbers define the economy, and they are one decision:
 *
 *   seedPrice   100 gold.
 *   sellPrice   chosen so that `yield * sellPrice` is exactly **twice** `seedPrice`.
 *
 * A full-health harvest therefore doubles the packet's cost, and a poor harvest —
 * health below 100, which is what weather does to a plot — is what erodes that
 * margin. A crop that sold for less than its seed would make the sixteen-plot goal
 * unreachable, so the two columns are never tuned apart.
 *
 * `available` is about art, not about the economy: a crop is playable when its five
 * growth stages exist in `assets/images/crops/<id>/`. The shop still lists every
 * crop with its price and refuses to sell the ones that cannot be planted yet —
 * hiding them would leave a player wondering where the missing fourth seed went.
 */

import { stageAt } from './stageMath.js';

export const RICE = {
  id: 'rice',
  name: 'Rice',
  shopUnit: '5 SEEDS',
  seedPrice: 100,
  sellPrice: 20, // 10 × 20 = 200, twice the seed
  growHours: 6,
  waterNeed: 0.9, // thirstiest crop — the multiplier on evaporation
  yield: 10,
  growNote: 'Cheapest seed, and the thirstiest crop — keep it watered.',
  available: true,

  /* Descriptive only — the tooltip in the seed picker. The mechanical effect of
   * weather lives in `config/cropWeatherMatrix.js`, so the two cannot drift. */
  likes: 'Rain, heat, flood',
  hates: 'Drought, frost',
  bestSeason: 'Rainy',
};

/** Growth stage 1..5 for rice planted `elapsedHours` ago. See `stageMath.js`. */
export function stageFor(elapsedHours) {
  return stageAt(elapsedHours, RICE.growHours);
}
