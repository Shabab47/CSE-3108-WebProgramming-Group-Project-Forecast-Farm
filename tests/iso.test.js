/**
 * Tests for the isometric placement. `node --test tests/`
 *
 * These exist because the field was wrong on screen and no test noticed: the y axis
 * was missing its centring term, so the whole cluster sat 15.3% of the stage below
 * the base and the front row hung off the edge (ISS-065). It was visible on every
 * render and invisible to assertion, because the assertion nobody wrote was "the
 * field is in the middle of the stage".
 *
 * T-54 added three more of that shape, all of them found by measuring the art rather
 * than deriving from it: the base is an extruded slab, so the origin is its top face
 * and not its bounding box (ISS-069); the plot box was square-art in a half-height box,
 * so every plot drew at half size (ISS-070); and an even rim does not exist, so
 * `tileScale` is a chosen fit rather than a solved one (ISS-071).
 *
 * Everything asserted here is a claim `docs/architecture.md` "Field geometry" makes
 * in prose. If a test fails, one of the two is wrong — check which before editing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { plotToScreen, pumpBox, frameY } from '../js/utils/iso.js';
import { FIELD, DIAMOND_CLIP } from '../js/config/field.js';

/** `base.png`'s **top face** — the surface the plots stand on, not the whole slab.
 *
 *  The slab's bounding box is 992 x 596; the ~72px skirt below the face accounts for
 *  the difference, and ISS-069 has the measurement. */
const BASE = { width: 0.992, height: 0.520 };

/** Every plot's box centre, in row-major order. */
function allPlots() {
  const out = [];
  for (let col = 0; col < FIELD.size; col += 1) {
    for (let row = 0; row < FIELD.size; row += 1) {
      out.push({ col, row, ...plotToScreen(col, row) });
    }
  }
  return out;
}

