import { el, clear } from '../utils/dom.js';
import { plotToScreen, pumpBox, frameY } from '../utils/iso.js';
import { FIELD } from '../config/field.js';
import { WATER } from '../config/game.js';
import { harvestsIn, isNextUnlockable } from '../land_squares/index.js';
import { plotName } from './plotLabel.js';
import { plotLayers } from './plotLayers.js';

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

/**
 * The field, mounted.
 *
 * This file owns the **geometry** — where each of the sixteen diamonds goes, how big
 * it is, and in what order they paint over each other. What is painted on one is
 * `plotLayers.js`, what a plot is called is `plotLabel.js`, and what a click means is
 * `plotClick.js`. `AGENTS.md` asks for panels to be split by responsibility before
 * they grow, and this one had.
 *
 * `state` carries the plots, the selection, the clock, and the price of the plot on
 * offer. The only required callback is `onPlotClick`; a caller that just wants to
 * watch clicks passes that alone, which is what `tests/farmView.test.js` does.
 *
 * **This module never imports `state/store.js`.** Every action arrives as a callback
 * from `farmActions.js`, so the whole field mounts in a fake DOM with no store, no
 * network and no browser. That is the reason the layer rules in `AGENTS.md` are worth
 * enforcing.
 *
 * @param {HTMLElement} root
 * @param {object} state `{plots, selection, clock, nextPrice, onPlotClick}`
 * @returns {{unmount: () => void}}
 */
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

  /**
   * Draw the whole field.
   *
   * Rebuilt from scratch every time rather than patched, and there are only sixteen
   * tiles — the cost is not worth a diffing pass that would have to reason about
   * which of five mutually exclusive classes a plot just changed between.
   */
  function render() {
    clear(plotsEl);

    for (const plot of state?.plots ?? []) {
      plotsEl.append(renderPlot(plot));
    }
  }

  function renderPlot(plot) {
    const { col, row } = plot;
    const { x, y, z } = plotToScreen(col, row);

    const isSelected = state?.selection?.plotId === plot.id;
    const isOwned = plot.owned;
    const hasCrop = plot.cropId != null;
    const isWatered = plot.waterLevel >= WATER.wateredThreshold;

    // Three states, not two (DEC-036): `next` is the one plot on offer and takes a
    // click, `locked` is the other fourteen and does not. `isNextUnlockable` is asked
    // of the same helper the buy rule uses, so the plot that looks buyable and the
    // plot that is buyable cannot disagree.
    const isNext = !isOwned && isNextUnlockable(state, plot.id);
    const isLocked = !isOwned && !isNext;

    const grown = isOwned ? harvestsIn(plot, now()) : null;
    const isReady = Boolean(grown?.ready);

    const classes = [
      'plot',
      isOwned ? 'plot--owned' : isNext ? 'plot--next' : 'plot--locked',
      isSelected ? 'plot--selected' : '',
      hasCrop ? 'plot--planted' : '',
      plot.dead ? 'plot--dead' : '',
      isReady ? 'plot--ready' : '',
    ].filter(Boolean).join(' ');

    // A real `<button>`, so keyboard focus and keyboard activation come for free —
    // `css/reset.css` clears the button chrome for exactly this. Ids are 0-based and
    // the player counts plots from 1, hence the `+ 1`; the name has to be here rather
    // than in the children, because every child is decorative. The layers inside are
    // `<span>`s, not `<div>`s, because a button's content model is phrasing content.
    //
    // `disabled` on a locked plot is what makes it genuinely unclickable rather than
    // merely drawn that way — it drops out of the tab order and out of the a11y tree
    // for activation, which is the honest description of "you cannot buy this yet".
    const tile = el('button', {
      type: 'button',
      class: classes,
      dataset: { plotId: String(plot.id) },
      'aria-label': plotName(plot, {
        isOwned,
        isNext,
        isReady,
        grown,
        price: state.nextPrice ?? 0,
      }),
      disabled: isLocked ? 'true' : undefined,
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

    for (const layer of plotLayers(plot, {
      isOwned, isNext, isReady, grown, isWatered, price: state.nextPrice ?? 0,
    })) {
      tile.append(layer);
    }
    tile.addEventListener('click', () => {
      if (state.onPlotClick) state.onPlotClick(plot.id);
    });

    return tile;
  }

  /**
   * The game's clock, including any debug time-skip.
   *
   * The offset lives in state and is added by the caller, so a time-skip moves growth
   * and the water bar together. Reading `Date.now()` directly here — which is what
   * this file used to do — meant the debug buttons changed the weather and not the
   * crops, which is the sort of thing that gets a feature reverted after a demo.
   */
  function now() {
    return Date.now() + (state?.clock?.timeOffsetMs ?? 0);
  }

  render();

  return {
    unmount() {
      clear(root);
    },
  };
}
