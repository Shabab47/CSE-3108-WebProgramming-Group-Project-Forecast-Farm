/**
 * Wheat — hardy in cool, dry weather, quick to bring in.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: false` — `assets/images/crops/wheat/` holds only the seed packet and
 * a `.gitkeep`. The shop lists it anyway and refuses to sell it.
 *
 * `seedPrice * 2 = yield * sellPrice`: 400 in, 800 out at full health.
 */

import { stageAt } from './stageMath.js';

export const WHEAT = {
  id: 'wheat',
  name: 'Wheat',
  shopUnit: '5 SEEDS',
  seedPrice: 400,
  sellPrice: 80, // 10 × 80 = 800, twice the seed
  growHours: 5,
  waterNeed: 0.5,
  yield: 10,
  growNote: 'Hardy in cool, dry weather and quick to bring in.',
  available: false,

  likes: 'Cool, mild, light rain',
  hates: 'Heat, drought, heavy rain',
  // Plain season names, not `SEASON` constants: this layer imports nothing. See the
  // same note in `rice.js`, and `tests/seasons.test.js` for the guard.
  seasons: ['Winter', 'Late Autumn', 'Spring'],
};

/** Growth stage 1..5 for wheat planted `elapsedHours` ago. */
export function stageFor(elapsedHours) {
  return stageAt(elapsedHours, WHEAT.growHours);
}
