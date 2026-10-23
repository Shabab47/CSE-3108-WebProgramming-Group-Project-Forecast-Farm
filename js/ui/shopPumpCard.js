/**
 * The Pump section of the shop: one machine, one upgrade button.
 *
 * The card is deliberately **one image and one button**. The six seed cards each show a
 * packet, a buy step, a sell step and a price; a machine is a different decision —
 * whether to spend a large sum on capacity — and putting five level images or four
 * buttons in one card made it look like a seed packet with variants. The single image is
 * the **next** level's art, so it is a picture of what the gold buys; at the top it is
 * the level 5 machine, and the button is replaced by a plain sentence.
 *
 * The rules are `domain/pumpUpgrade.js` and the numbering is `PUMP.levels`. This file
 * only writes the words and reads `actions.upgradePump`.
 */

import { el, setText } from '../utils/dom.js';
import { pumpFrame } from '../config/assets.js';
import { canUpgradePump, nextPumpUpgrade } from '../domain/pumpUpgrade.js';
import { pumpLevelInfo, pumpLevelOf } from '../domain/pump.js';
import { coinEl } from './shopArt.js';

function format(n) {
  return Number(n).toLocaleString('en-US');
}

function plotWord(n) {
  return n === 1 ? 'plot' : 'plots';
}

/**
 * @param {object} actions `{upgradePump, toast}`
 * @returns {{node: object, update: (state: object) => void}}
 */
export function buildPumpCard(actions) {
  const image = el('img', {
    src: pumpFrame(1),
    alt: 'Water pump, level 1',
    width: 1000,
    height: 1000,
    loading: 'lazy',
  });

  const name = el('h2', { class: 'shop-pump__name', text: 'Water pump' });
  const levelLine = el('p', { class: 'shop-pump__level', text: 'Level 1 · waters 1 plot' });
  const nextLine = el('p', { class: 'shop-pump__next', text: 'Upgrade to level 2.' });
  const gateLine = el('p', { class: 'shop-pump__gate' });
  const priceNum = el('span', { class: 'shop-card__price-num', text: '—' });
  const price = el('span', { class: 'shop-card__price' }, [coinEl(), priceNum]);

  const button = el('button', {
    class: 'shop-buy shop-buy--primary',
    type: 'button',
    text: 'UPGRADE',
    on: {
      click: () => {
        const result = actions.upgradePump?.();
        if (result?.ok) {
          actions.toast?.(`Pump upgraded to level ${result.level}.`, 'success');
        }
        // A refusal is already a toast from `store.apply`.
      },
    },
  });

  const buyRow = el('div', { class: 'shop-pump__buy' }, [price, button]);

  const node = el('article', { class: 'shop-pump' }, [
    el('div', { class: 'shop-pump__art' }, [image]),
    el('div', { class: 'shop-pump__body' }, [
      name,
      levelLine,
      nextLine,
      gateLine,
      buyRow,
    ]),
  ]);

  return {
    node,
    update(state) {
      const current = pumpLevelInfo(state);
      const next = nextPumpUpgrade(state);
      const owned = next?.owned ?? 0;
      const artLevel = next?.level ?? pumpLevelOf(state);

      // Exactly one pump image, and it shows what the next purchase buys. At max that is
      // the level 5 machine, which is also the one standing on the field.
      const src = pumpFrame(artLevel);
      if (image.getAttribute('src') !== src) {
        image.setAttribute('src', src);
        image.setAttribute('alt', `Water pump, level ${artLevel}`);
      }

      setText(levelLine, `Level ${current.level} · waters ${current.capacity} ${plotWord(current.capacity)}`);

      if (!next) {
        node.classList.add('shop-pump--max');
        node.dataset.max = 'true';
        node.dataset.locked = 'false';
        setText(nextLine, `Fully upgraded — waters all ${current.capacity} plots.`);
        gateLine.hidden = true;
        buyRow.hidden = true;
        button.hidden = true;
        return;
      }

      node.classList.remove('shop-pump--max');
      node.dataset.max = 'false';
      setText(nextLine,
        `Upgrade to level ${next.level} — waters ${next.capacity} ${plotWord(next.capacity)}.`);

      const ready = owned >= next.requiredPlots;
      setText(gateLine,
        `Requires ${next.requiredPlots} owned plots — you own ${owned}.${ready ? ' Ready.' : ''}`);
      gateLine.hidden = false;

      node.dataset.locked = String(!canUpgradePump(state));
      setText(priceNum, format(next.price));
      buyRow.hidden = false;
      button.hidden = false;
      button.disabled = !canUpgradePump(state);
      button.setAttribute('aria-label', `Upgrade the water pump to level ${next.level} for ${format(next.price)} gold`);
    },
  };
}
