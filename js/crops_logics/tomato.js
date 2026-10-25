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
 * `stageHours` is tomato's one deviation from the shared `stageAt()` formula. Tomato
 * takes six hours and has five sprites, so one stage has to cover two hours. Holding
 * **stage 4** across hours 3–5 and letting `tomato_5.png` arrive at hour 5 means the
 * ripe picture is only up for the last hour, not for two hours before the crop can
 * be harvested. `config/crops.js` reads this same array, so the field and the crop's
 * own `stageFor()` cannot disagree. See DEC-060.
 *
 * `seedPrice * 2 = yield * sellPrice`: 300 in, 600 out at full health.
 */

import { stageFromHours } from './stageMath.js';

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
  available: true,

  likes: 'Warm, sun, steady water',
  hates: 'Frost, extreme heat, heavy rain',
  // Plain season names, not `SEASON` constants: this layer imports nothing. See the
  // same note in `rice.js`, and `tests/seasons.test.js` for the guard.
  seasons: ['Summer', 'Spring'],

  // Stage 1 at 0h, 2 at 1h, 3 at 2h, 4 at 3h, and stage 5 at 5h.
  stageHours: [0, 1, 2, 3, 5],
};

/** Growth stage 1..5 for tomato planted `elapsedHours` ago. */
export function stageFor(elapsedHours) {
  return stageFromHours(elapsedHours, TOMATO.stageHours);
}
