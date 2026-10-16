/**
 * Isometric placement for the field stage.
 *
 * The contract is `docs/architecture.md` "Field geometry"; this file is the only
 * place that turns a `(col, row)` into a position. Every **measured** number comes
 * from `FIELD` — the constants there were read off the PNG alpha bounding boxes, so
 * moving the field means editing `js/config/field.js`, not this file.
 *
 * `utils/` imports only `config`, which is all this needs.
 *
 * Everything comes back in **one** unit: a fraction of the field frame's **width**.
 * Not of the frame's height, and not of the stage — see `frameY()` for why both of
 * those distinctions are load-bearing. Never px, so the field scales with its
 * container and needs no resize handling. `farmView.js` turns the fractions into `%`
 * and `css/scene.css` supplies the positioning.
 */

import { FIELD } from '../config/field.js';

/**
 * A frame-width fraction on the y axis -> a fraction of the frame's **height**.
 *
 * The two axes do not share a unit and this is the whole of it. Width fractions are
 * the natural unit here because CSS agrees on them: a plot's `width` and its
 * `padding-top` are both percentages of the containing block's **width**, so in this
 * unit a plot is `tileScale` wide and `tileScale * tileAspect` tall with no aspect
 * term anywhere. `top` is the exception — it resolves against the height.
 *
 * `base.png`'s canvas is 1000x1000 and its art is 596 tall, centred. The frame under
 * `object-fit: cover` is the whole canvas wide by that 596 tall, so the visible band
 * is canvas y `0.202..0.798` and a fraction `y` of the canvas width maps to
 * `(y - 0.202) / 0.596` of the frame's height.
 *
 * On a square field a frame-width fraction **was** a frame-height fraction and this
 * conversion did not exist. At `1000 / 596` skipping it shears the field by 68%
 * vertically — every plot correct in x, every row of them too far apart. ISS-069.
 *
 * @param {number} y frame-width fraction
 * @returns {number} fraction of the frame's height
 */
export function frameY(y) {
  return (y - FIELD.baseArtTop) / FIELD.baseArtHeight;
}

/**
 * Grid index -> position in tile widths, centred on the grid.
 *
 * Two terms, and both matter:
 *
 * - `(i - (n-1)/2) * (1 + gap)` is the centring term. The indices run `0..n-1`, so
 *   their mean is `(n-1)/2`, not 0. Drop it and the cluster lands `(n-1)` steps away
 *   from the origin — which is exactly ISS-065: the y axis lost this term while x
 *   kept it by luck, because `col - row` happens to average 0 over a square grid
 *   while `col + row` averages `n-1`. The field sat 15.3% of the stage too low.
 * - The `crossGap` term pushes the far indices out and the near ones in by the same
 *   amount, which opens the dirt cross around the pump **without** moving the
 *   cluster's centre. Equal and opposite, so index 0 and index `n-1` stay symmetric
 *   about the origin at any `crossGap`.
 */
function shift(i) {
  const centred = (i - (FIELD.size - 1) / 2) * (1 + FIELD.gap);
  const across = i >= FIELD.size / 2 ? FIELD.crossGap / 2 : -FIELD.crossGap / 2;
  return centred + across;
}

/**
 * Where a plot's box centre goes, as frame-width fractions.
 *
 * `col` runs to the lower right and `row` to the lower left, so `(0, 0)` is the top
 * vertex of the diamond, `(size-1, 0)` the right, `(0, size-1)` the left and
 * `(size-1, size-1)` the bottom — the `ZONES` mapping in `config/field.js`.
 *
 * **No `(col, row)` lands on the origin.** The origin is the cross, the meeting point
 * of the four zones, which is where the pump goes — see `pumpBox()`.
 *
 * `z` is the paint order: plots lower on the screen are nearer the camera and cover
 * the ones behind, and `col + row` is exactly "how far down the screen". Selection
 * and hover stack above this range in `css/scene.css`.
 *
 * @param {number} col 0..size-1
 * @param {number} row 0..size-1
 * @returns {{x: number, y: number, z: number}} box centre; both axes frame-width fractions
 */
export function plotToScreen(col, row) {
  const u = shift(col);
  const v = shift(row);

  return {
    x: FIELD.originX + ((u - v) * FIELD.tileScale) / 2,
    y: FIELD.originY + ((u + v) * FIELD.tileScale * FIELD.tileAspect) / 2,
    z: col + row,
  };
}

/**
 * The pump: the same centre formula at `u = v = 0`, sized by `pumpScale`.
 *
 * `pump.png` is 1000×1000 with its art occupying only the middle 279×237, so `size`
 * describes the **box** and the visible pump is 27.9% of it — about a third of one
 * plot's width. That ratio is the whole of ISS-007: a pump click target as wide as
 * this box covers the tips of four neighbouring plots.
 *
 * `translate(-50%, -50%)` in `css/scene.css` puts the box centre on this point, and
 * the art is centred in its box, so the pump's art lands on the cross.
 *
 * @returns {{x: number, y: number, size: number}} centre and box width; frame-width fractions
 */
export function pumpBox() {
  return { x: FIELD.originX, y: FIELD.originY, size: FIELD.pumpScale };
}
