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