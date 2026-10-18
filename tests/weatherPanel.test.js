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

/* --- T-09 the pump, and T-13 the warnings -------------------------------------
 *
 * These are the first tests of `domain/water.js` and `domain/notifications.js`.
 * Both modules existed as **0-byte files**, and `plot.waterLevel` was written once at
 * plot creation and never again — so `WATER.pumpPerSecond`, `PUMP.upkeepPerSecond` and
 * `HEALTH.dryDrainPerHour` were all defined and read by nothing, and
 * `ground_watered.png` was a registered asset that could never be seen.
 */

import { elapsedHours, tick } from '../js/domain/water.js';
import {
  bandFor, flowFor, minutesToOptimal, pumpedWindow, ratesFor, targetFor,
  timeOutsideBand, waterState,
} from '../js/domain/plotWater.js';
import { aimPump, setPump, costOf, pumpRun } from '../js/domain/pump.js';
import { applyDamage, damageFor, damageSprite, damageWord } from '../js/domain/damage.js';
import { alertsToRaise, currentTrouble, forProjection, plantedCrops, wateringAdvice } from '../js/domain/notifications.js';
import {
  FROST_C, HIGH_HUMIDITY, STRONG_WIND_KMH, environmentFacts,
} from '../js/domain/environment.js';
import { buildInitialState } from '../js/state/initialState.js';
import { DAMAGE, HEALTH, OPTIMAL, WATER } from '../js/config/game.js';
import { EVAPORATION_PER_HOUR, RAIN_WATER_PER_HOUR } from '../js/config/weatherEvents.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'a@b.c' };
const HOUR = 3_600_000;

