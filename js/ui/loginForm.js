/**
 * The sign-in and create-account form shells.
 *
 * Markup only: it builds a `<form>` out of the labelled inputs in
 * `loginFields.js`, wires the buttons to the callbacks it is handed, and hands
 * the whole thing back. It has no behaviour — no validation, no busy state, no
 * provider — which is `js/ui/loginPanel.js`'s job. Two files because together they
 * would sit well over the project's 200-line budget.
 *
 * One form per call, not both at once. The panel used to build the two forms
 * together and hide one; the menu screen gives each its own view, and a form that
 * exists only to stay hidden is a form a screen reader and a test both have to
 * reason around.
 *
 *   buildLoginForm(mode, actions) → { view, strength }
 */

import { el } from '../utils/dom.js';
import { RULE_LIST, SIGN_IN_FIELDS, SIGN_UP_FIELDS, field } from './loginFields.js';
import { backButton } from './signBoard.js';
import { play } from '../utils/sound.js';

/**
 * @param {'signIn'|'signUp'} mode
 * @param {object} actions the callbacks the panel was mounted with
 * @returns {{view: object, strength: HTMLElement}}
 */
export function buildLoginForm(mode, actions) {
  const isSignUp = mode === 'signUp';
  const scope = isSignUp ? 'signup' : 'signin';
  const spec = isSignUp ? SIGN_UP_FIELDS : SIGN_IN_FIELDS;

  const fields = {};
  for (const [name, options] of Object.entries(spec)) {
    fields[name] = field(scope, name, options);
  }

  // Only create-account carries guidance, and it sits with the password it is
  // about rather than at the foot of the form.
  const strength = el('p', { class: 'field__hint', hidden: true });
  const extras = isSignUp
    ? [el('p', { class: 'field__hint', text: `Needs ${RULE_LIST}.` }), strength]
    : [];

  const label = isSignUp ? 'Create account' : 'Sign in';

  const submit = el('button', {
    class: 'btn btn--go',
    type: 'submit',
    text: label,
  });

  // Back on the left, submit on the right — the pair a player looks for first,
  // rather than a full-width button with a text link underneath it.
  const row = el('div', { class: 'sign__row' }, [
    backButton(() => actions.onBack()),
    submit,
  ]);

  const links = isSignUp
    ? [
        link('Sign in instead', () => actions.onSwitch('signIn')),
        link('Play as guest', () => actions.onGuest()),
      ]
    : [
        link('Forgot your password?', () => actions.onForgotPassword()),
        link('Create account', () => actions.onSwitch('signUp')),
        link('Play as guest', () => actions.onGuest()),
      ];

  const parts = [];
  for (const [name, part] of Object.entries(fields)) {
    parts.push(part.wrapper);
    if (name === 'password') parts.push(...extras);
  }

  const node = el(
    'form',
    {
      class: 'auth__form',
      id: `${scope}-form`,
      novalidate: true,
      'aria-busy': 'false',
    },
    [...parts, row, el('div', { class: 'sign__footer' }, links)],
  );

  return { view: { mode, fields, submit, node, label }, strength };
}

/* --- internals ------------------------------------------------------------ */

/** A quiet text button. Still a `<button>`, so it is a button to a keyboard. */
  function link(text, onClick) {
    return el('button', {
      class: 'sign__link',
      type: 'button',
      text,
      on: {
        click: () => {
          play('click.mp3');
          onClick();
        },
      },
    });
  }