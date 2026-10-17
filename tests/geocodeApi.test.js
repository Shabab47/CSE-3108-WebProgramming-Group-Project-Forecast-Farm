/**
 * Tests for both geocoding directions.
 *
 * `fetch` is stubbed, so these need no network and no key. That is deliberate: the bug they exist to
 * catch (ISS-077) was a request that returned `400` for every coordinate on earth, and nothing in the
 * game could see it, because a 400 in a `catch`-and-fallback path is indistinguishable from being
 * offline and the fallback was a plausible English phrase rather than an error.
 *
 * **The response fixtures below are real payloads**, saved from live calls, not invented — the London
 * and ocean cases are the two that decide the ladder, and an invented fixture would have decided them
 * the wrong way. `city: "London"` beside `locality: "City of Westminster"` is the whole argument for
 * `city` going first, and open ocean returning four empty strings is the whole argument for a final
 * coordinate rung.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCoordinates,
  placeNameFrom,
  reverseGeocode,
  searchPlaces,
} from '../js/services/geocodeApi.js';
import { GEOCODE_URL, REVERSE_GEOCODE_URL } from '../js/config/api.js';

let calls = [];

/** A minimal Response stand-in, as `saveApi.test.js` uses. */
const json = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

function stub(handler) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return handler(url) ?? json(200, {});
  };
}

beforeEach(() => stub());

/* --- the two endpoints are genuinely different services ---------------------- */

test('the two directions do not share an endpoint', () => {
  // The direct regression guard. ISS-077 shipped because one constant was used for
  // both directions, and Open-Meteo has no reverse mode — so pointing reverse at
  // the search endpoint can only ever 400.
  assert.notEqual(REVERSE_GEOCODE_URL, GEOCODE_URL);
  assert.match(GEOCODE_URL, /open-meteo.*\/search$/);
  assert.match(REVERSE_GEOCODE_URL, /bigdatacloud.*reverse-geocode-client$/);
});

test('the reverse request asks by coordinates, never by name', () => {
  stub(() => json(200, { city: 'Dhaka', countryName: 'Bangladesh' }));

  return reverseGeocode(23.81, 90.41).then(() => {
    const url = new URL(calls[0]);

    assert.equal(url.searchParams.get('latitude'), '23.81');
    assert.equal(url.searchParams.get('longitude'), '90.41');
    assert.equal(url.searchParams.get('name'), null, 'a name would be ignored, and name-less is a 400');
    assert.equal(url.origin + url.pathname, REVERSE_GEOCODE_URL);
  });
});

test('the forward request asks by name, never by coordinates', () => {
  stub(() => json(200, { results: [{ name: 'Dhaka', latitude: 23.81, longitude: 90.41 }] }));

  return searchPlaces('Dhaka').then(() => {
    const url = new URL(calls[0]);

    assert.equal(url.searchParams.get('name'), 'Dhaka');
    assert.equal(url.searchParams.get('latitude'), null);
    assert.equal(url.origin + url.pathname, GEOCODE_URL);
  });
});

/* --- the name ladder --------------------------------------------------------- */

/** Real London response, trimmed to the fields the ladder reads. */
const LONDON = {
  city: 'London',
  locality: 'City of Westminster',
  principalSubdivision: 'England',
  countryName: 'United Kingdom of Great Britain and Northern Ireland',
};

test('the ladder falls through when the higher rungs are empty', () => {
  const bare = { city: '', principalSubdivision: 'Norðurland vestra', countryName: 'Iceland' };
  assert.equal(placeNameFrom(bare, 64.96, -19.02), 'Norðurland vestra');

  const countryOnly = { city: '', principalSubdivision: '', countryName: 'Iceland' };
  assert.equal(placeNameFrom(countryOnly, 64.96, -19.02), 'Iceland');
});

test('open ocean falls through to the coordinates', () => {
  // Real response for 0, -140. `locality` is "Polynesian Triangle", and it is
  // deliberately not on the ladder: a farm in open water labelled with a region
  // the player has never heard of reads as authoritative and means nothing. The
  // coordinates are the only true answer available here.
  const ocean = { city: '', locality: 'Polynesian Triangle', principalSubdivision: '', countryName: '' };
  assert.equal(placeNameFrom(ocean, 0, -140), '0.00° N, 140.00° W');
});

test('city wins over locality, and a borough is never the name', () => {
  // The measured case that removed `locality` from the ladder. It is populated
  // with regions rather than settlements — for London, "City of Westminster",
  // which is a borough. Naming a London farm that is wrong in the way people
  // notice.
  assert.equal(placeNameFrom(LONDON, 51.5074, -0.1278), 'London');
  assert.doesNotMatch(placeNameFrom(LONDON, 51.5074, -0.1278), /Westminster/);
  assert.equal(placeNameFrom({ city: 'London', locality: 'City of Westminster' }, 51.5074, -0.1278), 'London');
});

