/**
 * Service endpoints and refresh timings.
 *
 * Pure data, so the URLs are in one place and tests can assert on them.
 */

export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const TIME_URL = 'https://utctime.app/api/now/';

/**
 * Coordinates → place name.
 *
 * **A different service from `GEOCODE_URL`, and it has to stay that way.** Open-Meteo's geocoding API
 * is forward-search only: it takes `name=` and has no reverse mode, so posting `latitude`/`longitude`
 * to it returns `400` for every coordinate on earth. That is ISS-077, which is how every farm ended up
 * labelled "Current location".
 *
 * BigDataCloud's client endpoint is keyless, CORS-open (`Access-Control-Allow-Origin: *`, so it works
 * from a browser without a proxy) and returns the *place* rather than the nearest building — which is
 * the distinction that matters, because Nominatim and Photon answer "what is at these coordinates" and
 * will cheerfully return a specific bank. See DEC-038 for the alternatives that were measured.
 */
export const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/**
 * How the search-as-you-type list behaves.
 *
 * Separate from `searchPlaces` itself because these are presentation decisions, and the service
 * has no business knowing how fast a player types.
 *
 * `SUGGEST_COUNT` is six rather than five because a suggestion list is read by comparison — the
 * player is scanning for "the Dhaka in Bangladesh" among several Dhakas — so one more row is worth
 * more than the single extra request it costs. Open-Meteo caps `count` at 100.
 */
export const SUGGEST_COUNT = 6;

/**
 * Quiet period before a keystroke turns into a request.
 *
 * 200 ms is the point at which typing stops feeling like it is waiting and starts feeling like it
 * is thinking. Longer and the list lags behind the letters; shorter and every character is a
 * round trip to a public API that has no rate limit worth spending.
 */
export const SUGGEST_DEBOUNCE_MS = 200;

/**
 * Shortest query worth asking about.
 *
 * One letter matches most of the planet and the list comes back with places the player did not
 * mean — "S" is a better start than a worse answer.
 */
export const SUGGEST_MIN_QUERY = 2;

/** Where the farm starts. The player can move it from the top bar search. */
export const DEFAULT_LOCATION = {
  name: 'Dhaka',
  country: 'Bangladesh',
  lat: 23.8103,
  lon: 90.4125,
  tz: 'Asia/Dhaka',
};

/** Weather is refetched every 15 minutes. */
export const REFRESH_MS = 15 * 60 * 1000;

/** Set true to use data/sample-forecast.json instead of the live API. */
export const USE_SAMPLE_DATA = false;

/** Fields requested from Open-Meteo, in the order the game uses them. */
export const WEATHER_FIELDS = {
  current: [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation',
    'is_day',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ],
  hourly: [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation_probability',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'uv_index',
  ],
};

/** How many hours of forecast the game shows. */
export const FORECAST_HOURS = 24;

/** Sample fallback, saved once from a live response. */
export const SAMPLE_FORECAST_PATH = 'data/sample-forecast.json';