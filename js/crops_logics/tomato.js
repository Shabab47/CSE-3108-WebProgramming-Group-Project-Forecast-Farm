/**
 * Tomato — wants steady water and a warm spell to finish.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: true` — all five growth stages and two damage sprites are on disk in
 * `assets/images/crops/tomato/`. Only the `dead` sprite is still missing, which is
 * true of every crop.
 *
 * Tomato uses the shared `stageAt()` like every other crop: four growing sprites
 * spread evenly over the grow time, and `tomato_5.png` only at harvest.
 *
 * `seedPrice * 2 = yield * sellPrice`: 300 in, 600 out at full health.
 */

import { hoursForMonths, stageAt } from './stageMath.js';

export const TOMATO = {
  id: 'tomato',
  name: 'Tomato',
  shopUnit: '5 SEEDS',
  seedPrice: 300,
  sellPrice: 60, // 10 × 60 = 600, twice the seed
  realMonths: 2, // minimum real-life growing time
  growHours: hoursForMonths(2), // 1 real hour = half a month
  waterNeed: 0.5,
  yield: 10,
  growNote: 'Wants steady water and a warm spell to finish.',
  available: true,

  likes: 'Warm, sun, steady water',
  hates: 'Frost, extreme heat, heavy rain',
  // Plain season names, not `SEASON` constants: this layer imports nothing. See the
  // same note in `rice.js`, and `tests/seasons.test.js` for the guard.
  seasons: ['Summer', 'Spring'],
};

/** Growth stage 1..5 for tomato planted `elapsedHours` ago. */
export function stageFor(elapsedHours) {
  return stageAt(elapsedHours, TOMATO.growHours);
}
