/**
 * Tests for the big sticky note on the weather board — `js/ui/weatherPanel.js`.
 *
 * The board is drawn in CSS, so nothing here can assert a pixel. What it can pin
 * down is the note's *content*, which is where the reports have actually come
 * from: the farm's place name was squeezed into one ellipsised line above the
 * condition while the right half of the paper sat empty at every width (ISS-062),
 * and a farm with no location printed nothing at all — an empty span, invisible
 * on the page and silent in the console (ISS-063).
 *
 * The fake DOM is the one `tests/connectionStatus.test.js` and
 * `tests/loadingTips.test.js` use, kept deliberately identical: a second, subtly
 * different fake would drift from `el()`'s real contract and quietly stop testing
 * anything.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyHour } from '../js/config/weatherEvents.js';
import { cropOf, SHOP_ORDER } from '../js/config/crops.js';
import { allSeasonNames, seasonFor } from '../js/domain/seasons.js';
import {
  FORECAST_WINDOW_HOURS,
  WEATHER_HEALTH_FLOOR,
  forecastWindow,
  verdictFor,
  worstEventIn,
} from '../js/domain/weather.js';

import { mountWeatherPanel } from '../js/ui/weatherPanel.js';

/* --- a minimal DOM --------------------------------------------------------- */

class FakeNode {}

class FakeElement extends FakeNode {
  constructor(tag) {
    super();
    this.tag = String(tag).toLowerCase();
    this.className = '';
    this.textContent = '';
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.listeners = {};
  }

  append(...kids) {
    for (const kid of kids) this.children.push(kid);
  }

  /** `clear()` in `utils/dom.js` calls this, so a mount can empty a root. */
  replaceChildren(...kids) {
    this.children = kids;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(event, handler) {
    (this.listeners[event] ??= []).push(handler);
  }

  remove() {}
}

globalThis.Node = FakeNode;
globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => ({ textContent: String(text) }),
};

/* --- the note under test --------------------------------------------------- */

const DHAKA = { name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41, tz: 'Asia/Dhaka' };

/** A live reading, in the shape `weatherApi.js` hands back. */
function reading(overrides = {}) {
  return {
    fetchedAt: Date.UTC(2026, 9, 16, 12, 5),
    current: {
      temperature: 24,
      feelsLike: 26,
      humidity: 60,
      precipitation: 0,
      isDay: true,
      weatherCode: 1,
      windSpeed: 9,
      windDirection: 180,
      time: '2026-10-16T18:05',
    },
    hourly: {
      time: ['2026-10-16T18:00'],
      temperature: [24],
      weatherCode: [1],
      precipitationProbability: [10],
    },
    ...overrides,
  };
}

/** Every element carrying `className` as a whole class, depth first. */
function findAll(root, className) {
  const found = [];

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (String(node.className ?? '').split(/\s+/).includes(className)) found.push(node);
    for (const kid of node.children ?? []) walk(kid);
  };

  walk(root);
  return found;
}

/** Whether `target` is `root` or sits anywhere under it. */
function inTree(root, target) {
  if (root === target) return true;
  for (const kid of root.children ?? []) {
    if (kid && typeof kid === 'object' && inTree(kid, target)) return true;
  }
  return false;
}

/** Mount the panel into a fresh fake root, at a fixed clock so nothing ages. */
function mount(state) {
  const root = new FakeElement('div');
  mountWeatherPanel(root, state, () => 0);
  return root;
}

function placeLine(state) {
  const [line] = findAll(mount(state), 'note-loc');
  return line?.textContent;
}

/* --- the place line -------------------------------------------------------- */

test('the note names the farm place, town then country', () => {
  assert.equal(placeLine({ location: DHAKA, weather: reading() }), 'Dhaka, Bangladesh');
});

test('a place with no town still prints the country', () => {
  assert.equal(placeLine({ location: { country: 'Bangladesh' }, weather: reading() }), 'Bangladesh');
});

test('the place line is never empty', () => {
  // The bug this guards was invisible: an empty `<span>` renders as nothing, so a
  // farm with no location simply had no place on its board and no error anywhere.
  const cases = [
    ['no location at all', undefined],
    ['an empty location', {}],
    ['blank fields', { name: '', country: '' }],
    ['null fields', { name: null, country: null }],
  ];

  for (const [what, location] of cases) {
    assert.equal(placeLine({ location, weather: reading() }), 'Unknown location', what);
  }
});

test('the place line belongs to the big sticky note', () => {
  // DEC-033 moved it into the note's right-hand column. A place printed anywhere
  // else on the board — the search bar, say — would still pass the tests above.
  const root = mount({ location: DHAKA, weather: reading() });
  const [line] = findAll(root, 'note-loc');
  const [note] = findAll(root, 'note-current');

  assert.ok(line, 'the note must carry a place line');
  assert.ok(note, 'the big note must exist');
  assert.ok(inTree(note, line), 'the place line belongs to the big note');
});

