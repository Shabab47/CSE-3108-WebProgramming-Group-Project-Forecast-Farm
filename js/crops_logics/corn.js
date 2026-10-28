/**
 * Corn — the slowest crop and a season-long bet.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: true` — all five growth stages and both damage sprites are on disk in
 * `assets/images/crops/corn/`. Only the `dead` sprite is still missing, which is true
 * of every crop.
 *
 * Corn uses the shared `stageAt()` like rice and tomato: four growing sprites spread
 * evenly over its four-hour grow time, so it swaps on the hour, and `corn_5.png` — the
 * ripe picture — only appears when it can be harvested.
 *
 * Its grow note still calls it "the slowest crop", which stopped being true when the
 * clock was recalibrated in `c128550`: at two real months it is now level with tomato
 * and potato, and rice and wheat are the six-hour crops. The note is Jim's copy, so it
 * is flagged in `docs/team/issues.md` rather than rewritten here.
 *
 * `seedPrice * 2 = yield * sellPrice`: 500 in, 1,000 out at full health.
 */

import { hoursForMonths, stageAt } from './stageMath.js';

export const CORN = {
  id: 'corn',
  name: 'Corn',
  shopUnit: '5 SEEDS',
  seedPrice: 500,
  sellPrice: 100, // 10 × 100 = 1,000, twice the seed
  realMonths: 2, // minimum real-life growing time
  growHours: hoursForMonths(2), // 1 real hour = half a month
  waterNeed: 0.7,
  yield: 10,
  growNote: 'The slowest crop and the thirstiest — a season-long bet.',
  available: true,

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