/** A forecast of `hours` identical readings, starting on the hour containing now. */
function sky({ code = 0, temp = 20, rain = 0, hours = 30 } = {}) {
  const now = Date.now();
  const stamp = (ms) => {
    const at = new Date(ms);
    return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-`
      + `${String(at.getDate()).padStart(2, '0')}T${String(at.getHours()).padStart(2, '0')}:00`;
  };
  const fill = (v) => Array.from({ length: hours }, () => v);
  return {
    hourly: {
      time: Array.from({ length: hours }, (_, i) => stamp(now - 3_600_000 * (6 - i))),
      weatherCode: fill(code), temperature: fill(temp), humidity: fill(50),
      windSpeed: fill(5), precipitationProbability: fill(rain),
    },
  };
}

/** A farm with `n` plots of `cropId` sown, `hoursAgo` hours ago. */
function farmWith({ cropId = 'rice', count = 2, hoursAgo = 0, weather = null, gold = 1000 } = {}) {
  const state = buildInitialState(SESSION);
  state.gold = gold;
  state.weather = weather;
  state.plots = state.plots.map((plot, i) => (
    i < count ? { ...plot, owned: true, cropId, plantedAt: Date.now() - hoursAgo * HOUR } : plot
  ));
  state.lastTickAt = Date.now();
  return state;
}

test('evaporation scales with how thirsty the crop is, and bare soil is thirstiest', () => {
  // `waterNeed` exists as a number precisely so this is true. Rice at 0.9 must dry
  // faster than wheat at 0.5, or it is a word and not a rule.
  const rice = ratesFor({ cropId: 'rice' }, 'sunny').dry;
  const wheat = ratesFor({ cropId: 'wheat' }, 'sunny').dry;
  const bare = ratesFor({ cropId: null }, 'sunny').dry;

  assert.ok(rice > wheat, `rice (${rice}) must dry faster than wheat (${wheat})`);
  assert.ok(bare > rice, `bare soil (${bare}) must dry fastest, per docs/crops.md`);

  // The table's Evaporation column is a **multiplier** on baseDecayPerHour, not an
  // absolute rate. Read as an absolute rate a plot takes 133 hours to dry in sun, which
  // is longer than a save and would make watering a non-decision.
  assert.equal(rice, WATER.baseDecayPerHour * 0.9 * EVAPORATION_PER_HOUR.sunny);
  assert.equal(bare, WATER.baseDecayPerHour * EVAPORATION_PER_HOUR.sunny);
  assert.ok(
    WATER.baseDecayPerHour * EVAPORATION_PER_HOUR.sunny >= 10,
    'bare soil must dry in roughly one crop life, or the pump never matters',
  );
});

test('a sunny hour dries an empty plot to nothing and a planted one slower', () => {
  const planted = farmWith({ weather: sky({ code: 0, temp: 30 }) });
  planted.lastTickAt = Date.now() - HOUR;

  const result = tick(planted, Date.now());
  // Started at 0, so it cannot go below 0 — the clamp is the assertion here.
  assert.equal(result.state.plots[0].waterLevel, 0);

  const wet = farmWith({ weather: sky({ code: 0, temp: 30 }) });
  wet.plots[0].waterLevel = 100;
  wet.plots[1].waterLevel = 100;
  wet.lastTickAt = Date.now() - HOUR;

  const dried = tick(wet, Date.now());
  assert.ok(dried.state.plots[0].waterLevel < 100, 'a wet plot loses water');
});

test('rain fills a plot and never past the maximum', () => {
  const state = farmWith({ weather: sky({ code: 65, temp: 20 }), count: 3 });
  state.lastTickAt = Date.now() - HOUR;

  const result = tick(state, Date.now());
  for (const plot of result.state.plots.slice(0, 3)) {
    assert.equal(plot.waterLevel, Math.min(WATER.max, RAIN_WATER_PER_HOUR.heavyRain));
    assert.ok(plot.waterLevel <= WATER.max, 'and never over the cap');
  }
});

test('the pump waters one plot and bills for exactly what it delivered', () => {
  // One plot at a time: a per-second bill across sixteen plots would scale the cost
  // with how much land you own rather than with how thirsty you are.
  const state = farmWith({ weather: sky({ code: 0 }), count: 4 });
  state.pump = { on: true, target: 1 };
  state.lastTickAt = Date.now() - 60_000; // one minute of pumping

  const result = tick(state, Date.now());
  assert.ok(result.state.plots[1].waterLevel > 0, 'the aimed plot gained water');
  assert.equal(result.state.plots[0].waterLevel, 0, 'and the others did not');
  assert.ok(result.spent > 0, 'it was billed for it');
  assert.equal(result.state.gold, state.gold - result.spent);
  // 60 s x 0.028/s = 1.68 water, and 5 water per gold, so that is 0.336 -> 0.34 gold.
  assert.ok(Math.abs(result.spent - 0.34) < 0.01, `billed ${result.spent}, expected 0.34`);
});

test('watering a crop to its target costs a real slice of the harvest margin', () => {
  // Rice is 100 in and 200 out, so the margin is 100 gold. The pump charges 5 water per
  // gold and rice's target is 85, so a full watering is 17 — about a sixth of the
  // margin. Real enough to decide on, cheap enough not to be a punishment.
  assert.equal(costOf(10), 2, 'the rate is 5 water per gold');

  const rice = targetFor({ cropId: 'rice' });
  assert.equal(rice, 85, 'rice wants the most water');
  assert.equal(costOf(rice), 17, 'and a full watering costs 17 gold');

  const wheat = targetFor({ cropId: 'wheat' });
  assert.equal(wheat, 55, 'wheat wants much less');
  assert.equal(costOf(wheat), 11, 'and costs 11');

  // Not `WATER.max`. The pump stops at the target, so paying for water past the point
  // of any use is not something the player can be talked into, by design.
  assert.ok(costOf(WATER.max) > costOf(rice), 'filling to max would cost more, and never happens');
});

test('the pump stops itself when the plot is full and when the gold is gone', () => {
  const full = farmWith({ weather: sky({ code: 0 }) });
  full.pump = { on: true, target: 0 };
  full.plots[0].waterLevel = 0;
  full.lastTickAt = Date.now() - 10 * HOUR; // far more than a full plot needs
  const filled = tick(full, Date.now());
  assert.equal(filled.autoOff, 'full', 'a full plot stops the pump');
  assert.equal(filled.state.pump.on, true, 'the toggle stays on so the player can re-aim');

  const broke = farmWith({ weather: sky({ code: 0 }), gold: 1 });
  broke.pump = { on: true, target: 0 };
  broke.lastTickAt = Date.now() - 10 * HOUR;
  const empty = tick(broke, Date.now());
  assert.equal(empty.autoOff, 'gold', 'an empty purse stops it too');
  assert.equal(empty.state.pump.on, false, 'and turns it off, because it cannot restart itself');
  assert.equal(empty.state.gold, 0, 'without going negative');
});

test('a closed tab catches up instead of skipping the hours it slept through', () => {
  // The reason everything here is computed from elapsed time rather than a fixed
  // step: six hours away must dry the farm as six hours of ticking would have.
  const one = farmWith({ weather: sky({ code: 0, temp: 35 }) });
  one.plots[0].waterLevel = 100;
  one.lastTickAt = Date.now() - HOUR;
  const afterOne = tick(one, Date.now());

  const six = farmWith({ weather: sky({ code: 0, temp: 35 }) });
  six.plots[0].waterLevel = 100;
  six.lastTickAt = Date.now() - 6 * HOUR;
  const afterSix = tick(six, Date.now());

  assert.ok(
    afterSix.state.plots[0].waterLevel < afterOne.state.plots[0].waterLevel,
    'six hours away must dry further than one',
  );
});

test('a clock that jumped backwards does not dry the farm', () => {
  const state = farmWith({ weather: sky({ code: 0, temp: 35 }) });
  state.plots[0].waterLevel = 100;
  state.lastTickAt = Date.now() + 5 * HOUR; // the future

  const result = tick(state, Date.now());
  assert.equal(result.state.plots[0].waterLevel, 100, 'a save from the future is ignored, not obeyed');
  assert.equal(elapsedHours(state, Date.now()), 0);
});

test('standing at zero costs health, which is what makes drought matter', () => {
  // `HEALTH.dryDrainPerHour` was defined from the start and read by nothing.
  // docs/weather-events.md specifies `waterLevel == 0` — **not** "below the dry line".
  // The `< 30` conditional in that document belongs to the drought *matrix row*, which
  // is applied at sowing; draining health at 30 would punish a merely thirsty plot.
  const state = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 40 }), count: 1 });
  state.plots[0].waterLevel = 0;
  state.lastTickAt = Date.now() - HOUR;

  const result = tick(state, Date.now());
  // An hour at zero costs the per-hour drain — **and** latches dry damage, because an
  // hour under the floor is the documented threshold. 5 + 12 = 17.
  assert.equal(
    result.state.plots[0].health,
    HEALTH.max - HEALTH.dryDrainPerHour - DAMAGE.lossPerLatched,
    'an hour at zero costs the drain, plus the damage it latches',
  );
  assert.equal(result.state.plots[0].damage, 'dry');

  // A plot that is dry but not bone dry is spared the **drain**, but not the **latch**.
  // At 40 °C rice loses 8 * 0.9 * 3 = 21.6/h, so 25 ends the hour at ~3.4 — above
  // zero, so no drain. It started below its floor of 64 and stayed there, so it latches
  // damage instead. Two rules, two thresholds: the floor asks how the crop is faring,
  // zero asks whether it is dying.
  const damp = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 40 }), count: 1 });
  damp.plots[0].waterLevel = 25;
  damp.lastTickAt = Date.now() - HOUR;
  const damped = tick(damp, Date.now());
  assert.ok(damped.state.plots[0].waterLevel > 0, 'it ends the hour wet enough to skip the drain');
  assert.equal(damped.state.plots[0].damage, 'dry', 'but an hour under the floor still latches');
  assert.equal(
    damped.state.plots[0].health,
    HEALTH.max - DAMAGE.lossPerLatched,
    'and it costs the latch, and only the latch',
  );
});

test('health reaching zero kills the crop, and bare soil never does', () => {
  // Nothing in the codebase ever set `dead: true` before this. The dead sprite, the
  // `plot--dead` class and the fifth click case were all wired with no writer.
  const dying = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 40 }), count: 1 });
  dying.plots[0].waterLevel = 0;
  dying.plots[0].health = HEALTH.dryDrainPerHour; // one hour from gone
  dying.lastTickAt = Date.now() - HOUR;

  const result = tick(dying, Date.now());
  assert.equal(result.state.plots[0].health, 0);
  assert.equal(result.state.plots[0].dead, true, 'a crop that dries out dies');
  assert.equal(result.deaths.length, 1, 'and the caller is told, rather than finding grey ground');

  const bare = farmWith({ cropId: null, weather: sky({ code: 0, temp: 40 }), count: 1 });
  bare.plots[0].waterLevel = 0;
  bare.plots[0].health = 1;
  bare.lastTickAt = Date.now() - 10 * HOUR;
  const dried = tick(bare, Date.now());
  assert.equal(dried.state.plots[0].dead, false, 'there is no crop on bare soil to kill');
  assert.deepEqual(dried.deaths, [], 'so nothing is announced');
});

test('a dead crop is not killed twice, because a dead crop is already dead', () => {
  // The tick runs every second for the life of the save. A `deaths` list that re-reports
  // on every tick would emit the same toast sixty times a minute, forever.
  const dying = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 40 }), count: 1 });
  dying.plots[0].waterLevel = 0;
  dying.plots[0].health = 0;
  dying.plots[0].dead = true;
  dying.lastTickAt = Date.now() - HOUR;

  const result = tick(dying, Date.now());
  assert.equal(result.state.plots[0].dead, true, 'it stays dead');
  assert.deepEqual(result.deaths, [], 'but is not announced a second time');
});

test('the pump will not be aimed at land the player does not own', () => {
  const state = buildInitialState(SESSION);
  const locked = state.plots.find((p) => !p.owned);
  assert.equal(aimPump(state, locked.id).ok, false, 'a padlocked square is refused');
  assert.equal(aimPump(state, 9999).ok, false, 'and so is a plot that does not exist');
  assert.equal(aimPump(state, state.plots.find((p) => p.owned).id).ok, true);
  assert.equal(setPump(state, true).pump.on, true);
});

test('the pump refuses to water a plot that is already full, and bills nothing for it', () => {
  // `pumpRun` is the machine's own rules with no store attached. A full plot means
  // `needed` is 0, so `delivered` is 0, so the bill is 0 — the panel saying "running"
  // while charging gold would be the one thing a meter must never do.
  const state = farmWith({ weather: sky({ code: 0 }) });
  state.pump = { on: true, target: 0 };
  state.plots[0].waterLevel = WATER.max;

  const run = pumpRun(state, 1);
  assert.equal(run.watered, 0);
  assert.equal(run.spent, 0);
  assert.equal(run.autoOff, 'full');
});

test('a pump aimed at a dead crop runs nothing, rather than billing for water', () => {
  const state = farmWith({ weather: sky({ code: 0 }) });
  state.pump = { on: true, target: 0 };
  state.plots[0].dead = true;

  const run = pumpRun(state, 1);
  assert.equal(run.plot, null, 'there is nothing to water');
  assert.equal(run.spent, 0);
});

/* --- notifications ----------------------------------------------------------- */

test('only planted crops generate warnings', () => {
  assert.deepEqual(plantedCrops(farmWith({ cropId: null, count: 3 })), []);
  assert.equal(plantedCrops(farmWith({ cropId: 'rice', count: 3 })).length, 1,
    'three plots of one crop is one conversation, not three');
});

test('settled weather is silent, which is what makes a warning worth reading', () => {
  // A crop is only interested in an event rated worse than neutral.
  const calm = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 20 }) });
  assert.deepEqual(forProjection(calm, Date.now()), [], 'sun is not worth a toast');
});

test('a harmful event ahead warns once per crop, and not again for the same window', () => {
  // Dedupe is `cropId:event` keyed on the window's start, per docs/notifications.md.
  const state = farmWith({ cropId: 'wheat', weather: sky({ code: 65, temp: 20 }) });

  const first = alertsToRaise(state, Date.now());
  assert.ok(first.alerts.length > 0, 'heavy rain damages wheat, so it warns');
  assert.ok(/rain/i.test(first.alerts[0].message));

  const again = alertsToRaise({ ...state, notified: first.notified }, Date.now());
  assert.deepEqual(again.alerts, [], 'and does not repeat for the same six hours');
});

test('the warning names an action, because a warning with no action is just anxiety', () => {
  const state = farmWith({ cropId: 'rice', weather: sky({ code: 0, temp: 40, rain: 0 }) });
  const { alerts } = alertsToRaise(state, Date.now());
  const drought = alerts.find((a) => a.event === 'drought');

  assert.ok(drought, 'a 40 °C dry spell is a drought for a crop');
  assert.match(drought.message, /pump/i, 'and it says what to do about it');
});

test('a plot already running dry is a condition, not a forecast', () => {
  // The other half of the warning system, and the one that has to fire on the 1 Hz
  // tick rather than on the weather refresh.
  const dry = farmWith({ cropId: 'rice', count: 1, weather: sky({ code: 0, temp: 38 }) });
  dry.plots[0].waterLevel = 4;
  assert.match(currentTrouble(dry, Date.now()).message, /pump/i);

  const watered = farmWith({ cropId: 'rice', count: 1, weather: sky({ code: 0, temp: 38 }) });
  watered.plots[0].waterLevel = 90;
  assert.equal(currentTrouble(watered, Date.now()), null, 'a watered plot in the heat is fine');
});

/* --- ISS-091 / ISS-092: the optimal band, the pump, and damage ----------------- */

test('each crop has its own target, and the thirsty one wants the most', () => {
  // `waterNeed` was a number that only scaled evaporation. Now it decides what the
  // player is aiming at, which is what makes it a rule rather than a modifier.
  assert.equal(targetFor({ cropId: 'rice' }), 85, 'waterNeed 0.9 wants the most');
  assert.equal(targetFor({ cropId: 'corn' }), 70, 'waterNeed 0.7 is in the middle');
  assert.equal(targetFor({ cropId: 'wheat' }), 55, 'waterNeed 0.5 wants the least');
  assert.equal(targetFor({ cropId: null }), OPTIMAL.bareTarget, 'bare soil has no crop');

  // And the target must follow the documented formula, not drift away from it.
  const crop = cropOf('rice');
  assert.equal(targetFor({ cropId: 'rice' }), Math.round(OPTIMAL.base + OPTIMAL.perNeed * crop.waterNeed));
});

test('the band scales with the target, so a hardy crop has less room to sag', () => {
  const rice = bandFor({ cropId: 'rice' });
  const wheat = bandFor({ cropId: 'wheat' });

  assert.equal(rice.target, 85);
  assert.equal(rice.floor, 64, 'a quarter below 85');
  assert.equal(wheat.floor, 41, 'a quarter below 55');

  assert.ok(rice.target - rice.floor > wheat.target - wheat.floor,
    'rice has more units of give than wheat, because it wants more water at all');
});

test('water reads as one of four states, and the middle one is the one that matters', () => {
  const rice = { cropId: 'rice' };
  assert.equal(waterState({ ...rice, waterLevel: 0 }), 'dry');
  assert.equal(waterState({ ...rice, waterLevel: 63 }), 'low');
  assert.equal(waterState({ ...rice, waterLevel: 64 }), 'optimal', 'the floor is inclusive');
  assert.equal(waterState({ ...rice, waterLevel: 85 }), 'optimal', 'the target is inclusive');
  assert.equal(waterState({ ...rice, waterLevel: 86 }), 'saturated');
  assert.equal(waterState({ ...rice, waterLevel: WATER.max }), 'saturated');
});

test('the time-to-optimal estimate lands in the 30-60 minute window', () => {
  // The number the whole pump design rests on, so it is pinned rather than described.
  for (const cropId of ['rice', 'corn', 'wheat']) {
    const { minutes, gold } = minutesToOptimal({ cropId, waterLevel: 0 }, 'sunny');
    assert.ok(minutes >= 30 && minutes <= 60,
      `${cropId} takes ${minutes} min from empty, which must be 30-60`);
    assert.ok(gold >= 10 && gold <= 20, `${cropId} costs ${gold} gold, which must be 10-20`);
  }
});

test('the estimate counts evaporation, so it is not short by the time it takes to dry', () => {
  // Filling at 90/h against 10.8/h of drying nets 79.2/h. Ignoring the evaporation term
  // would understate the wait by about 12% on rice in sun, and more in drought, which is
  // the weather where the number matters most.
  const sun = minutesToOptimal({ cropId: 'rice', waterLevel: 0 }, 'sunny').minutes;
  const drought = minutesToOptimal({ cropId: 'rice', waterLevel: 0 }, 'drought').minutes;
  assert.ok(drought > sun, 'a drought must take longer to water for, because it dries harder');
});

test('the estimate is null when there is nothing to do', () => {
  assert.equal(minutesToOptimal({ cropId: 'rice', waterLevel: 85 }, 'sunny'), null,
    'already at target, so the panel says so rather than "0 min"');
});

test('the meter shows what is going in and what is coming out', () => {
  // "Why is this bar falling" is answered by two numbers and a sign.
  const sun = flowFor({ cropId: 'rice', waterLevel: 85 }, 'sunny');
  assert.equal(sun.in, 0);
  assert.ok(sun.out > 0);
  assert.ok(sun.net < 0, 'nothing is coming in, so the net is negative');
  assert.ok(sun.minutesToFull > 0, 'and it says how long until the plot needs attention');

  const rain = flowFor({ cropId: 'rice', waterLevel: 20 }, 'heavyRain');
  assert.ok(rain.in > 0, 'rain is coming in');
  assert.ok(rain.net > 0);
});

test('the rates are rounded, because they are printed', () => {
  // The panel offered the player "drying −5.760000000000001/h". `8 * 0.9 * 0.8` is
  // 5.760000000000001 and it went straight into the DOM — the same lesson as `health` in
  // `water.js`, arriving the same way: correct arithmetic, absurd output.
  const cloudy = flowFor({ cropId: 'rice', waterLevel: 85 }, 'cloudy');
  assert.equal(cloudy.out, 5.8, '5.760000000000001 is not a number anyone should read');

  for (const event of ['sunny', 'cloudy', 'drought', 'heavyRain', 'lightRain', 'hail']) {
    for (const crop of ['rice', 'wheat', null]) {
      const f = flowFor({ cropId: crop, waterLevel: 40 }, event);
      for (const key of ['in', 'out', 'net']) {
        assert.equal(String(f[key]).length <= 5, true,
          `${crop ?? 'bare'}/${event}.${key} = ${f[key]} should read as a short number`);
      }
    }
  }
});

test('the pump stops at the crop target, and never pays for water past it', () => {
  const state = farmWith({ weather: sky({ code: 0 }), count: 1 });
  state.pump = { on: true, target: 0 };
  state.plots[0].waterLevel = 0;
  state.lastTickAt = Date.now() - 10 * HOUR; // far more than a fill needs

  const result = tick(state, Date.now());
  assert.equal(result.state.plots[0].waterLevel, 85, 'it stops at 85, not at max');
  assert.equal(result.state.plots[0].waterLevel < WATER.max, true, 'and max is well above it');
  assert.equal(result.autoOff, 'full');
});

test('a plot already at its target is not watered, and is not billed for watering it', () => {
  // Not billed for *watering*, which is the shortfall — zero here. It is still billed for
  // the evaporation the pump replaced, which is the next test and the whole point of
  // splitting the two.
  const rain = farmWith({ weather: sky({ code: 61, temp: 15, rain: 90 }), count: 1 });
  rain.pump = { on: true, target: 0 };
  rain.plots[0].waterLevel = 85;
  rain.lastTickAt = Date.now() - 60_000;

  const result = tick(rain, Date.now());
  assert.equal(result.watered, 0, 'nothing was needed, so nothing was delivered');
  assert.equal(result.spent, 0, 'and nothing to pay for');
  assert.equal(result.autoOff, 'full');
});

test('a pump holding a plot is still billed for the water that dried up', () => {
  // The bug this catches: billing only the shortfall gave free water. `missing` is zero
  // on a plot already at target, so a pump holding it there cost nothing, forever.
  const state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
  state.pump = { on: true, target: 0 };
  state.plots[0].waterLevel = 85;
  state.lastTickAt = Date.now() - HOUR;

  const result = tick(state, Date.now());
  assert.equal(result.state.plots[0].waterLevel, 85, 'the pump holds it at target');
  assert.ok(result.spent > 0, 'but holding it is not free - the sun kept taking water out');
});

/** A weather response shaped like `services/weatherApi.js` returns, for the env card. */
function env({ temp = 30, temps, code = 0, humidity = 50, chance = 0, wind = 5, uv = 0 } = {}) {
  const pad = (v) => String(v).padStart(2, '0');
  const now = Date.now();
  const stamp = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  };
  const hours = 24;
  return {
    current: {
      temperature: temp, feelsLike: temp, humidity, precipitation: 0,
      isDay: true, weatherCode: code, windSpeed: wind, windDirection: 180,
    },
    hourly: {
      time: Array.from({ length: hours }, (_, i) => stamp(now - HOUR * (3 - i))),
      temperature: temps ?? Array(hours).fill(temp),
      humidity: Array(hours).fill(humidity),
      precipitationProbability: Array(hours).fill(chance),
      weatherCode: Array(hours).fill(code),
      windSpeed: Array(hours).fill(wind),
      windDirection: Array(hours).fill(180),
      uvIndex: Array(hours).fill(uv),
    },
  };
}

test('THE REPORTED BUG: a crop the pump is aimed at survives, and takes no damage', () => {
  // "2 crops died of thirst, the pump would have saved them" - with the pump running.
  // Two things were wrong: the death message ignored the pump, and the pump was modelled
  // as delivering one lump at the END of the window while evaporation ran continuously,
  // so a pumped plot was modelled as dry for 22 hours and then watered.
  const state = farmWith({ weather: sky({ code: 0, temp: 40 }), count: 3, gold: 10000 });
  state.pump = { on: true, target: 0 };
  state.plots[0].waterLevel = 5;
  state.plots[1].waterLevel = 0;
  state.plots[2].waterLevel = 0;
  state.lastTickAt = Date.now() - 30 * HOUR;

  const result = tick(state, Date.now());
  const pumped = result.state.plots[0];

  assert.equal(pumped.dead, false, 'the pumped plot must survive');
  assert.equal(pumped.damage, null, 'and must not latch damage it never suffered');
  assert.ok(pumped.health > 50, `and keeps its health, had ${pumped.health}`);

  // The two the pump was NOT aimed at legitimately died. That is the design, not a bug:
  // one plot at a time (DEC-040), so there is always somebody left to move it.
  assert.equal(result.state.plots[1].dead, true);
  assert.equal(result.state.plots[2].dead, true);
  assert.equal(result.deaths.length, 2);
});

test('the pump holds a plot indefinitely, and the bill scales with the hours', () => {
  for (const hours of [1, 30, 300]) {
    const state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1, gold: 1e6 });
    state.pump = { on: true, target: 0 };
    state.plots[0].waterLevel = 85;
    state.lastTickAt = Date.now() - hours * HOUR;

    const result = tick(state, Date.now());
    assert.equal(result.state.plots[0].waterLevel, 85, `held at target after ${hours}h`);
    assert.equal(result.state.plots[0].dead, false, `and alive after ${hours}h`);
    assert.ok(result.spent > 0, `and it cost gold after ${hours}h`);
  }
});

test('dryness is charged for how long a plot was dry, not for the whole period', () => {
  // The fix for ISS-091 defect 2. A plot at its target reaches 0 at 85/10.8 = 7.9h, so it
  // is dry for whatever is left - not the whole window.
  const healthAfter = (hours) => {
    const state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
    state.plots[0].waterLevel = 85;
    state.lastTickAt = Date.now() - hours * HOUR;
    return tick(state, Date.now()).state.plots[0].health;
  };


  const twelve = healthAfter(12);
  assert.ok(healthAfter(6), '6h never reaches zero, so the dry drain costs nothing');

  // 6 h of sun drops rice 64.8, from 85 to 20.2 — it never touches zero, so no drain.
  // But it does cross **below its floor of 64** for the last 1.9 h, and that is what
  // latches damage. The two are separate rules on separate thresholds: the floor is
  // about how the crop is faring, zero is about whether it is dying.
  const six = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
  six.plots[0].waterLevel = 85;
  six.lastTickAt = Date.now() - 6 * HOUR;
  const sixPlot = tick(six, Date.now()).state.plots[0];
  assert.equal(sixPlot.damage, 'dry', '6h under the floor latches it');
  assert.equal(sixPlot.health, HEALTH.max - DAMAGE.lossPerLatched, 'but the drain has not started');

  // Rice at 85 reaches 0 at 85/10.8 = 7.87h, so 9h away means 1.13h genuinely dry and
  // about 5 health — not the 45 the old whole-window charge cost.
  const nine = healthAfter(9);
  assert.ok(nine > 75 && nine < 90, `9h costs the drain and the latch, got ${nine}`);
  // 12 h: dry for 4.13 h costs ~21 by the drain, plus the 12 for the latch that
  // crossing the floor already triggered. Two separate charges, and the total is 67.
  assert.ok(twelve > 60 && twelve < 75, `12h costs the drain and the latch, got ${twelve}`);
  assert.ok(twelve > healthAfter(20), 'and more time away costs more');
});

test('damage latches on a plot left under its floor, and announces itself once', () => {
  const state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
  state.plots[0].waterLevel = 20;
  state.lastTickAt = Date.now() - 3 * HOUR;

  const result = tick(state, Date.now());
  assert.equal(result.state.plots[0].damage, 'dry', '3h under the floor latches it');
  assert.equal(result.damaged.length, 1, 'and the caller is told, once');
  assert.ok(result.state.plots[0].health < HEALTH.max, 'and it cost health');
});

test('damage never clears and never downgrades', () => {
  let state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
  state.plots[0].waterLevel = 20;
  state.lastTickAt = Date.now() - 3 * HOUR;
  state = tick(state, Date.now()).state;

  const hurt = state.plots[0].health;
  state.plots[0].waterLevel = 85;
  state.lastTickAt = Date.now() - HOUR;

  const after = tick(state, Date.now());
  assert.equal(after.state.plots[0].damage, 'dry', 'watering it again does not undo it');
  assert.equal(after.state.plots[0].health, hurt, 'and does not give the health back');
  assert.deepEqual(after.damaged, [], 'nor re-announce it');
});

test('one heavy shower is not waterlogging; hours of it is', () => {
  // An instant threshold here would undo the one-time verdict at sowing, and cost a
  // player a field every time it rained.
  const soak = (hours) => {
    const state = farmWith({ weather: sky({ code: 65, temp: 18, rain: 95 }), count: 1 });
    state.plots[0].waterLevel = 85;
    state.lastTickAt = Date.now() - hours * HOUR;
    return tick(state, Date.now()).state.plots[0];
  };

  assert.equal(soak(1).damage, null, 'an hour of rain is weather, not damage');
  assert.equal(soak(6).damage, 'waterlogged', 'six hours of it is');
});

test('a plot the pump is holding can never waterlog, because it is held AT the target', () => {
  const state = farmWith({ weather: sky({ code: 65, temp: 18, rain: 95 }), count: 1, gold: 1e6 });
  state.pump = { on: true, target: 0 };
  state.plots[0].waterLevel = 85;
  state.lastTickAt = Date.now() - 10 * HOUR;

  const plot = tick(state, Date.now()).state.plots[0];
  assert.equal(plot.waterLevel, 85, 'the pump caps it at the target, never past it');
  assert.equal(plot.damage, null, 'so there is no over-watering to damage it with');
});

test('damage words and sprites cover three states, and dead wins', () => {
  const plot = { cropId: 'rice', health: 40 };

  assert.equal(damageWord(plot), null, 'undamaged says nothing');
  assert.equal(damageSprite(plot), null);
  assert.equal(damageWord({ ...plot, damage: 'dry' }), 'Dry');
  assert.equal(damageSprite({ ...plot, damage: 'dry' }), 'dry');
  assert.equal(damageWord({ ...plot, damage: 'waterlogged' }), 'Waterlogged');
  assert.equal(damageSprite({ ...plot, damage: 'waterlogged' }), 'waterlogged');

  const dead = { ...plot, damage: 'dry', dead: true };
  assert.equal(damageWord(dead), 'Dead', 'a dead crop is dead whatever else was wrong');
  assert.equal(damageSprite(dead), 'dead');
});

test('a plot with no crop cannot be damaged', () => {
  assert.equal(damageSprite({ cropId: null, damage: 'dry' }), null);
  assert.equal(damageFor({}, { belowFloor: 99, aboveTarget: 0 }), 'dry',
    'the rule still answers; water.js is what declines to apply it to bare soil');
});

test('applyDamage returns the same object when nothing changes', () => {
  // Identity matters: `tick` uses it to decide whether to hand back a new plot at all,
  // and a fresh object every tick would make the field repaint forever.
  const plot = { cropId: 'rice', health: 90, damage: 'dry' };
  assert.equal(applyDamage(plot, 'dry'), plot, 'already this damage');
  assert.equal(applyDamage(plot, null), plot, 'nothing to apply');
  assert.notEqual(applyDamage(plot, 'waterlogged'), plot, 'a real change is a new object');
});

test('pumpedWindow is not the same rule as timeOutsideBand, and that is the point', () => {
  // A pumped plot climbs fast and then HOLDS. Interpolating it across the whole period
  // says a plot the pump rescued in forty minutes spent the other twenty-nine under its
  // floor - which is the same defect as the death message, one layer down, and it is what
  // made a rescued crop read as a drought victim.
  const band = bandFor({ cropId: 'rice' }); // floor 64, target 85
  const plot = { cropId: 'rice', waterLevel: 5 };
  const rates = ratesFor(plot, 'drought'); // dry 21.6/h
  const gross = 100.8;

  const window = pumpedWindow(plot, band, gross, rates, 30);
  const climb = (band.floor - 5) / (gross - rates.dry);
  assert.ok(window.belowFloor < 1, `it should be rescued in under an hour, got ${window.belowFloor}h`);
  assert.ok(Math.abs(window.belowFloor - climb) < 0.01, 'and the time is exactly the climb');
  assert.equal(window.aboveTarget, 0, 'and never above the target, because the pump stops at it');

  // The two rules disagree, deliberately, and this is the case that proves it.
  assert.ok(
    timeOutsideBand(plot, band, 5, 85, 30).belowFloor > 20,
    'the plain interpolation would call it over twenty hours of drought',
  );
});

test('timeOutsideBand measures the crossing, not the whole period', () => {
  // Two bugs pinned here. First: a plot below the floor that is being *filled* was under
  // it only until it arrived — reading the whole period counted a pump rescue as thirty
  // hours of drought. Second: the function takes the start and end levels, because the
  // water moves linearly and that makes the crossing exact.
  const band = bandFor({ cropId: 'rice' }); // floor 64, target 85
  const plot = { cropId: 'rice', waterLevel: 5 };

  // 5 -> 85 over 30 h is 2.67/h, and it reaches the floor of 64 at (64-5)/2.67 = 22.1h,
  // so it was under the floor for those 22.1h. Not 30h, and not 0.
  const rising = timeOutsideBand(plot, band, 5, 85, 30);
  assert.ok(rising.belowFloor > 22 && rising.belowFloor < 22.5,
    `a filling plot is under the floor until it arrives, got ${rising.belowFloor}`);

  // Drying from 85 to 20 over 30 h crosses 64 at 9.7h, so 20.3h under it.
  const falling = timeOutsideBand(plot, band, 85, 20, 30);
  assert.ok(falling.belowFloor > 20 && falling.belowFloor < 21, 'and the reverse for a drying one');

  assert.equal(timeOutsideBand(plot, band, 20, 0, 30).belowFloor, 30,
    'a plot that starts and stays below the floor is under it for everything');
  assert.equal(timeOutsideBand(plot, band, 85, 85, 30).aboveTarget, 0,
    'a plot held at its target by the pump is not over it');
  assert.equal(timeOutsideBand(plot, band, 64, 85, 30).belowFloor, 0,
    'a plot that starts exactly on the floor and rises is never under it');
  assert.equal(timeOutsideBand(plot, band, 85, 120, 30).aboveTarget, 30,
    'a plot sitting on the target while the rain comes is over it for everything');
  assert.ok(timeOutsideBand(plot, band, 20, 120, 30).aboveTarget < 15,
    'and one that climbs through the target is only over it for the tail');
});

test('DAMAGE thresholds and the health cost are the documented numbers', () => {
  assert.equal(DAMAGE.hoursBelowFloorToLatch, 1);
  assert.equal(DAMAGE.hoursAboveTargetToLatch, 2);
  assert.ok(DAMAGE.lossPerLatched > 0, 'damage must cost something or it is decorative');
  assert.ok(DAMAGE.lossPerLatched < HEALTH.max / 4, 'but not enough to be a death sentence');
});

test('every plot carries a damage field, including a fresh farm', () => {
  // Added in `buildPlots` rather than in sixteen files, and it doubles as the migration
  // for a save written before damage existed.
  for (const plot of buildInitialState(SESSION).plots) {
    assert.equal(plot.damage, null, 'a new plot is undamaged, not undefined');
  }
});

test('the player is told which plots need water, and where the pump is', () => {
  // ISS-091 arrived as a message about the past tense - "2 crops died" - for a situation
  // that had been visible for hours. This is the warning that should have come first, and
  // it has to name the plots, because the pump waters one square at a time and "some
  // crops are dry" is not actionable.
  const state = farmWith({ weather: sky({ code: 0, temp: 40 }), count: 3 });
  state.plots[0].waterLevel = 2;
  state.plots[1].waterLevel = 20;
  state.plots[2].waterLevel = 85;

  const off = wateringAdvice(state);
  assert.ok(off, 'there is something to say');
  assert.deepEqual(off.plots, [0, 1], 'both dry plots are named');
  assert.match(off.message, /plot 1, plot 2/, 'and listed by number');
  assert.match(off.message, /Turn the pump on/, 'with the action');

  state.pump = { on: true, target: 2 }; // aimed at the healthy one
  const elsewhere = wateringAdvice(state);
  assert.equal(elsewhere.aimedAt, 2);
  assert.match(elsewhere.message, /on plot 3/, 'and says where the pump is pointed');
  assert.match(elsewhere.message, /move it/, 'and that it has to move');

  const healthy = farmWith({ weather: sky({ code: 0, temp: 40 }), count: 1 });
  healthy.plots[0].waterLevel = 85;
  assert.equal(wateringAdvice(healthy), null, 'a comfortable plot says nothing');
});

test('a dead crop is not on the watering list', () => {
  const state = farmWith({ weather: sky({ code: 0, temp: 40 }), count: 2 });
  state.plots[0].waterLevel = 0;
  state.plots[0].dead = true;
  state.plots[1].waterLevel = 85;
  assert.equal(wateringAdvice(state), null, 'there is nothing left to water');
});

/* --- T-11 the environment card ------------------------------------------------- */

test('the environment card answers what the weather is doing to the farm', () => {
  // The board *reports* the weather; this says what it costs. Drying is always shown,
  // because it is the number every water decision is made against, and it is bare-soil
  // evaporation — the fastest anything on the farm dries.
  const facts = environmentFacts({ weather: env({ temp: 32, humidity: 45 }) });
  const drying = facts.find((f) => f.id === 'drying');

  assert.ok(drying, 'drying is always reported');
  assert.equal(drying.value, '12 /h', '8 x waterNeed 1 x sunny evaporation 1.5');
  assert.equal(drying.tone, 'warn');
});

test('every threshold on the card is the one the game already uses', () => {
  // Frost 2, wind 40, humidity 85 — the same comparisons `classifyHour` makes. A card
  // that invents its own numbers can tell a player a day is frost-free while
  // `verdictFor` is charging them for frost.
  assert.equal(FROST_C, 2);
  assert.equal(STRONG_WIND_KMH, 40);
  assert.equal(HIGH_HUMIDITY, 85);
});

test('a hot dry day warns about the things that cost you, and says what to do', () => {
  const facts = environmentFacts({ weather: env({ temp: 42, humidity: 20, uv: 9 }) });
  const by = Object.fromEntries(facts.map((f) => [f.id, f]));

  assert.equal(by.drying.tone, 'danger', 'drought evaporation is 24/h and it is the top row');
  assert.equal(by.drying.value, '24 /h');
  assert.ok(by.humidity, 'dry air is called out, because it compounds the drying');
  assert.ok(by.uv, 'and high UV, because a player stands in a field');
  assert.match(by.uv.note, /very high|high/);
});

test('a calm sky reports the drying and nothing else', () => {
  // Six rows where four say "fine" is a list nobody reads, and the frost line is easy to
  // miss in it. So calm facts are dropped rather than printed in grey.
  const facts = environmentFacts({ weather: env({ temp: 16, code: 3, humidity: 70, uv: 2 }) });
  assert.deepEqual(facts.map((f) => f.id), ['drying']);
});

test('frost is only mentioned when it is near enough to act on', () => {
  // "Frost 32C — safe" is worse than no row: it teaches the player to scan past it.
  const warm = environmentFacts({ weather: env({ temp: 32 }) });
  assert.equal(warm.some((f) => f.id === 'frost'), false);

  const cold = environmentFacts({ weather: env({ temp: 6, temps: [6, 5, 4, 3, 2, 3, 5, 7] }) });
  assert.ok(cold.some((f) => f.id === 'frost'), 'at 2C it is worth a line');
});

test('a storm says the wind will damage crops and that rain is coming', () => {
  const facts = environmentFacts({
    weather: env({ code: 95, temp: 18, humidity: 90, chance: 90, wind: 45, uv: 1 }),
  });
  const by = Object.fromEntries(facts.map((f) => [f.id, f]));

  assert.equal(by.wind.tone, 'danger');
  assert.match(by.wind.note, /damage/, 'and says what it does, not just the number');
  assert.ok(by.rain, 'rain is worth mentioning at 90%');
  assert.equal(by.humidity.tone, 'calm', 'saturated air is good news, so it is calm');
});

test('the most urgent fact sorts to the top', () => {
  const facts = environmentFacts({ weather: env({ temp: 3, temps: [3, 2, 1, -3, 0, 2, 4, 6], humidity: 20 }) });
  const tones = facts.map((f) => f.tone);
  const rank = { danger: 0, warn: 1, calm: 2 };
  const sorted = [...tones].sort((a, b) => rank[a] - rank[b]);
  assert.deepEqual(tones, sorted, `expected most-urgent first, got ${tones.join(', ')}`);
});

test('no forecast means no facts, and not an error', () => {
  assert.deepEqual(environmentFacts({ weather: null }), []);
  assert.deepEqual(environmentFacts(null), []);
  assert.deepEqual(environmentFacts({ weather: { hourly: {} } }), []);
});

test('a save written before damage existed still reads as undamaged', () => {
  const legacy = buildInitialState(SESSION);
  delete legacy.plots[0].damage;

  const state = farmWith({ weather: sky({ code: 0, temp: 35 }), count: 1 });
  state.plots[0] = legacy.plots[0];
  state.plots[0].cropId = 'rice';
  state.plots[0].waterLevel = 20;
  state.lastTickAt = Date.now() - 3 * HOUR;

  assert.equal(damageWord(state.plots[0]), null, 'absent is not the same as damaged');
  assert.equal(tick(state, Date.now()).state.plots[0].damage, 'dry', 'and it still latches');
});