test('a paused forecast adds its line without taking the place away', () => {
  const root = mount({ location: DHAKA, weather: reading(), sync: 'pending' });

  assert.equal(findAll(root, 'note-loc')[0].textContent, 'Dhaka, Bangladesh');
  assert.equal(findAll(root, 'note-status').length, 1, 'the paused line renders inside the note');
});

/* --- ISS-089: weather events, seasons, and the planting verdict ----------------
 *
 * Three things are asserted here that nothing asserted before, and one of them
 * exists because a whole class of bug got through: `getSeason(date, 'southern')`
 * rotated a six-element list by six, which is the identity, so **both hemispheres
 * answered identically for every month of the year** and no test noticed.
 */

/**
 * A weather payload of `hours` readings, spanning from six hours before noon to the
 * hour after it, so there is a full forward window from `NOON` to read.
 *
 * Stamped as local `YYYY-MM-DDTHH:00`, which is the shape Open-Meteo returns and the
 * shape `forecastWindow()` parses.
 */
function forecast({ code = 0, temp = 20, rain = 0, humidity = 50, wind = 5, hours = 12 } = {}) {
  const base = new Date(2026, 0, 15, 12, 0, 0).getTime();
  const time = [];
  for (let i = 0; i < hours; i += 1) {
    const at = new Date(base - 3_600_000 * (6 - i));
    const stamp = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-`
      + `${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
    time.push(stamp(at));
  }
  const fill = (value) => Array.from({ length: hours }, () => value);
  return { hourly: { time, weatherCode: fill(code), temperature: fill(temp), humidity: fill(humidity), windSpeed: fill(wind), precipitationProbability: fill(rain) } };
}

const NOON = new Date(2026, 0, 15, 12, 0, 0).getTime();

test('a code with a more severe reading above it never wins on the code alone', () => {
  // The order in `docs/weather-events.md` is the point. A thunderstorm carries a cold
  // reading, so a naive "coldest thing wins" test would call it frost.
  assert.equal(classifyHour({ weatherCode: 96, temperature: -3 }), 'hail', 'hail beats frost');
  assert.equal(classifyHour({ weatherCode: 71, temperature: -4 }), 'frost');
  assert.equal(classifyHour({ weatherCode: 0, temperature: 40, precipitationProbability: 5 }), 'drought');
  assert.equal(classifyHour({ weatherCode: 0, temperature: 40, precipitationProbability: 80 }), 'sunny',
    '40 °C with rain coming is heat, and heat is not one of the nine events');
  assert.equal(classifyHour({ weatherCode: 61, windSpeed: 55 }), 'strongWind', 'wind outranks rain');
  assert.equal(classifyHour({ weatherCode: 61, humidity: 90 }), 'lightRain', 'a rain code beats humidity');
  assert.equal(classifyHour({ weatherCode: 45, humidity: 90 }), 'highHumidity');
  assert.equal(classifyHour({ weatherCode: 2 }), 'cloudy');
  assert.equal(classifyHour(null), 'cloudy', 'an unreadable hour is cloud, not "nothing happens"');
});

test('the snow codes are frost on their own, without needing a temperature', () => {
  // `docs/weather-events.md` defines frost as "temp ≤ 2 °C, **or** code in 66, 67,
  // 71–77, 85, 86" — the code clause is unconditional. So snow at an implausible
  // temperature is still frost, and this test pins that rather than the intuition.
  assert.equal(classifyHour({ weatherCode: 71, temperature: -1 }), 'frost');
  assert.equal(classifyHour({ weatherCode: 71, temperature: 9 }), 'frost',
    'the code alone is enough; the temperature clause is an OR, not an AND');
  assert.equal(classifyHour({ weatherCode: 0, temperature: 9 }), 'sunny',
    'and a mild temperature on its own never makes frost');
});

test('seasons come from the location, not the month alone', () => {
  const january = new Date(2026, 0, 15);
  const july = new Date(2026, 6, 15);

  // Dhaka and Kolkata are inside the tropical band, so they get the six-season
  // Bangladeshi year — and July is **Monsoon**, not "Summer", which is the whole
  // reason this band exists separately from the temperate one.
  assert.equal(seasonFor({ lat: 23.81 }, january), 'Winter');
  assert.equal(seasonFor({ lat: 23.81 }, july), 'Monsoon');
  assert.equal(seasonFor({ lat: 22.57 }, july), 'Monsoon', 'Kolkata, same band');

  assert.equal(seasonFor({ lat: 59.91 }, july), 'Thaw', 'Oslo is polar, not temperate');
  assert.equal(seasonFor({ lat: 51.5 }, july), 'Summer', 'London is temperate');
  assert.equal(seasonFor({ lat: -33.87 }, january), 'Summer', 'Sydney, January is summer');
  assert.equal(seasonFor({ lat: -33.87 }, july), 'Winter');
});

test('the two hemispheres no longer answer identically', () => {
  // **This is the assertion that could not have existed before.** The old code
  // rotated a six-element list by `HEMISPHERE_OFFSET = 6`, and `(index + 6) % 6` is
  // the identity — so `getSeason(date, 'southern')` returned exactly what the northern
  // call returned, for every month of the year, and nothing tested it.
  //
  // January is chosen because it is the month the two hemispheres disagree most
  // plainly. Dhaka and London are deliberately *not* compared here: January is winter
  // in both, so asserting they differ would be asserting a falsehood.
  const january = new Date(2026, 0, 15);
  const july = new Date(2026, 6, 15);

  assert.notEqual(
    seasonFor({ lat: -33.87 }, january),
    seasonFor({ lat: 51.5 }, january),
    'January is summer in Sydney and winter in London',
  );
  assert.notEqual(
    seasonFor({ lat: -33.87 }, july),
    seasonFor({ lat: 51.5 }, july),
    'and July is the other way round',
  );
});

test('the tropical band has to actually include Dhaka', () => {
  // A regression guard on the boundary, not on the logic. Dhaka sits at 23.81°N, so a
  // textbook 23.5° tropic line put the game's own home location in the *temperate*
  // band and gave it a four-season year — which is exactly the wrong answer for the
  // audience, and looked fine in every other test because nothing else checks Dhaka.
  assert.equal(seasonFor({ lat: 23.81 }, new Date(2026, 6, 15)), 'Monsoon');
});

test('every season a crop names is one the game can actually produce', () => {
  // `crops_logics/` may import nothing, so the crop files retype season names rather
  // than referencing constants. This is the only thing stopping a stray `'monsoon'`
  // from leaving rice permanently out of season with nothing to show for it.
  const known = new Set(allSeasonNames());
  for (const id of SHOP_ORDER) {
    const crop = cropOf(id);
    assert.ok(Array.isArray(crop.seasons) && crop.seasons.length > 0, `${id} declares its seasons`);
    for (const season of crop.seasons) {
      assert.ok(known.has(season), `${id} names "${season}", which no band ever produces`);
    }
  }
});

test('the window starts at the current hour, not at index zero', () => {
  // Open-Meteo's first hourly reading is the top of the current hour, not the moment
  // of the request, so index 0 is already part-gone. This is the same trap as the
  // `hourly[0]` bug ISS-009 was about, and taking index 0 silently judges a planting
  // on an hour that has passed.
  const window = forecastWindow(forecast({ code: 0, temp: 20 }), 6, NOON);
  assert.equal(window.length, 6);
  assert.equal(window[0].temperature, 20, 'and the readings are the ones asked for');
});

test('the window is the most severe event in it, not an average', () => {
  // One frost hour among six ordinary ones is the fact a player is deciding on, and
  // averaging is exactly what would hide it. Index 7 is the second hour of the
  // forward window, which starts at index 6.
  const mixed = forecast({ code: 0, temp: 20 });
  mixed.hourly.weatherCode[7] = 73; // snow
  mixed.hourly.temperature[7] = -5; // ...at a temperature that is frost on its own

  const worst = worstEventIn(forecastWindow(mixed, FORECAST_WINDOW_HOURS, NOON));
  assert.equal(worst.event, 'frost');
  assert.equal(worst.hours, 1, 'and it is reported as the one hour it was');
});

test('weather wounds a crop and the season costs it, but neither kills it', () => {
  const ok = verdictFor({ cropId: 'rice', weather: forecast({ code: 0, temp: 20 }), location: { lat: 23.81 }, now: NOON });
  assert.equal(ok.ok, true);
  assert.equal(ok.verdict.health, 90, 'rice is out of season in January, so it costs 10');

  const winterWheat = verdictFor({ cropId: 'wheat', weather: forecast({ code: 0, temp: 20 }), location: { lat: 23.81 }, now: NOON });
  assert.equal(winterWheat.verdict.health, 100, 'wheat is in season, so the same day costs it nothing');

  for (const weather of [
    forecast({ code: 73, temp: -6 }),
    forecast({ code: 96, temp: -2 }),
    forecast({ code: 0, temp: 45, rain: 0 }),
  ]) {
    for (const cropId of SHOP_ORDER) {
      const v = verdictFor({ cropId, weather, location: { lat: 23.81 }, now: NOON });
      assert.ok(v.verdict.health >= WEATHER_HEALTH_FLOOR, `${cropId} was floored, not killed`);
      assert.ok(v.verdict.health > 0, `${cropId} is never left dead by weather alone`);
    }
  }
});

test('no forecast means no verdict, rather than a verdict of "fine"', () => {
  // Planting is refused without a forecast, so this has to be an honest refusal. A
  // default of "nothing is wrong" here would let a crop be sown by a player who was
  // never shown any weather at all.
  assert.deepEqual(verdictFor({ cropId: 'rice', weather: null, now: NOON }), { ok: false, reason: 'no_forecast' });
  assert.deepEqual(verdictFor({ cropId: 'rice', weather: { hourly: {} }, now: NOON }), { ok: false, reason: 'no_forecast' });
  assert.equal(verdictFor({ cropId: 'rice', weather: forecast(), now: NOON }).ok, true);
});
