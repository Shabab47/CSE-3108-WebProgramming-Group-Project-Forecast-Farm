/**
 * The name a plot is announced by.
 *
 * Split out of `farmView.js` because it is a different job from drawing: it is the
 * one piece of the field that has to be *correct* rather than merely visible, and
 * `AGENTS.md` asks that panels be split by responsibility before they grow.
 *
 * Every plot is a `<button>` whose children are all decorative, so this string is the
 * entire accessible name. There is no second chance at it — nothing else on the tile
 * is read out — which is why it says what a click *will do* and not merely what the
 * plot *is*. A player using a screen reader should not have to click fifteen locked
 * plots to discover that none of them do anything.
 *
 * Ids are 0-based and players count from 1, so the `+ 1` is here rather than at each
 * call site.
 */

import { cropOf } from '../config/crops.js';

/**
 * @param {object} plot the plot being drawn
 * @param {object} facts
 * @param {boolean} facts.isOwned
 * @param {boolean} facts.isNext  the plot currently on offer
 * @param {boolean} facts.isReady ready to harvest
 * @param {object}  facts.grown   the `harvestsIn()` result, or null when unowned
 * @param {number}  facts.price   the price of the plot on offer
 * @returns {string}
 */
export function plotName(plot, { isOwned, isNext, isReady, grown, price = 0 }) {
  const n = plot.id + 1;

  if (!isOwned) {
    return isNext ? `Plot ${n}, ${price} gold, buy this plot` : `Plot ${n}, locked`;
  }

  if (!grown?.planted) return `Plot ${n}, empty`;
  if (isReady) return `Plot ${n}, ready to harvest`;

  const name = cropOf(plot.cropId)?.name ?? 'crop';
  return `Plot ${n}, ${name} growing, ${formatLeft(grown.msLeft)} left`;
}

/**
 * "3h 20m left".
 *
 * Coarse on purpose — a countdown to the second is noise, and it would make the whole
 * field re-announce on every tick. Rounded **up**, because a crop with 40 seconds left
 * should say "1m" rather than "0m", and "0m left" reads as broken.
 */
export function formatLeft(ms) {
  const minutes = Math.ceil(Math.max(0, ms) / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
