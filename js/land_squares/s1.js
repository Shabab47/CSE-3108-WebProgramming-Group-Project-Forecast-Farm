/**
 * Land segment 1 of 16 — grid (col 0, row 0), zone A (top).
 *
 * One file per segment. This holds the segment's **identity** — where it sits on
 * the field, and whether it is the one every farm starts with. It does not hold
 * the player's crop, water, health or lock state, and that is deliberate: those
 * change every second of play and belong to the save file, not to a module.
 *
 * `createPlot1()` is a **factory, not a shared object.** A module-level mutable plot
 * would be the same object for every player, in every tab, forever: it could not
 * be saved, two players on one machine would overwrite each other, and a save
 * restored twice would share memory with the farm it came from. Calling the
 * factory gives a fresh plot every time `buildPlots()` runs, which is what makes
 * `state.plots` an ordinary serialisable array.
 *
 * **This is the free plot.** Every farm starts owning it. It is never locked and
 * never for sale: the player earns their first money here and spends it on the
 * segments below. It is the topmost diamond on screen — `z = col + row = 0`, so
 * it is the furthest from the camera and nothing paints over it.
 *
 * `config/field.js` is the source of truth for the geometry and for
 * `STARTER_PLOT_ID`. This file restates neither those numbers nor that choice —
 * it only spells out where this particular segment sits.
 */

/** Where this segment sits, and whether it is the free one. Immutable. */
export const PLOT_1 = {
  id: 0,
  col: 0,
  row: 0,
  zone: 'A',
  zoneLabel: 'top',
  isStarter: true,
};

/**
 * A fresh, unplanted plot for this segment.
 *
 * Owned from the start — the one plot a player never has to buy.
 * Otherwise identical to the old `buildPlots()` loop: empty, dry, at full health
 * and alive, so existing saves and the geometry tests are unaffected.
 *
 * @returns {object} a new plot, safe for the caller to mutate
 */
export function createPlot1() {
  return {
    ...PLOT_1,
    owned: PLOT_1.isStarter,
    cropId: null,
    plantedAt: null,
    waterLevel: 0,
    health: 100,
    dead: false,
  };
}
