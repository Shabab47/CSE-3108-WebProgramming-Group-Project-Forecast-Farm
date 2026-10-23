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
 * band, what the pump would cost to fix it, and a button that does it. Every other action
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
 *  1. **The gauge could not animate.** `.inspector__fill` has a `transition: height`, and a
 *     transition only runs when the *same element* changes value. A node destroyed and
 *     recreated sixty times a minute has no previous height to move from, so the meter
 *     jumped once a second and looked broken rather than busy.
 *  2. The close button, the pump button and every text node were rebuilt at the same rate,
 *     so focus and scroll on them died continuously.
 *
 * So this builds the card once and hands back an `update(state)` that mutates only what
 * moved — the fill's height, the band's position, `data-state`, and the four readouts.
 * Anything structural (the plot dying, being harvested, changing hands) still falls back
 * to a full rebuild, because those genuinely change the shape of the card.
 */

import { el, clear, setText } from '../utils/dom.js';
import { cropOf } from '../config/crops.js';
import { WATER } from '../config/game.js';
import { plotAction } from './plotClick.js';
import { bandFor, flowFor, minutesToOptimal, waterState } from '../domain/plotWater.js';
import { damageWord } from '../domain/damage.js';
import { currentEvent } from '../domain/water.js';
import { pumpCapacity, pumpLevelOf, pumpTargetIds } from '../domain/pump.js';
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
  root.append(el('div', { class: 'inspector__scrim' }, [view.card]));

  view.update(state);

  return {
    /** Mutate in place, so the gauge's height transition actually runs. */
    update(next) {
      const plot = next?.plots?.find((p) => p.id === plotId);
      // The plot went away entirely, or its *shape* changed — dead, harvested, or no
      // longer ours. Those change which elements exist, so they need a real rebuild
      // rather than a patch.
      if (!plot || view.shape(next) !== view.lastShape) {
        clear(root);
        const rebuilt = buildCard(plotId, actions);
        root.append(el('div', { class: 'inspector__scrim' }, [rebuilt.card]));
        rebuilt.update(next);
        return rebuilt;
      }
      view.update(next);
      return view;
    },
    unmount() {
      clear(root);
    },
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
  const gauge = el('div', { class: 'inspector__gauge', 'data-state': 'dry' }, [
    el('div', { class: 'inspector__band' }),
    el('div', { class: 'inspector__fill', style: 'height:0%' }),
  ]);
  const gaugeFill = gauge.children[1];
  const gaugeBand = gauge.children[0];

  const stateLine = el('p', { class: 'inspector__state', 'data-state': 'dry' });
  const levelLine = el('p', { class: 'inspector__level' });
  const etaLine = el('p', { class: 'inspector__eta' });
  const flowLine = el('p', { class: 'inspector__flow' });
  const pumpLine = el('p', { class: 'inspector__pump-status' });

  // The button reads its own `data-mode` rather than capturing a value, because the same
  // node survives every tick now and a captured target list would be stale by the time
  // the player pressed it — the pump state moves underneath an open panel.
  const pumpButton = el('button', {
    type: 'button',
    class: 'inspector__pump',
    'data-on': 'false',
    'data-mode': 'add',
    text: 'Water this plot',
    on: { click: () => actions.onPump?.(plotId, pumpButton.dataset.mode) },
  });

  const actionButton = el('button', {
    type: 'button',
    class: 'inspector__action',
    text: '',
    on: { click: () => actions.onAction?.(plotId) },
  });

  const cropLine = el('p', { class: 'inspector__crop' });
  const title = el('h2', { class: 'inspector__title', text: `Plot ${plotId + 1}` });

  const card = el('div', { class: 'inspector', role: 'dialog', 'aria-label': `Plot ${plotId + 1}` }, [
    el('div', { class: 'inspector__head' }, [
      title,
      el('button', {
        type: 'button',
        class: 'inspector__close',
        'aria-label': 'Close',
        text: '×',
        on: { click: () => actions.onClose?.() },
      }),
    ]),
    cropLine,
    el('div', { class: 'inspector__water' }, [
      gauge,
      el('div', { class: 'inspector__readout' }, [
        stateLine,
        levelLine,
        etaLine,
        flowLine,
        pumpLine,
      ]),
    ]),
    el('div', { class: 'inspector__actions' }, [pumpButton, actionButton]),
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
      const { floor, target } = bandFor(plot);
      const wState = plot.dead ? 'dry' : waterState(plot);
      const crop = cropOf(plot.cropId);
      const damage = damageWord(plot);
      const eta = plot.dead ? null : minutesToOptimal(plot, event);
      const flow = plot.dead ? null : flowFor(plot, event);
      const pct = (v) => `${((v / WATER.max) * 100).toFixed(1)}%`;
      const fill = Math.max(0, Math.min(100, (level / WATER.max) * 100));

      // **The two writes that make the meter move.** Assigning to `style.height` on the
      // element that is already on screen is what lets the CSS transition interpolate;
      // rebuilding the node would not.
      gaugeFill.style.height = `${fill.toFixed(1)}%`;
      gaugeBand.style.bottom = pct(floor);
      gaugeBand.style.height = pct(target - floor);
      const targets = pumpTargetIds(state);
      const isTargeted = targets.includes(plotId);
      const pumpOn = Boolean(state.pump?.on);
      const capacity = pumpCapacity(state);
      const pumpLevel = pumpLevelOf(state);

      gauge.dataset.state = wState;
      // So "it is filling" is legible without watching the number. Cosmetic only.
      gauge.dataset.pumping = pumpOn && isTargeted ? 'true' : 'false';

      setText(cropLine, plot.cropId
        ? `${crop?.name ?? plot.cropId}${plot.dead ? ' (dead)' : ''}`
        : 'Empty — nothing planted yet');

      if (plot.owned && !plot.dead) {
        setText(stateLine, damage ? `${STATE_WORDS[wState]} · ${damage}` : STATE_WORDS[wState]);
        stateLine.dataset.state = wState;
        setText(levelLine, `${Math.round(level)} of ${WATER.max} water · target ${target}`);
        setText(etaLine, eta
          ? (eta.minutes > 0
            ? `Pump: ${eta.minutes} min and ${formatGold(eta.gold)} gold to reach optimal`
            : 'Already at optimal — nothing to do')
          : 'Already at optimal — nothing to do');
        flow.hidden = !(flow && (flow.in > 0 || flow.out > 0));
        if (!flow.hidden) {
          setText(flowLine,
            `rain +${flow.in}/h · drying −${flow.out}/h · net ${flow.net > 0 ? '+' : '−'}${Math.abs(flow.net)}/h`);
        }

        setText(pumpLine,
          `Pump Lv ${pumpLevel} · watering ${targets.length} of ${capacity} `
          + `${capacity === 1 ? 'plot' : 'plots'}`);
        pumpLine.hidden = false;

        pumpButton.hidden = false;
        pumpButton.disabled = false;
        pumpButton.dataset.on = pumpOn && isTargeted ? 'true' : 'false';

        if (isTargeted && pumpOn) {
          pumpButton.dataset.mode = 'remove';
          setText(pumpButton, 'Stop watering this plot');
        } else if (isTargeted) {
          // The target list survives an auto-off, so the useful action is to carry on with
          // the same plots. Removing a target while the machine is off is done by
          // resuming and then stopping that plot, which is one extra tap in a rarer case.
          pumpButton.dataset.mode = 'resume';
          setText(pumpButton, 'Resume the pump');
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
      } else {
        setText(stateLine, plot.owned ? 'Dead' : 'Not yours yet');
        stateLine.dataset.state = 'dry';
        setText(levelLine, plot.owned ? 'Clear the plot to use it again' : 'Buy this plot to farm it');
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