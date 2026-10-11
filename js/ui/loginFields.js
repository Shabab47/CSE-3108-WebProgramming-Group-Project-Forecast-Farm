/**
 * Labelled inputs, and nothing else.
 *
 * These are `<input>`s with matching `for`/`id` pairs, a live error slot under
 * each, and a reveal toggle on the password ones. That pairing is the standard
 * the project holds itself to for plots, and it is what a screen reader uses —
 * so it is worth having in one file that has no opinions about auth.
 *
 * Ids are prefixed by scope, because a page holding two forms cannot reuse an id:
 * a duplicate silently breaks the label and `aria-describedby` pairing that
 * screen readers depend on. Hence the sign-in and create-account forms never
 * clone each other.
 *
 * `js/ui/loginForm.js` builds the form shells out of these; `js/ui/loginPanel.js`
 * runs them.
 */

import { el, setText } from '../utils/dom.js';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '../config/auth.js';

export const RULE_TEXT = {
  length: `at least ${PASSWORD_MIN_LENGTH} characters`,
  letter: 'a letter',
  number: 'a number',
};

export const RULE_LIST = PASSWORD_RULES.map((rule) => RULE_TEXT[rule.id]).join(', ');

/** The fields each form asks for, in the order the player meets them. */
export const SIGN_IN_FIELDS = {
  identifier: { label: 'Email or username', type: 'text', autocomplete: 'username', placeholder: 'you@example.com or username' },
  password: { label: 'Password', type: 'password', autocomplete: 'current-password', placeholder: 'Your password' },
};

export const SIGN_UP_FIELDS = {
  farmerName: { label: 'Farmer name', type: 'text', autocomplete: 'name', placeholder: 'How should we greet you?' },
  username: { label: 'Username', type: 'text', autocomplete: 'username', placeholder: 'Choose a unique username' },
  email: { label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' },
  password: { label: 'Password', type: 'password', autocomplete: 'new-password', placeholder: 'At least 8 characters' },
  confirmPassword: { label: 'Confirm password', type: 'password', autocomplete: 'new-password', placeholder: 'Type it again' },
};

/**
 * One labelled field.
 *
 * @param {string} scope id prefix, e.g. 'signin'
 * @param {string} name form field name
 * @param {{label:string, type?:string, autocomplete?:string, placeholder?:string}} options
 * @returns {{name:string, input:HTMLInputElement, error:HTMLElement, wrapper:HTMLElement}}
 */
export function field(scope, name, options) {
  const id = `${scope}-${name}`;
  const errorId = `${id}-error`;

  const input = el('input', {
    class: 'input',
    id,
    name,
    type: options.type ?? 'text',
    autocomplete: options.autocomplete,
    placeholder: options.placeholder,
    'aria-describedby': errorId,
  });

  const error = el('p', { class: 'field__error', id: errorId });
  const control = el('div', { class: 'field__control' }, [input]);

  if (options.type === 'password') {
    input.classList.add('input--with-action');
    control.append(revealButton(input, options.label));
  }

  const wrapper = el('div', { class: 'field' }, [
    el('label', { class: 'field__label', for: id, text: options.label }),
    control,
    error,
  ]);

  return { name, input, error, wrapper };
}

/** Read every field in a form into a `{name: value}` object. */
export function readValues(fields) {
  return Object.fromEntries(fields.map((part) => [part.name, part.input.value]));
}

/* --- internals ------------------------------------------------------------ */

function revealButton(input, label) {
  const name = label.toLowerCase();

  const toggle = el('button', {
    class: 'input__action',
    type: 'button',
    text: 'Show',
    'aria-label': `Show ${name}`,
    on: {
      click: () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        setText(toggle, showing ? 'Show' : 'Hide');
        toggle.setAttribute('aria-label', `${showing ? 'Show' : 'Hide'} ${name}`);
      },
    },
  });

  return toggle;
}