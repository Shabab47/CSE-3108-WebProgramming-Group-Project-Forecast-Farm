import { el, clear } from '../utils/dom.js';
import { describeWeatherCode, windCompass } from '../domain/weather.js';
import { weatherGlyph } from './weatherGlyph.js';

/** How many hours the strip shows. Six reads as a trend and stays short. */
const HOURS_SHOWN = 6;

/**
 * The weather panel.
 *
 * ## What is on the card
 *
 * Current conditions, the three numbers a farmer actually acts on, and the next
 * few hours. There is no curve and no weekly row: the shell fits one screen and
 * the field is what has to fit in it.
 *
 * ## Why the strip starts at index 0
 *
 * `weatherApi.js` sends `forecast_hours=24`, which makes Open-Meteo start the
 * hourly series at the **current hour** — verified live across four timezones,
 * where `hourly.time[0]` matched the current hour every time. ISS-009 claimed
 * index 0 was local midnight and had a loop seek forward to the present hour;
 * that premise only held before `forecast_hours` was sent, and seeking forward
 * actually made it worse, skipping the hour in progress. Relogged as stale.
 *
 * ## Showing a paused forecast
 *
 * When the connection drops, live weather cannot refresh. The last forecast is
 * still on screen — it is the information the player was making their decision
 * with, and blanking it would remove the only thing they can still act on — but
 * it is labelled with how long ago it was fetched rather than left reading as
 * live. `fetchedAt` comes from `state.weather`; without it the panel shows the
 * "paused" line immediately, which is the honest state for a response we cannot
 * vouch for the age of.
 *
 * @param {HTMLElement} root
 * @param {{location?:object, weather?:object, sync?: 'synced'|'saving'|'pending'}} state
 * @param {() => number} [now] injected so the ageing text is testable
 */
