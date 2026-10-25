/**
 * The domain meaning of a weather reading: what it does to a crop.
 *
 * This file is `weatherPanel.js`'s vocabulary — codes to words and a compass — and
 * now also the place a forecast is turned into a verdict on a planting. The rules
 * themselves live in `config/`: `weatherEvents.js` says what kind of weather a
 * reading is, `cropWeatherMatrix.js` says what that does to each crop, and
 * `seasons.js` says what time of year it is where the player is.
 *
 * ## The model, and why it is not a per-hour tick
 *
 * A planting is judged **once**, against the next `FORECAST_WINDOW_HOURS` hours of
 * forecast, at the moment the seed goes in. That is possible because every crop
 * takes 4–8 hours to grow, so the window is sized to the crop line rather than to
 * the clock. It also means there is no `simulator.js` to write and nothing to tick:
 * the consequence of the weather is decided when the player commits, not while they
 * sleep.
 */

import { HEALTH } from '../config/game.js';
import { healthDrainFor, weatherRating } from '../config/cropWeatherMatrix.js';
import { classifyHour, eventDrainPerHour, eventRank } from '../config/weatherEvents.js';
import { seasonFor, seasonRating } from './seasons.js';

/**
 * How far ahead a planting is judged, in hours.
 *
 * Six is not arbitrary: `rice` and `wheat` are `growHours: 6` and `potato`, `tomato`
 * and `corn` are 4, so the window covers the whole life of every crop there is.
 */
export const FORECAST_WINDOW_HOURS = 6;

/**
 * The floor a weather event can take a crop to.
 *
 * Weather can wound a crop but cannot kill it. `docs/weather-events.md` says frost
 * is "a drain, not an instant kill" — and a drain applied to six hours in a single
 * instant *is* an instant kill, since the spec's own figure is −30/h and six of them
 * is −180. Death stays the pump's fault, which is the only way "your crop died" has
 * something a player can act on behind it.
 */
export const WEATHER_HEALTH_FLOOR = 25;

/**
 * Health an off-season planting costs, flat.
 *
 * Small on purpose. The season is a soft signal that stacks with a forecast the
 * player can see, and a cost large enough to dominate would make the weather
 * unreadable — every winter planting would look like a storm.
 */
export const SEASON_MISS_COST = 10;

