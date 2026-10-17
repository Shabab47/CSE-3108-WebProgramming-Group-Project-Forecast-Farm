/**
 * Corn — the slowest crop and a season-long bet.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: false` — `assets/images/crops/corn/` holds only the seed packet and a
 * `.gitkeep`. The shop lists it anyway and refuses to sell it.
 *
 * Eight hours to grow is the longest on the farm, and at 500 a packet it is the
 * mid-game goal rather than a first purchase.
 *
 * `seedPrice * 2 = yield * sellPrice`: 500 in, 1,000 out at full health.
 */

import { stageAt } from './stageMath.js';

export const CORN = {
  id: 'corn',
  name: 'Corn',
  shopUnit: '5 SEEDS',
  seedPrice: 500,
  sellPrice: 100, // 10 × 100 = 1,000, twice the seed
  growHours: 8,
  waterNeed: 0.7,
  yield: 10,
  growNote: 'The slowest crop and the thirstiest — a season-long bet.',
  available: false,

  likes: 'Warm, sun, moderate rain',
  hates: 'Drought, strong wind',
  // Plain season names, not `SEASON` constants: this layer imports nothing. See the
  // same note in `rice.js`, and `tests/seasons.test.js` for the guard.
  seasons: ['Summer', 'Monsoon', 'Spring'],
};

/** Growth stage 1..5 for corn planted `elapsedHours` ago. */
export function stageFor(elapsedHours) {
  return stageAt(elapsedHours, CORN.growHours);
}
