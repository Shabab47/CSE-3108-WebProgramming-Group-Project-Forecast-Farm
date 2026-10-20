/**
 * The inventory page, mounted.
 *
 * The page reads the save, so it boots a session and a store — but the view is the
 * part that can be wrong without a browser, and it is what this covers: that the
 * bag it shows is the bag in `state.inventory.seeds`, and that a seed the farm has
 * not unlocked says so rather than lying about it.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { mountInventory } from '../js/ui/inventoryView.js';
import { shopCrops } from '../js/config/crops.js';

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** Mount the page against one state, as `subscribe` would deliver it. */
function mount(state) {
  mountInventory(root, {
    backHref: 'index.html',
    onState: (fn) => {
      fn(state);
      return () => {};
    },
  });
  return root.querySelectorAll('.inventory-card');
}

/** A farm with one owned plot and a couple of seeds in the bag. */
function farm(seeds = { rice: 3, potato: 2 }) {
  return {
    gold: 1234,
    plots: [{ owned: true }],
    inventory: { seeds },
  };
}

test('the inventory lists every crop the shop sells', () => {
  const cards = mount(farm());
  assert.equal(cards.length, shopCrops().length);
  assert.equal(cards.length, 5);
});

test('a card shows how many of a seed are owned', () => {
  const [rice] = mount(farm());
  assert.match(visibleText(rice).join(' '), /3 seeds/);
});

test('a crop with none in the bag says so, and is dimmed', () => {
  // Tomato is index 2 in shop order, and the farm holds none of it.
  const tomato = mount(farm())[2];
  assert.match(visibleText(tomato).join(' '), /None/);
  assert.ok(tomato.classList.contains('inventory-card--empty'));
});

test('a seed the farm has not unlocked says how to unlock it', () => {
  // Corn needs 16 plots; this farm owns one and holds none.
  const corn = mount(farm())[4];
  assert.match(visibleText(corn).join(' '), /Unlocks at 16 plots/);
});

test('a seed the farm owns but has not unlocked says it cannot be planted yet', () => {
  // Potato needs 4 plots; this farm owns one but holds two.
  const potato = mount(farm())[1];
  assert.match(visibleText(potato).join(' '), /have not unlocked the land/);
});

test('the purse shows the gold', () => {
  mount(farm());
  assert.match(visibleText(root).join(' '), /1,234/);
});
