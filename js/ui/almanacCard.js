/**
 * One crop's entry in the almanac: the portrait, the three facts a player decides
 * on, and how the crop reacts to the weather.
 *
 * Every number is read from `config/crops.js` or `config/cropWeatherMatrix.js` —
 * nothing here restates a crop name, price or grow time, so a balance change in
 * `js/crops_logics/` reaches the almanac without this file moving.
 *
 * The harvest figure is `harvestValue(cropId)` — `yield × sellPrice` — which is
 * the payout at full health. The quality rule is stated beside it, because the
 * number on its own reads as a promise the weather can take back.
 */

import { el } from '../utils/dom.js';
import { bookCropImg } from '../config/assets.js';
import { harvestValue } from '../config/crops.js';
import { almanacWeather } from './almanacWeather.js';

/**
 * @param {object} crop one entry from `shopCrops()`
 * @returns {HTMLElement} an `<article>`
 */
export function almanacCard(crop) {
  const fullHarvest = harvestValue(crop.id);

  return el('article', { class: 'almanac-card' }, [
    el('div', { class: 'almanac-card__art' }, [
      el('img', {
        class: 'almanac-card__img',
        src: bookCropImg(crop.id),
        alt: `${crop.name} illustration`,
        width: 1254,
        height: 1254,
        loading: 'lazy',
      }),
    ]),

    el('div', { class: 'almanac-card__body' }, [
      el('h2', { class: 'almanac-card__name', text: crop.name }),
      el('p', { class: 'almanac-card__note', text: crop.growNote }),

      el('dl', { class: 'almanac-card__facts' }, [
        fact('Grow time', `${crop.growHours} hours`),
        fact('Seed', `${crop.seedPrice} gold`),
        fact('Harvest, full health', `${fullHarvest} gold`),
        fact('Seasons', crop.seasons.join(', ')),
      ].flat()),

      el('h3', { class: 'almanac-card__subtitle', text: 'How it reacts to weather' }),
      almanacWeather(crop.id),

      el('p', {
        class: 'almanac-card__payout',
        text: 'Health scales the payout. Below 50% health a harvest no longer pays for its seed.',
      }),
    ]),
  ]);
}

/** One `term`/`value` pair; the caller flattens these into the `<dl>`. */
function fact(term, value) {
  return [
    el('dt', { class: 'almanac-card__term', text: term }),
    el('dd', { class: 'almanac-card__value', text: value }),
  ];
}
