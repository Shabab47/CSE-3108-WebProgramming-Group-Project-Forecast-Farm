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

import { GEOCODE_URL, REVERSE_GEOCODE_URL, SUGGEST_COUNT } from '../config/api.js';

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
 * How one candidate reads in the suggestion list.
 *
 * ## A search result is a *place*, not a *name*
 *
 * `searchPlaces` answers with candidates and "Dhaka" is one of them — so are Dhaka in Ohio, Dhaka
 * in Bihar and Dhaka in Chittagong Division. A suggestion list showing six identical rows labelled
 * "Dhaka" is worse than no list at all, because the only thing distinguishing them is invisible.
 *
 * So the label is the name *plus the context that tells them apart*, joined once each and in
 * descending order of how much it narrows the choice:
 *
 *     Dhaka · Dhaka Division · Bangladesh
 *     Paris · Île-de-France · France
 *     Springfield · Illinois · United States
 *
 * Repeated parts are dropped rather than deduplicated by string identity alone: Open-Meteo really
 * does return `admin1: "Dhaka"` next to `name: "Dhaka"`, and "Dhaka, Dhaka" is noise, not detail.
 *
 * The first row is always the name on its own, so the bold part of the row needs no markup and the
 * list stays scannable when the context is a long country name.
 *
 * Pure, and takes whatever `searchPlaces` returns, so it works for a search result and a
 * reverse-geocoded farm alike — the two are the same shape on purpose.
 *
 * @param {{name?: string, admin?: string, country?: string}|null|undefined} place
 * @returns {{name: string, context: string, label: string}}
 */
export function placeLabel(place) {
  const name = String(place?.name ?? '').trim();
  const seen = new Set([name.toLowerCase()]);

  const context = [];
  for (const part of [place?.admin, place?.country]) {
    const text = String(part ?? '').trim();
    const key = text.toLowerCase();
    // A part that is blank, or that a part already in the list repeats, adds
    // nothing — and a dropped part must not leave its separator behind either,
    // which is why the join happens once at the end rather than per part.
    if (!text || seen.has(key)) continue;
    seen.add(key);
    context.push(text);
  }

  return {
    name,
    context: context.join(' · '),
    label: context.length ? `${name} · ${context.join(' · ')}` : name,
  };
}

/**
 * Every nameless phrase that has ever reached a save.
 *
 * A set, so adding one is a one-line change and nothing that consumes it has to be touched.
 */
const PLACEHOLDER_NAMES = new Set([
  'current location',
  'your location',
  'my location',
  'unknown location',
  'location',
]);

/**
 * Whether a saved name is one of the phrases that say nothing about where the farm is.
 *
 * ## Why this is not an equality test
 *
 * The string this exists to detect was written by older builds as `'Current location'`, and the
 * migration that replaces it compared with `===`. That works right up until it does not: the phrase
 * has since appeared with a capital `L` in a build, in a player's own save, and in a save file
 * exported by hand. Every one of those farms keeps saying "Current Location" forever, because the
 * gate that is supposed to repair them rejects the one string they were written with — and the gate
 * is silent, so the symptom reads as "the fix is not there" rather than "the fix missed my save".
 *
 * A repair that only recognises its own spelling is not a repair. So the comparison is on a
 * normalised form — trimmed, collapsed, case-folded — against a *list* of the phrases that have
 * been shipped. `unknown location` is on it because `weatherPanel.locationLine()` emits exactly that
 * when a farm has no name at all, and such a farm is just as nameless as one labelled "Current
 * location". An empty name is a placeholder too, and needs no list entry.
 *
 * **Pure and deliberately generous.** A false positive costs one extra reverse-geocode call on
 * load, which is free and idempotent — it re-derives the name from coordinates that are already
 * stored. A false negative costs the player their farm's name permanently. Erring towards asking.
 *
 * @param {string|null|undefined} name
 * @returns {boolean}
 */
export function isPlaceholderName(name) {
  const key = String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!key) return true;

  return PLACEHOLDER_NAMES.has(key);
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
 * ## Now a *list*, not an answer
 *
 * This used to hand back five candidates for `main.js` to take `[0]` of, which meant the game asked
 * the network a question it had already decided the answer to. The API takes options for two reasons
 * that both come from the suggestion list:
 *
 * - `count` — a suggestion list is read by comparison, so it wants a different number of rows than
 *   a best-guess does. `SUGGEST_COUNT` is the default; the old `5` is still what a caller without
 *   options gets for free, because the default is the only thing that changed shape here.
 * - `signal` — an `AbortSignal`, handed straight to `fetch`. Search-as-you-type means a keystroke
 *   supersedes the request the last keystroke started, and an aborted request is how that is
 *   enforced. Without it, `d`, `dh`, `dha`, `dhak` are four live requests racing to paint the list,
 *   and the one that loses is decided by latency rather than by order — so the list flickers back
 *   through "Dhahran" on the way to "Dhaka".
 *
 * **`format: json`, not GeoJSON**, because nothing here draws a map.
 *
 * @param {string} query
 * @param {{count?: number, signal?: AbortSignal}} [options]
 * @returns {Promise<{ok: true, results: object[]}|{ok: false, reason: string}>}
 */
export async function searchPlaces(query, options = {}) {
  const { count = SUGGEST_COUNT, signal } = options;

  const params = new URLSearchParams({
    name: query,
    count: String(count),
    language: 'en',
    format: 'json',
  });

  let res;
  try {
    res = await fetch(`${GEOCODE_URL}?${params}`, { signal });
  } catch {
    // An abort is the *caller's* doing, not a failure: it asked for this request to be thrown away
    // because a newer keystroke replaced it. Reporting it as `network` would log every fast typist
    // as a dropped connection, and the UI would show "search failed" for the letter they just typed.
    if (signal?.aborted) return { ok: false, reason: 'aborted' };
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
