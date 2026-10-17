/**
 * Potato — the quickest to mature.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: false` because `assets/images/crops/potato/` holds only the seed
 * packet and a `.gitkeep`. The shop still lists it with its price and refuses to
 * sell it, rather than hiding it and leaving a player wondering where the second
 * seed went. Flip this to `true` when `potato_1.png` … `potato_5.png` land; no code
 * changes should be needed. If one is, that is an architecture bug — log it in
 * `docs/team/issues.md`.
 *
 * `seedPrice * 2 = yield * sellPrice`: 200 in, 400 out at full health. That ratio is
 * the game's risk model, and the two columns are never tuned apart.
 */

import { stageAt } from './stageMath.js';

export const POTATO = {
  id: 'potato',
  name: 'Potato',
  shopUnit: '5 SEEDS',
  seedPrice: 200,
  sellPrice: 40, // 10 × 40 = 400, twice the seed
  growHours: 4,
  waterNeed: 0.5,
  yield: 10,
  growNote: 'The quickest to mature, and happy in cool, moist soil.',
  available: false,

  likes: 'Cool, moist',
  hates: 'Frost, heat, waterlogging',
  // Plain season names, not `SEASON` constants: this layer imports nothing. See the
  // same note in `rice.js`, and `tests/seasons.test.js` for the guard.
  seasons: ['Winter', 'Late Autumn', 'Autumn'],
};

/** Growth stage 1..5 for potato planted `elapsedHours` ago. */
export function stageFor(elapsedHours) {
  return stageAt(elapsedHours, POTATO.growHours);
}
