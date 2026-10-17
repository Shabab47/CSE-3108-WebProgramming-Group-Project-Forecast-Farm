/**
 * Tomato — wants steady water and a warm spell to finish.
 *
 * One file per crop; `docs/crops.md` explains every number. The shape is identical
 * across all five files, and `config/crops.js` assembles them into `CROPS`.
 *
 * `available: false` — `assets/images/crops/tomato/` holds only the seed packet and
 * a `.gitkeep`. The shop lists it anyway and refuses to sell it, so a player can see
 * the price they are working toward.
 *
 * `seedPrice * 2 = yield * sellPrice`: 300 in, 600 out at full health.
 */

import { stageAt } from './stageMath.js';

export const TOMATO = {
  id: 'tomato',
  name: 'Tomato',
  shopUnit: '5 SEEDS',
  seedPrice: 300,
  sellPrice: 60, // 10 × 60 = 600, twice the seed
  growHours: 6,
  waterNeed: 0.5,
  yield: 10,
  growNote: 'Wants steady water and a warm spell to finish.',
  available: false,

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
