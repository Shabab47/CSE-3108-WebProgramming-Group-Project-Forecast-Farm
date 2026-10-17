/**
 * How far a planted crop has grown: the bar and the words above it.
 *
 * Split out of `plotLayers.js` by responsibility: that file owns *what is
 * painted on a plot*, this one owns *what growing means to show*. `AGENTS.md`
 * asks for panels to be split before they grow, and the meter has its own
 * rules worth stating in one place.
 *
 * One rule: **the meter hides when the crop is ready.** The gold rim
 * (`plot__ready`) is the unmissable cue six hours were waited for — a full
 * green bar beside it would say the same thing twice and split the eye.
 *
 * Everything is decorative (`aria-hidden`): `plotName()` in `plotLabel.js`
 * already announces `"Rice growing, 3h 20m left"`, so the words here reuse
 * `formatLeft()` from that same file and can never disagree with it.
 */

import { el } from '../utils/dom.js';
import { formatLeft } from './plotLabel.js';

/**
 * @param {object} grown the `harvestsIn()` result — `progress` 0..1, `msLeft`, `ready`
 * @returns {object|null} the meter element, or null when it must not show
 */
export function growthMeter(grown) {
  if (!grown?.planted || grown.ready) return null;

  const pct = Math.round(Math.min(Math.max(grown.progress ?? 0, 0), 1) * 100);

  return el('span', { class: 'plot__grow', 'aria-hidden': 'true' }, [
    el('span', { class: 'plot__grow-track' }, [
      el('span', { class: 'plot__grow-fill', style: `width:${pct}%` }),
    ]),
    el('span', { class: 'plot__grow-label', text: formatLeft(grown.msLeft) }),
  ]);
}
