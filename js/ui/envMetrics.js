/**
 * The environment card: what the weather is doing to the farm.
 *
 * Replaces the pump card that used to sit here. That card showed the aimed plot's water,
 * which the plot inspector now shows far better — and it was a card about a *machine* on a
 * rail whose job is the sky.
 *
 * ## Why rows are meters now
 *
 * Every row left on the card is a **meter**: a label, the number it is about, the note that
 * says what to do, and a bar whose fill is that number against its own scale. The fill
 * comes from `environmentFacts()` rather than this file — the bar must agree with the
 * number printed beside it, and a UI that divides by its own maximum is a second rule that
 * can disagree with the first.
 *
 * Rain, wind and humidity are not here because the board already reports them. What is
 * left is what the board cannot show: water loss, heat and frost.
 *
 * ## Why the note is always printed
 *
 * `tone` colours the row, and the note says what to do about it. Colour alone is not an
 * instruction: a red row that says nothing is a red row the player has to work out, and
 * this card's whole value is that it has already done the working out.
 */

import { el, clear } from '../utils/dom.js';
import { environmentFacts } from '../domain/environment.js';
import { icon } from './icon.js';

/** One Lucide icon per meter for the phone card. Decorative; the label is the meaning. */
const ICONS = {
  drying: 'droplets',
  frost: 'snowflake',
  uv: 'flame',
};

/** The desktop card keeps the emoji it has always used; the phone card is vector. */
const EMOJIS = {
  drying: '💦',
  frost: '❄️',
  uv: '🔥',
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
        el('span', {
          class: 'env__pill-fill',
          style: `width: ${fact.fill}%`,
          'aria-hidden': 'true',
        }),
        el('span', { class: 'env__pill-label', text: fact.label }),
        el('span', { class: 'env__pill-value', text: fact.value }),
        el('span', { class: 'env__pill-note', text: fact.note }),
        el('span', {
          class: 'env__pill-emoji',
          text: EMOJIS[fact.id] ?? '',
          'aria-hidden': 'true',
        }),
        icon(ICONS[fact.id] ?? 'droplets', 'env__pill-icon'),
      ])
    )));
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