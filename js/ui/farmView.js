import { el, clear } from '../utils/dom.js';
import { plotToScreen, pumpBox, frameY } from '../utils/iso.js';
import { FIELD } from '../config/field.js';
import { WATER } from '../config/game.js';
import { waterState } from '../domain/plotWater.js';
import { harvestsIn, isNextUnlockable } from '../land_squares/index.js';
import { plotName } from './plotLabel.js';
import { patchWaterMeter, plotLayers } from './plotLayers.js';

const PUMP_IMG = 'assets/images/pump.png';
const BASE_IMG = 'assets/images/base.png';

/**
 * What each root has already been painted with, so a repaint can be skipped or made
 * partial instead of rebuilding ~34 `<img>` elements. See ISS-088.
 *
 * Weak on the count that matters: keyed by the root element, so a torn-down panel takes
 * its entry with it and there is nothing to leak.
 */
const mounted = new WeakMap();

/** A frame-width fraction -> a CSS percentage. `width` and `padding-top` both take one. */
function pct(fraction) {
  return `${fraction * 100}%`;
}

/**
 * The game's clock, including any debug time-skip. Module scope because the signature has
 * to agree with the renderer about what "now" is, and two copies of that question drift.
 */
function nowOf(state) {
  return Date.now() + (state?.clock?.timeOffsetMs ?? 0);
}

/**
 * Everything one tile draws, reduced to a comparable string.
 *
 * **The point is the resolution, not the completeness.** A tile shows a growth *stage*, a
 * growth bar and a water bar each rounded to a whole percent, and a countdown rounded to
 * whole minutes (`formatLeft`). That is what this hashes, so two states differing only
 * below those thresholds compare equal — otherwise the guard repaints for changes nobody
 * can see. Anything that alters the markup or a class is in here; `left`, `top`, `width`
 * and `z-index` are not, because they come from `col`/`row` and `FIELD` and never change.
 * `onPlotClick` is excluded because swapping the callback changes no pixel.
 *
 * Pure and exported so the rule is testable without a DOM — the only way to prove the
 * half that matters, that it *stays equal* when nothing visible moved.
 *
 * @param {object} plot
 * @param {object} state
 * @returns {string}
 */
export function plotSignature(plot, state) {
  const isOwned = Boolean(plot.owned);
  const isSelected = state?.selection?.plotId === plot.id;
  const isNext = !isOwned && isNextUnlockable(state, plot.id);

  const grown = isOwned ? harvestsIn(plot, nowOf(state)) : null;

  return [
    isOwned,
    isNext,
    isSelected,
    Boolean(plot.dead),
    plot.cropId ?? '',
    grown?.stage ?? '',
    Boolean(grown?.ready),
    Math.round(Math.min(Math.max(grown?.progress ?? 0, 0), 1) * 100),
    Math.ceil(Math.max(0, grown?.msLeft ?? 0) / 60000),
    Math.round(plot.waterLevel ?? 0),
    // The threshold is tracked separately from the rounded number: 39 and 40 are one
    // apart, and crossing it swaps the ground sprite.
    (plot.waterLevel ?? 0) >= WATER.wateredThreshold,
    // **The band and the damage, or the tile diff misses both.** The meter's colour and
    // its target tick come from the band, and the sprite and the word come from the
    // latched damage - and ISS-088's whole saving is that this string is compared before
    // any DOM is touched. A field that moves without moving this string is a field that
    // does not repaint, which is the bug that cost 16 MB of PNG decoding a second.
    waterState(plot),
    plot.damage ?? '',
    state?.nextPrice ?? 0,
  ].join('|');
}

/**
 * The whole field as one string, in plot order, compared against the last painted one
 * before any DOM is touched. An idle farm holds this equal for a minute or more at a
 * time, which is the entire saving — ISS-088.
 *
 * @param {object} state
 * @returns {string}
 */
/**
 * The *water* half of `plotSignature`, on its own.
 *
 * The tick raises a plot's water every second, so `plotSignature` changes every second
 * and the tile is rebuilt — which re-decodes a 313–712 KB PNG per tile per second and,
 * separately, means the meter's `transition: height` never runs because the node holding
 * the fill is thrown away and a new one starts at the new value with nothing to move
 * from. The bar jumped rather than swept.
 *
 * So the two questions are separated. `plotSignatureWithoutWater` is everything *except*
 * water: growth stage, the crop, selection, damage. That changes rarely. When it has not
 * changed and only water moved, `repaint` patches the existing meter in place — no PNG
 * decoded, and the transition animates.
 *
 * This is the same trade `plotSignature` already makes one level up, where water is
 * rounded to a whole number: a fill at 39.6% and at 39.9% are the same picture.
 */
