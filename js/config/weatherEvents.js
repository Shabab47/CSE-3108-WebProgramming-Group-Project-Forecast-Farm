/**
 * WMO weather code → the nine events the farm cares about.
 *
 * Transcribed from `docs/weather-events.md`, which is the specification; this is
 * the machine-readable half of it. Nothing here decides an *effect* — that is
 * `cropWeatherMatrix.js`. This file only answers "what kind of weather is this".
 *
 * ## Why the order is written out and not sorted
 *
 * `docs/weather-events.md` is explicit that the order is not arbitrary: hail beats
 * frost because thunderstorm hail often carries a freezing reading, and frost beats
 * drought because a freezing night and a heatwave never overlap while frost is the
 * more dangerous of the two. `high-humidity` sits below the rain checks on purpose.
 * A `switch` would evaluate the cases top to bottom and quietly get this wrong the
 * first time someone reorders the file, so the ladder is written as an explicit
 * sequence of early returns.
 *
 * ## What a threshold is allowed to look at
 *
 * A code, the temperature and the wind. Humidity is included for the one check the
 * spec defines it for (`high-humidity`), not as a general-purpose input.
 */

/**
 * The nine events, in classification order. Exported so a crop's `seasons` list
 * and the tests can both name them without retyping a string literal.
 *
 * `order` is the index and doubles as severity for picking the event that matters
 * most across a window — see `worstEventIn()` in `domain/weather.js`.
 */
export const WEATHER_EVENTS = [
  { id: 'hail', label: 'Hail', drainPerHour: 20 },
  { id: 'frost', label: 'Frost', drainPerHour: 30 },
  { id: 'drought', label: 'Drought', drainPerHour: 8 },
  { id: 'strongWind', label: 'Strong wind', drainPerHour: 6 },
  { id: 'heavyRain', label: 'Heavy rain', drainPerHour: 4 },
  { id: 'lightRain', label: 'Light rain', drainPerHour: 0 },
  { id: 'highHumidity', label: 'High humidity', drainPerHour: 0 },
  { id: 'sunny', label: 'Sunny', drainPerHour: 0 },
  { id: 'cloudy', label: 'Cloudy', drainPerHour: 0 },
];

/**
 * Water lost per hour, by event — the `Evaporation` column of the table in
 * `docs/weather-events.md`, transcribed so the document and the game cannot disagree.
 *
 * Scaled by the crop's own `waterNeed`, so a thirsty crop dries faster. Rain and
 * drought both read here: rain stops the loss, and drought triples it.
 */
export const EVAPORATION_PER_HOUR = {
  sunny: 1.5,
  cloudy: 0.8,
  lightRain: 0,
  heavyRain: 0,
  drought: 3,
  frost: 0.5,
  hail: 0.8,
  strongWind: 1.5,
  highHumidity: 1,
};

/**
 * Water gained per hour, by event — the `Rain water / hour` column.
 *
 * This is the half that never existed in code, which is why `plot.waterLevel` was
 * written once at plot creation and never again. It is also the number ISS-008 is
 * measured against: heavy rain is 50/h, so the pump at `WATER.pumpPerSecond: 0.05`
 * delivers 180/h and is **3.6×** rain. At the old 0.5 it was 1800/h and **36×**, which
 * is where that issue's figure came from.
 */
export const RAIN_WATER_PER_HOUR = {
  sunny: 0,
  cloudy: 0,
  lightRain: 20,
  heavyRain: 50,
  drought: 0,
  frost: 0,
  hail: 5,
  strongWind: 0,
  highHumidity: 0,
};

/** Below this a plot is "dry" and a drought damages it. From the spec. */
export const DRY_WATER = 30;

/**
 * The rate for an event, or 0 for one the tables do not mention.
 *
 * Exported so a caller never has to know the maps exist, and so an unknown event is
 * a zero rather than an exception — a missing row must not stop the farm.
 *
 * @param {object} table
 * @param {string} eventId
 * @returns {number}
 */
export function rateFor(table, eventId) {
  return table[eventId] ?? 0;
}

/** Code groups, exactly as `docs/weather-events.md` lists them. */
const CODES = {
  hail: [96, 99],
  frost: [66, 67, 71, 72, 73, 75, 76, 77, 85, 86],
  drought: [],
  strongWind: [],
  heavyRain: [63, 65, 81, 82, 95],
  lightRain: [51, 53, 55, 56, 57, 61, 80],
  highHumidity: [45, 48],
  sunny: [0, 1],
  cloudy: [2, 3],
};

/** `code → event id` lookup, built once. */
const BY_CODE = (() => {
  const table = new Map();
  for (const [event, codes] of Object.entries(CODES)) {
    for (const code of codes) table.set(code, event);
  }
  return table;
})();

/** Severity rank, so a window can be reduced to its single worst event. */
const RANK = new Map(WEATHER_EVENTS.map((event, index) => [event.id, index]));

/** Where the ranking stands, so a test can assert an ordering that matters. */
export function eventRank(eventId) {
  return RANK.get(eventId) ?? WEATHER_EVENTS.length;
}

const PER_HOUR = new Map(WEATHER_EVENTS.map((event) => [event.id, event.drainPerHour]));

/**
 * Health per hour this event costs a crop that *hates* it, from the table in
 * `docs/weather-events.md` (frost −30, drought −8, and so on).
 *
 * `cropWeatherMatrix.js` turns a rating into a drain by multiplying by a base rate,
 * so a crop that merely dislikes the weather pays half this and a crop that is
 * harmed by it pays all of it. `verdictFor()` passes `this / 2` for exactly that
 * reason — the documented figures are already the −2 total.
 *
 * @param {string} eventId
 * @returns {number}
 */
export function eventDrainPerHour(eventId) {
  return PER_HOUR.get(eventId) ?? 0;
}

/**
 * Classify one hour of weather.
 *
 * @param {object} hour `{weatherCode, temperature, windSpeed, humidity}`
 * @returns {string} an event id, always — an unrecognised reading is `cloudy`
 *   rather than `null`, because "we do not know" must not read as "nothing is
 *   happening" on a farm whose whole point is that weather does something.
 */
export function classifyHour(hour) {
  if (!hour) return 'cloudy';

  const code = hour.weatherCode;
  const byCode = BY_CODE.get(code);

  // Hail and frost are code-driven first, and frost has a temperature clause as
  // well, so it is checked before falling through to the code groups below it.
  if (byCode === 'hail') return 'hail';
  if (byCode === 'frost' || (typeof hour.temperature === 'number' && hour.temperature <= 2)) {
    return 'frost';
  }

  // 38 °C with almost no chance of rain is a drought; 38 °C with rain is just heat,
  // and heat is not one of the nine events, so it falls through to whatever the
  // sky is actually doing.
  if (
    typeof hour.temperature === 'number'
    && hour.temperature >= 38
    && (hour.precipitationProbability ?? 100) < 20
  ) {
    return 'drought';
  }

  if (typeof hour.windSpeed === 'number' && hour.windSpeed >= 40) return 'strongWind';
  if (byCode === 'heavyRain') return 'heavyRain';
  if (byCode === 'lightRain') return 'lightRain';
  if (byCode === 'highHumidity' || (typeof hour.humidity === 'number' && hour.humidity >= 85)) {
    return 'highHumidity';
  }

  // Code 0 and 1 are the only sunny readings; everything else is treated as cloud.
  // `sunny` is deliberately absent from the early returns above because it is the
  // last word on a reading, not the first.
  return byCode === 'sunny' ? 'sunny' : 'cloudy';
}
