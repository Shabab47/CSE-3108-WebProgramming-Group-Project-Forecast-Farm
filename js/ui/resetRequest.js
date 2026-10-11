/**
 * The first step of the reset flow: ask for the address.
 *
 * One step, one file. `js/ui/passwordReset.js` owns the flow — which step is
 * showing, and what the plank says — and each step owns its own form, so no
 * single file has to hold all three.
 *
 * The neutral-message rule from DEC-019 applies here, and is why
 * `actions.requestPasswordReset` is expected to succeed even for an address with
 * no account: this panel shows the *same* confirmation either way, so it cannot
 * be turned into an enumeration oracle by its own wording.
 *
 *   mountResetRequest(actions) → { node, focus() }
 */

import { el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { authErrorToMessage } from './authErrors.js';
import { backButton } from './signBoard.js';

const log = createLog('passwordReset');

export function mountResetRequest(actions) {
  let busy = false;

  const input = el('input', {
    class: 'input',
    id: 'reset-email',
    name: 'email',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'you@example.com',
    'aria-describedby': 'reset-email-error',
  });
  const error = el('p', { class: 'field__error', id: 'reset-email-error' });

  const node = el('form', { class: 'auth__form', novalidate: true, 'aria-busy': 'false' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'reset-email', text: 'Email' }),
      el('div', { class: 'field__control' }, [input]),
      error,
    ]),
    el('div', { class: 'sign__row' }, [
      backButton(() => actions.onBack()),
      el('button', { class: 'btn btn--go', type: 'submit', text: 'Send reset link' }),
    ]),
  ]);

  function setBusy(isBusy) {
    busy = isBusy;
    node.setAttribute('aria-busy', String(isBusy));
    for (const control of node.querySelectorAll('input, button')) control.disabled = isBusy;
  }

  node.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const email = input.value.trim();
    if (!email) {
      setText(error, authErrorToMessage('email_required', 'session'));
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    setText(error, '');
    input.setAttribute('aria-invalid', 'false');
    setBusy(true);

    let result;
    try {
      result = await actions.requestPasswordReset({ email });
    } catch (thrown) {
      log.error('reset request threw -', thrown.message);
      setBusy(false);
      actions.announce(authErrorToMessage('network_request_failed', 'session'));
      return;
    }

    setBusy(false);

    // Trust `ok` and nothing else. The provider has already folded
    // account-existence reasons into a success (DEC-019), so branching on the
    // reason here would either undo that or, worse, claim a reset email was sent
    // when the provider could not send one. Any real failure is reported as-is.
    if (!result?.ok) {
      actions.announce(authErrorToMessage(String(result?.reason ?? 'unknown'), 'session'));
      return;
    }

    actions.onSent('If that address has an account, a reset link is on its way. Check your spam folder too.');
  });

  return { node, focus: () => input.focus() };
}