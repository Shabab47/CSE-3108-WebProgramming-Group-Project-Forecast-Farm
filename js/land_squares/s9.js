/**
 * Land segment 9 of 16 — grid (col 0, row 2), zone C (left).
 *
 * One file per segment. This holds the segment's **identity** — where it sits on
 * the field, and whether it is the one every farm starts with. It does not hold
 * the player's crop, water, health or lock state, and that is deliberate: those
 * change every second of play and belong to the save file, not to a module.
 *
 * `createPlot9()` is a **factory, not a shared object.** A module-level mutable plot
 * would be the same object for every player, in every tab, forever: it could not
 * be saved, two players on one machine would overwrite each other, and a save
 * restored twice would share memory with the farm it came from. Calling the
 * factory gives a fresh plot every time `buildPlots()` runs, which is what makes
 * `state.plots` an ordinary serialisable array.
 *
 * Bought with gold earned on the plots bought before it. Stays locked until it
 * is its turn in `UNLOCK_ORDER`, and is never sold out of turn.
 *
 * `config/field.js` is the source of truth for the geometry and for
 * `STARTER_PLOT_ID`. This file restates neither those numbers nor that choice —
 * it only spells out where this particular segment sits.
 */

/** Where this segment sits, and whether it is the free one. Immutable. */
export const PLOT_9 = {
  id: 8,
  col: 0,
  row: 2,
  zone: 'C',
  zoneLabel: 'left',
  isStarter: false,
};

/**
 * A fresh, unplanted plot for this segment.
 *
 * Locked from the start — it becomes the player's when they buy it, in turn.
 * Otherwise identical to the old `buildPlots()` loop: empty, dry, at full health
 * and alive, so existing saves and the geometry tests are unaffected.
 *
 * @returns {object} a new plot, safe for the caller to mutate
 */
export function createPlot9() {
  return {
    ...PLOT_9,
    owned: PLOT_9.isStarter,
    cropId: null,
    plantedAt: null,
    waterLevel: 0,
    health: 100,
    forecast: null,
    dead: false,
  };
}
