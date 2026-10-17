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
  isPlaceholderName,
  placeLabel,
  placeNameFrom,
  reverseGeocode,
  searchPlaces,
} from '../js/services/geocodeApi.js';
import { GEOCODE_URL, REVERSE_GEOCODE_URL, SUGGEST_COUNT } from '../js/config/api.js';

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

/* --- searchPlaces options ---------------------------------------------------
 *
 * Search-as-you-type is what made these parameters exist. `d`, `dh`, `dha`, `dhak` are four
 * questions about one, and without a signal the list is painted by whichever answer arrives
 * first rather than by whichever question was asked last. */

test('the row count is a parameter, and defaults to the suggestion list size', () => {
  stub(() => json(200, { results: [] }));

  return searchPlaces('Dhaka')
    .then(() => assert.equal(new URL(calls[0]).searchParams.get('count'), String(SUGGEST_COUNT)))
    .then(() => searchPlaces('Dhaka', { count: 1 }))
    .then(() => assert.equal(new URL(calls[1]).searchParams.get('count'), '1'));
});

test('the signal reaches fetch, so a superseded request can be thrown away', () => {
  let init = null;
  globalThis.fetch = async (_url, options) => {
    init = options;
    return json(200, { results: [] });
  };

  const controller = new AbortController();
  return searchPlaces('Dhaka', { signal: controller.signal }).then(() => {
    assert.equal(init.signal, controller.signal);
  });
});

test('a cancelled request reports itself as cancelled, not as a dropped connection', () => {
  // The distinction is worth a `reason` of its own. Reported as `network`, every fast typist
  // would be logged as an offline player and shown "search failed" for the letter they had
  // just finished typing.
  const controller = new AbortController();
  globalThis.fetch = async () => {
    // What a real aborted `fetch` does: reject.
    controller.abort();
    throw Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
  };

  return searchPlaces('dhak', { signal: controller.signal }).then((result) => {
    assert.deepEqual(result, { ok: false, reason: 'aborted' });
  });
});

/* --- how a candidate reads in the list -------------------------------------- */

test('a candidate carries the context that tells same-named places apart', () => {
  // "Dhaka" alone is not an answer — there is one in Ohio, one in Bihar and one in Chittagong
  // Division, and a list of six identical rows is worse than no list.
  const { name, context, label } = placeLabel({ name: 'Dhaka', admin: 'Dhaka Division', country: 'Bangladesh' });

  assert.equal(name, 'Dhaka');
  assert.equal(context, 'Dhaka Division · Bangladesh');
  assert.equal(label, 'Dhaka · Dhaka Division · Bangladesh');
});

test('a region that repeats the city is dropped rather than printed twice', () => {
  // Real Open-Meteo payload, not an invented one: `name: "Dhaka"` genuinely comes back beside
  // `admin1: "Dhaka"`. "Dhaka · Dhaka · Bangladesh" is noise, not detail.
  assert.equal(
    placeLabel({ name: 'Dhaka', admin: 'Dhaka', country: 'Bangladesh' }).label,
    'Dhaka · Bangladesh',
  );
  // And the comparison is case-folded, because the service is inconsistent about capitalisation.
  assert.equal(
    placeLabel({ name: 'springfield', admin: 'Springfield', country: 'United States' }).label,
    'springfield · United States',
  );
});

test('a place with no context still has a label', () => {
  // Open-Meteo returns `admin1: ""` for plenty of real places, and an empty `·` with a space on
  // either side of it is what a naive join produces.
  assert.deepEqual(placeLabel({ name: 'Reykjavik', admin: '', country: 'Iceland' }), {
    name: 'Reykjavik',
    context: 'Iceland',
    label: 'Reykjavik · Iceland',
  });
  assert.deepEqual(placeLabel({ name: 'Nowhere' }), { name: 'Nowhere', context: '', label: 'Nowhere' });
});

test('a missing candidate is labelled, not thrown at', () => {
  for (const missing of [null, undefined, {}]) {
    assert.equal(placeLabel(missing).label, '');
  }
});

/* --- the placeholder gate ----------------------------------------------------- */

test('every spelling of the placeholder is recognised, not just the one it was written with', () => {
  // The bug this exists for. An `=== 'Current location'` gate repairs the farms written by the
  // build that produced exactly that string, and silently declines every other one — so the
  // player keeps seeing "Current Location" for the life of their save and the repair looks like
  // it was never deployed.
  for (const spelling of [
    'Current location',
    'Current Location',
    'CURRENT LOCATION',
    '  current   location  ',
    'Your location',
    'Unknown location',
  ]) {
    assert.equal(isPlaceholderName(spelling), true, `should have matched ${JSON.stringify(spelling)}`);
  }
});

test('a real name is never mistaken for a placeholder', () => {
  // The cost of being generous here is one wasted request; the cost of being wrong the other way
  // is a farm permanently called "Location".
  for (const real of ['Dhaka', 'Location Mandi', 'New London', '0.00° N, 140.00° W', 'Ipswich']) {
    assert.equal(isPlaceholderName(real), false, `should not have matched ${real}`);
  }
});

test('a nameless save counts as a placeholder without needing a list entry', () => {
  for (const blank of ['', '   ', null, undefined]) {
    assert.equal(isPlaceholderName(blank), true);
  }
});
