/**
 * One seed card in the shop.
 *
 * Extracted from `shopView.js` so the page can grow a Pump section without the view
 * becoming a file that answers two unrelated questions. The card owns its own markup
 * and its own `update`, and it still knows no rules: the land gate is
 * `isSeedUnlocked`, the purse check is `canAfford`, and the purchase is `actions.buy`.
 */

import { el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { cropSeedImg } from '../config/assets.js';
import { requiredPlotsFor } from '../config/crops.js';
import { BUY_STEPS, SELL_RATE, canAfford } from '../domain/shop.js';
import { isSeedUnlocked, ownedPlots } from '../utils/seedUnlocks.js';
import { coinEl, plusEl } from './shopArt.js';

const log = createLog('shopCropCard');

/**
 * Whole numbers — seed counts and seed prices, which are integers by construction. Gold
 * *amounts* go through `formatGold` instead, because the purse holds a fraction once the
 * pump has been running.
 */
function format(n) {
  return Number(n).toLocaleString('en-US');
}

function pluralSeeds(n) {
  return n === 1 ? '1 seed' : `${format(n)} seeds`;
}

/**
 * @param {object} crop one entry from `shopCrops()`
 * @param {object} actions `{buy, sell, toast}`
 * @returns {{node: object, update: (state: object) => void}}
 */
export function buildCropCard(crop, actions) {
  const need = requiredPlotsFor(crop.id);

  const buyButtons = BUY_STEPS.map((quantity) => {
    const cost = crop.seedPrice * quantity;
    const isPrimary = quantity === 1;

    return {
      quantity,
      node: el(
        'button',
        {
          class: isPrimary ? 'shop-buy shop-buy--primary' : 'shop-buy shop-buy--step',
          type: 'button',
          'aria-label': `Buy ${pluralSeeds(quantity)} of ${crop.name} for ${format(cost)} gold`,
          title: `${format(cost)} gold`,
          on: {
            click: () => {
              const result = actions.buy(crop.id, quantity);
              if (result?.ok) {
                log.info(`bought ${quantity} ${crop.id} seeds for ${cost}`);
                actions.toast?.(`Bought ${pluralSeeds(quantity)} of ${crop.name}.`, 'success');
              }
              // On refusal `store.apply` has already emitted the reason as a toast,
              // so there is nothing to report here.
            },
          },
        },
        isPrimary ? ['BUY ', plusEl()] : `×${quantity}`,
      ),
    };
  });

  // One sell button, not a row of steps. It sells a single seed, and it sits immediately
  // left of BUY so the two read as one decision: BUY adds, SELL takes away.
  const payout = Math.round(crop.seedPrice * SELL_RATE);
  const sellButton = el(
    'button',
    {
      class: 'shop-sell shop-sell--primary',
      type: 'button',
      'aria-label': `Sell 1 seed of ${crop.name} for ${format(payout)} gold`,
      title: `${format(payout)} gold`,
      on: {
        click: () => {
          const result = actions.sell(crop.id, 1);
          if (result?.ok) {
            log.info(`sold 1 ${crop.id} seed for ${payout}`);
            actions.toast?.(`Sold 1 seed of ${crop.name}.`, 'success');
          }
          // On refusal `store.apply` has already emitted the reason as a toast.
        },
      },
    },
    'SELL',
  );

  const owned = el('p', { class: 'shop-card__owned', text: 'None in your bag' });

  // The note is filled per render: land-lock beats art-lock beats the blurb, because the
  // player can act on the first and only wait on the second.
  const note = el('p', { class: 'shop-card__note', text: crop.growNote });

  const node = el('article', { class: 'shop-card' }, [
    el('div', { class: 'shop-card__art' }, [
      // The per-crop unit lands in the top-left pill: "5 SEEDS", "1 TOOL", etc.
      el('span', { class: 'shop-card__pill', text: crop.shopUnit ?? 'Seed packet' }),
      el('img', {
        src: cropSeedImg(crop.id),
        // The packet already says the crop name; the alt is for anyone who cannot see it.
        alt: `${crop.name} seed packet`,
        width: 1312,
        height: 1199,
        loading: 'lazy',
      }),
      // The bar the packet stands on. Decorative, so it stays out of the tab order and
      // the accessibility tree.
      el('span', { class: 'shop-card__shadow', 'aria-hidden': 'true' }),
    ]),

    el('div', { class: 'shop-card__body' }, [
      // "Rice seeds", not "Rice": the mockup names every packet by its contents, and the
      // whole shop is seeds, so the suffix is always true.
      el('h2', { class: 'shop-card__name', text: `${crop.name} seeds` }),

      note,
      owned,

      el('div', { class: 'shop-card__buy-row' }, [
        el('span', { class: 'shop-card__price' }, [
          coinEl(),
          el('span', { class: 'shop-card__price-num', text: format(crop.seedPrice) }),
        ]),
        el('span', { class: 'shop-card__actions' }, [
          sellButton,
          ...buyButtons.map((entry) => entry.node),
        ]),
      ]),
    ]),
  ]);

  return {
    node,
    update(state) {
      const count = state?.inventory?.seeds?.[crop.id] ?? 0;
      setText(owned, count > 0 ? `In your bag: ${format(count)}` : 'None in your bag');

      // Land is the only gate. A land-unlocked crop without art yet shows its blurb with
      // a fallback note — buyable and plantable, drawn as rice until its own sprites land.
      const unlocked = isSeedUnlocked(state, crop.id);

      node.classList.toggle('shop-card--locked', !unlocked);

      if (!unlocked) {
        const have = ownedPlots(state);
        setText(note, `Unlocks at ${need} plots — you own ${have}. Buy more land first.`);
      } else if (crop.available === true) {
        setText(note, crop.growNote);
      } else {
        setText(note, `${crop.growNote} Field art still growing — shows as rice for now.`);
      }

      for (const entry of buyButtons) {
        entry.node.disabled = !canAfford(state, crop.id, entry.quantity);
      }
      // Disabled when the bag is empty, so the button agrees with the rule rather than
      // refusing after being pressed.
      sellButton.disabled = (state?.inventory?.seeds?.[crop.id] ?? 0) < 1;
    },
  };
}
