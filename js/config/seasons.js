/**
 * Season calendars by latitude band.
 *
 * ## Why this is keyed on location and not on the calendar month alone
 *
 * `domain/seasons.js` used to decide the season from the month and a `hemisphere`
 * flag whose offset was `SEASONS.length`, so `(index + 6) % 6` was the identity and
 * every month returned the same answer in both hemispheres. The bug is only the
 * surface of the problem: **the months alone do not say what season it is
 * anywhere**, because "monsoon" is a South-Asian season, June is not the start of
 * summer in Dhaka, and a calendar that ignores the player's coordinates is a
 * calendar that is wrong for most of the planet.
 *
 * So the calendar is chosen from the player's latitude and each band carries its own
 * month boundaries, written out for each hemisphere rather than derived by rotation.
 *
 * ## The tropical band is the Bangladeshi one
 *
 * Six seasons, which is the calendar this project's home audience actually lives
 * in: winter, spring, summer, monsoon, autumn, late autumn. `DEFAULT_LOCATION` is
 * Dhaka. Keeping this band as written means a Bangladeshi player sees the seasons
 * they would name, while a player in Oslo or Buenos Aires gets their own rather
 * than a southern-flip of a South-Asian year.
 */

/** Season names, exported so crop files reference them instead of retyping them. */
export const SEASON = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  MONSOON: 'Monsoon',
  AUTUMN: 'Autumn',
  LATE_AUTUMN: 'Late Autumn',
  COLD: 'Cold',
  THAW: 'Thaw',
};

/**
 * Latitude bands, widest first. The first band whose `maxLat` covers the absolute
 * latitude wins, so the order is meaningful.
 *
 * `maxLat` is the poleward edge *exclusive*, in degrees.
 */
export const BANDS = [
  {
    id: 'tropical',
    label: 'Tropical',
    // 27.5°, not the Tropic of Cancer's 23.44°. **Dhaka is at 23.81° and Kolkata at
    // 22.57°, so a textbook tropic line puts the game's own home location outside
    // the band whose calendar is the South Asian one.** 27.5° keeps Dhaka, Kolkata,
    // Bangkok, Singapore and the Gulf inside it while still excluding Delhi at 28.6°.
    maxLat: 27.5,
    seasons: [
      // Northern hemisphere, as Bangladesh names them.
      { name: SEASON.WINTER, months: [12, 1, 2] },
      { name: SEASON.SPRING, months: [3, 4] },
      { name: SEASON.SUMMER, months: [5, 6] },
      { name: SEASON.MONSOON, months: [7, 8] },
      { name: SEASON.AUTUMN, months: [9, 10] },
      { name: SEASON.LATE_AUTUMN, months: [11] },
    ],
    // Southern hemisphere, written out rather than rotated. A rotation is what
    // produced the no-op this file replaces.
    southern: [
      { name: SEASON.SUMMER, months: [12, 1, 2] },
      { name: SEASON.AUTUMN, months: [3, 4] },
      { name: SEASON.LATE_AUTUMN, months: [5] },
      { name: SEASON.WINTER, months: [6, 7, 8] },
      { name: SEASON.SPRING, months: [9, 10] },
      { name: SEASON.MONSOON, months: [11] },
    ],
  },
  {
    id: 'temperate',
    label: 'Temperate',
    maxLat: 55,
    seasons: [
      { name: SEASON.WINTER, months: [12, 1, 2] },
      { name: SEASON.SPRING, months: [3, 4, 5] },
      { name: SEASON.SUMMER, months: [6, 7, 8] },
      { name: SEASON.AUTUMN, months: [9, 10, 11] },
    ],
    southern: [
      { name: SEASON.SUMMER, months: [12, 1, 2] },
      { name: SEASON.AUTUMN, months: [3, 4, 5] },
      { name: SEASON.WINTER, months: [6, 7, 8] },
      { name: SEASON.SPRING, months: [9, 10, 11] },
    ],
  },
  {
    id: 'polar',
    label: 'Polar',
    maxLat: 90,
    seasons: [
      { name: SEASON.WINTER, months: [10, 11, 12, 1, 2, 3] },
      { name: SEASON.THAW, months: [4, 5, 6, 7, 8, 9] },
    ],
    southern: [
      { name: SEASON.SUMMER, months: [12, 1, 2] },
      { name: SEASON.WINTER, months: [3, 4, 5, 6, 7, 8] },
      { name: SEASON.THAW, months: [9, 10, 11] },
    ],
  },
];

/**
 * The band a latitude falls in.
 *
 * `null` for a missing or non-numeric latitude rather than a guess: the caller
 * decides what an unknown location means, and this file only knows about bands.
 *
 * @param {number} lat
 * @returns {object|null}
 */
export function bandForLat(lat) {
  const abs = Math.abs(Number(lat));
  if (!Number.isFinite(abs)) return null;
  return BANDS.find((band) => abs < band.maxLat) ?? BANDS[BANDS.length - 1];
}