/** The WMO codes, for the board's own labels. Unrelated to the events above. */
const WMO_CODES = {
  0: { label: 'Clear sky', short: 'Clear', icon: 'sun' },
  1: { label: 'Mainly clear', short: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', short: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', short: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', short: 'Fog', icon: 'fog' },
  48: { label: 'Rime fog', short: 'Rime fog', icon: 'fog' },
  51: { label: 'Light drizzle', short: 'Drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', short: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Dense drizzle', short: 'Heavy drizzle', icon: 'drizzle' },
  56: { label: 'Freezing drizzle', short: 'Freezing drizzle', icon: 'drizzle' },
  57: { label: 'Dense freezing drizzle', short: 'Freezing drizzle', icon: 'drizzle' },
  61: { label: 'Light rain', short: 'Light rain', icon: 'rain' },
  63: { label: 'Moderate rain', short: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', short: 'Heavy rain', icon: 'rain' },
  66: { label: 'Light freezing rain', short: 'Freezing rain', icon: 'rain' },
  67: { label: 'Heavy freezing rain', short: 'Freezing rain', icon: 'rain' },
  71: { label: 'Light snow', short: 'Light snow', icon: 'snow' },
  73: { label: 'Moderate snow', short: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', short: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', short: 'Snow grains', icon: 'snow' },
  80: { label: 'Light showers', short: 'Light showers', icon: 'rain' },
  81: { label: 'Moderate showers', short: 'Showers', icon: 'rain' },
  82: { label: 'Violent showers', short: 'Heavy showers', icon: 'rain' },
  85: { label: 'Light snow showers', short: 'Snow showers', icon: 'snow' },
  86: { label: 'Heavy snow showers', short: 'Snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', short: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm with hail', short: 'Thunderstorm', icon: 'storm' },
  99: { label: 'Severe thunderstorm', short: 'Severe storm', icon: 'storm' },
};

export function describeWeatherCode(code) {
  return WMO_CODES[code] ?? { label: 'Unknown conditions', short: 'Unknown', icon: 'cloud' };
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function windCompass(degrees) {
  if (typeof degrees !== 'number' || Number.isNaN(degrees)) return '';
  return COMPASS[Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16];
}

export function isWet(code) {
  const info = describeWeatherCode(code);
  return info.icon === 'rain' || info.icon === 'drizzle' || info.icon === 'storm';
}

export function isSevere(code) {
  const info = describeWeatherCode(code);
  return info.icon === 'storm' || code === 65 || code === 75 || code === 82 || code === 86;
}

/* --- the planting verdict ------------------------------------------------- */

/**
 * The next `hours` readings from now, as objects.
 *
 * Open-Meteo returns hourly arrays starting at the **top of the current hour**, not
 * at the moment of the request, so "now" has to be found rather than assumed to be
 * index 0. Taking index 0 blindly would judge a planting on the temperature from
 * part of an hour that has already passed — which is the same class of mistake as
 * the `hourly[0]` bug ISS-009 was about.
 *
 * Returns `[]` rather than `null` for missing data, so a caller can test length
 * instead of guarding every access.
 *
 * **One assumption, stated because it is inherited rather than correct.** Open-Meteo
 * returns `hourly.time` in the *farm's* local time, and `new Date('2026-01-15T12:00')`
 * reads a zone-less string as the *browser's* local time. Those agree when the machine
 * is set to the farm's timezone, which is the normal case, and drift by the offset
 * when it is not. `weatherPanel.js` already parses these timestamps the same way for
 * its clock, so this is consistent with the rest of the game rather than a new
 * inconsistency; fixing it properly needs the location's UTC offset, which
 * `weatherApi.js` does not keep.
 *
 * @param {object} weather `state.weather`
 * @param {number} [hours]
 * @param {number} [now] ms, injected so a test can say what "now" is
 * @returns {object[]}
 */
export function forecastWindow(weather, hours = FORECAST_WINDOW_HOURS, now = Date.now()) {
  const hourly = weather?.hourly;
  if (!hourly?.time || !Array.isArray(hourly.time)) return [];

  const startIndex = Math.max(0, indexOfHour(hourly.time, now));

  return hourly.time.slice(startIndex, startIndex + hours).map((_, offset) => {
    const index = startIndex + offset;
    return {
      weatherCode: hourly.weatherCode?.[index],
      temperature: hourly.temperature?.[index],
      humidity: hourly.humidity?.[index],
      windSpeed: hourly.windSpeed?.[index],
      precipitationProbability: hourly.precipitationProbability?.[index],
    };
  });
}

/**
 * The index of the first reading at or after `now`.
 *
 * Exported because it is the part that can be wrong silently: an off-by-one here
 * judges the wrong hour and nothing else notices.
 *
 * @param {string[]} times ISO hour strings
 * @param {number} now
 * @returns {number} 0 when there is nothing usable, so a caller gets a window
 *   rather than an exception
 */
export function indexOfHour(times, now) {
  if (!Array.isArray(times) || times.length === 0) return 0;

  const target = new Date(now).getTime();
  for (let index = 0; index < times.length; index += 1) {
    const at = new Date(times[index]).getTime();
    // `>=` on purpose: a reading stamped 14:00 covers 14:00–14:59, so a planting at
    // 14:30 is judged by it rather than skipped past.
    if (!Number.isNaN(at) && at >= target) return index;
  }
  return 0;
}

/**
 * The one event that matters in a window.
 *
 * **The most severe, not an average.** Averaging is what would let a frost hour
 * disappear into five ordinary ones — and "one of the next six hours is below
 * freezing" is exactly the fact a player is deciding on. `sunny` and `cloudy` tie
 * with everything else at the bottom of the order and simply lose.
 *
 * @param {object[]} window
 * @returns {{event: string, hours: number}|null} `null` for an empty window
 */
export function worstEventIn(window) {
  if (!Array.isArray(window) || window.length === 0) return null;

  let worst = null;
  let worstRank = Infinity;
  const counts = new Map();

  for (const hour of window) {
    const event = classifyHour(hour);
    counts.set(event, (counts.get(event) ?? 0) + 1);
    const rank = eventRank(event);
    if (rank < worstRank) {
      worstRank = rank;
      worst = event;
    }
  }

  return worst ? { event: worst, hours: counts.get(worst) ?? 0 } : null;
}

/**
 * Everything the weather is going to do to a crop planted right now.
 *
 * Three inputs and one number out:
 *
 *   forecast  the worst event in the next six hours, rated per crop by
 *             `cropWeatherMatrix.js`
 *   season    a −1 when the crop is off-season where the player is, 0 otherwise
 *   health    `100 + drain`, floored so weather cannot kill
 *
 * The season is a **soft** penalty and not a gate: a January player with only rice
 * unlocked must still have something to plant, or a weather feature becomes a dead
 * end for the player least able to avoid it.
 *
 * `ok: false` means there is no forecast to judge by — offline, or the fetch has
 * not landed. `main.js` surfaces that as the reason planting is unavailable rather
 * than quietly planting a crop the weather never got to speak about.
 *
 * @param {object} params
 * @param {string} params.cropId
 * @param {object} [params.weather] `state.weather`
 * @param {object} [params.location] `state.location`, for the season
 * @param {number} [params.now] ms
 * @returns {{ok: true, verdict: object}|{ok: false, reason: string}}
 */
export function verdictFor({ cropId, weather, location, now = Date.now() } = {}) {
  if (!cropId) return { ok: false, reason: 'no_crop' };

  const window = forecastWindow(weather, FORECAST_WINDOW_HOURS, now);
  const worst = worstEventIn(window);
  if (!worst) return { ok: false, reason: 'no_forecast' };

  const rating = weatherRating(cropId, worst.event);
  const season = seasonFor(location, new Date(now));
  const seasonPenalty = seasonRating(cropId, season);

  // `eventDrainPerHour` is the documented cost for a crop that *hates* the event.
  // `healthDrainFor` multiplies by the crop's own rating, so halving it here is what
  // reproduces the spec's figures: frost costs 30/h at `-2` and 15/h at `-1`.
  const rate = eventDrainPerHour(worst.event);
  const perHour = healthDrainFor(cropId, worst.event, rate / 2);

  // Scaled by how many of the window's hours the event actually held, so one hour of
  // frost and six hours of frost are not the same planting. Applied once, not
  // hourly — which is what turns a drain into a verdict instead of a death sentence.
  const drain = perHour * worst.hours;

  // The season miss is a flat cost rather than a second rating, so "planted rice in
  // winter" is one legible number instead of compounding with a forecast rating the
  // player cannot compare it against.
  const seasonCost = Math.abs(seasonPenalty) * SEASON_MISS_COST;

  const health = Math.max(
    WEATHER_HEALTH_FLOOR,
    Math.min(HEALTH.max, Math.round(HEALTH.max - drain - seasonCost)),
  );

  return {
    ok: true,
    verdict: {
      cropId,
      event: worst.event,
      eventHours: worst.hours,
      windowHours: FORECAST_WINDOW_HOURS,
      rating,
      season,
      seasonPenalty,
      health,
    },
  };
}
