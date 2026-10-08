/**
 * The arm-and-confirm control the two destructive settings actions share.
 *
 * Split out of `settingsView.js` because that file went over the ~200-line budget
 * once both actions were added, and this project holds panels to it
 * (`docs/architecture.md`).
 *
 * Both settings actions are the same shape — arm, then confirm, with a cancel that
 * takes focus — and a destructive control is exactly where that consistency earns
 * something. A player who has worked out that the first click only arms the button
 * should not have to work it out twice on one page, and one of these two deletes a
 * farm.
 *
 * It renders and calls back. It does not know *what* it destroys: the session stays
 * in `settingsView.js` and the store stays in the entry point.
 */

import { el, setText } from '../utils/dom.js';

/**
 * @param {object} options
 * @param {string} options.label text on the button that arms the action
 * @param {string} options.confirmLabel text on the button that does it
 * @param {string} options.cancelLabel text on the button that backs out
 * @param {string} options.busyLabel text while the action is in flight
 * @param {string} options.description the sentence that says what this costs
 * @param {() => void} [options.onArm] when the action is armed, for any extra narration
 * @param {{wrap:HTMLElement, read:Function, forgive:Function, setVisible:Function}} [options.gate]
 *   a password field to reveal while armed. Omitted by erase-progress, which asks for
 *   no credential.
 * @returns {{node: HTMLElement, trigger: HTMLElement, confirmButton: HTMLElement,
 *            reset: Function, setBusy: Function, isBusy: () => boolean,
 *            clearSecret: Function}}
 */
export function dangerAction({
  label,
  confirmLabel,
  cancelLabel,
  busyLabel,
  description,
  onArm,
  gate,
}) {
  const trigger = el('button', {
    class: 'btn btn--danger btn--block',
    type: 'button',
    text: label,
  });

  // The password field, when this action asks for one. Hidden until armed, so the
  // form does not look like it is collecting a credential before the player has
  // committed to anything.
  const passwordInput = gate ?? null;

  const confirmButton = el('button', {
    class: 'btn btn--danger btn--block',
    type: 'button',
    text: confirmLabel,
    hidden: true,
  });

  const cancelButton = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: cancelLabel,
    hidden: true,
  });

  let busy = false;

  /** Back to the single-button state: after a cancel, or after the action ran. */
  function reset() {
    trigger.hidden = false;
    confirmButton.hidden = true;
    cancelButton.hidden = true;
    // The password field goes with them. Leaving a typed password sitting in a hidden
    // input is exactly the half-finished-credential state `loginPanel.js` clears its
    // own password fields to avoid.
    passwordInput?.setVisible(false);
    passwordInput?.clearSecret?.();
  }

  function arm() {
    reset();
    trigger.hidden = true;
    confirmButton.hidden = false;
    cancelButton.hidden = false;
    passwordInput?.setVisible(true);

    // Cancel takes the focus, never the confirm. The next control a keyboard user
    // reaches must not be the one that destroys something. When there is a password
    // field the focus goes there instead, because the confirm is useless without it
    // and reaching a dead button first is a worse dead end than typing.
    (passwordInput?.input ?? cancelButton).focus();
    onArm?.();
  }

  trigger.addEventListener('click', arm);
  cancelButton.addEventListener('click', reset);

  return {
    node: el('div', { class: 'settings-action' }, [
      el('p', { class: 'field__hint', text: description }),
      trigger,
      confirmButton,
      cancelButton,
    ]),
    trigger,
    confirmButton,

    /**
     * One flag for the pair, so a second click cannot get through while the first is
     * still in flight. Doubled by the caller: this only disables, it does not know
     * whether the work already succeeded.
     */
    setBusy(isBusy) {
      busy = isBusy;
      const controls = [trigger, confirmButton, cancelButton, passwordInput?.input];
      for (const node of controls) {
        // `hidden` buttons are already inert, and disabling a hidden password field
        // would leave it greyed out when the action is armed again.
        if (node && !node.hidden) node.disabled = isBusy;
      }
      setTextLabel(confirmButton, isBusy ? busyLabel : confirmLabel);
    },

    /** @returns {boolean} true when the click should be ignored as a duplicate */
    isBusy: () => busy,

    /** Put the confirm back to normal, for a path that did not reach the action. */
    restore: () => setTextLabel(confirmButton, confirmLabel),

    /** Empty the password field, for a cancel or a wrong password. */
    clearSecret() {
      if (passwordInput) passwordInput.input.value = '';
    },

    reset,
  };
}

/**
 * The password field an armed action can ask for.
 *
 * Separate from `dangerAction` because only one caller needs it. Erase-progress does
 * not: the farm is the player's own and reversible by starting again, whereas deleting
 * an account is the one action here that cannot be undone by the game, so it asks for
 * the password before it will do anything.
 *
 * Autocomplete is `current-password` deliberately — it is the account's existing
 * password, not a new one being chosen, and browsers will offer to fill it from the
 * same store they fill the sign-in form from. That is a convenience here, not a leak:
 * only someone already at this keyboard benefits.
 *
 * @returns {{wrap: HTMLElement, input: HTMLInputElement, read: () => string}}
 */
export function passwordGate({ id, label }) {
  const error = el('p', { class: 'field__error', id: `${id}-error` });

  const input = el('input', {
    class: 'input',
    id,
    name: 'password',
    type: 'password',
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

function setTextLabel(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