/** The box the whole cluster covers, as stage fractions. */
function clusterBox() {
  const plots = allPlots();
  const halfWidth = FIELD.tileScale / 2;
  const halfHeight = (FIELD.tileScale * FIELD.tileAspect) / 2;

  const left = Math.min(...plots.map((plot) => plot.x)) - halfWidth;
  const right = Math.max(...plots.map((plot) => plot.x)) + halfWidth;
  const top = Math.min(...plots.map((plot) => plot.y)) - halfHeight;
  const bottom = Math.max(...plots.map((plot) => plot.y)) + halfHeight;

  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

/** Distance between two placements, in stage fractions. */
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test('there are sixteen plots, all distinct positions', () => {
  const plots = allPlots();
  assert.equal(plots.length, FIELD.size * FIELD.size);

  const seen = new Set(plots.map((plot) => `${plot.x},${plot.y}`));
  assert.equal(seen.size, plots.length, 'no two plots share a position');
});

test('the cluster is centred on the origin on both axes, x and y alike', () => {
  // The bug this exists for: `col + row` averages FIELD.size - 1, not 0, so the y
  // axis needs the centring term just as much as x does. The old code applied it to
  // neither and got away with it on x only because `col - row` happens to average 0.
  const plots = allPlots();
  const mean = (pick) => plots.reduce((sum, plot) => sum + pick(plot), 0) / plots.length;

  assert.ok(Math.abs(mean((plot) => plot.x) - FIELD.originX) < 1e-9, 'mean x is the origin');
  assert.ok(
    Math.abs(mean((plot) => plot.y) - FIELD.originY) < 1e-9,
    'mean y is the origin — this is ISS-065',
  );
});

test('the bounding box of the cluster is centred, not just its mean', () => {
  const box = clusterBox();

  assert.ok(Math.abs((box.left + box.right) / 2 - FIELD.originX) < 1e-9);
  assert.ok(Math.abs((box.top + box.bottom) / 2 - FIELD.originY) < 1e-9);
});

test('the cluster measures 4.21 x 2.265 tile widths', () => {
  const box = clusterBox();

  assert.ok(Math.abs(box.width / FIELD.tileScale - 4.21) < 1e-6, 'width');
  // `architecture.md` writes 2.266 where the formula gives 2.26498 — a 0.05% rounding of
  // the same figure, not a disagreement. Both are measured to the tile **boxes**, which
  // stand half a box proud of the outermost diamonds; the drawn cluster is 0.6% smaller
  // than this on each axis, so the assertion is the conservative one.
  assert.ok(Math.abs(box.height / FIELD.tileScale - 2.265) < 1e-3, 'height');
});

test('base.png cannot give the cluster an even rim, at any tileScale', () => {
  // `architecture.md` used to report that `tileScale: 0.204` solved
  //   4.21t + 2r = 0.991   against   2.266t + 2r = 0.595   for an even `r ≈ 0.067`.
  // The 0.595 in the second equation is the slab's whole bounding box, skirt included.
  // Against the top face — the surface the plots actually stand on, 0.520 — the same
  // pair gives:
  const t = (BASE.width - BASE.height) / (4.21 - 2.265);
  const r = (BASE.width - 4.21 * t) / 2;

  assert.ok(r < 0, `an even rim solves to ${r.toFixed(4)}, which is not a rim`);
  assert.ok(t > FIELD.tileScale, 'so the fit that ships is inside the one that cannot exist');

  // The cause is the art, not the arithmetic: the ground diamond is h/w 0.538 and the
  // slab's top face is 520/992 = 0.524, so four rows of tiles are ~2.7% too tall for
  // the surface they cover. No `tileScale` reconciles two different shapes.
  assert.ok(FIELD.tileAspect > BASE.height / BASE.width, 'a cluster of these tiles is too tall');
});

test('tileScale covers the top face, standing slightly proud of it front-to-back', () => {
  // Retuned to `0.2320` by eye on the running page (DEC-049). DEC-034's `0.2296`
  // fitted the face front-to-back exactly; the bigger tiles give that up and stand
  // ~0.0027 of the frame width proud at the back and front (~2px at a 720px stage),
  // narrowing the side border from 0.013 to 0.0076. The slab cannot give an even rim
  // either way — ISS-071 has the arithmetic.
  const box = clusterBox();
  const rimX = (BASE.width - box.width) / 2;
  const rimY = (BASE.height - box.height) / 2;

  assert.ok(Math.abs(rimY + 0.0027) < 0.001, `the back and front rows stand ${-rimY} proud`);
  assert.ok(Math.abs(rimX - 0.0076) < 0.002, 'and the sides keep a border');
  assert.ok(rimX > 0, 'which is the only rim this slab can give');
});

test('frameY maps the base onto the frame, and crops nothing off the base', () => {
  // The frame is `base.png`'s visible band under `object-fit: cover`: the canvas is 1000
  // wide and the band 596 tall, centred, so it runs canvas y 0.202..0.798 (ISS-069). The
  // two ends of that band have to be the two edges of the frame, or the base and the
  // plots are measuring different boxes and the field shears.
  assert.ok(Math.abs(frameY(FIELD.baseArtTop) - 0) < 1e-9, 'the band top is the frame top');
  assert.ok(
    Math.abs(frameY(FIELD.baseArtTop + FIELD.baseArtHeight) - 1) < 1e-9,
    'and the band bottom is the frame bottom',
  );

  // The band is the slab's bounding box, 0.202..0.798, so `cover` discards the canvas
  // padding and no part of the slab itself.
  assert.ok(Math.abs(FIELD.baseArtTop - 0.202) < 1e-9, 'slab top');
  assert.ok(Math.abs(FIELD.baseArtTop + FIELD.baseArtHeight - 0.798) < 1e-9, 'slab bottom');

  // The origin, where the pump stands, therefore sits *above* the frame's midline: the
  // skirt below it drags the frame down. Centring on the bounding box instead is
  // exactly what ISS-069 was. `originY` is 0.004 below the face's measured centre of
  // 0.462, by the same eyes-on retune as `tileScale` (DEC-049).
  assert.ok(Math.abs(frameY(FIELD.originY) - 0.44295) < 0.001, 'the cross is 0.443 down the frame');
  assert.ok(frameY(FIELD.originY) < frameY(0.5), 'which is above the frame centre');
});

test('FIELD.frameAspect matches the aspect-ratio in css/scene.css', () => {
  // The one number that has to exist in two places, because it is both a CSS layout
  // value and a geometry constant. If the two drift, the base and the plots measure
  // different boxes — and the only symptom is that the whole field shears.
  const css = readFileSync(new URL('../css/scene.css', import.meta.url), 'utf8');
  const ratios = [...css.matchAll(/aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/g)]
    .map(([, width, height]) => Number(width) / Number(height));

  assert.ok(ratios.length >= 2, 'the stage and the mount both declare one');
  for (const ratio of ratios) {
    assert.ok(
      Math.abs(ratio - FIELD.frameAspect) < 1e-9,
      `css says ${ratio}, FIELD says ${FIELD.frameAspect}`,
    );
  }
});

test('the hit-area clip in css/scene.css matches DIAMOND_CLIP', () => {
  // The clip is the hit contract for all sixteen plots, and it lives in two places: the
  // constant the docs and `farmView.js` talk about, and the rule `.plot__hit` actually
  // uses. Same reasoning as `frameAspect` above — one number, two homes, so a test.
  const css = readFileSync(new URL('../css/scene.css', import.meta.url), 'utf8');
  const rule = /\.plot__hit\s*\{[^}]*clip-path:\s*([^;]+);/.exec(css);
  assert.ok(rule, 'no clip-path on .plot__hit in css/scene.css');

  // Both sides are percentages, so the numbers compare directly.
  const points = (polygon) => (polygon.match(/-?[\d.]+/g) ?? []).map(Number);

  assert.deepEqual(points(rule[1]), points(DIAMOND_CLIP), 'the two polygons differ');

  const p = points(DIAMOND_CLIP);
  assert.equal(p.length, 8, 'four points');
  assert.equal(p[1], 22.4, 'the top tip is 22.4% down the canvas');
  assert.equal(p[5], 75.6, 'and the bottom tip is at 75.6%');
  // Not symmetric about the box centre. The diamond's own centre is at 49%, which is
  // exactly where the art sits — `ground_*.png`'s measured bounding box centre is
  // (0.503, 0.490). Centring the clip on 50% instead would put the hit area a hair
  // below the pixels it is meant to cover.
  assert.equal((p[1] + p[5]) / 2, 49, 'the diamond is centred at 49%, where the art is');

  // ISS-004: rounding the bottom tip *out*, to 78%, is the tempting version and it
  // inflates the target past the visible art — a pointer off the tile answers as the
  // tile. Erring short is the safe direction, so the clip is allowed to be a hair
  // shorter than the diamond the art draws and never taller.
  assert.ok(
    (p[5] - p[1]) / 100 <= FIELD.tileAspect,
    'the clip must not reach past the ground art',
  );
});

test('corners map as documented: (0,0) top, (0,3) left, (3,0) right, (3,3) bottom', () => {
  const last = FIELD.size - 1;
  const plots = allPlots();
  const yOf = (col, row) => plots.find((plot) => plot.col === col && plot.row === row).y;
  const xOf = (col, row) => plots.find((plot) => plot.col === col && plot.row === row).x;

  assert.equal(yOf(0, 0), Math.min(...plots.map((plot) => plot.y)), '(0,0) is the top vertex');
  assert.equal(yOf(last, last), Math.max(...plots.map((plot) => plot.y)), 'is the bottom');
  assert.equal(xOf(last, 0), Math.max(...plots.map((plot) => plot.x)), '(3,0) is the right vertex');
  assert.equal(xOf(0, last), Math.min(...plots.map((plot) => plot.x)), '(0,3) is the left');
});

test('plots that can overlap are painted back to front', () => {
  // `z` is `col + row`, and two plots with the same `col + row` can still sit at
  // different heights — `(1,1)` is higher on screen than `(0,2)` despite both
  // summing to 2. That is only safe because such a pair is more than a tile width
  // apart across the screen and so cannot overlap. This asserts that, and the
  // ordering, together: a `z` tie is allowed only where it cannot be seen.
  const plots = allPlots();

  for (const front of plots) {
    for (const behind of plots) {
      if (front === behind) continue;
      if (Math.abs(front.x - behind.x) >= FIELD.tileScale) continue; // cannot overlap
      if (front.y > behind.y) continue;

      assert.ok(
        front.z <= behind.z,
        `(${front.col},${front.row}) is in front of (${behind.col},${behind.row}) but paints under it`,
      );
    }
  }
});

test('the cross is left free for the pump', () => {
  // No `(col, row)` lands on the origin — that is the whole point of the cross.
  const pump = pumpBox();

  for (const plot of allPlots()) {
    assert.ok(plot.x !== pump.x || plot.y !== pump.y, `plot ${plot.col},${plot.row} is on the cross`);
  }
});

test('plots are separated, and the cross gap is wider than an ordinary one', () => {
  const a = plotToScreen(0, 0);
  const b = plotToScreen(1, 0);

  // Half a tile width apart is exactly touching. Anything more is the gap.
  assert.ok(Math.abs(b.x - a.x) > FIELD.tileScale / 2, 'neighbouring plots do not touch');

  const neighbour = distance(a, b);
  const acrossCross = distance(plotToScreen(1, 1), plotToScreen(FIELD.size / 2, FIELD.size / 2));
  assert.ok(acrossCross > neighbour, 'the dirt cross is wider than the gap between plots');
});

test('the pump is the stage centre, sized by pumpScale', () => {
  const pump = pumpBox();

  assert.equal(pump.x, FIELD.originX);
  assert.equal(pump.y, FIELD.originY);
  assert.equal(pump.size, FIELD.pumpScale);

  // pump.png is 1000x1000 with 279x237 of art, so the visible pump is about a quarter
  // of a plot's width at the shipped `pumpScale: 0.2` (0.2 x 0.279 / 0.2320 = 0.241).
  // It was 0.25 / 0.304 before the eyes-on retune (DEC-049), and the ratio no longer
  // carries the click problem it once did — the `<img>` is `pointer-events: none` and
  // the button is clipped to the art (ISS-007).
  assert.ok(Math.abs((pump.size * 0.279) / FIELD.tileScale - 0.2405) < 0.005);
});

test('the grid is mirror-symmetric: (col,row) and (row,col) straddle the vertical axis', () => {
  // A check that both axes are treated alike. If `- (n-1)/2` or `crossGap` were
  // applied to one and not the other, this is the assertion that would notice.
  for (const plot of allPlots()) {
    const mirrored = plotToScreen(plot.row, plot.col);

    const offA = Math.abs(plot.x - FIELD.originX);
    const offB = Math.abs(mirrored.x - FIELD.originX);
    assert.ok(Math.abs(offA - offB) < 1e-12, `x offsets mirror at (${plot.col},${plot.row})`);
    assert.equal(plot.y, mirrored.y);
    assert.equal(plot.z, mirrored.z);
  }
});

test('the grid is point-symmetric: a 180-degree rotation maps plots onto plots', () => {
  const last = FIELD.size - 1;

  for (const plot of allPlots()) {
    const opposite = plotToScreen(last - plot.col, last - plot.row);

    assert.ok(Math.abs(plot.x + opposite.x - 2 * FIELD.originX) < 1e-9, 'x mirrors about the origin');
    assert.ok(Math.abs(plot.y + opposite.y - 2 * FIELD.originY) < 1e-9, 'y mirrors about the origin');
    assert.equal(plot.z + opposite.z, 2 * last, 'depth mirrors too, so the stack stays consistent');
  }
});
