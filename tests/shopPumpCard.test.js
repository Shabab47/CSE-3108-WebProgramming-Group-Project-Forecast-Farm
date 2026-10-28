/**
 * The shop's Pump card, and the two-section shop around it.
 *
 * These assertions are about what a player can see and press: one image, one button, the
 * exact land-gate sentence, and the sentence that replaces the button at the top level.
 * The rules behind them live in `tests/pump.test.js`; this is the render.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { buildInitialState } from '../js/state/initialState.js';
import { buildPumpCard } from '../js/ui/shopPumpCard.js';
import { mountShop } from '../js/ui/shopView.js';

const SESSION = { status: 'authed', userId: 'acc_shop', email: 'shop@farm.test', farmerName: 'Shop Tester' };

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

function shopState({ owned = 4, gold = 1_000, level = 1 } = {}) {
  const state = buildInitialState(SESSION);
  state.plots = state.plots.map((plot, index) => ({ ...plot, owned: index < owned }));
  state.gold = gold;
  state.pump = { on: false, level, targets: [] };
  return state;
}

function elements(node, tag) {
  return [...node.descendants()].filter((child) => child.tagName === tag.toUpperCase());
}

test('the pump card shows one image and one button, not a seed-card grid', () => {
  const state = shopState({ owned: 4, gold: 1_000 });
  const card = buildPumpCard({ upgradePump: () => ({ ok: false }) });
  card.update(state);

  const images = elements(card.node, 'img');
  const buttons = elements(card.node, 'button');
  assert.equal(images.length, 1, 'exactly one pump drawing');
  assert.equal(buttons.length, 1, 'exactly one UPGRADE button');
  assert.equal(buttons[0].textContent.trim(), 'UPGRADE');
});

test('the card pictures the next level, not the one the player owns', () => {
  const card = buildPumpCard({ upgradePump: () => ({ ok: false }) });
  const state = shopState({ owned: 4, gold: 1_000, level: 1 });
  card.update(state);

  const image = elements(card.node, 'img')[0];
  // Level 2 is what the gold buys, and level N wears pump_N.png, so the card shows
  // pump_2.png while the field behind it still shows pump_1.png.
  assert.equal(image.getAttribute('src'), 'assets/images/pump/pump_2.png',
    'level 2 is what the gold buys');
  assert.equal(image.getAttribute('alt'), 'Water pump, level 2');
});

test('the gate sentence is exact, and says Ready only when the land is there', () => {
  const card = buildPumpCard({ upgradePump: () => ({ ok: false }) });

  card.update(shopState({ owned: 2, gold: 1_000, level: 1 }));
  let text = visibleText(card.node).join(' | ');
  assert.match(text, /Requires 4 owned plots — you own 2\./);
  assert.doesNotMatch(text, /Ready\./);
  assert.equal(elements(card.node, 'button')[0].disabled, true);

  card.update(shopState({ owned: 4, gold: 1_000, level: 1 }));
  text = visibleText(card.node).join(' | ');
  assert.match(text, /Requires 4 owned plots — you own 4\. Ready\./);
  assert.equal(elements(card.node, 'button')[0].disabled, false);
});

test('the button is disabled when the land is there but the gold is not', () => {
  const card = buildPumpCard({ upgradePump: () => ({ ok: false }) });
  card.update(shopState({ owned: 4, gold: 999, level: 1 }));

  assert.equal(elements(card.node, 'button')[0].disabled, true);
  assert.equal(card.node.dataset.locked, 'true');
});

test('a maxed pump shows level 5, no buy button, and the Fully upgraded sentence', () => {
  const card = buildPumpCard({ upgradePump: () => ({ ok: false }) });
  card.update(shopState({ owned: 16, gold: 0, level: 5 }));

  const image = elements(card.node, 'img')[0];
  assert.equal(image.getAttribute('src'), 'assets/images/pump/pump_5.png');
  assert.equal(card.node.dataset.max, 'true');

  const text = visibleText(card.node).join(' | ');
  assert.match(text, /Fully upgraded/);
  assert.equal(text.includes('Requires'), false, 'there is no next gate to state');

  const button = elements(card.node, 'button')[0];
  assert.equal(button.hidden, true, 'the UPGRADE button is gone');
  assert.equal(card.node.querySelector('.shop-pump__buy').hidden, true);
});

test('pressing UPGRADE calls the action once and reports the new level', async () => {
  let calls = 0;
  const toasts = [];
  const card = buildPumpCard({
    upgradePump: () => {
      calls += 1;
      return { ok: true, level: 2 };
    },
    toast: (message, tone) => toasts.push({ message, tone }),
  });
  card.update(shopState({ owned: 4, gold: 1_000, level: 1 }));

  await elements(card.node, 'button')[0].click();

  assert.equal(calls, 1);
  assert.deepEqual(toasts, [{ message: 'Pump upgraded to level 2.', tone: 'success' }]);
});

test('the shop has a Seeds section and a separate Pump section', () => {
  const state = shopState({ owned: 4, gold: 1_000, level: 1 });
  mountShop(root, {
    backHref: 'index.html',
    onState: (listener) => {
      listener(state);
      return () => {};
    },
    buy: () => ({ ok: false }),
    sell: () => ({ ok: false }),
    upgradePump: () => ({ ok: false }),
  });

  const sections = root.querySelectorAll('.shop-section');
  assert.equal(sections.length, 2, 'Seeds and Pump, not a single mixed grid');

  const titles = root.querySelectorAll('.shop-section__title')
    .map((node) => node.textContent.trim());
  assert.deepEqual(titles, ['Seeds', 'Pump']);

  assert.equal(root.querySelector('.shop-grid').querySelectorAll('.shop-card').length, 5,
    'five seeds, not six cards in the grid');
  assert.equal(root.querySelectorAll('.shop-pump').length, 1,
    'the pump is its own card outside the seed grid');
  assert.equal(elements(root.querySelector('.shop-pump'), 'img').length, 1);
});
