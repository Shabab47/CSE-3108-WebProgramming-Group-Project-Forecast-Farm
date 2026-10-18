/**
 * Tests for the gold display format. `node --test tests/`
 *
 * The thing worth protecting here is that this is a *display* function. If a
 * domain rule ever started reading `formatGold`, rounding a purchase cost to
 * three decimals would become a bug that only shows up on a fractional purse —
 * so the first test says out loud that the numbers are untouched underneath.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatGold, goldLabel } from '../js/utils/formatGold.js';
import { buySeeds, sellSeeds } from '../js/domain/shop.js';
import { buildInitialState } from '../js/state/initialState.js';

const SESSION = {
  status: 'authed',
  userId: 'acc_test',
  email: 'a@b.bd',
  farmerName: 'Test',
};

test('a whole purse shows no decimals at all', () => {
  // The common case, and the one that must not become noisy: 10,000.000 is not
  // more precise than 10,000, it is just longer.
  assert.equal(formatGold(10000), '10,000');
  assert.equal(formatGold(0), '0');
  assert.equal(formatGold(200), '200');
});

test('at most three decimals, so a per-second pump bill is legible', () => {
  // The pump bills at upkeepPerSecond 0.0056, so a purse really does land on
  // numbers like this one.
  assert.equal(formatGold(99.9933333), '99.993');
  assert.equal(formatGold(0.0056), '0.006');
  assert.equal(formatGold(12.5), '12.5');
});

test('thousands separators survive alongside the decimals', () => {
  assert.equal(formatGold(1234567.891), '1,234,567.891');
  assert.equal(formatGold(1638400), '1,638,400');
});

test('floating point noise is not shown as digits', () => {
  // 0.1 + 0.2 is the canonical example, and a purse that has been through a
  // thousand per-second bills is full of numbers like it.
  assert.equal(formatGold(0.1 + 0.2), '0.3');
});

test('a missing or broken gold reads as zero rather than NaN', () => {
  // A hand-edited save can omit it. A gold readout is not the place to show a
  // player a parse failure.
  assert.equal(formatGold(undefined), '0');
  assert.equal(formatGold(null), '0');
  assert.equal(formatGold('not a number'), '0');
  assert.equal(formatGold(NaN), '0');
  assert.equal(formatGold(Infinity), '0');
});

test('a numeric string formats like the number it holds', () => {
  // The state has crossed a JSON boundary more than once.
  assert.equal(formatGold('10000'), '10,000');
  assert.equal(formatGold('99.9933333'), '99.993');
});

test('goldLabel adds the unit for a sentence', () => {
  assert.equal(goldLabel(10000), '10,000 gold');
  assert.equal(goldLabel(17.5), '17.5 gold');
});

test('formatting gold does not change what a purchase costs', () => {
  // The promise that matters: display rounds, arithmetic does not. Buy on a
  // fractional purse and check the debit is the exact price, not the shown one.
  const state = { ...buildInitialState(SESSION), gold: 1000.0056 };
  const before = state.gold;

  const bought = buySeeds(state, 'rice', 1);
  assert.equal(bought.ok, true);
  assert.equal(bought.state.gold, before - 100);

  const sold = sellSeeds(bought.state, 'rice', 1);
  assert.equal(sold.ok, true);
  assert.equal(sold.state.gold, before - 100 + 75);
});

test('a fractional balance is not rounded away by the purchase gate', () => {
  // 99.9933 gold cannot afford a 100 gold rice packet, and the refusal must be
  // about the shortfall rather than a balance that was quietly rounded to 100.
  const state = { ...buildInitialState(SESSION), gold: 99.9933 };
  const bought = buySeeds(state, 'rice', 1);
  assert.equal(bought.ok, false);

  // The message shows three decimals and no more, so the player sees they are
  // 0.0067 short rather than being told they have exactly 99.9933 gold.
  assert.match(bought.reason, /99\.993\b/);
  assert.doesNotMatch(bought.reason, /99\.9933/);
});