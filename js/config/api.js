/**
 * Service endpoints and refresh timings.
 *
 * Pure data, so the URLs are in one place and tests can assert on them.
 */

export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const TIME_URL = 'https://utctime.app/api/now/';

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