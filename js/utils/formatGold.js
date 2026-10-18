/**
 * How gold is written for a player to read.
 *
 * **The number is not rounded for them; only the writing of it is.** `formatGold`
 * is a display function and nothing else — no domain rule reads it, so showing
 * three decimals cannot change what a purchase costs or what a harvest pays. The
 * arithmetic stays exact; this decides how many digits of it reach the screen.
 *
 * That distinction matters because gold is genuinely fractional. The pump bills
 * per second (`domain/water.js`), and at `upkeepPerSecond` 0.0056 a minute of
 * watering costs a fraction of a coin. A balance of `99.9933333` is a real
 * number that `Math.round` would turn into a lie — the player would see 100 and
 * be short for the next top-up.
 *
 * **Three decimals, and no more.** Enough to show a per-second bill moving
 * without the digits crawling as the balance ticks. `maximumFractionDigits`
 * rather than a fixed three, because "10,000" is right for a round purse and
 * "10,000.000" is noise.
 *
 * Imports nothing, so every layer may read it.
 */

/**
 * Gold as a string, with thousands separators and at most three decimals.
 *
 * Trailing zeros are dropped, so a whole purse reads `10,000` and a fractional
 * one reads `99.993`. A non-number renders as `0` rather than `NaN` — a gold
 * readout is not the place to show a player a parse failure, and `state.gold`
 * only goes undefined if a hand-edited save omits it.
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatGold(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/**
 * Gold with its unit, for a sentence rather than a readout: `1,638 gold`.
 *
 * Separate from `formatGold` so a caller cannot end up with `10,000 gold` in one
 * place and a bare `10000` in another.
 */
export function goldLabel(amount) {
  return `${formatGold(amount)} gold`;
}