export function mountWeatherPanel(root, state, now = () => Date.now()) {
  clear(root);

  const card = el('div', { class: 'weather' }, [
    el('div', { class: 'weather__top' }),
    el('div', { class: 'weather__stats' }),
    el('div', { class: 'weather__hours' }),
    el('p', { class: 'weather__updated' }),
  ]);

  root.append(card);

  const topEl = card.querySelector('.weather__top');
  const statsEl = card.querySelector('.weather__stats');
  const hoursEl = card.querySelector('.weather__hours');
  const updatedEl = card.querySelector('.weather__updated');

  renderLocation(state?.location);
  renderTop(state?.weather);
  renderStats(state?.weather);
  renderHours(state?.weather);
  renderUpdated(state?.weather, state);

  function renderLocation(location) {
    if (!location) return;
    const parts = [location.name, location.country].filter(Boolean).join(', ');
    topEl.append(
      el('span', { class: 'weather__place', text: parts || 'Unknown location' }),
    );
  }

  function renderTop(weather) {
    const current = weather?.current;
    if (!current) {
      topEl.append(
        el('div', { class: 'weather__idle' }, [
          weatherGlyph('cloud'),
          el('p', { class: 'weather__idle-text', text: 'Reading the sky…' }),
        ]),
      );
      return;
    }

    const info = describeWeatherCode(current.weatherCode);
    const iconName = current.isDay === false && info.icon === 'sun' ? 'night' : info.icon;

    const left = el('div', { class: 'weather__now' }, [
      weatherGlyph(iconName, 'weather__now-icon'),
      el('div', { class: 'weather__now-text' }, [
        el('p', { class: 'weather__temp' }, [
          el('span', { class: 'weather__temp-value', text: formatTemp(current.temperature) }),
          el('span', { class: 'weather__temp-unit', text: '°C' }),
        ]),
        el('p', { class: 'weather__desc', text: info.label }),
        current.feelsLike != null
          ? el('p', { class: 'weather__feels', text: `Feels like ${formatTemp(current.feelsLike)}` })
          : null,
      ].filter(Boolean)),
    ]);

    const right = el('div', { class: 'weather__meta' }, [
      el('span', { class: 'weather__meta-time', text: formatDayTime(current.time) }),
    ]);

    topEl.append(left, right);
  }

  function renderStats(weather) {
    const current = weather?.current;
    if (!current) return;

    const compass = windCompass(current.windDirection);
    const chance = currentRainChance(weather);

    statsEl.append(
      stat('Humidity', `${Math.round(current.humidity)}%`),
      stat('Wind', `${Math.round(current.windSpeed)} km/h${compass ? ` ${compass}` : ''}`),
      // "Rain chance", not "Precipitation": this is `precipitation_probability` —
      // the odds it rains this hour. "Precipitation" names the amount in mm, which is
      // a different field (`current.precipitation`) and reads 0 almost always. The
      // probability is the number that tells a player whether to water, so the
      // label says what it is rather than what the API field is called.
      stat('Rain chance', chance == null ? '—' : `${Math.round(chance)}%`),
    );
  }

  function renderHours(weather) {
    const hourly = weather?.hourly;
    if (!hourly?.time?.length) return;

    const strip = el('div', { class: 'hours' });

    // From index 0: `forecast_hours=24` means the series starts at the current
    // hour, so slot 0 is the hour in progress rather than midnight. See the note
    // on `currentRainChance` and the relogged ISS-009.
    for (let i = 0; i < Math.min(HOURS_SHOWN, hourly.time.length); i += 1) {
      const info = describeWeatherCode(hourly.weatherCode?.[i]);
      const chance = hourly.precipitationProbability?.[i];

      strip.append(
        el('div', { class: 'hours__slot', title: info.label }, [
          el('span', { class: 'hours__time', text: formatHourShort(hourly.time[i]) }),
          weatherGlyph(info.icon, 'hours__icon'),
          el('span', { class: 'hours__temp', text: formatTemp(hourly.temperature?.[i]) }),
          chance >= 20
            ? el('span', { class: 'hours__rain', text: `${Math.round(chance)}%` })
            : null,
        ].filter(Boolean)),
      );
    }

    hoursEl.append(strip);
  }

  /**
   * The freshness line: either when the forecast was read, or that it is paused.
   *
   * Paused takes priority over a timestamp. A player seeing "Updated 14:05" while
   * their connection is down would reasonably read it as current, which is the
   * exact misreading that leads to planting the wrong crop.
   */
  function renderUpdated(weather, state) {
    const paused = state?.sync === 'pending';

    if (paused) {
      const since = describeAge(now() - (weather?.fetchedAt ?? Number.NaN));
      updatedEl.textContent = `Live weather paused — last read ${since}`;
      updatedEl.dataset.paused = 'true';
      return;
    }

    const stamp = weather?.current?.time;
    updatedEl.textContent = stamp ? `Updated ${formatClock(stamp)}` : '';
    delete updatedEl.dataset.paused;
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

/**
 * Chance of rain in the current hour.
 *
 * Index 0, because `weatherApi.js` sends `forecast_hours=24` and that makes
 * Open-Meteo start the hourly series at the current hour. `current.time` carries
 * the minutes past the hour (`01:15`) and never appears in `hourly.time`, so it
 * cannot be looked up directly — and matching it would land on the *next* hour,
 * skipping the one the player is standing in. ISS-009 said index 0 is midnight:
 * true only before `forecast_hours` was sent, and relogged as stale.
 */
function currentRainChance(weather) {
  const hourly = weather?.hourly;
  if (!hourly?.time?.length) return null;

  const chance = hourly.precipitationProbability?.[0];
  return typeof chance === 'number' ? chance : null;
}

function formatTemp(value) {
  return value == null || Number.isNaN(value) ? '—' : `${Math.round(value)}°`;
}

function formatHourShort(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

function formatDayTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { weekday: 'long' }) + ', ' +
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * How long ago something was read, for the paused line.
 *
 * An unknown age reads as "a moment ago" rather than a bare dash: the panel is
 * saying the forecast cannot be refreshed, and that is true whatever the age is.
 */
function describeAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'a moment ago';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'a moment ago';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}
