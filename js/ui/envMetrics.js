/**
 * The environment card: what the weather is doing to the farm.
 *
 * Replaces the pump card that used to sit here. That card showed the aimed plot's water,
 * which the plot inspector now shows far better — and it was a card about a *machine* on a
 * rail whose job is the sky.
 *
 * ## Why rows disappear
 *
 * `environmentFacts()` drops anything calm and unremarkable. Six rows where four say
 * "fine" is a list nobody reads and a list where the frost line is easy to miss. The one
 * row always kept is **drying**, because every water decision on the farm is made against
 * that number.
 *
 * ## Why the note is always printed
 *
 * `tone` colours the row, and the note says what to do about it. Colour alone is not an
 * instruction: a red row that says nothing is a red row the player has to work out, and
 * this card's whole value is that it has already done the working out.
 */

import { el, clear } from '../utils/dom.js';
import { environmentFacts } from '../domain/environment.js';

const TITLES = {
  drying: 'Drying',
  frost: 'Frost risk',
  rain: 'Rain',
  wind: 'Wind',
  humidity: 'Humidity',
  uv: 'UV',
};

/**
 * @param {object} root
 * @param {object} state
 * @param {number} [now] passed in so a test can pin the clock
 * @returns {{refresh: (now?: number) => void, unmount: () => void}}
 */
export function mountEnvMetrics(root, state, now = Date.now()) {
  const card = el('div', { class: 'card env' });

  function render(at = now) {
    clear(card);
    card.append(el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Environment' }),
    ]));

    const facts = environmentFacts(state, at);

    if (facts.length === 0) {
      card.append(el('p', {
        class: 'env__empty',
        text: state?.weather ? 'Nothing to flag — the sky is behaving.' : 'Reading the sky…',
      }));
      return;
    }

    card.append(el('div', { class: 'env__pills' }, facts.map((fact) =>
      el('div', {
        class: 'env__pill',
        'data-tone': fact.tone,
        'data-id': fact.id,
      }, [
        el('span', { class: 'env__pill-label', text: TITLES[fact.id] ?? fact.label }),
        el('span', { class: 'env__pill-value', text: fact.value }),
        el('span', { class: 'env__pill-note', text: fact.note }),
      ])
    )));

    // Add a clear fix for the floated pills
    card.append(el('div', { style: 'clear: both' }));
  }

  render();
  root.append(card);

  return {
    refresh: (at) => render(at),
    unmount() {
      clear(root);
    },
  };
}