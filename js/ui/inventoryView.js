/**
 * The inventory page — the seeds the player owns.
 *
 * A page of its own, like the shop, because it reads the save and so has to boot
 * the session first (`js/inventory-main.js`). It owns no rules: what a seed is
 * comes from `config/crops.js`, whether it is unlocked from `utils/seedUnlocks.js`,
 * and the bag itself from `state.inventory.seeds`.
 *
 * **Read-only.** The shop is where seeds are bought and sold; this page answers
 * "what is in my bag", so it has no buttons and writes nothing.
 */

import { clear, el, setText } from '../utils/dom.js';
import { requiredPlotsFor, shopCrops } from '../config/crops.js';
import { cropSeedImg } from '../config/assets.js';
import { formatGold } from '../utils/formatGold.js';
import { isSeedUnlocked } from '../utils/seedUnlocks.js';
import { arrowLeftEl, coinEl } from './shopArt.js';

/** Whole numbers — seed counts are integers by construction. */
function format(n) {
  return Number(n).toLocaleString('en-US');
}

/** "3 seeds", or "1 seed". */
function plural(n) {
  return n === 1 ? '1 seed' : `${format(n)} seeds`;
}

/**
 * One crop: the packet, the name, and how many are in the bag. Returns an
 * `update` so the page is built once and then kept in step with the state.
 */
function buildCard(crop) {
  const count = el('p', { class: 'inventory-card__count', text: 'None' });
  const note = el('p', { class: 'inventory-card__note', text: '' });

  const node = el('article', { class: 'inventory-card' }, [
    el('div', { class: 'inventory-card__art' }, [
      el('img', {
        class: 'inventory-card__img',
        src: cropSeedImg(crop.id),
        alt: `${crop.name} seed packet`,
        width: 1312,
        height: 1199,
        loading: 'lazy',
      }),
    ]),

    el('div', { class: 'inventory-card__body' }, [
      el('h2', { class: 'inventory-card__name', text: crop.name }),
      count,
      note,
    ]),
  ]);

  return {
    node,
    update(state) {
      const have = state?.inventory?.seeds?.[crop.id] ?? 0;
      setText(count, have > 0 ? plural(have) : 'None');

      // Dim the card when the bag is empty, so "what I own" reads at a glance.
      node.classList.toggle('inventory-card--empty', have === 0);

      if (have === 0) {
        setText(note, isSeedUnlocked(state, crop.id)
          ? 'Not bought yet.'
          : `Unlocks at ${requiredPlotsFor(crop.id)} plots.`);
      } else if (!isSeedUnlocked(state, crop.id)) {
        setText(note, 'You own these, but have not unlocked the land to plant them.');
      } else {
        setText(note, crop.growNote);
      }
    },
  };
}

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {string} actions.backHref href back to the farm, carrying `?guest=1` for a guest
 * @param {(fn: (state: object|null) => void) => () => void} actions.onState subscribe
 * @returns {{unmount: () => void}}
 */
export function mountInventory(root, actions) {
  clear(root);

  const gold = el('span', { class: 'inventory-purse__gold', text: '—' });
  const cards = shopCrops().map(buildCard);

  root.append(
    el('div', { class: 'inventory' }, [
      el('header', { class: 'inventory__head' }, [
        el('a', { class: 'inventory__back', href: actions.backHref }, [
          arrowLeftEl('inventory__back-arrow'),
          'Back to farm',
        ]),

        el('div', { class: 'inventory__intro' }, [
          el('h1', { class: 'inventory__title', text: 'Inventory' }),
          el('p', {
            class: 'inventory__subtitle',
            text: 'The seeds you own. Plant them from a plot on your farm.',
          }),
        ]),

        el('p', { class: 'inventory-purse' }, [
          el('span', { class: 'inventory-purse__label', text: 'Purse' }),
          coinEl('inventory-purse__coin'),
          gold,
        ]),
      ]),

      el('div', { class: 'inventory__grid' }, cards.map((card) => card.node)),
    ]),
  );

  // `subscribe` calls its listener immediately, so the first render happens here.
  const off = actions.onState((state) => {
    if (!state) return;
    setText(gold, formatGold(state.gold));
    for (const card of cards) card.update(state);
  });

  return {
    unmount() {
      off();
      clear(root);
    },
  };
}
