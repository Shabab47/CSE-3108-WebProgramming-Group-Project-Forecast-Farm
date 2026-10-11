/**
 * The sign-in and create-account forms, drawn on the wooden sign.
 *
 * Render and events only. Every outside call arrives through `actions`, so this
 * file has no idea what the provider is — swapping Supabase for anything else
 * touches `authApi.js` and nothing here.
 *
 * Provider error codes never reach this file as strings: `ui/authErrors.js`
 * turns them into sentences and neutralises the ones that would otherwise let a
 * caller discover which emails have accounts.
 *
 * One form per mount. The panel used to hold both forms and switch between them
 * with a tab pair; each is now its own view on the menu page, and only the one
 * being shown is ever in the DOM.
 *
 *   mountLoginPanel(root, mode, actions) → { unmount() }
 *
 * mode:
 *   'signIn' | 'signUp'
 *
 * actions:
 *   signIn({identifier, password})             → Promise<{ok:true, session}|{ok:false, reason}>
 *   signUp({email, password, farmerName, username}) → same
 *   signOut()                                  → Promise<{ok:true}>
 *   onAuthenticated(session|null)              → route onward; null means awaiting confirmation
 *   onBack()                                   → return to the menu
 *   onSwitch(mode)                             → 'signIn' | 'signUp'
 *   onGuest()                                  → continue without an account
 *   onForgotPassword()                         → open the reset flow
 *   notice                                     → optional sentence to show on arrival
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { validateSignIn, validateSignUp, passwordProblems } from '../domain/authRules.js';
import { authErrorToMessage } from './authErrors.js';
import { RULE_TEXT, readValues } from './loginFields.js';
import { buildLoginForm } from './loginForm.js';
import { signBoard } from './signBoard.js';

const log = createLog('loginPanel');

export function mountLoginPanel(root, mode, actions) {
  clear(root);

  const message = el('p', {
    class: 'form-message form-message--error',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  /** `tone` is one of error | success | info, so a notice is not styled as a fault. */
  function announce(text, tone = 'error') {
    setText(message, text ?? '');
    message.className = `form-message form-message--${tone}`;
    message.hidden = !text;
  }

  const { view, strength } = buildLoginForm(mode, actions);
  let busy = false;

  function paintErrors(errors) {
    for (const part of Object.values(view.fields)) {
      const code = errors[part.name];
      setText(part.error, code ? authErrorToMessage(code, mode) : '');
      part.input.setAttribute('aria-invalid', code ? 'true' : 'false');
    }
  }

  /**
   * Disables every control and marks the form busy. One flag covers the whole
   * form, so a second submit cannot get through while the first is in flight.
   */
  function setBusy(isBusy) {
    busy = isBusy;
    view.node.setAttribute('aria-busy', String(isBusy));
    setText(view.submit, isBusy ? 'Working…' : view.label);
    for (const node of view.node.querySelectorAll('input, button')) node.disabled = isBusy;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const isSignUp = mode === 'signUp';
    const validate = isSignUp ? validateSignUp : validateSignIn;
    const action = isSignUp ? actions.signUp : actions.signIn;

    const { ok, values, errors } = validate(readValues(Object.values(view.fields)));
    paintErrors(errors);

    if (!ok) {
      // The field messages already say everything; no banner stacked on top.
      announce(null);
      Object.values(view.fields).find((part) => errors[part.name])?.input.focus();
      return;
    }

    announce(null);
    setBusy(true);

    // Sign-up can succeed without a session: GoTrue emails a confirmation link
    // and issues no token, which is a success state rather than a failure. The
    // panel clears the password field before handing over, so a half-finished
    // attempt does not leave a credential sitting in the DOM.

    let result;
    try {
      result = await action(values);
    } catch (error) {
      // Log the error only. `values` holds the password and must never be logged.
      log.error('provider call threw -', error.message);
      setBusy(false);
      announce(authErrorToMessage('network_request_failed', mode));
      return;
    }

    if (!result?.ok) {
      const reason = String(result?.reason ?? 'unknown');
      setBusy(false);
      // A reason code, never the credential that produced it.
      log.warn('auth refused -', reason);
      announce(authErrorToMessage(reason, mode));
      return;
    }

    if (isSignUp) {
      // Do not keep the new password in the DOM once it has been accepted.
      for (const part of Object.values(view.fields)) {
        if (part.input.type === 'password') part.input.value = '';
      }
    }

    actions.onAuthenticated(result.session ?? null);
  }

  view.node.addEventListener('submit', handleSubmit);

  // One delegated listener for the whole form: clear a field's error the moment
  // it is being fixed, and keep the password guidance live.
  view.node.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.matches('input')) return;

    if (input.getAttribute('aria-invalid') === 'true') {
      setText(input.closest('.field').querySelector('.field__error'), '');
      input.setAttribute('aria-invalid', 'false');
    }

    // The hint belongs to create-account only.
    if (mode === 'signUp' && input.name === 'password') {
      const problems = passwordProblems(input.value);
      strength.hidden = !input.value;
      setText(
        strength,
        problems.length
          ? `Still needs: ${problems.map((p) => RULE_TEXT[p]).join(', ')}`
          : 'Password looks good',
      );
    }
  });

  // A notice is shown as information, not as an error — the most common one being
  // "check your inbox to confirm", which is a success the player did not expect.
  if (actions.notice) announce(actions.notice, 'info');

  // The plank title is the form's own name, so the sign reads "Sign in" or
  // "Create account" without this file carrying a second copy of either string.
  root.append(signBoard({ title: view.label, children: [message, view.node] }));

  // The form is the point of this view, so open on its first field.
  Object.values(view.fields)[0].input.focus();

  return { unmount() { clear(root); } };
}