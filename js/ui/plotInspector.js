/**
 * The plot inspector: what one square of ground is doing, and what you can do about it.
 *
 * ## Why clicking a plot opens this rather than acting
 *
 * Clicking bare land opened the seed picker, and clicking a growing crop did nothing at
 * all. So the one thing a player most wants to know — *how wet is this square, and can I
 * water it* — was on the right rail or nowhere, and the rail only ever described the plot
 * the pump happened to be aimed at.
 *
 * The inspector makes the plot the unit. Click a plot, get **that** plot's water, its
 * target, what the pump would cost to fix it, and a button that does it. Every other action
 * for the plot is in here too, so nothing that used to be one click away is now two.
 *
 * ## Why the pump button is here and not the click itself
 *
 * A running pump used to claim the click outright, which meant that with the pump on you
 * could not open anything. It is a button now, aimed at whichever plot the inspector is
 * showing. That is one extra click for the common case and it buys back the entire surface.
 *
 * ## The DOM is the state
 *
 * `farmActions.js` keeps no `isOpen` flag and no reference: the host has children while
 * something is up and none when it is not. A second source of truth there is what let the
 * field and the picker disagree in the first place.
 *
 * ## Why this builds once and then updates, rather than re-rendering
 *
 * The panel follows the pump on a 1 Hz tick, and it used to answer that by tearing the
 * whole card down and building it again (`clear(root)` then re-`el()`). That is the
 * obvious way to write it and it costs two things:
 *
 *  1. **The gauge could not animate.** `.inspector__fill` has a `transition: width`, and a
 *     transition only runs when the *same element* changes value. A node destroyed and
 *     recreated sixty times a minute has no previous width to move from, so the meter
 *     jumped once a second and looked broken rather than busy.
 *  2. The close button, the pump button and every text node were rebuilt at the same rate,
 *     so focus and scroll on them died continuously.
 *
 * So this builds the card once and hands back an `update(state)` that mutates only what
 * moved — the fill's width, the target marker's position, `data-state`, and the four
 * readouts. Anything structural (the plot dying, being harvested, changing hands) still
 * falls back to a full rebuild, because those genuinely change the shape of the card.
 */

import { el, clear, setText } from '../utils/dom.js';
import { cropOf } from '../config/crops.js';
import { WATER } from '../config/game.js';
import { DIALOG_CLOSE_IMG, DIALOG_PEG_IMG, cropSeedImg } from '../config/assets.js';
import { dismissOnBackdrop } from './backdropDismiss.js';
import { plotAction } from './plotClick.js';
import { bandFor, flowFor, minutesToOptimal, waterState } from '../domain/plotWater.js';
import { damageWord } from '../domain/damage.js';
import { currentEvent } from '../domain/water.js';
import { pumpCapacity, pumpLevelOf, pumpTargetIds } from '../domain/pump.js';
import { releasableTarget } from '../domain/pumpSwap.js';
import { formatGold } from '../utils/formatGold.js';

const STATE_WORDS = {
  dry: 'Dry',
  low: 'Low',
  optimal: 'Optimal',
  saturated: 'Saturated',
};

const ACTION_WORDS = {
  harvest: 'Harvest',
  plant: 'Plant a seed',
  clear: 'Clear the plot',
  buy: 'Buy this plot',
};

/**
 * @param {object} root the picker host, a sibling of the field
 * @param {object} state
 * @param {number} plotId
 * @param {object} actions callbacks, so this file decides nothing and just renders
 * @returns {{unmount: () => void}}
 */
