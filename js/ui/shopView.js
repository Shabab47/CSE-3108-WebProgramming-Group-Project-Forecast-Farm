/**
 * The seed shop page.
 *
 * Lists every crop with its price and a row of buy buttons, and nothing else. The
 * shop owns no rules: prices come from `config/crops.js`, whether a button is
 * enabled comes from `domain/shop.js`, and the purchase itself is `actions.buy`.
 * That keeps the file to what it is — markup and a re-render on every state
 * change.
 *
 * **The look is painted art, not theme chrome.** The reference mockup is a farm
 * stall — grass, a wooden sign, a dark board, golden cards — and the shop now
 * draws itself that way with CSS and the two inline glyphs in `shopArt.js`. It
 * deliberately does not read `data-theme`, like `login.html` (DEC-027): a
 * wooden sign is brown in a dark theme too. The trade-off is stated in
 * `docs/team/decisions.md`.
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
import { requiredPlotsFor, shopCrops } from '../config/crops.js';
import { BUY_STEPS, canAfford } from '../domain/shop.js';
import { isSeedUnlocked, ownedPlots } from '../utils/seedUnlocks.js';
import { coinEl, sproutEl } from './shopArt.js';

const log = createLog('shopView');

/** Thousands separators, because a corn packet is 5,000 gold and 5000 reads as a typo. */
function format(n) {
  return Number(n).toLocaleString('en-US');
}

function pluralSeeds(n) {
  return n === 1 ? '1 seed' : `${format(n)} seeds`;
}

/**
 * One crop: the packet on its shelf, the name and price, what it does, and how
 * many the player already has. Returns an `update` so the page is built once and
 * then kept in step with the state.
 *
 * The three buttons are one primary `BUY +` and two compact step buttons. The
 * purchase rule is unchanged — `BUY_STEPS` still reads `[1, 5, 10]` — so the
 * domain and its tests do not move; only the labels and the markup do.
 */
function buildCard(crop, actions) {
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
          // The step is the button; the total it costs is what makes it a decision.
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
        },
        isPrimary
          ? ['Buy', el('span', { class: 'shop-buy__plus', text: '+' })]
          : `×${quantity}`,
      ),
    };
  });

  const owned = el('p', { class: 'shop-card__owned', text: 'None in your bag' });

  // The note is filled per render: land-lock beats art-lock beats the blurb,
  // because the player can act on the first and only wait on the second.
  const note = el('p', { class: 'shop-card__note', text: crop.growNote });

  const node = el('article', { class: 'shop-card' }, [
    el('div', { class: 'shop-card__art' }, [
      // The per-crop unit lands in the top-left pill: "5 SEEDS", "1 TOOL", etc.
      el('span', { class: 'shop-card__pill', text: crop.shopUnit ?? 'Seed packet' }),
      el('img', {
        src: cropSeedImg(crop.id),
        // The packet already says "rice"; the alt is for anyone who cannot see it.
        alt: `${crop.name} seed packet`,
        width: 1312,
        height: 1199,
        loading: 'lazy',
      }),
      // The bar the packet stands on. Decorative, so it stays out of the tab order
      // and the accessibility tree.
      el('span', { class: 'shop-card__shelf', 'aria-hidden': 'true' }),
    ]),

    el('div', { class: 'shop-card__body' }, [
      // "Rice seeds", not "Rice": the mockup names every packet by its contents, and
      // the whole shop is seeds, so the suffix is always true.
      el('h2', { class: 'shop-card__name', text: `${crop.name} seeds` }),

      note,

      owned,

      el('div', { class: 'shop-card__buy-row' }, [
        el('span', { class: 'shop-card__price' }, [
          coinEl(),
          el('span', { class: 'shop-card__price-num', text: format(crop.seedPrice) }),
        ]),
        el('span', { class: 'shop-card__actions' }, buyButtons.map((entry) => entry.node)),
      ]),
    ]),
  ]);

  return {
    node,
    update(state) {
      const count = state?.inventory?.seeds?.[crop.id] ?? 0;
      setText(owned, count > 0 ? `In your bag: ${format(count)}` : 'None in your bag');

      // Land is the only gate. A land-unlocked crop without art yet shows its
      // blurb with a fallback note — buyable and plantable, drawn as rice
      // until its own sprites land.
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

  const gold = el('span', { class: 'shop-purse__gold', text: '—' });

  const cards = shopCrops().map((crop) => buildCard(crop, actions));

  root.append(
    el('div', { class: 'shop-scene' }, [
      el('header', { class: 'shop-top' }, [
        el('a', { class: 'shop-back', href: actions.backHref }, [
          el('span', { class: 'shop-back__arrow', text: '←', 'aria-hidden': 'true' }),
          'Back to farm',
        ]),

        // The sign is the page's only heading, so it carries the heading role.
        el('div', { class: 'shop-sign', role: 'heading', 'aria-level': '1' }, [
          el('span', { class: 'shop-sign__plank', text: 'Farm Shop' }),
        ]),

        el('p', { class: 'shop-purse' }, [
          el('span', { class: 'shop-purse__label', text: 'Purse' }),
          coinEl('shop-coin shop-purse__coin'),
          gold,
        ]),
      ]),

      el('div', { class: 'shop-board' }, [
        el('div', { class: 'shop-grid' }, cards.map((card) => card.node)),

        el('p', { class: 'shop-hint' }, [
          sproutEl(),
          'Real weather. Real growing time. Check your forecast before planting.',
        ]),
      ]),
    ]),
  );

  // `subscribe` calls its listener immediately, so the first render happens here
  // without a separate call — and every later change lands in the same place.
  const off = actions.onState((state) => {
    if (!state) return;
    setText(gold, format(state.gold));
    for (const card of cards) card.update(state);
  });

  return {
    unmount() {
      off();
      clear(root);
    },
  };
}
