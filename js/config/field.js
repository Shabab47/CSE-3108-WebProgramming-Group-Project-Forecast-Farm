/**
 * Field geometry and land prices.
 *
 * The constants are measured from the PNG alpha bounding boxes, not guessed.
 * See docs/architecture.md "Field geometry" and ISS-003, ISS-004, ISS-005.
 */

/** Isometric grid geometry. Every `x` and `y` here is a fraction of the field frame's
 *  **width** — `js/utils/iso.js` `frameY()` is the one place that converts, for `top`. */
export const FIELD = {
  size: 4, // 4x4 plots
  zoneSize: 2, // 2x2 plots per zone

  /* The field frame, from `base.png`. Its canvas is 1000x1000 and its art is 992 x 596
   * at (8, 202), so the canvas carries 202px of empty space above and below the slab.
   * `css/scene.css` crops that padding with `object-fit: cover` instead of editing the
   * file — and cropping the file would not have helped anyway, which is worked through
   * in ISS-069. */
  baseArtTop: 0.202, // canvas y where the art starts — `cover` centres its crop
  baseArtHeight: 0.596, // and how tall it is, so the visible band is 0.202..0.798
  frameAspect: 1 / 0.596, // width / height = 1000/596. Repeated as `aspect-ratio` in CSS

  /* `tileScale` is the plot **box** side, and the box is square — the same shape as the
   * 1000x1000 ground canvas, which makes `object-fit: contain` an exact fit. The diamond
   * drawn inside it is 0.991 of the box, and `tileAspect` is the diamond's own h/w.
   *
   * Up to T-54 the box was `tileScale * tileAspect` tall. That fits a square canvas to
   * the box's *height*, so every plot drew at half the size the geometry assumed and sat
   * in a gap twice `gap` wide. Over half the stage, that is the "doesn't fit properly"
   * the field was reported for. ISS-070.
   *
   * Retuned `0.2296 -> 0.2320` by eye on the running page (DEC-049): ~2px bigger a plot
   * at a 720px stage, at the cost of ~2px of overhang front-to-back that DEC-034's exact
   * face fit did not have. An even rim was never available (ISS-071). */
  tileScale: 0.2320,
  tileAspect: 0.538, // diamond height / width, measured from ground_unwatered.png
  gap: 0.03, // gap between plots, in tile units
  crossGap: 0.12, // extra gap at the centre cross, in tile units

  /* The slab's **top face** — the surface the plots stand on — not the centre of its
   * bounding box. `base.png` is an extruded slab: the top face is 992 x 520 centred at
   * canvas (0.503, 0.462), and the ~72px skirt hanging below it drags the bounding box
   * centre down to y 0.4995. Using the bounding box centre put the whole field 3.7% of
   * the frame too low, with the front row hanging off the bevel onto the skirt. ISS-069.
   *
   * The shipped origin is a pixel left of the measured face centre and 0.004 below it:
   * the same eyes-on retune as `tileScale` (DEC-049). */
  originX: 0.502,
  originY: 0.466,

  pumpScale: 0.2, // pump art is 27.9% of its canvas — about a quarter of a plot here (DEC-049)
};

/** Zone names, by compass position on the isometric grid. */
export const ZONES = {
  A: 'top',
  B: 'right',
  C: 'left',
  D: 'bottom',
};

/**
 * The plot every farm starts with, and the only one that is never for sale.
 *
 * `id` 0 is the back corner: `col` 0, `row` 0, so `z = col + row = 0` and it is the
 * furthest diamond from the camera. Nothing paints over it, which matters for a
 * plot the player is meant to read at a glance for the whole first session.
 *
 * The player starts on it, plants on it, and earns the money that buys the rest.
 * Because it is owned from the first frame it can never be locked, greyed, or shown
 * with a price — see `land_squares/s1.js`.
 */
export const STARTER_PLOT_ID = 0;

/**
 * The order plots are acquired in (DEC-036), **including the free one**.
 *
 * Sixteen entries indexed by `ownedCount`, which is why it has sixteen and not
 * fifteen: `nextUnlockable()` reads `UNLOCK_ORDER[ownedCount]`, and a starting farm
 * already owns one plot, so index 0 is the starter's own slot. Listing only the
 * fifteen paid plots and indexing from there put every purchase one slot early and
 * made `UNLOCK_ORDER[0]` unreachable.
 *
 * Zone A → B → C → D, and within a zone by `col` then `row`, so the farm fills from
 * the back edge to the front and every plot bought touches one already owned.
 *
 * **Read this against the id formula before trusting it.** `id = row * 4 + col`, so a
 * zone is *not* a contiguous run of ids: zone A is `{0, 1, 4, 5}`, not `{0, 1, 2, 3}`.
 * An earlier draft got that wrong and offered a zone-B plot as the second purchase;
 * the test in `tests/farm.test.js` that walks the whole ladder now pins every zone.
 *
 * ```
 *   index  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
 *   plot   0    4    1    5    2    6    3    7    8   12    9   13   10   14   11   15
 *   zone   A    A    A    A    B    B    B    B    C    C    C    C    D    D    D    D
 *   cost   —  100  200  400  800 1600 3200 6400 ...
 * ```
 *
 * Index 0 is the starter and is never charged — see `PLOT_PRICES`. Because both arrays
 * are indexed the same way there is no second source of truth: `nextUnlockable()` in
 * `land_squares/index.js` is the only place that decides, and it cannot disagree with
 * itself.
 *
 * Storing a per-plot `state: 'next' | 'locked' | 'owned'` was rejected in DEC-036: it
 * would make a wrong order a save-migration problem, and `owned` is the only field
 * the data actually needs.
 */
export const UNLOCK_ORDER = [
  // Zone A — top. Ids 0, 1, 4, 5; id 0 is the free starter.
  0, 4, 1, 5,
  // Zone B — right. Ids 2, 3, 6, 7.
  2, 6, 3, 7,
  // Zone C — left. Ids 8, 9, 12, 13.
  8, 12, 9, 13,
  // Zone D — bottom. Ids 10, 11, 14, 15.
  10, 14, 11, 15,
];

/**
 * The price of the n-th plot the player buys is PLOT_PRICES[ownedCount].
 * Price depends on how many plots are already owned, not on which plot it is
 * (DEC-009). Index 0 is never charged — the player already owns that plot — so
 * buying begins at index 1, and every plot after costs exactly twice the last.
 * All sixteen together cost 3,276,700 gold.
 */
export const PLOT_PRICES = [
  0, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400, 204800,
  409600, 819200, 1638400,
];

/** The diamond clip used for plot hit areas. Measured: y runs 22.4% to 75.6%. */
export const DIAMOND_CLIP = 'polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)';