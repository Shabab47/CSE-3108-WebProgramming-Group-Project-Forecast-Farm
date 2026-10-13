import { el, clear } from '../utils/dom.js';
import { describeWeatherCode, windCompass } from '../domain/weather.js';
import { weatherGlyph } from './weatherGlyph.js';
import { icon } from './icon.js';

/** How many hours the strip shows. Six fills the bottom row of the board. */
const HOURS_SHOWN = 6;

/**
 * The weather board.
 *
 * ## The shape
 *
 * A wooden notice board carrying sticky notes: one large note for right now, a
 * column of three meters, and a row of six small notes for the coming hours. It
 * is the game's own language — the same wood as the shop and inventory buttons,
 * the same display face as the sign board on the login page.
 *
 * The board is drawn entirely in CSS. No artwork ships for it, so the frame, the
 * two posts, the paper, the pin and the folded corner are all borders, gradients
 * and pseudo-elements. That keeps it editable: the wood tone is one property.
 *
 * Class names here are flat (`board-meters`, `note-pin`, not `board__meters`), to
 * match the stylesheet. See css/weather.css.
 *
 * ## Sizing
 *
 * The board takes **one third** of the centre column's height and the field the
 * other two thirds — see `css/layout.css`. Deliberate rather than content-driven:
 * the panel used to size itself, and on a 16:9 screen it grew to roughly 700px,
 * leaving the field a 220px sliver.
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
 * ## Why wind gets no bar
 *
 * Humidity and rain chance are 0–100%, so a fill bar beside them carries
 * information at a glance. Wind has no natural ceiling — a bar would need an
 * invented maximum, and a half-full wind bar would mean nothing — so it shows
 * the number only.
 *
 * ## Showing a paused forecast
 *
 * When the connection drops, live weather cannot refresh. The last forecast is
 * still on screen — it is the information the player was making their decision
 * with, and blanking it would remove the only thing they can still act on — but
 * it is labelled with how long ago it was fetched rather than left reading as
 * live. `fetchedAt` comes from `state.weather`; without it the board shows the
 * "paused" line immediately, which is the honest state for a response we cannot
 * vouch for the age of.
 *
 * @param {HTMLElement} root
 * @param {{location?:object, weather?:object, sync?: 'synced'|'saving'|'pending'}} state
 * @param {() => number} [now] injected so the ageing text is testable
 */
