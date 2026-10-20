/**
 * One crop's reaction to every weather event, as a list.
 *
 * The data is `CROP_WEATHER` (the rating per event) and `WEATHER_EVENTS` (the
 * label and order). This file only turns them into rows, so the almanac and the
 * seed picker read the same matrix and the same words — `RATING_WORDS` is
 * exported from `config/cropWeatherMatrix.js` for exactly that reason.
 *
 * The event list is the canonical nine from `config/weatherEvents.js`, which is
 * what the forecast board shows, so the almanac covers every weather a player can
 * actually see. `highHumidity` is in that list but has no row in `CROP_WEATHER` —
 * no crop has an opinion about it — so `weatherRating()` answers `neutral` and it
 * reads "fine". That is correct rather than a gap: high humidity drains no health.
 *
 * Each row carries a modifier class named after the rating word
 * (`almanac-weather__row--harmed`), which is what `css/almanac.css` colours.
 */

import { el } from '../utils/dom.js';
import { WEATHER_EVENTS } from '../config/weatherEvents.js';
import { RATING_WORDS, weatherRating } from '../config/cropWeatherMatrix.js';

/**
 * @param {string} cropId
 * @returns {HTMLUListElement}
 */
export function almanacWeather(cropId) {
  const rows = WEATHER_EVENTS.map((event) => {
    const rating = weatherRating(cropId, event.id);
    const word = RATING_WORDS[rating];

    return el('li', { class: `almanac-weather__row almanac-weather__row--${word}` }, [
      el('span', { class: 'almanac-weather__event', text: event.label }),
      el('span', { class: 'almanac-weather__rating', text: word }),
    ]);
  });

  return el('ul', { class: 'almanac-weather' }, rows);
}
