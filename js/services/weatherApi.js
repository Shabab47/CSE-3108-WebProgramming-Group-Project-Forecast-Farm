import { WEATHER_URL, WEATHER_FIELDS, FORECAST_HOURS } from '../config/api.js';

export async function fetchWeather(location) {
  const { lat, lon, tz } = location;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: WEATHER_FIELDS.current.join(','),
    hourly: WEATHER_FIELDS.hourly.join(','),
    forecast_hours: String(FORECAST_HOURS),
    timezone: tz || 'auto',
  });

  const url = `${WEATHER_URL}?${params}`;

  let res;
  try {
    res = await fetch(url);
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

  if (!data.current || !data.hourly) return { ok: false, reason: 'bad_shape' };

  return {
    ok: true,
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      isDay: data.current.is_day === 1,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      time: data.current.time,
    },
    hourly: {
      time: data.hourly.time,
      temperature: data.hourly.temperature_2m,
      humidity: data.hourly.relative_humidity_2m,
      precipitationProbability: data.hourly.precipitation_probability,
      weatherCode: data.hourly.weather_code,
      windSpeed: data.hourly.wind_speed_10m,
      uvIndex: data.hourly.uv_index,
    },
  };
}