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
import { BUY_STEPS, SELL_RATE, SHOP_REASONS, SELL_REASONS, buySeeds, sellSeeds, canAfford } from '../js/domain/shop.js';
import { isSeedUnlocked, ownedPlots } from '../js/utils/seedUnlocks.js';
import { CROPS, CROP_UNLOCK_PLOTS, SHOP_ORDER, cropOf, harvestValue, requiredPlotsFor, shopCrops } from '../js/config/crops.js';
import { cropSeedImg } from '../js/config/assets.js';
import { START_GOLD } from '../js/config/game.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'abdul@rice.bd', farmerName: 'Abdul Karim' };

function farmWith(gold) {
  return { ...buildInitialState(SESSION), gold };
}

/** A farm owning exactly `count` plots (ids filled low to high), with gold. */
function farmWithPlots(count, gold = 999999) {
  const state = farmWith(gold);
  state.plots = state.plots.map((plot, index) => ({ ...plot, owned: index < count }));
  return state;
}

test('a new farm can afford one rice packet and nothing more', () => {
  // The opening has to be a decision: START_GOLD buys two rice packets and a
  // fifth of a potato packet, so the first purchase is a real choice. Potato is
  // priced within reach, but a one-plot farm has not unlocked it yet.
  assert.equal(START_GOLD, 200);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 1), true);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 2), true);
  assert.equal(canAfford(farmWith(START_GOLD), 'rice', 5), false);
  assert.equal(canAfford(farmWith(START_GOLD), 'potato', 1), false, 'locked by land, not by gold');
  assert.equal(canAfford(farmWith(START_GOLD), 'corn', 1), false);
});

test('seed prices run 100 to 500 in steps of 100, cheapest first', () => {
  const prices = shopCrops().map((crop) => crop.seedPrice);
  assert.deepEqual(prices, [100, 200, 300, 400, 500]);

  for (let i = 1; i < prices.length; i += 1) {
    assert.ok(prices[i] > prices[i - 1], 'the shop lists the cheapest crop first');
  }
});