export function mountWeatherPanel(root, state, now = () => Date.now()) {
  clear(root);

  const bodyEl = el('div', { class: 'board-body' });
  const metersEl = el('div', { class: 'board-meters' });
  const hoursEl = el('div', { class: 'board-notes' });
  const updatedEl = el('p', { class: 'board-updated' });

  root.append(bodyEl, hoursEl, updatedEl);
  // The meters live INSIDE `.board-body`, which is the two-column grid (note left,
  // meters right). Appending them as siblings of `bodyEl` leaves the grid with one
  // child: the note occupies column 1, column 2 renders as empty wood, and the
  // meters stretch full-width below instead. See ISS-053.
  bodyEl.append(metersEl);

  renderNow(bodyEl, state?.location, state?.weather);
  renderMeters(metersEl, state?.weather);
  renderHours(hoursEl, state?.weather);
  renderUpdated(updatedEl, state?.weather, state);

  /* --- the large note: right now ----------------------------------------- */

  function renderNow(target, location, weather) {
    const current = weather?.current;

    if (!current) {
      target.append(
        el('div', { class: 'note note-current' }, [
          pin(),
          el('div', { class: 'note-idle' }, [
            weatherGlyph('cloud'),
            el('span', { text: 'Reading the sky…' }),
          ]),
        ]),
      );
      return;
    }

    const info = describeWeatherCode(current.weatherCode);
    const iconName = current.isDay === false && info.icon === 'sun' ? 'night' : info.icon;

    const date = new Date(current.time);
    const day = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    const time = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    target.append(
      el('div', { class: 'note note-current' }, [
        pin(),

        // Above the condition, in the spot the design marked for it: the place the
        // numbers describe. Empty when the farm has no location yet.
        el('span', { class: 'note-loc', text: locationLine(location) }),
        el('span', { class: 'note-label', text: info.short.toUpperCase() }),

        el('div', { class: 'note-main' }, [
          weatherGlyph(iconName, 'note-glyph'),
          el('p', { class: 'note-temp' }, [
            el('span', { class: 'note-temp-value', text: formatTemp(current.temperature) }),
            el('span', { class: 'note-temp-unit', text: '°C' }),
          ]),
        ]),

        el('div', { class: 'note-foot' }, [
          el('span', { class: 'note-day', text: day }),
          el('span', { class: 'note-time', text: time }),
        ]),

        current.feelsLike != null
          ? el('span', { class: 'note-feels', text: `Feels like ${formatTemp(current.feelsLike)}` })
          : null,
      ].filter(Boolean)),
    );
  }

  /* --- the three meters --------------------------------------------------- */

  function renderMeters(target, weather) {
    const current = weather?.current;
    if (!current) return;

    const compass = windCompass(current.windDirection);
    const humidity = clamp(current.humidity);
    const chance = currentRainChance(weather);

    target.append(
      meter('droplet', 'Humidity', humidity == null ? '—' : `${humidity}%`, humidity),
      // No bar: wind has no natural ceiling, so a fill level would need an
      // invented maximum and would not mean anything to read.
      meter('wind', 'Wind', `${Math.round(current.windSpeed)} km/h${compass ? ` ${compass}` : ''}`, null),
      meter('umbrella', 'Rain Chance', chance == null ? '—' : `${clamp(chance)}%`, chance),
    );
  }

  function meter(iconName, label, value, percent) {
    return el('div', { class: 'board-meter' }, [
      icon(iconName, 'board-meter-icon'),
      el('span', { class: 'board-meter-label', text: label }),
      el('span', { class: 'board-meter-value', text: value }),
      percent == null
        ? null
        : el('span', { class: 'board-meter-track' }, [
            el('span', { class: 'board-meter-fill', style: `width:${clamp(percent)}%` }),
          ]),
    ].filter(Boolean));
  }

  /* --- the six small notes: the coming hours ------------------------------ */

  function renderHours(target, weather) {
    const hourly = weather?.hourly;
    if (!hourly?.time?.length) return;

    // From index 0: `forecast_hours=24` means the series starts at the current
    // hour, so slot 0 is the hour in progress rather than midnight. See the note
    // on `currentRainChance` and the relogged ISS-009.
    for (let i = 0; i < Math.min(HOURS_SHOWN, hourly.time.length); i += 1) {
      const info = describeWeatherCode(hourly.weatherCode?.[i]);
      const chance = hourly.precipitationProbability?.[i];

      target.append(
        el('div', { class: 'note note-hour', title: info.label }, [
          pin(),
          el('span', { class: 'note-hour-time', text: formatHourShort(hourly.time[i]) }),
          weatherGlyph(info.icon, 'note-hour-glyph'),
          el('span', { class: 'note-hour-temp', text: formatTemp(hourly.temperature?.[i]) }),
          chance >= 20
            ? el('span', { class: 'note-hour-rain', text: `${Math.round(chance)}%` })
            : null,
        ].filter(Boolean)),
      );
    }
  }

  /* --- the freshness line ------------------------------------------------- */

  /**
   * The freshness line: either when the forecast was read, or that it is paused.
   *
   * Paused takes priority over a timestamp. A player seeing "Updated 14:05" while
   * their connection is down would reasonably read it as current, which is the
   * exact misreading that leads to planting the wrong crop.
   */
  function renderUpdated(target, weather, state) {
    const paused = state?.sync === 'pending';

    if (paused) {
      const since = describeAge(now() - (weather?.fetchedAt ?? Number.NaN));
      target.textContent = `Live weather paused — last read ${since}`;
      target.dataset.paused = 'true';
      return;
    }

    const stamp = weather?.current?.time;
    target.textContent = stamp ? `Updated ${formatClock(stamp)}` : '';
    delete target.dataset.paused;
  }

  return {
    unmount() {
      clear(root);
    },
  };
}

/** The red pin every note is hung by. Decorative — the text carries the meaning. */
function pin() {
  return el('span', { class: 'note-pin', 'aria-hidden': 'true' });
}

function locationLine(location) {
  if (!location) return '';
  return [location.name, location.country].filter(Boolean).join(', ');
}

/** Clamp to 0–100 for a bar width, or null when the value is not a number. */
function clamp(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function formatClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * How long ago something was read, for the paused line.
 *
 * An unknown age reads as "a moment ago" rather than a bare dash: the board is
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