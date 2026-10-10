/**
 * Form parts for the login panel.
 *
 * Split out to keep `loginPanel.js` inside the ~200-line budget. Nothing here
 * knows about auth: these are labelled inputs with matching `for`/`id` pairs,
 * plus the two form shells built from them. That pairing is the standard the
 * project holds itself to for plots, and it is what a screen reader uses.
 */

import { el, setText } from '../utils/dom.js';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from '../config/auth.js';

export const RULE_TEXT = {
  length: `at least ${PASSWORD_MIN_LENGTH} characters`,
  letter: 'a letter',
  number: 'a number',
};

export const RULE_LIST = PASSWORD_RULES.map((rule) => RULE_TEXT[rule.id]).join(', ');

const EMAIL_INPUT = { label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' };
const IDENTIFIER_INPUT = { label: 'Email or username', type: 'text', autocomplete: 'username', placeholder: 'you@example.com or username' };
const USERNAME_INPUT = { label: 'Username', type: 'text', autocomplete: 'username', placeholder: 'Choose a unique username' };

/**
 * One labelled field.
 *
 * Ids are prefixed by scope, because a page holding two forms cannot reuse an id:
 * a duplicate silently breaks the label and `aria-describedby` pairing that screen
 * readers depend on. Hence the two forms never clone each other.
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

/**
 * One form: its scoped fields, its submit button and its node kept together, so
 * the panel can switch between them without a pile of loose variables.
 *
 * `extras` are inserted directly after the field named by `extrasAfter`, not
 * appended at the end. Guidance about a field has to sit next to that field —
 * a password hint below the confirmation box reads as being about the wrong
 * input.
 */
function buildForm({ id, labelledBy, label, fields, extras = [], extrasAfter = null }) {
  const submit = el('button', {
    class: 'btn btn--primary btn--block auth__submit',
    type: 'submit',
    text: label,
  });

  const parts = [];
  for (const name of Object.keys(fields)) {
    parts.push(fields[name].wrapper);
    if (name === extrasAfter) parts.push(...extras);
  }
  if (extrasAfter === null) parts.push(...extras);

  const node = el(
    'form',
    {
      class: 'auth__form',
      id,
      novalidate: true,
      'aria-busy': 'false',
      role: 'tabpanel',
      'aria-labelledby': labelledBy,
      hidden: true,
    },
    [...parts, submit],
  );

  return { fields, submit, node, label };
}

/**
 * Both forms, plus the password guidance node they share.
 *
 * The hint is returned rather than buried inside a form, because the panel is
 * the only thing that knows when it should update.
 */
export function buildForms() {
  const strength = el('p', { class: 'field__hint', hidden: true });
  const rules = el('p', { class: 'field__hint', text: `Needs ${RULE_LIST}.` });

  const signIn = buildForm({
    id: 'signin-form',
    labelledBy: 'tab-signin',
    label: 'Sign in',
    fields: {
      identifier: field('signin', 'identifier', IDENTIFIER_INPUT),
      password: field('signin', 'password', {
        label: 'Password',
        type: 'password',
        autocomplete: 'current-password',
        placeholder: 'Your password',
      }),
    },
  });

  const signUp = buildForm({
    id: 'signup-form',
    labelledBy: 'tab-signup',
    label: 'Create account',
    fields: {
      farmerName: field('signup', 'farmerName', {
        label: 'Farmer name',
        autocomplete: 'name',
        placeholder: 'How should we greet you?',
      }),
      username: field('signup', 'username', USERNAME_INPUT),
      email: field('signup', 'email', EMAIL_INPUT),
      password: field('signup', 'password', {
        label: 'Password',
        type: 'password',
        autocomplete: 'new-password',
        placeholder: 'At least 8 characters',
      }),
      confirmPassword: field('signup', 'confirmPassword', {
        label: 'Confirm password',
        type: 'password',
        autocomplete: 'new-password',
        placeholder: 'Type it again',
      }),
    },
    extras: [rules, strength],
    extrasAfter: 'password',
  });

  return { forms: { signIn, signUp }, strength };
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