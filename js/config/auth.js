/**
 * Authentication configuration.
 *
 * Pure data: nothing here imports anything or touches the browser.
 *
 * NOTE: this project has no backend. Accounts live in localStorage and the
 * password is stored as a PBKDF2 hash so a casual look at devtools does not
 * reveal it. That is obfuscation, not security -- see DEC-017 and ISS-026.
 */

/** localStorage keys. */
export const AUTH_KEYS = {
  accounts: 'forecastFarm.accounts.v1',
  session: 'forecastFarm.session.v1',
  /** Save keys are per account: `forecastFarm.save.v1:<accountId>`. */
  savePrefix: 'forecastFarm.save.v1:',
};

/** Email shape. Deliberately permissive: one @, a dot in the domain. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Password policy. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // PBKDF2 key length ceiling is generous; this is ours
export const PASSWORD_RULES = [
  { id: 'length', test: (value) => value.length >= PASSWORD_MIN_LENGTH },
  { id: 'letter', test: (value) => /[a-zA-Z]/.test(value) },
  { id: 'number', test: (value) => /\d/.test(value) },
];

/** Display name bounds. */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 24;

/** PBKDF2 parameters. Iterations are deliberately slow. */
export const HASH = {
  algorithm: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 210000,
  saltBytes: 16,
  keyBits: 256,
};

/** How long a signed-in session stays valid. */
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/** Password strength buckets, weakest first. Used by the meter on the form. */
export const STRENGTH_LEVELS = [
  { id: 'weak', label: 'Weak' },
  { id: 'fair', label: 'Fair' },
  { id: 'good', label: 'Good' },
  { id: 'strong', label: 'Strong' },
];