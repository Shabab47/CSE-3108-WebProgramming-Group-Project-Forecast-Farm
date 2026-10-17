/**
 * The pump panel: the toggle, what it costs, and which plot it is aimed at.
 *
 * ## Why the pump is aimed by clicking a plot rather than by a list here
 *
 * A dropdown of sixteen plots is a worse way to choose one square of dirt than
 * clicking the square. So the panel only carries the toggle and the read-out, and
 * `farmActions.onPlotClick` claims the click while the pump is running.
 *
 * ## Why the numbers are shown at all
 *
 * The pump bills gold continuously, and a charge a player cannot see is a charge they
 * will stop trusting. Cost-per-second and the water target are both on screen for as
 * long as it runs.
 */

import { el, clear, setText } from '../utils/dom.js';
import { PUMP, WATER } from '../config/game.js';

export function mountPumpPanel(root, actions = {}) {
  clear(root);

  const state = () => actions.getState?.() ?? null;

  const toggle = el('button', {
    type: 'button',
    class: 'pump-panel__toggle',
    on: { click: () => actions.onToggle?.(!state()?.pump?.on) },
  });

  const meterFill = el('span', { class: 'pump-panel__fill' });
  const meterLabel = el('span', { class: 'pump-panel__meter-label' });
  const cost = el('span', { class: 'pump-panel__cost' });
  const target = el('p', { class: 'pump-panel__target' });

  const card = el('div', { class: 'card pump-panel' }, [
    el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Pump' }),
      cost,
    ]),
    el('div', { class: 'pump-panel__meter' }, [
      el('span', { class: 'pump-panel__track' }, [meterFill]),
      meterLabel,
    ]),
    target,
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

    toggle.textContent = on ? 'Turn pump off' : 'Turn pump on';
    toggle.dataset.on = on ? 'true' : 'false';
    card.dataset.on = on ? 'true' : 'false';

    // The meter is the **aimed plot's** water, not the farm's average. The player
    // aims at one plot, so the one number they need is that plot's.
    // `setAttribute` rather than `element.style.height`: the fake DOM in
    // `tests/mainPageBoot.test.js` has no `style` object, and the boot smoke test
    // crashed on it. `plotLayers.js` sets inline styles the same way for that reason.
    meterFill.setAttribute('style', `height:${Math.round(level)}%`);
    setText(meterLabel, aimed == null ? 'No plot chosen' : `Plot ${aimed + 1} · ${Math.round(level)}% water`);

    // Bill only while running, so a stopped pump does not show a price.
    setText(cost, on ? `${PUMP.upkeepPerSecond} gold/s` : `${WATER.pumpPerSecond * PUMP.upkeepPerSecond * 5} gold per 5 water`);

    if (!on) {
      setText(target, 'Click a plot of yours to aim the pump.');
    } else if (aimed == null) {
      setText(target, 'Running, but it has no plot. Click one of yours to start watering.');
    } else {
      setText(target, `Watering plot ${aimed + 1}. Click another to move it.`);
    }
  }

  render();

  return {
    refresh: render,
    unmount() {
      clear(root);
    },
  };
}
