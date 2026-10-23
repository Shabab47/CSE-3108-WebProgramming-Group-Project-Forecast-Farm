/**
 * The shop page — painted to match the Figma reference (frame 114:2002,
 * "Forecast Farm · Shop").
 *
 * The shop owns no rules: seed prices come from `config/crops.js`, whether a seed button
 * is enabled comes from `domain/shop.js`, the pump's gate and price come from
 * `domain/pumpUpgrade.js`, and the purchases are `actions.buy` / `actions.upgradePump`.
 * That keeps this file to the stall chrome, the two sections, and a re-render on every
 * state change.
 *
 * ## Two sections: Seeds and Pump
 *
 * The pump is **not a sixth seed card**. A seed card is a repeat purchase with a small
 * price; the pump is one machine bought in five steps, and mixing it into the seed grid
 * made it read as another packet. The board carries a `Seeds` heading over the five crop
 * cards and a separate `Pump` section under them, with its own one-image, one-button
 * card (`shopPumpCard.js`).
 *
 * ## The look
 *
 * It is painted art, not theme chrome. The reference mockup is a farm stall — grass
 * floor, wood posts and beams, a scalloped awning, a stone base, a hanging "FARM SHOP"
 * sign, golden seed cards on a dark-green board, and a footer hint bar. It is all CSS and
 * inline SVG (`shopArt.js`). It deliberately does not read `data-theme`, like
 * `login.html` (DEC-027): a wooden sign is brown in a dark theme too.
 *
 * ## Two rules that still matter
 *
 *  1. **Every crop is listed, not just the playable ones.** A shop that silently omits
 *     four of its five seeds looks broken. Unavailable crops show their price and say
 *     why they cannot be bought yet — see `available` in `config/crops.js`.
 *  2. **The buttons disable themselves.** A button that cannot be afforded is `disabled`
 *     rather than "click and get told off", which is why the price and the gold are both
 *     on screen. The gold readout updates on every state change.
 *
 * Rendered once, then updated. Rebuilding the cards on every keystroke of game time would
 * drop focus off a button the player is about to press.
 */

import { clear, el, setText } from '../utils/dom.js';
import { formatGold } from '../utils/formatGold.js';
import { shopCrops } from '../config/crops.js';
import { buildCropCard } from './shopCropCard.js';
import { buildPumpCard } from './shopPumpCard.js';
import { coinEl, sproutEl, arrowLeftEl } from './shopArt.js';

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {string} actions.backHref href back to the farm, carrying `?guest=1` for a guest
 * @param {(fn: (state: object|null) => void) => () => void} actions.onState subscribe
 * @param {(cropId: string, quantity: number) => {ok: boolean, reason?: string}} actions.buy
 * @param {() => {ok: boolean, level?: number, reason?: string}} actions.upgradePump
 * @param {(message: string, tone: string) => void} [actions.toast]
 * @returns {{unmount: () => void}}
 */
export function mountShop(root, actions) {
  clear(root);

  const gold = el('span', { class: 'shop-purse__gold', text: '—' });

  const cropCards = shopCrops().map((crop) => buildCropCard(crop, actions));
  const pumpCard = buildPumpCard(actions);
  const cards = [...cropCards, pumpCard];

  root.append(
    el('div', { class: 'shop-scene' }, [
      // The painted stall frame: posts, beam, awning, base, interior wall.
      el('div', { class: 'shop-stall' }, [
        el('div', { class: 'shop-stall__beam' }),
        el('div', { class: 'shop-stall__awning' }),
        el('div', { class: 'shop-stall__base' }, [
          // Eight stones along the base (Figma's stone1..stone8).
          ...Array.from({ length: 8 }, () =>
            el('div', { class: 'shop-stall__stone', 'aria-hidden': 'true' }),
          ),
        ]),
        el('div', { class: 'shop-stall__wall' }, [
          // Ten vertical wood-grain lines (Figma's wg1..wg10).
          ...Array.from({ length: 10 }, () =>
            el('div', { class: 'shop-stall__grain', 'aria-hidden': 'true' }),
          ),
        ]),
      ]),

      el('header', { class: 'shop-top' }, [
        el('a', { class: 'shop-back', href: actions.backHref }, [
          arrowLeftEl(),
          'Back to farm',
        ]),

        // The sign is the page's only heading, so it carries the heading role.
        el('div', { class: 'shop-sign', role: 'heading', 'aria-level': '1' }, [
          el('span', { class: 'shop-sign__plank', text: 'Farm Shop' }),
        ]),

        el('p', { class: 'shop-purse' }, [
          coinEl('shop-coin shop-purse__coin'),
          gold,
        ]),
      ]),

      el('div', { class: 'shop-board' }, [
        el('section', { class: 'shop-section shop-section--seeds', 'aria-label': 'Seeds' }, [
          el('h2', { class: 'shop-section__title', text: 'Seeds' }),
          el('div', { class: 'shop-grid' }, cropCards.map((card) => card.node)),
        ]),

        el('section', { class: 'shop-section shop-section--pump', 'aria-label': 'Pump' }, [
          el('h2', { class: 'shop-section__title', text: 'Pump' }),
          pumpCard.node,
        ]),

        el('p', { class: 'shop-hint' }, [
          sproutEl(),
          'Real weather. Real growing time. Check your forecast before planting.',
        ]),
      ]),
    ]),
  );

  // `subscribe` calls its listener immediately, so the first render happens here without
  // a separate call — and every later change lands in the same place.
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
