/**
 * Turning a place into coordinates, and coordinates back into a place.
 *
 * ## These are two different services, and they always were
 *
 * `searchPlaces()` is Open-Meteo **forward** search: it takes a `name` and answers with candidates.
 * `reverseGeocode()` is the opposite direction and **cannot** use that endpoint — Open-Meteo's
 * geocoding API has no reverse mode, so posting `latitude`/`longitude` to `/v1/search` returns
 * `400 {"reason":"No value found … at path 'name'."}` for every coordinate on earth.
 *
 * That is ISS-077. It shipped because the two functions live in one file and share a constant name,
 * so the mistake looked like nothing. The reverse direction now goes to BigDataCloud
 * (`REVERSE_GEOCODE_URL`), which is keyless and CORS-open. DEC-038 records why not Nominatim or
 * Photon, both of which answer with the nearest *building* rather than the nearest *place*.
 *
 * Everything below returns `{ok: true, …}` or `{ok: false, reason}` and never throws, because a farm
 * that cannot be named still has weather and must keep playing.
 */

import { GEOCODE_URL, REVERSE_GEOCODE_URL } from '../config/api.js';

/**
 * A readable coordinate pair, for when there is genuinely no place to name.
 *
 * The last rung of `placeNameFrom`, and the answer when the lookup itself fails. A farm pinned at
 * `0.00° N, 140.00° W` says something true and useful; "Current location" says nothing at all, which
 * is what it replaced.
 *
 * Returns `''` for a non-finite input rather than printing `NaN°`, so a caller can treat "no
 * coordinates" as a failed lookup instead of rendering it.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
export function formatCoordinates(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
  // `>= 0` rather than `> 0` so a due-west or due-south coordinate is not signed `W`/`S`.
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

/**
 * The best place name a reverse-geocode response can offer.
 *
 * ## The ladder, and why `locality` is not on it
 *
 * `city → principalSubdivision → countryName → coordinates`.
 *
 * `city` is the settlement a player would name. Measured on the live service it was populated for
 * every land probe tried — Dhaka, London, and a rural Icelandic farm — so it is the rung that
 * actually decides the answer in practice.
 *
 * `locality` was on the first draft of this ladder and was **removed by a test**. It looks like a
 * better second rung, but it is populated with *regions* rather than settlements: for London it is
 * `"City of Westminster"` (a borough), and for a point in open ocean it is `"Polynesian Triangle"`. A
 * farm in the middle of the Atlantic labelled "Polynesian Triangle" is worse than useless — it looks
 * authoritative and means nothing. Keeping it would have put a plausible-sounding lie on the board in
 * exactly the case where there is no place at all, which is the one case the coordinate rung exists
 * to handle honestly.
 *
 * `principalSubdivision` outranks `countryName` because a region is more useful than a country when
 * both are available, and it is the only rung that fires between `city` and `country`.
 *
 * The ladder always terminates, so the coordinates are the final answer and never a placeholder.
 *
 * Pure and exported so the whole ladder is testable without a network.
 *
 * @param {object|null|undefined} data a reverse-geocode response
 * @param {number} lat
 * @param {number} lon
 * @returns {string} possibly `''` only when the coordinates are unusable too
 */
export function placeNameFrom(data, lat, lon) {
  return (
    data?.city ||
    data?.principalSubdivision ||
    data?.countryName ||
    formatCoordinates(lat, lon)
  );
}

/**
 * Coordinates → place name, for the farm the player pinned to themselves.
 *
 * Answers the same shape as `searchPlaces`, so `main.js` and `locationLine()` treat a pinned farm and
 * a searched one identically.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ok: true, name: string, country: string, admin: string}|{ok: false, reason: string}>}
 */
export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    // The API defaults to the request's own locale; without this a player in
    // Bangladesh gets place names transliterated into their browser language.
    localityLanguage: 'en',
  });

  let res;
  try {
    res = await fetch(`${REVERSE_GEOCODE_URL}?${params}`);
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }

  const name = placeNameFrom(data, lat, lon);
  if (!name) return { ok: false, reason: 'no_place' };

  return {
    ok: true,
    name,
    country: data?.countryName || '',
    admin: data?.principalSubdivision || '',
  };
}

/**
 * A typed place name → candidates.
 *
 * `count: 5` so the list has something to show, and `format: json` rather than GeoJSON because
 * nothing here draws a map.
 *
 * @param {string} query
 * @returns {Promise<{ok: true, results: object[]}|{ok: false, reason: string}>}
 */
export async function searchPlaces(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  });

  let res;
  try {
    res = await fetch(`${GEOCODE_URL}?${params}`);
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }

  // ISS-012: an empty result set omits the `results` key entirely rather than
  // sending `[]`, so this cannot be a bare `data.results.map`.
  const results = (Array.isArray(data?.results) ? data.results : []).map((p) => ({
    name: p.name,
    country: p.country || '',
    admin: p.admin1 || '',
    lat: p.latitude,
    lon: p.longitude,
    tz: p.timezone || 'auto',
  }));

  return { ok: true, results };
}
