/**
 * The "forgot password" flow: three steps, one at a time.
 *
 *   request  enter an address, we email a link        → ui/resetRequest.js
 *   sent     told to check the inbox, no address field → built here, it is 4 lines
 *   set      back from the link, choose a new password → ui/resetSet.js
 *
 * Split by step because a reset is inherently a round trip through the player's
 * inbox and all three do not fit in one file. This module owns the flow — which
 * step is showing and what the plank says — and each step owns its own form.
 *
 * Kept provider-agnostic for the same reason `loginPanel.js` is: every outside
 * call arrives through `actions` and nothing here names a provider.
 *
 * The neutral-message rule from DEC-019 applies throughout, and is the reason
 * `actions.requestPasswordReset` is expected to succeed even for an address with
 * no account: this panel shows the *same* confirmation either way, so it cannot
 * be turned into an enumeration oracle by its own wording.
 *
 *   mountPasswordReset(root, actions) → { unmount() }
 *
 * actions:
 *   requestPasswordReset({email}) → Promise<{ok, reason?}>
 *   updatePassword({accessToken, password}) → Promise<{ok, reason?}>
 *   recoveryToken() → string | null
 *   notice          → string | undefined, why this view opened (a broken link)
 *   onBack(notice?) → return to the sign-in form
 */

import { clear, el, setText } from '../utils/dom.js';
import { backButton, signBoard } from './signBoard.js';
import { mountResetRequest } from './resetRequest.js';
import { mountResetSet } from './resetSet.js';

/** The plank heading for each step. */
const STEP_TITLE = {
  request: 'Reset password',
  sent: 'Check your inbox',
  set: 'New password',
};

export function mountPasswordReset(root, actions) {
  clear(root);

  const message = el('p', {
    class: 'form-message form-message--error',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  /** `tone` is error | success | info, so a notice is not styled as a fault. */
  function announce(text, tone = 'error') {
    setText(message, text ?? '');
    message.className = `form-message form-message--${tone}`;
    message.hidden = !text;
  }

  const heading = el('h1', { class: 'sign__title' });

  /** The board's content slot. Only one step is in it at a time. */
  const stage = el('div', { class: 'auth__form' });

  const sent = el('div', { class: 'auth__form' }, [
    el('p', { class: 'field__hint', text: 'The link opens this page again, where you can choose a new password.' }),
    el('div', { class: 'sign__row' }, [
      backButton(() => actions.onBack()),
      el('button', { class: 'btn btn--go', type: 'button', text: 'Resend', on: { click: () => show('request') } }),
    ]),
  ]);

  // Built once and reused: these two hold no state between visits, and rebuilding
  // the request form each time would throw away anything already typed into it.
  const request = mountResetRequest({
    requestPasswordReset: actions.requestPasswordReset,
    announce,
    onBack: () => actions.onBack(),
    onSent(notice) {
      show('sent');
      announce(notice, 'info');
    },
  });

  const set = mountResetSet({
    updatePassword: actions.updatePassword,
    recoveryToken: actions.recoveryToken,
    announce,
    onBack: (notice) => actions.onBack(notice),
    // An expired link is not an error to sit on: the player needs the address
    // form to ask again, which is what this returns them to.
    onExpired() {
      show('request');
    },
  });

  const STEPS = {
    request,
    sent: { node: sent, focus: () => {} },
    set,
  };

  function show(step) {
    announce(null);
    setText(heading, STEP_TITLE[step]);

    clear(stage);
    stage.append(STEPS[step].node);

    STEPS[step].focus();
  }

  root.append(
    signBoard({
      // A node rather than a string, because the flow changes step without being
      // rebuilt — "Check your inbox" is a different sentence from "Reset password",
      // and leaving the first one up over the second would be a lie.
      title: heading,
      children: [message, stage],
    }),
  );

  // Arriving from an emailed link means there is a recovery session, so skip
  // straight to choosing a password rather than asking for the address again.
  show(actions.recoveryToken() ? 'set' : 'request');

  // An arrival with a broken link opens the address form and says why. `show`
  // clears the message line first, so this has to come after it.
  if (actions.notice) announce(actions.notice, 'error');

  return { unmount() { clear(root); } };
}