test('rice, potato and tomato are the crops available to plant', () => {
  // All three have their five growth sprites on disk; wheat and corn have a price
  // and a packet but no growth art yet. The shop still lists all five; the field
  // draws the rice fallback for the ones without art.
  assert.deepEqual(
    SHOP_ORDER.filter((id) => CROPS[id].available),
    ['rice', 'potato', 'tomato'],
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

test('a land-unlocked crop without art can still be bought — land is the only gate', () => {
  // Tomato needs 8 plots. A 1-plot farm is refused with the plot count; a
  // 8-plot farm buys, even though `available` is still false — the field draws
  // the rice fallback until the real sprites land, so nothing 404s.
  const small = buySeeds(farmWithPlots(1), 'tomato', 1);
  assert.equal(small.ok, false);
  assert.equal(small.reason, SHOP_REASONS.locked('Tomato', 8, 1));

  const unlocked = buySeeds(farmWithPlots(8, 500), 'tomato', 1);
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.state.inventory.seeds.tomato, 1);
  assert.equal(canAfford(farmWithPlots(8, 500), 'tomato', 1), true);
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

test('one seed unlocks every four plots owned, in shop order', () => {
  // DEC-041: rice at 1, potato at 4, tomato at 8, wheat at 12, corn at 16.
  // Five seeds across sixteen plots, nothing left over.
  assert.deepEqual(SHOP_ORDER, ['rice', 'potato', 'tomato', 'wheat', 'corn']);
  assert.deepEqual(
    SHOP_ORDER.map((id) => requiredPlotsFor(id)),
    [1, 4, 8, 12, 16],
  );
  assert.deepEqual(CROP_UNLOCK_PLOTS, {
    rice: 1, potato: 4, tomato: 8, wheat: 12, corn: 16,
  });

  // The gate opens exactly at its threshold — one plot short is still locked.
  for (const cropId of SHOP_ORDER) {
    const need = requiredPlotsFor(cropId);
    assert.equal(isSeedUnlocked(farmWithPlots(need), cropId), true, `${cropId} at ${need} plots`);
    if (need > 1) {
      assert.equal(isSeedUnlocked(farmWithPlots(need - 1), cropId), false, `${cropId} at ${need - 1} plots`);
    }
  }

  // A new farm owns one plot: rice open, everything else land-locked.
  assert.equal(ownedPlots(farmWith(200)), 1);
  assert.equal(isSeedUnlocked(farmWith(200), 'rice'), true);
  assert.equal(isSeedUnlocked(farmWith(200), 'potato'), false);

  // And the shop refuses with the plot count, not the art queue.
  const locked = buySeeds(farmWithPlots(3), 'potato', 1);
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, SHOP_REASONS.locked('Potato', 4, 3));
  assert.equal(canAfford(farmWithPlots(3), 'potato', 1), false, 'a locked seed greys its buttons');

  // Unknown ids stay unknown rather than unlocking at some default.
  assert.equal(requiredPlotsFor('truffle'), Infinity);
  assert.equal(isSeedUnlocked(farmWithPlots(16), 'truffle'), false);
});

test('seeds sell back for 75% of what they cost', () => {
  assert.equal(SELL_RATE, 0.75);
});

test('selling seeds returns 75% of buying price, rounds, and debits bag + credits gold', () => {
  let st = farmWith(400); // enough to buy 4 rice
  const b = buySeeds(st, 'rice', 4);
  assert.equal(b.ok, true);
  st = b.state;
  assert.equal(st.gold, 0);
  assert.equal(st.inventory.seeds.rice, 4);
  const sell = sellSeeds(st, 'rice', 4);
  assert.equal(sell.ok, true);
  assert.equal(sell.payout, Math.round(100 * 4 * 0.75));
  assert.equal(sell.state.gold, sell.payout);
  assert.ok(!('rice' in sell.state.inventory.seeds));
});

test('selling partial seeds keeps remainder and gives correct payout', () => {
  let st = farmWithPlots(4, 2000);
  st = buySeeds(st, 'potato', 10).state;
  const res = sellSeeds(st, 'potato', 3);
  assert.equal(res.ok, true);
  assert.equal(res.payout, Math.round(200 * 3 * 0.75));
  assert.equal(res.state.inventory.seeds.potato, 7);
  assert.equal(res.state.gold, res.payout);
});

test('cannot sell more seeds than owned', () => {
  let st = farmWith(100);
  st = buySeeds(st, 'rice', 1).state;
  const res = sellSeeds(st, 'rice', 5);
  assert.equal(res.ok, false);
  assert.equal(res.reason, SELL_REASONS.notEnoughSeeds(1, 5));
  assert.equal(st.inventory.seeds.rice, 1);
  assert.equal(st.gold, 0);
});

test('selling refuses unknown crop and invalid quantity', () => {
  const s = farmWith(100);
  let r = sellSeeds(s, 'unknown', 1);
  assert.equal(r.ok, false);
  assert.equal(r.reason, SELL_REASONS.unknownCrop);
  r = sellSeeds(s, 'rice', 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, SELL_REASONS.badQuantity);
  r = sellSeeds(s, 'rice', 2.5);
  assert.equal(r.ok, false);
  assert.equal(r.reason, SELL_REASONS.badQuantity);
});

test('selling is not land-gated — a locked crop can still be sold back', () => {
  // The unlock gate is on *buying* land, not on holding seeds. A one-plot farm
  // that somehow holds corn must not be stuck with it forever.
  const state = farmWithPlots(1, 0);
  state.inventory.seeds.corn = 2;

  assert.equal(isSeedUnlocked(state, 'corn'), false, 'cannot be bought or planted');
  const res = sellSeeds(state, 'corn', 1);
  assert.equal(res.ok, true);
  assert.equal(res.payout, Math.round(500 * SELL_RATE));
  assert.equal(res.state.inventory.seeds.corn, 1);
});

test('a save with no seed bag has nothing to sell', () => {
  const state = { ...farmWith(500), inventory: {} };
  const res = sellSeeds(state, 'rice', 1);
  assert.equal(res.ok, false);
  assert.equal(res.reason, SELL_REASONS.notEnoughSeeds(0, 1));
});

test('sellSeeds does not mutate original state', () => {
  const base = farmWith(200);
  const afterBuy = buySeeds(base, 'rice', 2).state;
  const before = structuredClone ? structuredClone(afterBuy) : JSON.parse(JSON.stringify(afterBuy));
  const res = sellSeeds(afterBuy, 'rice', 1);
  assert.equal(res.ok, true);
  assert.deepEqual(afterBuy, before);
});