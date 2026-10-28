/**
 * Wheat — hardy in cool, dry weather, quick to bring in.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: true` — all five growth stages and both damage sprites are on disk in
 * `assets/images/crops/wheat/`. Only the `dead` sprite is still missing, which is true
 * of every crop.
 *
 * Wheat uses the shared `stageAt()` like rice and tomato: four growing sprites spread
 * evenly over its six-hour grow time, so it swaps every 1.5 h, and `wheat_5.png` — the
 * ripe picture — only appears when it can be harvested.
 *
 * `seedPrice * 2 = yield * sellPrice`: 400 in, 800 out at full health.
 */

import { hoursForMonths, stageAt } from './stageMath.js';

export const WHEAT = {
  id: 'wheat',
  name: 'Wheat',
  shopUnit: '5 SEEDS',
  seedPrice: 400,
  sellPrice: 80, // 10 × 80 = 800, twice the seed
  realMonths: 3, // minimum real-life growing time
  growHours: hoursForMonths(3), // 1 real hour = half a month
  waterNeed: 0.5,
  yield: 10,
  growNote: 'Hardy in cool, dry weather and quick to bring in.',
  available: true,

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
