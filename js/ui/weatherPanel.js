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
 * ## Why no meter carries a bar
 *
 * Humidity and rain chance are 0–100%, so a fill bar beside them once carried
 * information at a glance. Wind never could — it has no natural ceiling, so a
 * level would need an invented maximum — and in the end **none** of them has
 * one. The pills are narrow, and a 4px bar under the number read as clutter
 * rather than information. So all three are icon, label and number, and the
 * `board-meter-track` / `board-meter-fill` rules are gone from `css/weather.css`.
 *
 * A bar was hidden rather than removed for a while — `display: none` on the
 * track — which meant the DOM kept building an element nothing styled, and the
 * prose above kept describing bars nobody could see. That is ISS-055, closed as
 * `wontfix` in the sense that the *removal* is the answer, not a missing rule.
 *
 * ## Where the place name goes, and why it is never blank
 *
 * The farm's place is printed in the big note's right-hand column, beside the
 * temperature; the note's grid is what puts it there (`css/weather.css`, DEC-033).
 * It was above the condition until then, ellipsised to one line, while the right
 * side of the paper was empty at every window size (ISS-062).
 *
 * `locationLine()` answers a name for every input, including none at all. It used
 * to return `''` for a farm with no location, which rendered as an invisible empty
 * span and said nothing in the console; the panel this replaced printed "Unknown
 * location" and the refactor dropped it (ISS-063).
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
 * That label lives **inside** the big sticky note, not under the hour strip. It
 * used to print `Updated 6:45 PM` while the note's own foot row printed
 * `FRI 6:45 PM` — both read from `current.time`, so the board stated one instant
 * twice, twenty pixels apart. In the note, the line renders only while the
 * forecast is stale, which is the one thing it was ever adding: the note already
 * says when the reading is from.
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

  root.append(bodyEl, hoursEl);
  // The meters live INSIDE `.board-body`, which is the two-column grid (note left,
  // meters right). Appending them as siblings of `bodyEl` leaves the grid with one
  // child: the note occupies column 1, column 2 renders as empty wood, and the
  // meters stretch full-width below instead. See ISS-053.
  bodyEl.append(metersEl);

  renderNow(bodyEl, state?.location, state?.weather, state);
  renderMeters(metersEl, state?.weather);
  renderHours(hoursEl, state?.weather);

  /* --- the large note: right now ----------------------------------------- */

  function renderNow(target, location, weather, state) {
    const current = weather?.current;

    if (!current) {
      target.append(
        el('div', { class: 'note note-current' }, [
          pin(),
          el('div', { class: 'note-idle' }, [
            weatherGlyph('cloud'),
            el('span', { text: 'Reading the sky…' }),
          ]),
          // The paused label is not conditional on having a reading: `sync:
          // 'pending'` with no `weather` at all is a first fetch that has never
          // succeeded, which is exactly when the player most needs to be told the
          // forecast is not coming. `el()` skips null children.
          statusLine(state, weather),
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

        // The place the numbers describe, in the note's right-hand column beside
        // the temperature. It used to sit above the condition, where it was
        // squeezed into one ellipsised line while the paper's right side sat
        // empty. See DEC-033.
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

        // Absent unless the forecast is stale — see statusLine().
        statusLine(state, weather),
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
      meter('droplet', 'Humidity', humidity == null ? '—' : `${humidity}%`),
      // The compass rides in the pill's title rather than in the value. The value
      // column is `auto` and takes what it asks for, so "5 km/h NNW" left "Wind"
      // about 19px at the board's width and it rendered as "W…". The speed is the
      // number the player plants by; the bearing is a hover detail. Same pattern
      // as `.note-hour`'s condition label. See ISS-061.
      meter(
        'wind',
        'Wind',
        `${Math.round(current.windSpeed)} km/h`,
        compass ? `Wind from ${compass}` : undefined,
      ),
      meter('umbrella', 'Rain Chance', chance == null ? '—' : `${clamp(chance)}%`),
    );
  }

  /** One meter pill. `title` carries detail too long to print — see renderMeters. */
  function meter(iconName, label, value, title) {
    return el('div', { class: 'board-meter', title }, [
      icon(iconName, 'board-meter-icon'),
      el('span', { class: 'board-meter-label', text: label }),
      el('span', { class: 'board-meter-value', text: value }),
    ]);
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

  /* --- the freshness label ------------------------------------------------ */

  /**
   * The freshness label, rendered as the sticky note's own last line.
   *
   * It renders nothing at all while the forecast is live, so the element's
   * presence *is* the state — no `data-paused` attribute to keep in step.
   *
   * Paused takes priority over a timestamp, and now there is only one case left
   * to render. The old line spent most of its life printing `Updated 14:05`,
   * which was `current.time` — the very value the note's foot row already shows.
   * The one reading a player could misread as live was that same stamp shown
   * after the connection dropped, so the stale case is the whole job.
   */
  function statusLine(state, weather) {
    if (state?.sync !== 'pending') return null;

    const since = describeAge(now() - (weather?.fetchedAt ?? Number.NaN));
    return el('span', {
      class: 'note-status',
      text: `Paused · ${since}`,
      title: `Live weather paused — last read ${since}`,
    });
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
  const parts = [location?.name, location?.country].filter(Boolean).join(', ');
  return parts || 'Unknown location';
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

/**
 * How long ago something was read, for the paused label.
 *
 * An unknown age reads as "a moment ago" rather than a bare dash: the board is
 * saying the forecast cannot be refreshed, and that is true whatever the age is.
 *
 * The label prints this straight, so it is written to stay short — the longest
 * form is "59 minutes ago", which fits the note on one line at 10px.
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