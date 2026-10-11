/**
 * The last step of the reset flow: choose the new password.
 *
 * Shown when the player arrives back from the emailed link, which means a
 * recovery session already exists — so there is no address to ask for again.
 *
 *   mountResetSet(actions) → { node, focus() }
 *
 * actions:
 *   updatePassword({accessToken, password}) → Promise<{ok, reason?}>
 *   recoveryToken()                         → string | null
 *   announce(sentence, tone)                → the board's message line
 *   onBack(sentence)                        → return to sign-in
 */

import { el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { passwordProblems } from '../domain/authRules.js';
import { authErrorToMessage } from './authErrors.js';
import { PASSWORD_MIN_LENGTH } from '../config/auth.js';
import { RULE_LIST, RULE_TEXT } from './loginFields.js';
import { backButton } from './signBoard.js';

const log = createLog('passwordReset');

export function mountResetSet(actions) {
  let busy = false;

  const newPassword = el('input', {
    class: 'input',
    id: 'reset-new',
    name: 'password',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'At least 8 characters',
    'aria-describedby': 'reset-new-error',
  });
  const confirmPassword = el('input', {
    class: 'input',
    id: 'reset-confirm',
    name: 'confirmPassword',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Type it again',
    'aria-describedby': 'reset-confirm-error',
  });

  const newError = el('p', { class: 'field__error', id: 'reset-new-error' });
  const confirmError = el('p', { class: 'field__error', id: 'reset-confirm-error' });
  const strength = el('p', { class: 'field__hint', hidden: true });

  const node = el('form', { class: 'auth__form', novalidate: true, 'aria-busy': 'false' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'reset-new', text: 'New password' }),
      el('div', { class: 'field__control' }, [newPassword]),
      newError,
    ]),
    el('p', { class: 'field__hint', text: `Needs ${RULE_LIST}.` }),
    strength,
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'reset-confirm', text: 'Confirm new password' }),
      el('div', { class: 'field__control' }, [confirmPassword]),
      confirmError,
    ]),
    el('div', { class: 'sign__row' }, [
      backButton(() => actions.onBack()),
      el('button', { class: 'btn btn--go', type: 'submit', text: 'Save new password' }),
    ]),
  ]);

  function setBusy(isBusy) {
    busy = isBusy;
    node.setAttribute('aria-busy', String(isBusy));
    for (const control of node.querySelectorAll('input, button')) control.disabled = isBusy;
  }

  // Same live password guidance the sign-up form has.
  node.addEventListener('input', (event) => {
    if (event.target !== newPassword) return;
    const problems = passwordProblems(newPassword.value);
    strength.hidden = !newPassword.value;
    setText(
      strength,
      problems.length
        ? `Still needs: ${problems.map((p) => RULE_TEXT[p]).join(', ')}`
        : 'Password looks good',
    );
  });

  node.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const accessToken = actions.recoveryToken();
    if (!accessToken) {
      // The player opened the page directly, or the link expired.
      actions.announce('That reset link is no longer valid. Ask for a new one.', 'error');
      actions.onExpired();
      return;
    }

    setText(newError, '');
    setText(confirmError, '');

    const problems = passwordProblems(newPassword.value);
    if (problems.length) {
      setText(newError, `Use at least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`);
      newPassword.focus();
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      setText(confirmError, authErrorToMessage('password_mismatch', 'session'));
      confirmPassword.focus();
      return;
    }

    setBusy(true);
    let result;
    try {
      result = await actions.updatePassword({ accessToken, password: newPassword.value });
    } catch (thrown) {
      log.error('password update threw -', thrown.message);
      setBusy(false);
      actions.announce(authErrorToMessage('network_request_failed', 'session'));
      return;
    }

    setBusy(false);
    if (!result?.ok) {
      log.warn('password update refused -', String(result?.reason));
      actions.announce(authErrorToMessage(String(result?.reason ?? 'unknown'), 'session'));
      return;
    }

    // Back to sign-in: the old password is dead and the player must use the new
    // one. The values are cleared first so the new password is not left in the DOM
    // for as long as the sign-in form is on screen.
    newPassword.value = '';
    confirmPassword.value = '';
    log.info('password changed');
    actions.onBack('Password changed. Sign in with your new password.');
  });

  return { node, focus: () => newPassword.focus() };
}