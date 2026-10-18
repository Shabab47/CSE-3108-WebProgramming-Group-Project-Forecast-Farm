/**
 * Damage: the committed half of what water does to a crop.
 *
 * ## Why this is separate from `water.js`
 *
 * `water.js` is the medium — it settles every plot from the clock, the sky and the
 * pump. This decides **what that settling did to a crop**, and it is a different
 * kind of thing: `water.js` computes a number every second; this decides a fact that,
 * once true, never changes.
 *
 * ## The distinction the whole file rests on
 *
 * **Water is a live reading. Damage is a committed fact.**
 *
 * `plot.waterLevel` rises and falls every second, so it crosses any threshold
 * repeatedly — rice at 10.8/h crosses any given line in under a minute and then sits
 * astride it. Anything drawn straight from it (a sprite, a caption, a colour) strobes
 * between two pictures of the same crop, and `farmView.js` diffs tiles per frame, so
 * the image `src` would swap over and over.
 *
 * So damage is **latched onto the plot** the first time a line is crossed, and read
 * from there thereafter. That is also the honest reading of a crop: one that has been
 * through a real drought does not un-sunburn because you watered it afterwards. And
 * because every input is ours — rain, evaporation and the pump are all numbers we add
 * and subtract, never sensors we read — a latched record is exactly reproducible on
 * reload and in an exported save.
 *
 * ## The two lines
 *
 * | damage | latches when | sprite |
 * | :--- | :--- | :--- |
 * | `dry` | held **below its optimal floor** for an hour | `<crop>_dry.png` |
 * | `waterlogged` | held **above its target** for two hours | `<crop>_waterlogged.png` |
 * | `dead` | health reached 0 (`plot.dead`, separate) | `<crop>_dead.png` |
 *
 * **The floor is per crop, not a flat number.** It is `target × (1 - slack)`, so rice
 * is held to 64 and wheat to 41. A single flat line would put wheat at "damaged" while
 * it was still comfortably optimal, which is the kind of number that looks reasonable
 * in a table and lies on the field.
 *
 * **Waterlogging needs a two-hour hold**, because one shower must not cost a field.
 * That is exactly what the one-time verdict at sowing exists to prevent, and an
 * instant threshold here would undo that decision on every rain shower for the rest
 * of the crop's life.
 *
 * ## Damage costs payout, never the harvest
 *
 * Latching subtracts `DAMAGE.lossPerLatched` from `plot.health`, which is what
 * `farm.harvest()` pays out on. The crop still harvests and is still worth picking; it
 * is just worth less, permanently. Blocking the harvest instead would rebuild the
 * ISS-006 trap — a plot with nothing to do until it is cleared by hand, and no second
 * failure state available to the player at that point.
 */

import { DAMAGE } from '../config/game.js';

/**
 * Should damage latch for this plot?
 *
 * Pure and total: it asks about the elapsed period only, and knows nothing about
 * whether damage is already latched — `applyDamage()` owns that, so the two rules
 * cannot disagree about whether damage is permanent.
 *
 * @param {object} plot the plot, for nothing but its identity — kept for callers
 * @param {object} window how long it spent in each state, in hours
 * @param {number} window.belowFloor hours spent under the optimal floor
 * @param {number} window.aboveTarget hours spent over the target
 * @returns {'dry'|'waterlogged'|null}
 */
export function damageFor(_plot, { belowFloor = 0, aboveTarget = 0 } = {}) {
  if (belowFloor >= DAMAGE.hoursBelowFloorToLatch) return 'dry';
  if (aboveTarget >= DAMAGE.hoursAboveTargetToLatch) return 'waterlogged';
  return null;
}

/**
 * Latch a damage state onto a plot.
 *
 * **Never clears, never downgrades.** Waterlogged does not become dry: a plot that
 * was waterlogged was not fine beforehand, and the newest reading is not the truest
 * one.
 *
 * Pure — it returns a new plot rather than mutating, because `domain/` functions never
 * mutate the state they are handed.
 *
 * @param {object} plot
 * @param {'dry'|'waterlogged'|null} kind
 * @returns {object} a new plot, or the same object when nothing changes
 */
export function applyDamage(plot, kind) {
  if (!kind || plot.damage === kind) return plot;

  return {
    ...plot,
    damage: kind,
    health: Math.max(0, (plot.health ?? 0) - DAMAGE.lossPerLatched),
  };
}

/**
 * The one word for a plot's damage, or null.
 *
 * Text carries the meaning while the sprites are 0 bytes, which is the AGENTS.md
 * fact-4 pattern: broken images are expected until art lands, so the caption has to
 * be readable alone. When Zim's art lands the sprite appears *alongside* this and the
 * caption stays — it is the part a screen reader gets and the part that survives a
 * missing file.
 *
 * @param {object} plot
 * @returns {string|null}
 */
export function damageWord(plot) {
  if (plot?.dead) return 'Dead';
  if (plot?.damage === 'waterlogged') return 'Waterlogged';
  if (plot?.damage === 'dry') return 'Dry';
  return null;
}

/**
 * The sprite filename for a plot's damage state, or null.
 *
 * Matches `cropFailureImg()` in `config/assets.js`. `dead` wins over any latched
 * damage, because a dead crop is dead whatever else was wrong with it first.
 *
 * @param {object} plot
 * @returns {string|null} e.g. `'rice_dry'`
 */
export function damageSprite(plot) {
  if (!plot?.cropId) return null;
  if (plot.dead) return 'dead';
  if (plot.damage === 'waterlogged') return 'waterlogged';
  if (plot.damage === 'dry') return 'dry';
  return null;
}

/** A plain-English line for the damage sprite's `title`, or null. */
export function damageNote(plot) {
  if (!plot) return null;
  if (plot.dead) return 'Dead — clear the plot to reuse it.';
  if (!plot.damage) return null;
  return `${damageWord(plot)} — this damage is permanent and lowers the harvest.`;
}