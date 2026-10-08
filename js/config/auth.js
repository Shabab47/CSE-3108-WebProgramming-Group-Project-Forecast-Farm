/**
 * Authentication configuration.
 *
 * Pure data: nothing here imports anything or touches the browser.
 *
 * **The real provider has a backend now.** Supabase (DEC-018, T-29), so accounts
 * and passwords live there and never touch this browser. See `config/supabase.js`
 * for the connection and `services/authApi.js` for the calls.
 *
 * The keys below belong to the **legacy local provider** (`services/localAuth.js`),
 * which is still present only as a fallback if `authApi.js` fails to load, and as
 * the home of `signInAsGuest`. Nothing writes them on the normal path. PBKDF2
 * hashing here is obfuscation, not security — the salt, the hash and the account
 * table were all readable in devtools, which is why the provider was temporary.
 * See ISS-026 and ISS-027.
 */

/** localStorage keys. `accounts` and `session` are the legacy provider's only. */
export const AUTH_KEYS = {
  /** Legacy: the local provider's account table. Unused on the Supabase path. */
  accounts: 'forecastFarm.accounts.v1',
  /** Legacy: the local provider's session. Unused on the Supabase path. */
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

/** Username shape: alphanumeric and underscore, no spaces. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * PBKDF2 parameters, used only by the legacy local provider.
 *
 * Dead on the Supabase path — the real provider never hashes a password in the
 * browser — so this goes away with `localAuth.js` (ISS-027).
 */
export const HASH = {
  algorithm: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 210000,
  saltBytes: 16,
  keyBits: 256,
};