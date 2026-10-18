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
 */

import { el, clear } from '../utils/dom.js';
import { cropOf } from '../config/crops.js';
import { WATER } from '../config/game.js';
import { plotAction } from './plotClick.js';
import { bandFor, flowFor, minutesToOptimal, waterState } from '../domain/plotWater.js';
import { damageWord } from '../domain/damage.js';
import { currentEvent } from '../domain/water.js';

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

  const plot = state?.plots?.find((p) => p.id === plotId);
  if (!plot) return { unmount() {} };

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

  // The gauge, drawn large enough to read. Same four states and same band as the sliver
  // on the tile — the tile answers "which squares need me", this answers "how bad is it".
  const gauge = el('div', { class: 'inspector__gauge', 'data-state': wState }, [
    el('div', { class: 'inspector__band', style: `bottom:${pct(floor)};height:${pct(target - floor)}` }),
    el('div', { class: 'inspector__fill', style: `height:${fill.toFixed(1)}%` }),
  ]);

  const pumpOn = Boolean(state.pump?.on);
  const aimed = state.pump?.target ?? null;
  const isAimed = pumpOn && aimed === plotId;

  const pumpButton = plot.owned && !plot.dead
    ? el('button', {
      type: 'button',
      class: 'inspector__pump',
      'data-on': isAimed ? 'true' : 'false',
      text: isAimed ? 'Stop watering this' : (pumpOn ? 'Water this plot instead' : 'Water this plot'),
      on: { click: () => actions.onPump?.(plotId, !isAimed) },
    })
    : null;

  const actionWord = ACTION_WORDS[plotAction(state, plotId)];

  const card = el('div', { class: 'inspector', role: 'dialog', 'aria-label': `Plot ${plotId + 1}` }, [
    el('div', { class: 'inspector__head' }, [
      el('h2', { class: 'inspector__title', text: `Plot ${plotId + 1}` }),
      el('button', {
        type: 'button',
        class: 'inspector__close',
        'aria-label': 'Close',
        text: '×',
        on: { click: () => actions.onClose?.() },
      }),
    ]),

    plot.owned
      ? el('p', {
        class: 'inspector__crop',
        text: plot.cropId
          ? `${crop?.name ?? plot.cropId}${plot.dead ? ' (dead)' : ''}`
          : 'Empty — nothing planted yet',
      })
      : el('p', { class: 'inspector__crop', text: 'Not yours yet' }),

    plot.owned && !plot.dead
      ? el('div', { class: 'inspector__water' }, [
        gauge,
        el('div', { class: 'inspector__readout' }, [
          el('p', {
            class: 'inspector__state',
            'data-state': wState,
            text: damage
              ? `${STATE_WORDS[wState]} · ${damage}`
              : STATE_WORDS[wState],
          }),
          el('p', {
            class: 'inspector__level',
            text: `${Math.round(level)} of ${WATER.max} water · target ${target}`,
          }),
          eta
            ? el('p', {
              class: 'inspector__eta',
              text: eta.minutes > 0
                ? `Pump: ${eta.minutes} min and ${eta.gold} gold to reach optimal`
                : 'Already at optimal — nothing to do',
            })
            : null,
          flow && (flow.in > 0 || flow.out > 0)
            ? el('p', {
              class: 'inspector__flow',
              text: `rain +${flow.in}/h · drying −${flow.out}/h · net ${flow.net > 0 ? '+' : '−'}${Math.abs(flow.net)}/h`,
            })
            : null,
        ]),
      ])
      : null,

    el('div', { class: 'inspector__actions' }, [
      pumpButton,
      actionWord
        ? el('button', {
          type: 'button',
          class: 'inspector__action',
          text: actionWord,
          on: { click: () => actions.onAction?.(plotId) },
        })
        : null,
    ]),
  ]);

  root.append(el('div', { class: 'inspector__scrim' }, [card]));

  return {
    unmount() {
      clear(root);
    },
  };
}