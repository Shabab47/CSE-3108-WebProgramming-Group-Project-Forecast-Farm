/**
 * The seed shop page.
 *
 * Lists every crop with its price and a row of buy buttons, and nothing else. The
 * shop owns no rules: prices come from `config/crops.js`, whether a button is
 * enabled comes from `domain/shop.js`, and the purchase itself is `actions.buy`.
 * That keeps the file to what it is — markup and a re-render on every state
 * change.
 *
 * Two decisions worth stating:
 *
 *  1. **Every crop is listed, not just the playable ones.** A shop that silently
 *     omits four of its five seeds looks broken. Unavailable crops show their
 *     price and say why they cannot be bought yet — see `available` in
 *     `config/crops.js`.
 *
 *  2. **The buttons disable themselves.** A button that cannot be afforded is
 *     `disabled` rather than "click and get told off", which is why the price and
 *     the gold are both on screen: the player can see the arithmetic before
 *     spending anything. The gold readout updates on every state change, so after
 *     a purchase the affordable options change with it.
 *
 * Rendered once, then updated. Rebuilding the cards on every keystroke of game
 * time would drop focus off a button the player is about to press.
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { cropSeedImg } from '../config/assets.js';
import { shopCrops } from '../config/crops.js';
import { BUY_STEPS, canAfford } from '../domain/shop.js';

const log = createLog('shopView');

/** Thousands separators, because a corn packet is 5,000 gold and 5000 reads as a typo. */
function format(n) {
  return Number(n).toLocaleString('en-US');
}

function pluralSeeds(n) {
  return n === 1 ? '1 seed' : `${format(n)} seeds`;
}

/**
 * One crop: the packet, the price, what it does, and how many the player already
 * has. Returns an `update` so the page is built once and then kept in step with
 * the state.
 */
function buildCard(crop, actions) {
  // Quantity is kept alongside the button rather than parsed back off its label.
  const buyButtons = BUY_STEPS.map((quantity) => {
    const cost = crop.seedPrice * quantity;

    return {
      quantity,
      node: el('button', {
        class: 'btn btn--primary shop-card__buy',
        type: 'button',
        // The step is the button; the total it costs is what makes it a decision.
        text: `×${quantity}`,
        'aria-label': `Buy ${pluralSeeds(quantity)} of ${crop.name} for ${format(cost)} gold`,
        title: `${format(cost)} gold`,
        on: {
          click: () => {
            const result = actions.buy(crop.id, quantity);
            if (result?.ok) {
              // The cost is worked out from the table rather than read back off
              // the result: `store.apply` returns `{ok: true}` and nothing else, so
              // there is no `cost` on it to trust.
              log.info(`bought ${quantity} ${crop.id} seeds for ${cost}`);
              actions.toast?.(`Bought ${pluralSeeds(quantity)} of ${crop.name}.`, 'success');
            }
            // On refusal `store.apply` has already emitted the reason as a toast,
            // so there is nothing to report here.
          },
        },
      }),
    };
  });

  const owned = el('p', { class: 'shop-card__owned', text: 'None in your bag' });

  const node = el('article', { class: crop.available ? 'shop-card' : 'shop-card shop-card--locked' }, [
    el('div', { class: 'shop-card__art' }, [
      el('img', {
        src: cropSeedImg(crop.id),
        // The packet already says "rice"; the alt is for anyone who cannot see it.
        alt: `${crop.name} seed packet`,
        width: 1312,
        height: 1199,
        loading: 'lazy',
      }),
    ]),

    el('div', { class: 'shop-card__body' }, [
      el('div', { class: 'shop-card__head' }, [
        el('h2', { class: 'shop-card__name', text: crop.name }),
        el('span', { class: 'badge badge--accent', text: `${format(crop.seedPrice)} gold` }),
      ]),

      el('p', { class: 'shop-card__meta', text: `Ready in ${crop.growHours} hours · ${crop.yield} per packet` }),

      // A locked crop says so in place of its own description, so the reason its
      // buttons are dead is on the card rather than only in the toast.
      el('p', {
        class: 'shop-card__note',
        text: crop.available
          ? crop.growNote
          : 'Not available yet — this crop needs its growth art drawn before it can be planted.',
      }),

      owned,

      el('div', { class: 'shop-card__actions' }, [
        el('span', { class: 'shop-card__actions-label', text: 'Buy' }),
        ...buyButtons.map((entry) => entry.node),
      ]),
    ]),
  ]);

  return {
    node,
    update(state) {
      const count = state?.inventory?.seeds?.[crop.id] ?? 0;
      setText(owned, count > 0 ? `In your bag: ${format(count)}` : 'None in your bag');

      for (const entry of buyButtons) {
        entry.node.disabled = !canAfford(state, crop.id, entry.quantity);
      }
    },
  };
}

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {string} actions.backHref href back to the farm, carrying `?guest=1` for a guest
 * @param {(fn: (state: object|null) => void) => () => void} actions.onState subscribe
 * @param {(cropId: string, quantity: number) => {ok: boolean, reason?: string}} actions.buy `store.apply`
 * @param {(message: string, tone: string) => void} [actions.toast]
 * @returns {{unmount: () => void}}
 */
export function mountShop(root, actions) {
  clear(root);

  const gold = el('span', { class: 'shop-top__gold', text: '—' });

  const cards = shopCrops().map((crop) => buildCard(crop, actions));

  root.append(
    el('header', { class: 'shop-top' }, [
      el('div', { class: 'shop-top__lead' }, [
        el('a', { class: 'shop-top__back', href: actions.backHref, text: '← Back to the farm' }),
        el('h1', { class: 'shop-top__title', text: 'Seed shop' }),
      ]),
      el('p', { class: 'shop-top__wallet' }, [
        el('span', { class: 'shop-top__wallet-label', text: 'Purse' }),
        gold,
      ]),
    ]),

    el('p', {
      class: 'shop-top__intro',
      text: 'Seeds go straight into your bag. Gold is taken the moment you buy, and the farm saves itself.',
    }),

    el('div', { class: 'shop-grid' }, cards.map((card) => card.node)),

    el('p', {
      class: 'field__hint',
      text: 'A packet holds enough seed for one plot. Plant it, keep it watered, and sell the harvest to buy more land.',
    }),
  );

  // `subscribe` calls its listener immediately, so the first render happens here
  // without a separate call — and every later change lands in the same place.
  const off = actions.onState((state) => {
    if (!state) return;
    setText(gold, `${format(state.gold)} gold`);
    for (const card of cards) card.update(state);
  });

  return {
    unmount() {
      off();
      clear(root);
    },
  };
}