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
   * the field was reported for. ISS-070. */
  tileScale: 0.2296,
  tileAspect: 0.538, // diamond height / width, measured from ground_unwatered.png
  gap: 0.03, // gap between plots, in tile units
  crossGap: 0.12, // extra gap at the centre cross, in tile units

  /* The slab's **top face** centre — the surface the plots stand on — not the centre of
   * its bounding box. `base.png` is an extruded slab: the top face is 992 x 520 centred
   * at canvas (0.503, 0.462), and the ~72px skirt hanging below it drags the bounding box
   * centre down to y 0.4995. Using the bounding box centre put the whole field 3.7% of
   * the frame too low, with the front row hanging off the bevel onto the skirt. ISS-069. */
  originX: 0.503,
  originY: 0.462,

  pumpScale: 0.25, // pump.png is 1000x1000 with the pump art 27.9% wide
};

/** Zone names, by compass position on the isometric grid. */
export const ZONES = {
  A: 'top',
  B: 'right',
  C: 'left',
  D: 'bottom',
};

/**
 * The price of the n-th plot the player buys is PLOT_PRICES[ownedCount].
 * Price depends on how many plots are already owned, not on which plot it is
 * (DEC-009). The first plot is free; every plot after costs exactly twice the
 * previous one. All sixteen together cost 3,276,700 gold.
 */
export const PLOT_PRICES = [
  0, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400, 204800,
  409600, 819200, 1638400,
];

/** The diamond clip used for plot hit areas. Measured: y runs 22.4% to 75.6%. */
export const DIAMOND_CLIP = 'polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)';