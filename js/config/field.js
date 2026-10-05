/**
 * Field geometry and land prices.
 *
 * The constants are measured from the PNG alpha bounding boxes, not guessed.
 * See docs/architecture.md "Field geometry" and ISS-003, ISS-004, ISS-005.
 */

/** Isometric grid geometry. All sizes are fractions of the stage. */
export const FIELD = {
  size: 4, // 4x4 plots
  zoneSize: 2, // 2x2 plots per zone
  tileScale: 0.204, // plot image width as a fraction of the stage
  tileAspect: 0.538, // diamond height / width, measured from ground_unwatered.png
  gap: 0.03, // gap between plots, in tile units
  crossGap: 0.12, // extra gap at the centre cross, in tile units
  originX: 0.5, // diamond centre, fraction of the stage
  originY: 0.5, // tuned with the debug sliders against field-reference.jpeg
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