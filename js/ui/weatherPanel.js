import { el, clear } from '../utils/dom.js';
import { describeWeatherCode, windCompass } from '../domain/weather.js';
import { weatherGlyph } from './weatherGlyph.js';

const HOURS_SHOWN = 12;

export function mountWeatherPanel(root, state) {
  clear(root);

  const card = el('div', { class: 'weather' }, [
    el('div', { class: 'weather__place' }),
    el('div', { class: 'weather__now' }),
    el('div', { class: 'weather__details' }),
    el('div', { class: 'weather__hourly' }),
    el('p', { class: 'weather__updated' }),
  ]);

  root.append(card);

  const placeEl = card.querySelector('.weather__place');
  const nowEl = card.querySelector('.weather__now');
  const detailsEl = card.querySelector('.weather__details');
  const hourlyEl = card.querySelector('.weather__hourly');
  const updatedEl = card.querySelector('.weather__updated');

  renderLocation(state?.location);
  renderNow(state?.weather);
  renderDetails(state?.weather);
  renderHourly(state?.weather);
  renderUpdated(state?.weather);

  function renderLocation(location) {
    clear(placeEl);

    if (!location) return;

    const parts = [location.name, location.country].filter(Boolean).join(', ');

    placeEl.append(
      el('span', { class: 'weather__place-name', text: parts || 'Unknown location' }),
      location.lat != null && location.lon != null
        ? el('span', {
            class: 'weather__place-coords',
            text: `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`,
          })
        : null,
    );
  }

  function renderNow(weather) {
    clear(nowEl);

    const current = weather?.current;

    if (!current) {
      nowEl.append(
        el('div', { class: 'weather__idle' }, [
          weatherGlyph('cloud'),
          el('div', {}, [
            el('p', { class: 'weather__idle-title', text: 'Reading the skyâ€¦' }),
            el('p', { class: 'weather__idle-sub', text: 'Fetching live conditions for your farm.' }),
          ]),
        ]),
      );
      return;
    }

    const info = describeWeatherCode(current.weatherCode);
    const iconName = current.isDay === false && info.icon === 'sun' ? 'night' : info.icon;

    nowEl.append(
      weatherGlyph(iconName, 'weather__now-icon'),
      el('div', { class: 'weather__now-text' }, [
        el('p', { class: 'weather__temp' }, [
          el('span', { class: 'weather__temp-value', text: formatTemp(current.temperature) }),
          el('span', { class: 'weather__temp-unit', text: 'C' }),
        ]),
        el('p', { class: 'weather__desc', text: info.label }),
        current.feelsLike != null
          ? el('p', { class: 'weather__feels', text: `Feels like ${formatTemp(current.feelsLike)}Â°` })
          : null,
      ]),
    );
  }

  function renderDetails(weather) {
    clear(detailsEl);

    const current = weather?.current;
    if (!current) return;

    const compass = windCompass(current.windDirection);

    detailsEl.append(
      stat('Humidity', `${Math.round(current.humidity)}%`),
      stat('Wind', `${Math.round(current.windSpeed)} km/h${compass ? ` ${compass}` : ''}`),
      stat('Rain', `${Math.round(weather.hourly?.precipitationProbability?.[0] ?? 0)}%`),
      stat('Rainfall', current.precipitation != null ? `${round1(current.precipitation)} mm` : 'â€”'),
    );
  }

  function renderHourly(weather) {
    clear(hourlyEl);

    const hourly = weather?.hourly;
    if (!hourly?.time?.length) return;

    const strip = el('div', { class: 'hourly' });
    const codes = hourly.weatherCode ?? [];
    const temps = hourly.temperature ?? [];
    const rain = hourly.precipitationProbability ?? [];

    for (let i = 0; i < Math.min(hourly.time.length, HOURS_SHOWN); i += 1) {
      const info = describeWeatherCode(codes[i]);
      const chance = rain[i];

      strip.append(
        el('div', { class: 'hourly__slot', title: info.label }, [
          el('span', { class: 'hourly__time', text: formatHour(hourly.time[i]) }),
          weatherGlyph(info.icon, 'hourly__icon'),
          el('span', { class: 'hourly__temp', text: formatTemp(temps[i]) }),
          chance >= 20
            ? el('span', { class: 'hourly__rain', text: `${Math.round(chance)}%` })
            : null,
        ]),
      );
    }

    hourlyEl.append(strip);
  }

  function renderUpdated(weather) {
    const stamp = weather?.current?.time;
    updatedEl.textContent = stamp ? `Updated ${formatClock(stamp)}` : '';
  }

  function stat(label, value) {
    return el('div', { class: 'weather-stat' }, [
      el('span', { class: 'weather-stat__label', text: label }),
      el('span', { class: 'weather-stat__value', text: value }),
    ]);
  }

  return {
    unmount() {
      clear(root);
    },
  };
}

function formatTemp(value) {
  return value == null || Number.isNaN(value) ? 'â€”' : `${Math.round(value)}Â°`;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function toDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHour(iso) {
  const date = toDate(iso);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

function formatClock(iso) {
  const date = toDate(iso);
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}