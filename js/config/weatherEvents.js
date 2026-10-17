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
