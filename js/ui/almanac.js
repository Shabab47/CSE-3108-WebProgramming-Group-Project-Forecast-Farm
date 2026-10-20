/**
 * The almanac page — a reference of the five crops.
 *
 * Static by design: no session, no save, no network. The crop data comes from
 * `config/crops.js`, so the page renders before anything is fetched and the
 * entry script (`js/almanac-main.js`) only has to pass it a back-link href.
 *
 * Split by responsibility, per `AGENTS.md`: this file answers "what is the page",
 * `almanacCard.js` answers "what is one crop's entry", and `almanacWeather.js`
 * answers "what does this crop think of the weather".
 */

import { clear, el } from '../utils/dom.js';
import { shopCrops } from '../config/crops.js';
import { arrowLeftEl } from './shopArt.js';
import { almanacCard } from './almanacCard.js';

/**
 * @param {HTMLElement} root
 * @param {{backHref: string}} actions href back to the farm, carrying `?guest=1`
 *   for a guest
 * @returns {{unmount: () => void}}
 */
export function mountAlmanac(root, actions) {
  clear(root);

  root.append(
    el('div', { class: 'almanac' }, [
      el('header', { class: 'almanac__head' }, [
        el('a', { class: 'almanac__back', href: actions.backHref }, [
          arrowLeftEl('almanac__back-arrow'),
          'Back to farm',
        ]),

        el('div', { class: 'almanac__intro' }, [
          el('h1', { class: 'almanac__title', text: 'Crop Almanac' }),
          el('p', {
            class: 'almanac__subtitle',
            text: 'What each crop needs, how long it takes, and what the weather does to it.',
          }),
        ]),
      ]),

      el('div', { class: 'almanac__grid' }, shopCrops().map(almanacCard)),
    ]),
  );

  return { unmount() { clear(root); } };
}
