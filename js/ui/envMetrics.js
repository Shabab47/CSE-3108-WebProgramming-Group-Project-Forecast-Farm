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
 * ## Why the description is behind an (i)
 *
 * The note used to be printed in every row, on the argument that colour alone is not an
 * instruction. That was true and it also made the card three sentences deep on a rail that
 * has to hold a purse as well (DEC-063). So the row keeps the reading and its tone, and the
 * sentence — plus a one-line explanation of what the meter measures — is one click away,
 * the way the seed picker does it. The tone still colours the row, so an urgent meter is
 * still obvious without opening anything.
 *
 * **One at a time, and always the same one.** Opening a second meter closes the first, and
 * a refresh from the weather keeps the open one open, because re-rendering the card must
 * not feel like clicking it shut.
 */

import { el, clear, listen } from '../utils/dom.js';
import { environmentFacts } from '../domain/environment.js';
import { DIALOG_INFO_IMG } from '../config/assets.js';
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
 * What each meter measures, in one sentence.
 *
 * **Copy, not a reading.** No numbers and no thresholds: those live in
 * `domain/environment.js` and in the live note printed above this line, and a second copy
 * here would be a second rule that can disagree with the first. This is the "what am I
 * looking at" sentence that the note alone does not answer.
 */
const HELP = {
  drying: 'How fast the field loses water each hour. Rain tops it up; the pump is the only thing you control.',
  frost: 'The coldest hour in the next twelve. Cold enough and the crop takes damage — nothing covers it.',
  uv: 'How hard the sun gets in the next twelve hours. Nothing in the field is shaded, so the peak is the one to plan around.',
};

/**
 * @param {object} root
 * @param {object} state
 * @param {number} [now] passed in so a test can pin the clock
 * @returns {{refresh: (now?: number) => void, unmount: () => void}}
 */
export function mountEnvMetrics(root, state, now = Date.now()) {
  const card = el('div', { class: 'card env' });

  /** The meter whose description is showing, or null. Survives a refresh. */
  let openId = null;

  /** Close whatever is open. Rendering is idempotent, so this is the whole of it. */
  function close() {
    if (!openId) return;
    openId = null;
    render();
  }

  // Both listeners are mounted once, on nodes that survive a re-render: the card is the
  // same element every time, and a document listener per render would leak one per refresh.
  const offKey = listen(card, 'keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  const offOutside = listen(document, 'click', (event) => {
    if (openId && !card.contains(event.target)) close();
  });

  /** One meter and, when open, its description. */
  function meter(fact) {
    const open = openId === fact.id;
    const descId = `env-desc-${fact.id}`;

    const info = el('button', {
      type: 'button',
      class: 'env__pill-info',
      'aria-label': `Review the ${fact.label} reading`,
      'aria-expanded': open ? 'true' : 'false',
      'aria-controls': descId,
      on: {
        click: (event) => {
          event.stopPropagation();
          openId = open ? null : fact.id;
          render();
        },
      },
    }, [
      el('img', {
        src: DIALOG_INFO_IMG,
        alt: '',
        'aria-hidden': 'true',
        draggable: 'false',
        width: '16',
        height: '16',
      }),
    ]);

    return el('div', { class: 'env__meter', 'data-id': fact.id }, [
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
        info,
        el('span', { class: 'env__pill-value', text: fact.value }),
        el('span', {
          class: 'env__pill-emoji',
          text: EMOJIS[fact.id] ?? '',
          'aria-hidden': 'true',
        }),
        icon(ICONS[fact.id] ?? 'droplets', 'env__pill-icon'),
      ]),
      open ? el('div', { class: 'env__desc', id: descId }, [
        el('p', { class: 'env__desc-note', text: fact.note }),
        el('p', { class: 'env__desc-help', text: HELP[fact.id] ?? '' }),
      ]) : null,
    ]);
  }

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

    card.append(el('div', { class: 'env__pills' }, facts.map(meter)));
  }

  render();
  root.append(card);

  return {
    refresh: (at) => render(at),
    unmount() {
      offKey();
      offOutside();
      openId = null;
      clear(root);
    },
  };
}
