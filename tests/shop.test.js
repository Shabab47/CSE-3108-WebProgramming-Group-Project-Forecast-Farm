/**
 * Tests for the shop rules and the crop table. `node --test tests/`
 *
 * The purchase rule is the only place gold leaves an account, so these are the
 * assertions worth having: the arithmetic, the two refusals, and the promise that
 * the rule does not touch the state it was handed — `store.apply` trusts that, and
 * an in-place mutation would corrupt a save that the autosave is about to write.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildInitialState } from '../js/state/initialState.js';
import { BUY_STEPS, SHOP_REASONS, buySeeds, canAfford } from '../js/domain/shop.js';
import { CROPS, SHOP_ORDER, cropOf, harvestValue, shopCrops } from '../js/config/crops.js';
import { cropSeedImg } from '../js/config/assets.js';
import { START_GOLD } from '../js/config/game.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'abdul@rice.bd', farmerName: 'Abdul Karim' };

function farmWith(gold) {
  return { ...buildInitialState(SESSION), gold };
}

test('a new farm can afford one rice packet and nothing more', () => {
  // The opening has to be a decision: START_GOLD buys two rice packets and a
  // fifth of a potato packet, so the first purchase is a real choice. Potato is
  // priced within reach on purpose and still refused, because it cannot be
  // planted yet.
  assert.equal(START_GOLD, 200);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 1), true);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 2), true);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 5), false);
  assert.equal(canAfford(farmWith(START_GOLD), 'potato', 1), false, 'unavailable, not unaffordable');
  assert.equal(canAfford(farmWith(START_GOLD), 'corn', 1), false);
});

test('seed prices run 100 to 500 in steps of 100, cheapest first', () => {
  const prices = shopCrops().map((crop) => crop.seedPrice);
  assert.deepEqual(prices, [100, 200, 300, 400, 500]);

  for (let i = 1; i < prices.length; i += 1) {
    assert.ok(prices[i] > prices[i - 1], 'the shop lists the cheapest crop first');
  }
});

test('rice is the only crop available to plant', () => {
  // The other four have a price and a packet but no growth art yet. The shop
  // still lists them; the rule refuses them.
  assert.deepEqual(
    SHOP_ORDER.filter((id) => CROPS[id].available),
    ['rice'],
  );
});

test('every crop has a packet image and a price', () => {
  for (const crop of shopCrops()) {
    assert.ok(crop.name, `${crop.id} has a name`);
    assert.ok(crop.seedPrice > 0, `${crop.id} has a seed price`);
    assert.equal(cropSeedImg(crop.id), `assets/images/crops/${crop.id}/${crop.id}%20seed.png`);
  }
});

test('a full-health harvest is worth exactly twice the seed', () => {
  // The invariant the whole economy rests on. If it is broken, a crop can make a
  // player lose gold by planting it and the sixteen-plot goal becomes
  // unreachable, so this is checked rather than trusted.
  for (const crop of shopCrops()) {
    assert.equal(harvestValue(crop.id), crop.seedPrice * 2, `${crop.id} doubles its seed cost`);
  }
});

test('a purchase takes the gold and puts the seeds in the bag', () => {
  const state = farmWith(200);
  const result = buySeeds(state, 'rice', 2);

  assert.equal(result.ok, true);
  assert.equal(result.cost, 200);
  assert.equal(result.state.gold, 0);
  assert.equal(result.state.inventory.seeds.rice, 2);
});

test('the rule does not touch the state it was given', () => {
  // `store.apply` assigns the returned state; mutating the old one would change a
  // farm the autosave has already written.
  const state = farmWith(200);
  buySeeds(state, 'rice', 1);

  assert.equal(state.gold, 200);
  assert.equal(state.inventory.seeds.rice, 0);
});

test('buying twice spends twice', () => {
  const first = buySeeds(farmWith(300), 'rice', 1);
  const second = buySeeds(first.state, 'rice', 1);

  assert.equal(second.ok, true);
  assert.equal(second.state.gold, 100);
  assert.equal(second.state.inventory.seeds.rice, 2);
});

test('a purchase that costs more than the purse is refused, and changes nothing', () => {
  const state = farmWith(150);
  const result = buySeeds(state, 'rice', 5);

  assert.equal(result.ok, false);
  assert.equal(result.state, undefined, 'a refusal hands back no state to write');
  assert.equal(result.reason, SHOP_REASONS.tooExpensive(500, 150));
  assert.equal(state.gold, 150, 'and the farm it was given is untouched');
});

test('exact change is affordable — the purse may reach zero', () => {
  const result = buySeeds(farmWith(200), 'rice', 2);
  assert.equal(result.ok, true);
  assert.equal(result.state.gold, 0);
});

test('an unavailable crop cannot be bought, however much gold there is', () => {
  const result = buySeeds(farmWith(999999), 'corn', 1);

  assert.equal(result.ok, false);
  assert.equal(result.reason, SHOP_REASONS.unavailable('Corn'));
  assert.equal(canAfford(farmWith(999999), 'corn', 1), false);
});

test('a crop that is not in the table is not sold', () => {
  assert.equal(buySeeds(farmWith(9999), 'truffle', 1).reason, SHOP_REASONS.unknownCrop);
  assert.equal(cropOf('truffle'), undefined);
  // Inherited keys must not be mistaken for crops.
  assert.equal(buySeeds(farmWith(9999), 'toString', 1).reason, SHOP_REASONS.unknownCrop);
});

test('a nonsensical quantity is refused', () => {
  for (const quantity of [0, -1, 1.5, Number.NaN]) {
    assert.equal(buySeeds(farmWith(9999), 'rice', quantity).reason, SHOP_REASONS.badQuantity);
    assert.equal(canAfford(farmWith(9999), 'rice', quantity), false);
  }
});

test('the offered quantities are one, five and ten', () => {
  assert.deepEqual(BUY_STEPS, [1, 5, 10]);
});

test('a save with no seed bag can still buy', () => {
  // Saves written before seeds were tracked have no bag at all, and a purchase
  // must not be the thing that refuses to load one.
  const old = farmWith(200);
  delete old.inventory.seeds;

  const result = buySeeds(old, 'rice', 1);
  assert.equal(result.ok, true);
  assert.equal(result.state.inventory.seeds.rice, 1);
});

test('canAfford and buySeeds never disagree', () => {
  // A button the UI enables must not be refused, and vice versa. Without this the
  // shop would disable a purchase the player could have made.
  for (const gold of [0, 99, 100, 199, 500, 1000]) {
    for (const crop of shopCrops()) {
      for (const quantity of BUY_STEPS) {
        const affordable = canAfford(farmWith(gold), crop.id, quantity);
        assert.equal(affordable, buySeeds(farmWith(gold), crop.id, quantity).ok, `${crop.id} ×${quantity} at ${gold} gold`);
      }
    }
  }
});