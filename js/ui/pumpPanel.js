/**
 * The pump panel: the toggle, what it costs, and the aimed plot's water.
 *
 * ## Why the numbers are on the panel at all
 *
 * "Water this plot for 30 to 60 minutes" is a promise, and a promise nobody can see is a
 * rumour. So the panel quotes the two figures that make it real — **how long**, and
 * **how much gold** — and recomputes them as the meter moves, because a figure that was
 * right when the pump switched on is wrong two minutes later.
 *
 * That estimate accounts for evaporation happening *while* the pump runs; see
 * `minutesToOptimal()`. Ignoring it would read about 12% fast on rice in sun, and the
 * panel would be quoting a number the pump does not deliver.
 *
 * ## Why the meter is the aimed plot's, not the farm's average
 *
 * The player aims at one plot (DEC-040), so the one number they need is that plot's.
 * An average across sixteen would be a number about no particular square of dirt.
 *
 * ## Why the words are here as well as the colours
 *
 * Colour alone fails anyone who cannot tell red from green, and the four states carry
 * real consequences. `data-state` drives the colour; the text carries the meaning.
 */

import { el, clear, setText } from '../utils/dom.js';
import { PUMP, WATER } from '../config/game.js';
import { currentEvent } from '../domain/water.js';
import { bandFor, flowFor, minutesToOptimal, waterState } from '../domain/plotWater.js';
import { damageWord } from '../domain/damage.js';

const WORDS = {
  dry: 'Dry',
  low: 'Low',
  optimal: 'Optimal',
  saturated: 'Saturated',
};

export function mountPumpPanel(root, actions = {}) {
  clear(root);

  const state = () => actions.getState?.() ?? null;

  const toggle = el('button', {
    type: 'button',
    class: 'pump-panel__toggle',
    on: { click: () => actions.onToggle?.(!state()?.pump?.on) },
  });

  const meterFill = el('span', { class: 'pump-panel__fill' });
  const targetTick = el('span', { class: 'pump-panel__target-tick' });
  const meterLabel = el('span', { class: 'pump-panel__meter-label' });
  const cost = el('span', { class: 'pump-panel__cost' });
  const estimate = el('p', { class: 'pump-panel__estimate' });
  const flow = el('p', { class: 'pump-panel__flow' });
  const note = el('p', { class: 'pump-panel__note' });

  const card = el('div', { class: 'card pump-panel' }, [
    el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Pump' }),
      cost,
    ]),
    el('div', { class: 'pump-panel__meter' }, [
      el('span', { class: 'pump-panel__track' }, [meterFill, targetTick]),
      meterLabel,
    ]),
    estimate,
    flow,
    note,
    toggle,
  ]);

  root.append(card);

  function render() {
    const s = state();
    if (!s) return;

    const on = Boolean(s.pump?.on);
    const aimed = s.pump?.target ?? null;
    const plot = aimed == null ? null : s.plots.find((p) => p.id === aimed);
    const level = plot?.waterLevel ?? 0;
    const event = currentEvent(s, Date.now());

    toggle.textContent = on ? 'Turn pump off' : 'Turn pump on';
    toggle.dataset.on = on ? 'true' : 'false';
    card.dataset.on = on ? 'true' : 'false';

    if (!plot) {
      card.dataset.state = '';
      meterFill.setAttribute('style', 'height:0%');
      setText(meterLabel, 'No plot chosen');
      setText(estimate, '');
      setText(flow, '');
      setText(note, on
        ? 'Running, but it has no plot. Click one of yours to start watering.'
        : 'Click a plot of yours to aim the pump.');
      return;
    }

    const band = bandFor(plot);
    const wState = waterState(plot);
    card.dataset.state = wState;

    // `setAttribute` rather than `.style.height`: the fake DOM in `mainPageBoot` has no
    // `style` object, and the boot smoke test hung on it because a crashed boot leaves a
    // live timer behind. `plotLayers.js` sets inline styles the same way for that reason.
    meterFill.setAttribute('style', `height:${((level / WATER.max) * 100).toFixed(1)}%`);
    targetTick.setAttribute('style', `bottom:${((band.target / WATER.max) * 100).toFixed(1)}%`);

    const word = WORDS[wState] ?? wState;
    setText(meterLabel, `Plot ${aimed + 1} · ${Math.round(level)} of ${WATER.max} · ${word}`);

    const eta = minutesToOptimal(plot, event);
    setText(estimate, eta
      ? `${eta.minutes} min to optimal · ${eta.gold} gold`
      : `At optimal · nothing left to do`);
    card.dataset.eta = eta ? 'true' : 'false';

    // What is coming in and what is going out. "Why is this bar falling" is the question
    // a player actually has, and it is answered by two numbers and a sign.
    const f = flowFor(plot, event);
    setText(flow, f.in > 0 || f.out > 0
      ? `in +${f.in}/h · out −${f.out}/h · net ${f.net > 0 ? '+' : '−'}${Math.abs(f.net)}/h`
      : '');

    const damaged = damageWord(plot);
    setText(note, damaged
      ? `${damaged} — permanent. This will harvest for less.`
      : (!on
        ? 'Turn the pump on, then click a plot to water it.'
        : (aimed == null ? 'Click a plot of yours.' : `Watering plot ${aimed + 1}. Click another to move it.`)));
  }

  render();

  return {
    refresh: render,
    unmount() {
      clear(root);
    },
  };
}