export function mountPlotInspector(root, state, plotId, actions = {}) {
  clear(root);

  if (!state?.plots?.some((p) => p.id === plotId)) {
    return { unmount() {}, update() {} };
  }

  const view = buildCard(plotId, actions);
  // `#farm-picker` is already the viewport overlay: it dims the field, centres its
  // child and hides itself when empty. The old extra `.inspector__scrim` inside it
  // dimmed the field a second time; the dialog is the only child now.
  root.append(view.card);

  // The × and the backdrop are the same exit, so they share one callback. `stop` is
  // called by `unmount`; a panel that is cleared without it would leave the document
  // Escape listener behind, and the next Escape would run a closed panel's `onClose`.
  const stopDismiss = dismissOnBackdrop(root, () => actions.onClose?.());

  function unmount() {
    stopDismiss();
    clear(root);
  }

  view.update(state);

  return {
    /** Mutate in place, so the gauge's width transition actually runs. */
    update(next) {
      const plot = next?.plots?.find((p) => p.id === plotId);
      // The plot went away entirely, or its *shape* changed — dead, harvested, or no
      // longer ours. Those change which elements exist, so they need a real rebuild
      // rather than a patch.
      if (!plot || view.shape(next) !== view.lastShape) {
        clear(root);
        const rebuilt = buildCard(plotId, actions);
        root.append(rebuilt.card);
        rebuilt.update(next);
        // The rebuilt card brings fresh element handles but the *mount's* teardown:
        // there is still one listener on the host, and this is what removes it.
        return { ...rebuilt, unmount };
      }
      view.update(next);
      return view;
    },
    unmount,
  };
}

/**
 * The parts of the plot that decide the card's *shape* — as opposed to its numbers.
 *
 * `update` compares this between ticks: if it is unchanged, every element the card needs
 * already exists and can be patched. It deliberately excludes water, health and gold,
 * which is the whole point — those change every tick and must *not* force a rebuild.
 */
function shapeOf(state, plotId) {
  const plot = state?.plots?.find((p) => p.id === plotId);
  if (!plot) return 'missing';
  return [
    plot.owned ? 'owned' : 'not-owned',
    plot.dead ? 'dead' : 'alive',
    plot.cropId ?? 'bare',
  ].join('|');
}

/**
 * Build the card once, capturing handles on the pieces `update` will mutate.
 *
 * Split out from `mountPlotInspector` so the rebuild path and the first paint are the
 * same code — two builders would drift, and this is the shape of bug the codebase has
 * already been bitten by (`docs/architecture.md`, the inspector/picker disagreement).
 */
