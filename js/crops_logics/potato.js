/**
 * Potato — the quickest to mature.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: true` — all five growth stages are on disk. Note that `potato_3..5.png`
 * are currently rice sprites under potato names (see `config/assets.js`); they are
 * placeholders and will be replaced in place, under the same filenames, so nothing
 * here changes when the real art lands. The land gate (4 plots) still governs buying.
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
  available: true,

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
