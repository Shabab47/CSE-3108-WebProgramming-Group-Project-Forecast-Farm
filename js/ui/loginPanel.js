/**
 * The sign-in / sign-up panel.
 *
 * Render and events only. Every outside call arrives through `actions`, so this
 * file has no idea what the provider is — swapping Supabase for anything else
 * touches `authApi.js` and nothing here.
 *
 * Provider error codes never reach this file as strings: `ui/authErrors.js`
 * turns them into sentences and neutralises the ones that would otherwise let a
 * caller discover which emails have accounts.
 *
 *   mountLoginPanel(root, actions) → { unmount() }
 *
 * actions:
 *   currentSession()                      → session | null
 *   signIn({email, password})             → Promise<{ok:true, session}|{ok:false, reason}>
 *   signUp({email, password, farmerName}) → same
 *   signOut()                             → Promise<{ok:true}>
 *   onAuthenticated(session|null)         → route onward; null means awaiting confirmation
 *   onGuest()                             → continue without an account
 *   onForgotPassword()                    → open the reset flow
 *   notice                                → optional sentence to show on arrival
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { validateSignIn, validateSignUp, passwordProblems } from '../domain/authRules.js';
import { authErrorToMessage } from './authErrors.js';
import { RULE_TEXT, buildForms, readValues } from './loginFields.js';

const log = createLog('loginPanel');

export function mountLoginPanel(root, actions) {
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

  const { forms, strength } = buildForms();
  let mode = 'signIn';
  let busy = false;

  const active = () => forms[mode];

  function paintErrors(errors) {
    for (const part of Object.values(active().fields)) {
      const code = errors[part.name];
      setText(part.error, code ? authErrorToMessage(code, mode) : '');
      part.input.setAttribute('aria-invalid', code ? 'true' : 'false');
    }
  }

  function show(next) {
    mode = next;
    announce(null);
    for (const [key, view] of Object.entries(forms)) view.node.hidden = key !== next;
    for (const button of tabs.children) {
      button.setAttribute('aria-selected', String(button.dataset.mode === next));
    }
    Object.values(forms[next].fields)[0].input.focus();
  }

  /**
   * Disables every control and marks the form busy. One flag covers both forms,
   * so a second submit cannot get through while the first is still in flight.
   */
  function setBusy(isBusy) {
    busy = isBusy;
    for (const view of Object.values(forms)) {
      view.node.setAttribute('aria-busy', String(isBusy));
      setText(view.submit, isBusy ? 'Working…' : view.label);
    }
    for (const node of root.querySelectorAll('input, button')) node.disabled = isBusy;
    guest.hidden = isBusy;
    forgot.hidden = isBusy;
  }

  async function handleSubmit(view, validate, action) {
    if (busy) return;

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
    const isSignUp = action === actions.signUp;

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

  forms.signIn.node.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit(forms.signIn, validateSignIn, actions.signIn);
  });

  forms.signUp.node.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit(forms.signUp, validateSignUp, actions.signUp);
  });

  // One delegated listener covers both forms: clear a field's error the moment it
  // is being fixed, and keep the password guidance live.
  root.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.matches('input')) return;

    if (input.getAttribute('aria-invalid') === 'true') {
      setText(input.closest('.field').querySelector('.field__error'), '');
      input.setAttribute('aria-invalid', 'false');
    }

    // The hint belongs to sign-up only. Both forms have a field called
    // "password", so the test has to be which form, not which name.
    if (forms.signUp.node.contains(input) && input.name === 'password') {
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

  const tabs = el('div', { class: 'tabs', role: 'tablist' }, [
    el('button', { class: 'tab', type: 'button', role: 'tab', id: 'tab-signin', text: 'Sign in', dataset: { mode: 'signIn' }, 'aria-selected': 'true', 'aria-controls': 'signin-form', on: { click: () => show('signIn') } }),
    el('button', { class: 'tab', type: 'button', role: 'tab', id: 'tab-signup', text: 'Create account', dataset: { mode: 'signUp' }, 'aria-selected': 'false', 'aria-controls': 'signup-form', on: { click: () => show('signUp') } }),
  ]);

  const guest = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Play as guest',
    on: { click: () => actions.onGuest() },
  });

  // Inside the sign-in form, not beside the tabs: it only makes sense to someone
  // who cannot get past that form.
  const forgot = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Forgot your password?',
    on: { click: () => actions.onForgotPassword() },
  });
  forms.signIn.node.append(forgot);

  // A notice is shown as information, not as an error — the most common one being
  // "check your inbox to confirm", which is a success the player did not expect.
  if (actions.notice) announce(actions.notice, 'info');

  root.append(
    el('div', { class: 'auth__card' }, [
      el('div', { class: 'auth__brand' }, [
        el('div', { class: 'auth__mark', 'aria-hidden': 'true', text: '🌾' }),
        el('h1', { class: 'auth__title', text: 'Forecast Farm' }),
        el('p', { class: 'auth__subtitle', text: 'A farm that runs on your real weather.' }),
      ]),
      message,
      tabs,
      forms.signIn.node,
      forms.signUp.node,
      el('div', { class: 'auth__divider' }, [guest]),
      el('p', { class: 'auth__note', text: 'A guest farm stays in this browser and cannot be exported.' }),
    ]),
  );

  show(mode);

  return { unmount() { clear(root); } };
}