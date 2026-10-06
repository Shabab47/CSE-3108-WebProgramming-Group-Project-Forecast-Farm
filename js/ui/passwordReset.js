/**
 * The "forgot password" flow.
 *
 * Three steps on one page, because a reset is inherently a round trip through the
 * player's inbox:
 *
 *   request  — enter an address, we email a link
 *   sent     — told to check the inbox, no email field any more
 *   set      — back from the link, choose a new password
 *
 * Split out of `loginPanel.js` to stay inside the ~200-line budget, and kept
 * provider-agnostic for the same reason that panel is: it receives every call
 * through `actions` and never imports a provider.
 *
 * The neutral-message rule from DEC-019 applies here too, and is the reason
 * `actions.requestPasswordReset` is expected to succeed even for an address with
 * no account: this panel shows the *same* confirmation either way, so it cannot
 * be turned into an enumeration oracle by its own wording.
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { passwordProblems } from '../domain/authRules.js';
import { authErrorToMessage } from './authErrors.js';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '../config/auth.js';
import { RULE_TEXT } from './loginFields.js';

const log = createLog('loginPanel');

const RULE_LIST = PASSWORD_RULES.map((rule) => RULE_TEXT[rule.id]).join(', ');

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {(opts:{email:string}) => Promise<{ok:boolean, reason?:string}>} actions.requestPasswordReset
 * @param {(opts:{accessToken:string, password:string}) => Promise<{ok:boolean, reason?:string}>} actions.updatePassword
 * @param {() => string|null} actions.recoveryToken reads the token from the URL
 * @param {() => void} actions.onBack return to the sign-in form
 * @returns {{unmount: () => void}}
 */
export function mountPasswordReset(root, actions) {
  clear(root);

  let step = 'request';
  let busy = false;

  const message = el('p', {
    class: 'form-message form-message--error',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  function announce(text, tone = 'error') {
    setText(message, text ?? '');
    message.className = `form-message form-message--${tone}`;
    message.hidden = !text;
  }

  function setBusy(isBusy) {
    busy = isBusy;
    for (const node of root.querySelectorAll('input, button')) node.disabled = isBusy;
    back.disabled = isBusy;
  }

  /* --- step: request ------------------------------------------------------- */

  const emailInput = el('input', {
    class: 'input',
    id: 'reset-email',
    name: 'email',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'you@example.com',
    'aria-describedby': 'reset-email-error',
  });
  const emailError = el('p', { class: 'field__error', id: 'reset-email-error' });

  const requestForm = el('form', { class: 'auth__form', novalidate: true, 'aria-busy': 'false' }, [
    el('div', { class: 'field' }, [
      el('label', { class: 'field__label', for: 'reset-email', text: 'Email' }),
      el('div', { class: 'field__control' }, [emailInput]),
      emailError,
    ]),
    el('button', { class: 'btn btn--primary btn--block auth__submit', type: 'submit', text: 'Send reset link' }),
  ]);

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const email = emailInput.value.trim();
    if (!email) {
      setText(emailError, authErrorToMessage('email_required', 'session'));
      emailInput.setAttribute('aria-invalid', 'true');
      emailInput.focus();
      return;
    }

    setText(emailError, '');
    emailInput.setAttribute('aria-invalid', 'false');
    setBusy(true);

    let result;
    try {
      result = await actions.requestPasswordReset({ email });
    } catch (error) {
      log.error('reset request threw -', error.message);
      setBusy(false);
      announce(authErrorToMessage('network_request_failed', 'session'));
      return;
    }

    setBusy(false);

    // Trust `ok` and nothing else. The provider has already folded
    // account-existence reasons into a success (DEC-019), so branching on the
    // reason here would either undo that or, worse, claim a reset email was sent
    // when the provider could not send one. Any real failure is reported as-is.
    if (!result?.ok) {
      announce(authErrorToMessage(String(result?.reason ?? 'unknown'), 'session'));
      return;
    }

    show('sent');
    announce('If that address has an account, a reset link is on its way. Check your spam folder too.', 'info');
  });

  /* --- step: sent ---------------------------------------------------------- */

  const sent = el('div', { class: 'auth__form' }, [
    el('p', { class: 'field__hint', text: 'The link opens this page again, where you can choose a new password.' }),
    el('button', { class: 'btn btn--ghost btn--block', type: 'button', text: 'Resend', on: { click: () => show('request') } }),
  ]);

  /* --- step: set ----------------------------------------------------------- */

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

  const setForm = el('form', { class: 'auth__form', novalidate: true, 'aria-busy': 'false' }, [
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
    el('button', { class: 'btn btn--primary btn--block auth__submit', type: 'submit', text: 'Save new password' }),
  ]);

  // Same live password guidance the sign-up form has.
  setForm.addEventListener('input', (event) => {
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

  setForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const accessToken = actions.recoveryToken();
    if (!accessToken) {
      // The player opened the page directly, or the link expired.
      announce('That reset link is no longer valid. Ask for a new one.', 'error');
      show('request');
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
    } catch (error) {
      log.error('password update threw -', error.message);
      setBusy(false);
      announce(authErrorToMessage('network_request_failed', 'session'));
      return;
    }

    setBusy(false);
    if (!result?.ok) {
      log.warn('password update refused -', String(result?.reason));
      announce(authErrorToMessage(String(result?.reason ?? 'unknown'), 'session'));
      return;
    }

    // Back to sign-in: the old password is dead and the player must use the new one.
    log.info('password changed');
    actions.onBack('Password changed. Sign in with your new password.');
  });

  /* --- shell --------------------------------------------------------------- */

  const back = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Back to sign in',
    on: { click: () => actions.onBack() },
  });

  function show(next) {
    step = next;
    announce(null);
    requestForm.hidden = step !== 'request';
    sent.hidden = step !== 'sent';
    setForm.hidden = step !== 'set';
    back.hidden = step === 'set';
    (step === 'request' ? emailInput : newPassword).focus();
  }

  root.append(
    el('div', { class: 'auth__card' }, [
      el('div', { class: 'auth__brand' }, [
        el('h1', { class: 'auth__title', text: step === 'set' ? 'Choose a new password' : 'Reset your password' }),
      ]),
      message,
      requestForm,
      sent,
      setForm,
      back,
    ]),
  );

  // Arriving from an emailed link means there is a recovery session, so skip
  // straight to choosing a password rather than asking for the address again.
  show(actions.recoveryToken() ? 'set' : 'request');

  return { unmount() { clear(root); } };
}