export function plotSignatureWithoutWater(plot, state) {
  const isOwned = Boolean(plot.owned);
  const grown = isOwned ? harvestsIn(plot, nowOf(state)) : null;

  return [
    isOwned,
    !isOwned && isNextUnlockable(state, plot.id),
    state?.selection?.plotId === plot.id,
    Boolean(plot.dead),
    plot.cropId ?? '',
    grown?.stage ?? '',
    Boolean(grown?.ready),
    Math.round(Math.min(Math.max(grown?.progress ?? 0, 0), 1) * 100),
    Math.ceil(Math.max(0, grown?.msLeft ?? 0) / 60000),
    plot.damage ?? '',
    state?.nextPrice ?? 0,
  ].join('|');
}

export function fieldSignature(state) {
  return (state?.plots ?? [])
    .map((plot) => plotSignature(plot, state))
    .join('§');
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
  // **Verify, do not assume.** The cache is only valid while our own card is still the
  // thing standing in this root. `tests/farmLoop.test.js` mounts the crop picker into the
  // same element, which clears the field; reusing a detached card there left the root
  // holding a picker and sixteen invisible tiles, and nothing threw. That failure is the
  // whole reason this check exists, and it is cheap.
  const cached = mounted.get(root);
  const live = cached && cached.card.parentNode === root ? cached : null;
  if (!live) mounted.delete(root);

  // Nothing the field draws has moved. This is the branch the 1 Hz tick takes almost
  // every time, and it is why the tick can run for six hours unheeded — ISS-088.
  if (live && live.signature === fieldSignature(state)) return live.controller;

  // Something changed: keep the card, the stage and the two static images, and repaint
  // the plots. `base.png` and `pump.png` never change and are 62 KB and 73 KB of art,
  // and a fresh `<img>` re-decodes even when the bitmap is already in memory.
  if (live) {
    // `repaint` rebinds `state` rather than reading it off the controller, because
    // `renderPlot` closes over this binding. Storing it on the controller instead is a
    // silent failure: the diff compares the *old* state against itself, finds sixteen
    // matches and repaints nothing.
    live.controller.repaint(state);
    live.signature = fieldSignature(state);
    return live.controller;
  }

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

  /** This mount's own tiles. Per-mount, so two fields cannot share a node map. */
  const tiles = new Map();

  /**
   * Repaint only the tiles whose own signature moved.
   *
   * This replaces a wholesale rebuild, and the old reasoning for it — "there are only
   * sixteen tiles, a diffing pass would have to reason about which of five exclusive
   * classes changed" — counted the buttons and forgot the images. Each tile carries a
   * ground and a crop sprite of 313–712 KB, so rebuilding all sixteen meant ~16.4 MB of
   * PNG decoded per second. That was ISS-088, and it is also why a click to buy land
   * appeared to do nothing: the click queued behind the decode and every tile was
   * replaced, so there was nothing local to see.
   *
   * One string per tile avoids all of that and leaves the renderer itself unchanged. A
   * moved tile is swapped with `replaceWith`, so the paint order — which is append order
   * — survives without re-sorting.
   */
  function repaint(nextState) {
    state = nextState;

    for (const plot of state?.plots ?? []) {
      const signature = plotSignature(plot, state);
      const entry = tiles.get(plot.id);
      if (entry?.signature === signature) continue;

      // **The water-only case: patch the meter rather than rebuild the tile.** Only water
      // moved, so nothing else in the tile can have changed — and rebuilding would re-decode
      // the ground and crop sprites to change one bar's height. Returns false when there is
      // no meter on this tile (unowned, or a dead plot), which falls through to a rebuild.
      const structure = plotSignatureWithoutWater(plot, state);
      if (entry && entry.structure === structure && patchWaterMeter(entry.node, plot)) {
        entry.signature = signature;
        continue;
      }

      const node = renderPlot(plot);
      entry?.node?.replaceWith(node);
      tiles.set(plot.id, { node, signature, structure });
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

    const grown = isOwned ? harvestsIn(plot, nowOf(state)) : null;
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

  const controller = {
    state,
    repaint,

    unmount() {
      mounted.delete(root);
      clear(root);
    },
  };

  // First mount: every tile is new, so seed the map by rendering them all.
  for (const plot of state?.plots ?? []) {
    const node = renderPlot(plot);
    plotsEl.append(node);
    tiles.set(plot.id, { node, signature: plotSignature(plot, state) });
  }

  mounted.set(root, { signature: fieldSignature(state), controller, card });

  return controller;
}
