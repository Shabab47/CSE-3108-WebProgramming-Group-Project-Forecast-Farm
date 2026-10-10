/**
 * A full-page veil that shows a weather or farming fact while the page boots.
 *
 * ## Why this exists
 *
 * The game has no loading screen. All four entry points await the session and
 * the remote save *before* mounting anything, so a player on a slow connection
 * saw a blank white page. On the farm page that wait is bounded only by the
 * `Promise.race` in `js/services/authApi.js`, because `js/services/gotrue.js`
 * sets no deadline of its own — up to fifteen seconds of nothing.
 *
 * This paints over that. It carries no game state and reads none, so it is safe
 * to show before the session is known — see DEC-026 for why that is stated
 * rather than assumed.
 *
 * ## Contract
 *
 * `mountBootLoader()` appends to `<body>` and hands back `done()`. The caller
 * mounts it as the first statement of `start()` and calls `done()` after the
 * real UI is up. It is deliberately not `mountX(root, actions)` against a
 * selector from the HTML: no page should have to declare an empty `<div>` in
 * markup for this, and `almanac.html` is currently a zero-byte file.
 *
 * ## Nothing is shown for a fast load
 *
 * A loader that appears instantly is worse than no loader. Two thresholds guard
 * that, both from `config/tips.js`: the veil waits `SHOW_AFTER_MS` before it
 * paints, and the first fact waits a further `FIRST_TIP_AFTER_MS`. A load that
 * finishes inside the first threshold shows nothing at all — no flash, no
 * spinner, nothing to un-see.
 */

import { el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { FIRST_TIP_AFTER_MS, SHOW_AFTER_MS, TIPS, TIP_ROTATE_MS } from '../config/tips.js';

const log = createLog('loadingTips');

/**
 * Pick the order facts are shown in.
 *
 * Shuffled rather than sequential so two players loading at the same moment do
 * not read the same thing in the same order, and so nobody accidentally learns
 * the list by reading it top to bottom. Every tip appears exactly once per
 * cycle — that is the one property worth guaranteeing, because a rotation that
 * can repeat is how a player ends up seeing the same fact three times during a
 * long wait and correctly concludes the thing is broken.
 *
 * Exported so it can be tested without a DOM.
 *
 * @param {Array<{id: string}>} [tips]
 * @returns {Array<object>} the same objects, shuffled
 */
export function shuffledTips(tips = TIPS) {
  const copy = tips.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * @typedef {object} BootLoader
 * @property {() => void} done  reveal the page; safe to call more than once
 * @property {() => void} unmount remove the veil and cancel every timer
 */

/**
 * Mount the veil. Paints nothing until `SHOW_AFTER_MS` has passed.
 *
 * @param {{label?: string}} [options] `label` is the line announced to a screen
 *   reader and shown under the spinner, e.g. "Loading your farm".
 * @returns {BootLoader} a no-op pair when there is no `document.body` to append to
 */
export function mountBootLoader({ label = 'Loading' } = {}) {
  const root = typeof document === 'undefined' ? null : document.body;
  if (!root) {
    log.warn('no document.body, boot loader is inert');
    return { done() {}, unmount() {} };
  }

  // The status line is a separate node from the tip on purpose. A live region
  // that rewrites itself every few seconds is unusable with a screen reader —
  // it interrupts whatever was being read. So the status announces once and
  // stays put, and only the visible tip rotates. Same reasoning as the one
  // statusLine per region rule in `js/ui/statusLine.js`.
  const status = el('p', {
    class: 'boot-loader__status',
    role: 'status',
    'aria-live': 'polite',
    text: label,
  });

  const tip = el('p', { class: 'boot-loader__tip', 'aria-hidden': 'true' });

  const veil = el('div', { class: 'boot-loader', 'data-boot': 'veil' }, [
    el('div', { class: 'boot-loader__panel' }, [
      el('span', { class: 'btn__spinner boot-loader__spinner', 'aria-hidden': 'true' }),
      status,
      tip,
    ]),
  ]);

  // Hidden in markup rather than painted transparent, so nothing is composited
  // for the common case where the page loads fast. `reset.css` already makes
  // `[hidden]` beat any display rule.
  veil.hidden = true;
  root.append(veil);

  const order = shuffledTips();
  const timers = [];
  let index = 0;
  let shown = false;
  let finished = false;

  const later = (fn, ms) => {
    timers.push(setTimeout(fn, ms));
  };

  /** Write the current fact and restart the fade. */
  function advance() {
    setText(tip, order[index % order.length].text);
    index += 1;

    // Restart the fade. Removing the class and reading layout in between is
    // what makes the browser treat the re-add as a new animation rather than a
    // no-op change to one that already ran. `void` on the read is the
    // conventional way to say the value is deliberately unused.
    tip.classList.remove('boot-loader__tip--in');
    void tip.offsetWidth;
    tip.classList.add('boot-loader__tip--in');
  }

  function rotate() {
    if (finished) return;
    advance();
    later(rotate, TIP_ROTATE_MS);
  }

  /** Reveal the veil and start the rotation. */
  function reveal() {
    if (shown || finished) return;
    shown = true;
    veil.hidden = false;
    log.trace('boot loader shown');

    // Measured from *mount*, not from here. Both thresholds are delays from the
    // start of `start()`, so a fact lands at FIRST_TIP_AFTER_MS rather than at
    // SHOW_AFTER_MS + it — which would quietly push every tip 250 ms later than
    // the number in config/tips.js claims.
    later(advance, FIRST_TIP_AFTER_MS - SHOW_AFTER_MS);
    later(rotate, FIRST_TIP_AFTER_MS - SHOW_AFTER_MS + TIP_ROTATE_MS);
  }

  // The whole reason this is not just `veil.hidden = false`.
  later(reveal, SHOW_AFTER_MS);

  /** Cancel every timer and take the veil off the page. */
  function unmount() {
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
    veil.remove();
  }

  return {
    done() {
      if (finished) return;
      finished = true;
      log.trace('boot loader done');
      unmount();
    },

    unmount,
  };
}