test('a missing response is still named', () => {
  for (const empty of [null, undefined, {}, { city: '', principalSubdivision: '', countryName: '' }]) {
    assert.equal(placeNameFrom(empty, 23.81, 90.41), '23.81° N, 90.41° E');
  }
});

/* --- coordinate formatting --------------------------------------------------- */

test('coordinates carry a hemisphere and no sign clutter', () => {
  assert.equal(formatCoordinates(23.81, 90.41), '23.81° N, 90.41° E');
  assert.equal(formatCoordinates(-33.87, -151.21), '33.87° S, 151.21° W');
  assert.equal(formatCoordinates(0, 0), '0.00° N, 0.00° E');
});

test('negative zero is zero, not a sign', () => {
  // A negated coordinate can arrive as `-0` from arithmetic like `-1 * 0`. The
  // `>= 0` comparison is what makes this come out as north/east — `-0` really is
  // zero degrees — and `Math.abs` is what stops a `-0.00°` ever being printed.
  assert.equal(formatCoordinates(0, -0), '0.00° N, 0.00° E');
  assert.equal(formatCoordinates(-0, -0), '0.00° N, 0.00° E');
  assert.doesNotMatch(formatCoordinates(-0.0001, -0), /-0\.00/, 'a real negative must keep its magnitude');
  assert.equal(formatCoordinates(-0.0001, 0), '0.00° S, 0.00° E');
});

test('unusable coordinates answer empty rather than printing NaN', () => {
  // Empty is falsy, so a caller treats it as "could not name it" instead of
  // rendering `NaN° N, NaN° E` on the weather board.
  assert.equal(formatCoordinates(Number.NaN, 90.41), '');
  assert.equal(formatCoordinates(23.81, Infinity), '');
});

/* --- reverseGeocode contract ------------------------------------------------- */

test('a good response answers the same shape as a search result', () => {
  stub(() => json(200, LONDON));

  return reverseGeocode(51.5074, -0.1278).then((result) => {
    assert.equal(result.ok, true);
    assert.equal(result.name, 'London');
    assert.equal(result.country, 'United Kingdom of Great Britain and Northern Ireland');
    assert.equal(result.admin, 'England');
  });
});

test('a response with no usable name still answers a name', () => {
  // The point of the final rung: a farm in open water is playable and must be
  // labelled, not left as "Current location" or blank.
  stub(() => json(200, { city: '', locality: 'Polynesian Triangle', principalSubdivision: '', countryName: '' }));

  return reverseGeocode(0, -140).then((result) => {
    assert.equal(result.ok, true);
    assert.equal(result.name, '0.00° N, 140.00° W');
    assert.equal(result.country, '');
  });
});

test('every failure is a reason, never a throw', () => {
  // A dropped connection must not stop the game, and must not leave the board
  // without a label either — `main.js` falls back to the coordinates.
  stub(() => { throw new Error('offline'); });
  return reverseGeocode(23.81, 90.41)
    .then((r) => assert.deepEqual(r, { ok: false, reason: 'network' }))
    .then(() => {
      stub(() => json(500, {}));
      return reverseGeocode(23.81, 90.41);
    })
    .then((r) => assert.deepEqual(r, { ok: false, reason: 'http_500' }))
    .then(() => {
      stub(() => ({ ok: true, status: 200, json: async () => { throw new Error('bad'); } }));
      return reverseGeocode(23.81, 90.41);
    })
    .then((r) => assert.deepEqual(r, { ok: false, reason: 'bad_json' }));
});

/* --- searchPlaces ------------------------------------------------------------ */

test('search maps every field the caller stores', () => {
  stub(() => json(200, {
    results: [{ name: 'Dhaka', country: 'Bangladesh', admin1: 'Dhaka', latitude: 23.81, longitude: 90.41, timezone: 'Asia/Dhaka' }],
  }));

  return searchPlaces('Dhaka').then((result) => {
    assert.deepEqual(result.results, [{
      name: 'Dhaka', country: 'Bangladesh', admin: 'Dhaka', lat: 23.81, lon: 90.41, tz: 'Asia/Dhaka',
    }]);
  });
});

test('an empty result set omits the results key entirely', () => {
  // ISS-012: Open-Meteo leaves `results` off the payload rather than sending
  // `[]`, so this must not be a bare `data.results.map`.
  stub(() => json(200, { generationtime_ms: 0.1 }));

  return searchPlaces('nowhere at all').then((result) => {
    assert.equal(result.ok, true, 'no matches is a success, not a failure');
    assert.deepEqual(result.results, []);
  });
});

test('every search failure is a reason, never a throw', () => {
  stub(() => { throw new Error('offline'); });
  return searchPlaces('Dhaka')
    .then((r) => assert.deepEqual(r, { ok: false, reason: 'network' }))
    .then(() => {
      stub(() => json(429, {}));
      return searchPlaces('Dhaka');
    })
    .then((r) => assert.deepEqual(r, { ok: false, reason: 'http_429' }));
});
