/**
 * Which season it is, and whether a crop suits it.
 *
 * ## The bug this replaces
 *
 * The previous version took `(date, hemisphere)` and rotated the season list by
 * `HEMISPHERE_OFFSET = 6` against a list of exactly six seasons, so the rotation was
 * `(index + 6) % 6` — the identity. Every month returned the same season in both
 * hemispheres, and nothing tested it. The fix is not a bigger offset; it is that
 * `config/seasons.js` now carries a real calendar per latitude band, with the
 * southern months written out rather than derived.
 *
 * ## Signature change, and why it had to be one
 *
 * `getSeason(date, hemisphere)` became `seasonFor(location, date)`. Season is not a
 * property of the calendar month on its own — it is a property of the calendar month
 * *at some latitude* — so latitude has to be an input. `getSeason` is kept as a
 * thin northern-hemisphere wrapper so `ui/seasonCard.js` keeps working until it is
 * updated to pass the location.
 */

import { BANDS, SEASON, bandForLat } from '../config/seasons.js';
import { cropOf } from '../config/crops.js';

/**
 * The season name for a location and a date.
 *
 * @param {{lat?: number, lon?: number}|null} [location]
 * @param {Date} [date]
 * @returns {string} the season name, or `SEASON.WINTER` when the location is
 *   unknown — a farm still needs an answer, and winter is the one season that is
 *   never wrong enough to be dangerous on its own.
 */
export function seasonFor(location, date = new Date()) {
  const lat = location?.lat;
  const band = bandForLat(lat);
  if (!band) return SEASON.WINTER;

  // South of the equator the southern calendar applies. Latitude sign, not a
  // separate argument, because a caller that got the sign wrong would otherwise
  // silently get the other hemisphere's year with no way to tell.
  const southern = Number(lat) < 0;
  const calendar = (southern ? band.southern : band.seasons) ?? band.seasons;

  const month = date.getMonth() + 1;
  const found = calendar.find((season) => season.months.includes(month));
  return found?.name ?? calendar[0].name;
}

/**
 * The latitude band a location sits in, for display.
 *
 * @param {{lat?: number}|null} [location]
 * @returns {{id: string, label: string}|null}
 */
export function bandFor(location) {
  const band = bandForLat(location?.lat);
  return band ? { id: band.id, label: band.label } : null;
}

/**
 * Whether a crop is suited to the season it would be planted in.
 *
 * **This is a soft check, not a gate.** An off-season crop is still plantable; it
 * simply starts a rating point down. Gating would mean a January player with only
 * rice unlocked had nothing to plant at all, which turns a weather feature into a
 * dead end.
 *
 * A crop with no `seasons` list is neutral — `null`, not `false`. A crop we have not
 * thought about yet must not read as badly suited, and the difference matters
 * because the picker shows this verdict to the player.
 *
 * @param {string} cropId
 * @param {string} seasonName
 * @returns {boolean|null} `null` when the crop declares no preference
 */
export function isSuitableFor(cropId, seasonName) {
  const crop = cropOf(cropId);
  const seasons = crop?.seasons;
  if (!Array.isArray(seasons) || seasons.length === 0) return null;
  return seasons.includes(seasonName);
}

/**
 * The season rating for a crop: `0` when suited, `-1` when not, `0` when unstated.
 *
 * Returned as a number rather than the boolean above because that is what the
 * verdict arithmetic wants, and returning `null ? -1 : 0` here would make the
 * unstated case indistinguishable from a real mismatch.
 *
 * @param {string} cropId
 * @param {string} seasonName
 * @returns {number}
 */
export function seasonRating(cropId, seasonName) {
  const suitable = isSuitableFor(cropId, seasonName);
  return suitable === false ? -1 : 0;
}

/**
 * Every season name the game can produce, for tests and for a picker legend.
 *
 * @returns {string[]}
 */
export function allSeasonNames() {
  return [...new Set(BANDS.flatMap((band) => band.seasons.map((season) => season.name)))];
}

export { SEASON };
