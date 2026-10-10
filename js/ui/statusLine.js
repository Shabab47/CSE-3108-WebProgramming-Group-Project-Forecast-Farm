/**
 * A polite live region for one part of a page to say things in.
 *
 * Its own file because the settings page needed **two** of them, and having two is the
 * point.
 *
 * It used to have one, rendered inside the erase-progress card. So when the account
 * action ran, every sentence it produced — "Checking your password.", "That password is
 * not right", each failure explanation — appeared above the *progress* button, in a card
 * the player might have scrolled past and had not clicked. Worse for a screen reader: a
 * shared node announces changes as page-level narration, so a password check in the
 * bottom card was narrated as if it were the whole page's.
 *
 * One per region, inside the region it describes. `tests/settingsDom.test.js` asserts
 * there are exactly two on the settings page, and that each lands in its own card.
 */

import { el, setText } from '../utils/dom.js';

/**
 * @returns {{node: HTMLElement, announce: (text: string|null, tone?: 'error'|'success'|'info') => void}}
 */
export function statusLine() {
  const node = el('p', {
    class: 'form-message',
    // `status` not `alert`: everything said here is a consequence of a click the player
    // just made, so it should wait for a pause in speech rather than interrupt.
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  return {
    node,

    /**
     * Say something, or clear it.
     *
     * @param {string|null} text pass null or '' to clear the line
     * @param {'error'|'success'|'info'} [tone] `info` is progress, not a fault — which
     *   is why it is not an error by default. `setText` compares before assigning so an
     *   unchanged message does not re-announce.
     */
    announce(text, tone = 'error') {
      setText(node, text ?? '');
      node.className = `form-message form-message--${tone}`;
      node.hidden = !text;
    },
  };
}