function buildCard(plotId, actions) {
  // The target marker sits outside the gauge's `overflow: hidden` so its 24px notch
  // can overhang the 18px track, exactly as the Figma frame draws it. The fill stays
  // inside the gauge and is clipped to the rounded track.
  const gauge = el('div', { class: 'inspector__gauge', 'data-state': 'dry' }, [
    el('div', { class: 'inspector__fill', style: 'width:0%' }),
  ]);
  const gaugeFill = gauge.children[0];
  const gaugeBand = el('div', { class: 'inspector__band' });
  const gaugeWrap = el('div', { class: 'inspector__gauge-wrap' }, [gauge, gaugeBand]);

  const stateLine = el('p', { class: 'inspector__state', 'data-state': 'dry' });
  const levelLine = el('p', { class: 'inspector__level' });
  const etaLine = el('p', { class: 'inspector__eta' });
  const flowLine = el('p', { class: 'inspector__flow' });
  // Kept off the field itself; this is the inspector's one line on the pump's
  // overall state — how big it is and how full — so "watering 1 of 2 plots" is
  // legible without opening anything. DEC-058.
  const pumpLine = el('p', { class: 'inspector__pump-status' });

  // The button reads its own `data-on` rather than capturing a value, because the same
  // node survives every tick now and a captured `isAimed` would be stale by the time the
  // player pressed it — the pump state moves underneath an open panel.
  const pumpButton = el('button', {
    type: 'button',
    class: 'inspector__pump farm-dialog__button farm-dialog__button--primary',
    'data-on': 'false',
    'data-mode': 'add',
    text: 'Water this plot',
    on: { click: () => actions.onPump?.(plotId, pumpButton.dataset.mode) },
  });

  const actionButton = el('button', {
    type: 'button',
    class: 'inspector__action farm-dialog__button farm-dialog__button--secondary',
    text: '',
    on: { click: () => actions.onAction?.(plotId) },
  });

  // The crop line: the packet on the left, the name and state on the right. The
  // packet is the art the shop, the bag and the seed picker already use, so "this is
  // rice" is one glance rather than a word to read — DEC-060. It is decorative: the
  // name is right beside it.
  const cropArt = el('img', {
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
  });
  const cropArtBox = el('span', { class: 'inspector__crop-art', 'aria-hidden': 'true' }, [cropArt]);
  const cropText = el('span', { class: 'inspector__crop-text' });
  const cropLine = el('p', { class: 'inspector__crop' }, [cropArtBox, cropText]);
  const title = el('h2', {
    class: 'inspector__title farm-dialog__title',
    text: `Plot ${plotId + 1}`,
  });

  const peg = (side) => el('img', {
    class: `farm-dialog__peg farm-dialog__peg--${side}`,
    src: DIALOG_PEG_IMG,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
  });

  const closeButton = el('button', {
    type: 'button',
    class: 'inspector__close farm-dialog__close',
    'aria-label': 'Close',
    on: { click: () => actions.onClose?.() },
  }, [
    el('img', {
      src: DIALOG_CLOSE_IMG,
      alt: '',
      'aria-hidden': 'true',
      draggable: 'false',
      width: '44',
      height: '44',
    }),
  ]);

  const waterCard = el('div', { class: 'inspector__water' }, [
    el('div', { class: 'inspector__water-head' }, [levelLine, stateLine]),
    gaugeWrap,
    etaLine,
  ]);

  const card = el('div', {
    class: 'inspector farm-dialog',
    role: 'dialog',
    'aria-label': `Plot ${plotId + 1}`,
  }, [
    peg('left'),
    peg('right'),
    el('div', { class: 'farm-dialog__panel' }, [
      el('div', { class: 'farm-dialog__head' }, [title, closeButton]),
      el('div', { class: 'farm-dialog__rule' }),
      el('div', { class: 'inspector__body farm-dialog__body' }, [
        cropLine,
        waterCard,
        flowLine,
        pumpLine,
      ]),
      el('div', { class: 'inspector__actions farm-dialog__actions' }, [
        pumpButton,
        actionButton,
      ]),
    ]),
  ]);

  const lastShape = { value: null };

  return {
    card,
    shape: (state) => shapeOf(state, plotId),
    get lastShape() {
      return lastShape.value;
    },
    update(state) {
      const plot = state?.plots?.find((p) => p.id === plotId);
      if (!plot) return;
      lastShape.value = shapeOf(state, plotId);

      const event = currentEvent(state, Date.now());
      const level = plot.waterLevel ?? 0;
      const { target } = bandFor(plot);
      const wState = plot.dead ? 'dry' : waterState(plot);
      const crop = cropOf(plot.cropId);
      const damage = damageWord(plot);
      const eta = plot.dead ? null : minutesToOptimal(plot, event);
      const flow = plot.dead ? null : flowFor(plot, event);
      const pct = (v) => `${((v / WATER.max) * 100).toFixed(1)}%`;
      const fill = Math.max(0, Math.min(100, (level / WATER.max) * 100));
      const ownedAndAlive = Boolean(plot.owned) && !plot.dead;
      // Support both old {target} and new {targets: []} pump formats
      const pumpTargets = state.pump?.targets ?? (state.pump?.target != null ? [state.pump.target] : []);
      const aimed = ownedAndAlive && Boolean(state.pump?.on) && pumpTargets.includes(plotId);

      // **The two writes that make the meter move.** Assigning to `style.width` on the
      // element that is already on screen is what lets the CSS transition interpolate;
      // rebuilding the node would not. The marker is a single target line now, not the
      // old optimal band — the pill carries the judgement, the line carries the goal.
      gaugeFill.style.width = `${fill.toFixed(1)}%`;
      gaugeBand.style.left = pct(target);
      gaugeBand.hidden = !ownedAndAlive;
      gauge.dataset.state = wState;
      // So "it is filling" is legible without watching the number. Cosmetic only.
      gauge.dataset.pumping = aimed ? 'true' : 'false';

      if (plot.cropId) {
        const cropName = crop?.name ?? plot.cropId;
        // The pill is short on purpose; damage belongs in the status sentence, or a
        // dry-damaged crop would read "Dry · Dry" in the same line (ISS-119).
        const suffix = plot.dead ? ' — dead' : (damage ? ` — ${damage.toLowerCase()}` : '');
        setText(cropText, `${cropName}${suffix}`);
      } else {
        setText(cropText, plot.owned ? 'Empty — nothing planted yet' : 'Not yours yet');
      }

      // One `src` write per crop rather than one per tick: reassigning the same URL
      // every second restarts the image load and flickers. `shapeOf` already rebuilds
      // the card when the crop changes, so the guard only covers a repaint in between.
      const packet = plot.cropId ? cropSeedImg(plot.cropId) : null;
      cropArtBox.hidden = !packet;
      if (packet && cropArt.getAttribute('src') !== packet) cropArt.setAttribute('src', packet);

      if (ownedAndAlive) {
        setText(stateLine, STATE_WORDS[wState]);
        stateLine.dataset.state = wState;
        stateLine.hidden = false;
        setText(levelLine, `${Math.round(level)} of ${WATER.max} water · target ${target}`);
        setText(etaLine, eta
          ? (eta.minutes > 0
            ? `Pump: ${eta.minutes} min and ${formatGold(eta.gold)} gold to reach optimal`
            : 'Already at optimal — nothing to do')
          : 'Already at optimal — nothing to do');
        flowLine.hidden = !(flow && (flow.in > 0 || flow.out > 0));
        if (!flowLine.hidden) {
          setText(flowLine,
            `rain +${flow.in}/h · drying −${flow.out}/h · net ${flow.net > 0 ? '+' : '−'}${Math.abs(flow.net)}/h`);
        }

        pumpButton.hidden = false;
        const targets = pumpTargets;
        const isTargeted = targets.includes(plotId);
        const pumpOn = Boolean(state.pump?.on);
        const capacity = pumpCapacity(state);
        const pumpLevel = pumpLevelOf(state);

        setText(pumpLine,
          `Pump Lv ${pumpLevel} · watering ${targets.length} of ${capacity} `
          + `${capacity === 1 ? 'plot' : 'plots'}`);
        pumpLine.hidden = false;

        // The button reads its own data-mode, so the join (main.js ->
        // farmActions.onPump) never has to guess intent. The four states DEC-058
        // introduced: remove (stop this plot), resume (carry on after an auto-off),
        // swap (make room by releasing a finished plot), and full (refuse before the
        // press). `add` is the fifth, the idle case.
        pumpButton.dataset.on = aimed ? 'true' : 'false';
        pumpButton.disabled = false;
        if (isTargeted && pumpOn) {
          pumpButton.dataset.mode = 'remove';
          setText(pumpButton, 'Stop watering this plot');
          pumpButton.title = '';
        } else if (isTargeted) {
          // The target list survives an auto-off, so the useful action is to carry on with
          // the same plots. Removing a target while the machine is off is done by
          // resuming and then stopping that plot, which is one extra tap in a rarer case.
          pumpButton.dataset.mode = 'resume';
          setText(pumpButton, 'Resume the pump');
          pumpButton.title = '';
        } else if (targets.length >= capacity && releasableTarget(state) !== null) {
          // Every outlet is taken, but one of them is on a plot that has reached its
          // optimal level. The pump lets that one go, so this is an action, not a refusal.
          pumpButton.dataset.mode = 'swap';
          pumpButton.title = `Plot ${releasableTarget(state) + 1} is at optimal and will be released.`;
          setText(pumpButton, 'Water this plot instead');
        } else if (targets.length >= capacity) {
          pumpButton.dataset.mode = 'full';
          pumpButton.disabled = true;
          setText(pumpButton, `Pump full (${capacity} ${capacity === 1 ? 'plot' : 'plots'})`);
          pumpButton.title = 'Stop watering another plot before adding this one.';
        } else {
          pumpButton.dataset.mode = 'add';
          pumpButton.title = '';
          setText(pumpButton, pumpOn ? 'Water this plot too' : 'Water this plot');
        }
      } else if (plot.owned) {
        setText(stateLine, 'Dead');
        stateLine.dataset.state = 'dead';
        stateLine.hidden = false;
        setText(levelLine, 'Clear the plot to use it again');
        setText(etaLine, 'Nothing to water');
        flowLine.hidden = true;
        pumpLine.hidden = true;
        pumpButton.hidden = true;
      } else {
        setText(stateLine, '');
        stateLine.dataset.state = 'dry';
        stateLine.hidden = true;
        setText(levelLine, 'Buy this plot to farm it');
        setText(etaLine, 'Nothing to water');
        flowLine.hidden = true;
        pumpLine.hidden = true;
        pumpButton.hidden = true;
      }

      const word = ACTION_WORDS[plotAction(state, plotId)];
      actionButton.hidden = !word;
      if (word) setText(actionButton, word);
    },
  };
}