/**
 * Choosing which seed to sow.
 *
 * Mounted by `main.js` when the player clicks one of their own empty plots. Lists the
 * seeds they actually have — a picker offering a seed they do not own is a dead end,
 * and the shop link is here because "you have none" is exactly when a player wants
 * to go and buy some.
 *
 * **No store import.** Every action arrives as a callback, so this mounts in a fake
 * DOM in `tests/cropPicker.test.js` with no browser and no network. That is the whole
 * reason the layer rules in `AGENTS.md` exist.
 *
 * Rendered content is phrasing-only, because it goes inside a `<div>` this module
 * owns — but nothing here assumes a `<dialog>`, so it can be dropped into any
 * container.
 */

import { el, clear } from '../utils/dom.js';
import { cropOf, SHOP_ORDER } from '../config/crops.js';
import { cropSeedImg } from '../config/assets.js';

/**
 * Mount the seed picker.
 *
 * @param {HTMLElement} root
 * @param {object} state
 * @param {object} state.seeds        `{rice: 2, ...}` — the player's bag
 * @param {number} state.plotId       which plot it will be sown on
 * @param {(cropId:string)=>void} state.onPlant
 * @param {()=>void} [state.onClose]
 * @param {()=>void} [state.onShop]   offered when the bag is empty
 * @param {(cropId:string)=>boolean} [state.isUnlocked] land gate — defaults to
 *   open when the caller has nothing to say (tests, old callers), so a locked
 *   seed is hidden only when someone actually reports the lock.
 * @returns {{unmount:()=>void}}
 */
export function mountCropPicker(root, state) {
  clear(root);

  const seeds = state?.seeds ?? {};
  const gate = typeof state?.isUnlocked === 'function' ? state.isUnlocked : () => true;
  // Land-unlocked and in the bag. `available` (art) is deliberately NOT read:
  // a seed the farm earned must be sowable, and the field draws the fallback
  // sprite until the real one lands.
  const inBag = SHOP_ORDER.map(cropOf).filter(
    (crop) => crop && (seeds[crop.id] ?? 0) > 0 && gate(crop.id),
  );

  const card = el('div', { class: 'card crop-picker' }, [
    el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Plant a seed' }),
    ]),

    inBag.length
      ? el('ul', { class: 'crop-picker__list' }, inBag.map((crop) => seedOption(crop, seeds)))
      : el('p', { class: 'crop-picker__empty' }, [
        'You have no seeds. Buy some from the shop to plant here.',
      ]),

    el('div', { class: 'crop-picker__actions' }, [
      shopButton(state),
      closeButton(state),
    ].filter(Boolean)),
  ]);

  root.append(card);

  for (const button of card.querySelectorAll('.crop-picker__seed')) {
    button.addEventListener('click', () => {
      if (state?.onPlant) state.onPlant(button.dataset.cropId);
    });
  }

  const shop = card.querySelector('.crop-picker__shop');
  if (shop) {
    shop.addEventListener('click', () => {
      if (state?.onShop) state.onShop();
    });
  }

  const close = card.querySelector('.crop-picker__close');
  if (close) {
    close.addEventListener('click', () => {
      if (state?.onClose) state.onClose();
    });
  }

  return {
    unmount() {
      clear(root);
    },
  };
}

/**
 * One seed in the list: the packet art, how many are left, and how long that crop
 * takes — the three things a player decides on. `growNote` carries the likes and
 * hates, which are descriptive only; the mechanical effect is in
 * `config/cropWeatherMatrix.js`.
 */
function seedOption(crop, seeds) {
  const count = seeds[crop.id] ?? 0;
  const hours = crop.growHours;

  return el('li', { class: 'crop-picker__item' }, [
    el('button', {
      type: 'button',
      class: 'crop-picker__seed',
      dataset: { cropId: crop.id },
      title: `${crop.likes}. Hates ${crop.hates.toLowerCase()}.`,
      'aria-label': `${crop.name}, ${count} in your bag, ready in ${hours} hours`,
    }, [
      el('img', {
        class: 'crop-picker__art',
        src: cropSeedImg(crop.id),
        alt: '',
        draggable: 'false',
        'aria-hidden': 'true',
      }),
      el('span', { class: 'crop-picker__meta' }, [
        el('span', { class: 'crop-picker__name', text: crop.name }),
        el('span', {
          class: 'crop-picker__facts',
          text: `×${count} · ${hours}h · sells for ${crop.yield * crop.sellPrice}g`,
        }),
        el('span', { class: 'crop-picker__note', text: crop.growNote }),
      ]),
    ]),
  ]);
}

/** The shop button, which only earns its place when the bag is empty. */
function shopButton(state) {
  if (typeof state?.onShop !== 'function') return null;

  return el('button', {
    type: 'button',
    class: 'crop-picker__shop',
    text: 'Open the shop',
  });
}

/** Always offered, and always last, so "never mind" is where the eye expects it. */
function closeButton(state) {
  if (typeof state?.onClose !== 'function') return null;

  return el('button', {
    type: 'button',
    class: 'crop-picker__close',
    text: 'Never mind',
  });
}
