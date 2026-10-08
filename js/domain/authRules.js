/**
 * Sign-in and sign-up rules.
 *
 * Pure functions: no DOM, no storage, no provider. Every decision about whether
 * an email or password is acceptable lives here, so the panel never has to make
 * one. See `ui/authErrors.js` for provider error codes → sentences.
 */

import {
  EMAIL_PATTERN,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  USERNAME_PATTERN,
} from '../config/auth.js';
import { normaliseEmail, normaliseName, normaliseUsername } from '../utils/normalize.js';

export { normaliseEmail, normaliseName, normaliseUsername };

/** Trim an email. Case is preserved here; providers normalise their own index. */
export function emailLooksValid(email) {
  return EMAIL_PATTERN.test(normaliseEmail(email));
}

/** @returns {string[]} the ids of every rule the password fails. Empty = valid. */
export function passwordProblems(password) {
  const value = String(password ?? '');
  const problems = [];

  if (value.length < PASSWORD_MIN_LENGTH) problems.push('length');
  for (const rule of PASSWORD_RULES) {
    if (rule.id !== 'length' && !rule.test(value)) problems.push(rule.id);
  }
  return problems;
}

/** Farmer names are trimmed, collapsed, and length-checked. */
export function farmerNameLooksValid(name) {
  const value = normaliseName(name);
  return value.length >= NAME_MIN_LENGTH && value.length <= NAME_MAX_LENGTH;
}

/** Usernames are alphanumeric with underscores, 3-20 chars. */
export function usernameLooksValid(username) {
  return USERNAME_PATTERN.test(normaliseUsername(username));
}

/**
 * Validate the sign-in form. Shape only — whether the password is right needs
 * the provider, so that lives behind `actions.signIn`.
 *
 * The identifier can be either an email or a username.
 *
 * @returns {{ ok: boolean, values: {identifier:string, password:string}, errors: Record<string,string> }}
 */
export function validateSignIn({ identifier, password }) {
  const values = { identifier: String(identifier ?? '').trim(), password: String(password ?? '') };

  const errors = {};
  if (!values.identifier) errors.identifier = 'identifier_required';
  if (!values.password) errors.password = 'password_required';

  return { ok: Object.keys(errors).length === 0, values, errors };
}

/**
 * Validate the sign-up form. Every problem at once, so the panel shows them all
 * rather than one per submit.
 *
 * @returns {{ ok: boolean, values: object, errors: Record<string,string> }}
 */
export function validateSignUp({ email, password, confirmPassword, farmerName, username }) {
  const values = {
    email: normaliseEmail(email),
    password: String(password ?? ''),
    farmerName: normaliseName(farmerName),
    username: normaliseUsername(username),
  };

  const errors = {};
  if (!values.email) errors.email = 'email_required';
  else if (!emailLooksValid(values.email)) errors.email = 'email_invalid';

  if (!values.password) errors.password = 'password_required';
  else if (values.password.length > PASSWORD_MAX_LENGTH) errors.password = 'password_too_long';
  else if (passwordProblems(values.password).length > 0) errors.password = 'password_weak';

  if (!values.farmerName) errors.farmerName = 'name_required';
  else if (!farmerNameLooksValid(values.farmerName)) errors.farmerName = 'name_length';

  if (!values.username) errors.username = 'username_required';
  else if (!usernameLooksValid(values.username)) errors.username = 'username_invalid';

  if (values.password !== String(confirmPassword ?? '')) {
    errors.confirmPassword = 'password_mismatch';
  }

  return { ok: Object.keys(errors).length === 0, values, errors };
}