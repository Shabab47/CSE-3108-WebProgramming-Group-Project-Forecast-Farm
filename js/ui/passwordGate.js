/**
 * The password field an armed destructive action can ask for.
 *
 * Its own file because it is a different concern from the arm-and-confirm control in
 * `dangerAction.js`: that one is a pair of buttons, this is a credential that appears
 * only once the action is armed. Both destructive settings actions use one.
 *
 * Erase-progress did not have one at first, on the reasoning that a farm is the
 * player's own and one click away from being rebuilt — but "easily replaced" is not
 * "protected", and the farm is the accumulated product of real play. Anything
 * irreversible is now behind a password, so a stolen session token cannot destroy
 * anything on its own (DEC-025).
 */

import { el, setText } from '../utils/dom.js';

/**
 * @param {object} options
 * @param {string} options.id unique per form on the page — the label's `for` needs it
 * @param {string} options.label the visible label, e.g. "Your password"
 * @returns {{wrap: HTMLElement, input: HTMLInputElement, read: () => string,
 *            complain: (text:string) => void, forgive: () => void,
 *            setVisible: (on:boolean) => void}}
 */
export function passwordGate({ id, label }) {
  const error = el('p', { class: 'field__error', id: `${id}-error` });

  const input = el('input', {
    class: 'input',
    id,
    name: 'password',
    type: 'password',
    // `current-password` deliberately — it is the account's existing password, not a
    // new one being chosen, and browsers will offer to fill it from the same store they
    // fill the sign-in form from. That is a convenience here, not a leak: only someone
    // already at this keyboard benefits.
    autocomplete: 'current-password',
    placeholder: 'Your password',
    'aria-describedby': error.id,
  });

  const wrap = el('div', { class: 'field' }, [
    el('label', { class: 'field__label', for: id, text: label }),
    el('div', { class: 'field__control' }, [input]),
    error,
  ]);

  // `hidden` on the wrapper rather than on the input, so the label and the error go
  // with it — a hidden input under a visible label is a screen reader's worst case.
  wrap.hidden = true;

  return {
    wrap,
    input,

    /** @returns {string} what the player typed, unmangled */
    read: () => input.value,

    /** Show a message under the field and mark it invalid. */
    complain(text) {
      setText(error, text);
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    },

    /** Clear any message and take the field back to normal. */
    forgive() {
      setText(error, '');
      input.setAttribute('aria-invalid', 'false');
    },

    setVisible(on) {
      wrap.hidden = !on;
    },
  };
}
