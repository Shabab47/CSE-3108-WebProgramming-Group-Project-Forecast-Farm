import { el, clear } from '../utils/dom.js';
import { plotToScreen, pumpBox, frameY } from '../utils/iso.js';
import { FIELD } from '../config/field.js';
import { cropOf } from '../config/crops.js';
import { cropStageImg, groundTile } from '../config/assets.js';
import { WATER } from '../config/game.js';

const PUMP_IMG = 'assets/images/pump.png';
const BASE_IMG = 'assets/images/base.png';

/** A frame-width fraction -> a CSS percentage. `width` and `padding-top` both take one. */
function pct(fraction) {
  return `${fraction * 100}%`;
}

/**
 * A frame-width fraction on the y axis -> a CSS `top`, which is a percentage of height.
 *
 * `iso.js` counts y in frame widths; this is the one conversion. See `frameY()` there —
 * on a square field the two units were the same number and the conversion did nothing,
 * which is why it can be skipped by accident.
 */
function topPct(y) {
  return pct(frameY(y));
}

/**
 * The pump's box, anchored on the dirt cross.
 *
 * `iso.js` gives the centre and the box width; `css/scene.css` supplies
 * `position: absolute` and the `translate(-50%, -50%)` that turns a centre into an
 * anchor. The pump is placed from JS for the same reason the plots are: so the only
 * numbers are `FIELD` constants. ISS-007 — this box is nearly four times wider than
 * the visible pump art, so it must not become a click target at this size.
 */
function pumpStyle() {
  const { x, y, size } = pumpBox();
  return `left:${pct(x)};top:${topPct(y)};width:${pct(size)}`;
}

export function mountFarmView(root, state) {
  clear(root);

  const card = el('div', { class: 'card farm-view' }, [
    el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Your Farm' }),
      el('span', { class: 'farm-view__hint', text: 'Click a plot to plant' }),
    ]),
    el('div', { class: 'field-stage', id: 'field-stage' }, [
      // Every part of the farm lives inside the mount, which is the frame `iso.js`
      // measures against — the base's own shape, fitted into the stage. `css/scene.css`
      // explains why the two boxes are not the same one.
      el('div', { class: 'field-stage__mount' }, [
        el('img', { class: 'field-stage__base', src: BASE_IMG, alt: '', 'aria-hidden': 'true' }),
        el('div', { class: 'field-stage__plots', id: 'field-plots' }),
        el('img', {
          class: 'field-stage__pump',
          src: PUMP_IMG,
          alt: 'Water pump',
          'aria-hidden': 'true',
          style: pumpStyle(),
        }),
      ]),
    ]),
  ]);

  root.append(card);

  const plotsEl = card.querySelector('#field-plots');

  function render(plots, selection) {
    clear(plotsEl);

    for (const plot of plots) {
      const tile = renderPlot(plot, selection);
      plotsEl.append(tile);
    }
  }

  function renderPlot(plot, selection) {
    const { col, row } = plot;
    const { x, y, z } = plotToScreen(col, row);

    const isSelected = selection?.plotId === plot.id;
    const isOwned = plot.owned;
    const hasCrop = plot.cropId != null;
    const isWatered = plot.waterLevel >= WATER.wateredThreshold;

    const classes = [
      'plot',
      isOwned ? 'plot--owned' : 'plot--unowned',
      isSelected ? 'plot--selected' : '',
      hasCrop ? 'plot--planted' : '',
      plot.dead ? 'plot--dead' : '',
    ].filter(Boolean).join(' ');

    // A real `<button>`, so keyboard focus and keyboard activation come for free —
    // `css/reset.css` clears the button chrome for exactly this. Ids are 0-based and
    // the player counts plots from 1, hence the `+ 1`; the name has to be here rather
    // than in the children, because every child is decorative. The layers inside are
    // `<span>`s, not `<div>`s, because a button's content model is phrasing content.
    const tile = el('button', {
      type: 'button',
      class: classes,
      dataset: { plotId: String(plot.id) },
      'aria-label': isOwned ? `Plot ${plot.id + 1}` : `Plot ${plot.id + 1}, unowned`,
      // `left`/`top` are the box centre — `css/scene.css` pulls it back with
      // translate(-50%, -50%). `top` goes through `frameY` on its way out, because
      // `iso.js` counts y in frame *widths* while CSS resolves `top` against the
      // height. `width` and `padding-top` are the same number: the box is square, to
      // match the square ground canvas (ISS-070). `z-index` is `col + row`: plots
      // nearer the camera paint over the ones behind. See `utils/iso.js`.
      style:
        `left:${pct(x)};top:${topPct(y)};` +
        `width:${pct(FIELD.tileScale)};padding-top:${pct(FIELD.tileScale)};` +
        `z-index:${z};`,
    });

    // The one hit target, and the reason the button's box is not. `pointer-events`
    // inherits, so the button above is inert and every layer below is decorative;
    // this is what answers a pointer, and `css/scene.css` clips it to the diamond.
    // Without it the square box overlaps a neighbour's by half a box, and a third of
    // each tile's visible surface answers as the plot in front. ISS-004.
    tile.append(el('span', { class: 'plot__hit' }));

    const groundSrc = groundTile(isWatered);
    tile.append(
      el('img', {
        class: 'plot__ground',
        src: groundSrc,
        alt: '',
        // Square PNG, transparent corners: never let it become a drag ghost.
        draggable: 'false',
        'aria-hidden': 'true',
      }),
    );

    if (hasCrop && !plot.dead) {
      const crop = cropOf(plot.cropId);
      if (crop) {
        const stage = growthStage(plot);
        tile.append(
          el('img', {
            class: 'plot__crop',
            draggable: 'false',
            src: cropStageImg(plot.cropId, stage),
            alt: `${crop.name} — stage ${stage}`,
            'aria-hidden': 'true',
          }),
        );
      }
    }

    if (plot.dead) {
      tile.append(
        el('span', { class: 'plot__dead', text: '🥀', 'aria-label': 'Dead crop' }),
      );
    }

    if (isOwned && hasCrop && !plot.dead) {
      const waterPct = Math.round(plot.waterLevel);
      tile.append(
        el('span', { class: 'plot__water', title: `Water: ${waterPct}%` }, [
          el('span', { class: 'plot__water-fill', style: `height:${waterPct}%` }),
        ]),
      );
    }

    if (!isOwned) {
      // The padlock alone, and centred. The "Buy" label that used to sit under it is
      // gone: it landed in the half of the diamond that the plot in front paints over,
      // so it read "BU.." or "..UY" depending on the row. The padlock says the same
      // thing and survives every row.
      tile.append(
        el('span', { class: 'plot__lock' }, [
          el('span', { class: 'plot__lock-icon', text: '🔒', 'aria-hidden': 'true' }),
        ]),
      );
    }

    tile.addEventListener('click', () => {
      if (state.onPlotClick) state.onPlotClick(plot.id);
    });

    return tile;
  }

  function growthStage(plot) {
    if (!plot.plantedAt || !plot.cropId) return 1;
    const crop = cropOf(plot.cropId);
    if (!crop) return 1;

    const elapsed = (Date.now() - plot.plantedAt) / (1000 * 60 * 60);
    const progress = Math.min(elapsed / crop.growHours, 1);
    return Math.max(1, Math.ceil(progress * 5));
  }

  render(state?.plots, state?.selection);

  return {
    unmount() {
      clear(root);
    },
  };
}
