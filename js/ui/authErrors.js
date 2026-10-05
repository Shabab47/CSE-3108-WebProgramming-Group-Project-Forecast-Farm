/**
 * Provider error codes → human sentences.
 *
 * One pure function, no DOM, no provider import. Provider error codes stop here
 * and never reach render code, so swapping the provider does not touch the
 * panel. `tests/authErrors.test.js` covers it without a browser.
 *
 * `context` is which flow raised the error, and it matters for security:
 *
 *   'signIn'  — every reason that could reveal whether an account exists is
 *               collapsed into one neutral sentence. A login form that says
 *               "no account with that email" is an account-enumeration oracle.
 *   'signUp'  — the player already typed that address, so being specific helps
 *               them and reveals nothing.
 *   'session' — refresh or restore failures.
 */

export const NEUTRAL_SIGN_IN = 'Check your email and password and try again.';

/** Shown after sign-up, which is where a new player learns they must confirm. */
export const CONFIRM_EMAIL =
  'Almost there — check your inbox for the confirmation link, then sign in.';

/**
 * Messages keyed by reason. Any reason absent from here falls back by shape, so
 * a new provider code still produces something better than an exception.
 */
const MESSAGES = {
  // --- credential and account problems, provider-neutral names ---
  invalid_credentials: NEUTRAL_SIGN_IN,
  wrong_password: NEUTRAL_SIGN_IN,
  no_account: NEUTRAL_SIGN_IN,
  email_taken: 'That email already has an account. Sign in instead.',
  user_already_exists: 'That email already has an account. Sign in instead.',
  password_mismatch: 'The two passwords do not match.',

  // --- verification ---
  email_not_confirmed: CONFIRM_EMAIL,
  not_confirmed: CONFIRM_EMAIL,

  // --- validation, mirrored from domain/authRules.js ---
  email_required: 'Enter your email address.',
  email_invalid: 'That does not look like an email address.',
  password_required: 'Enter your password.',
  password_too_long: 'That password is too long.',
  password_weak: 'Use at least 8 characters, with a letter and a number.',
  name_required: 'Tell us what to call you.',
  name_length: 'Names are 2 to 24 characters.',

  // --- connectivity ---
  offline: 'No connection. The farm needs the network to sign you in.',
  network_request_failed: 'Could not reach the server. Check your connection.',
  timeout: 'The server took too long to answer. Try again.',

  // --- throttling. The backend does the rate limiting; we only report it. ---
  too_many_requests: 'Too many attempts. Wait a minute, then try again.',
  rate_limited: 'Too many attempts. Wait a minute, then try again.',

  // --- server and storage ---
  server_error: 'Something went wrong on our side. Try again in a moment.',
  storage_unavailable: 'This browser is blocking storage, so your farm cannot be saved.',
  storage_write_failed: 'This browser is blocking storage, so your farm cannot be saved.',
};

/**
 * Reasons that must never be shown verbatim on the sign-in path, because each
 * one tells the caller whether the email is registered. Listed explicitly so
 * adding a new provider code cannot accidentally widen the oracle.
 */
const ENUMERATION_SENSITIVE = new Set([
  'invalid_credentials',
  'wrong_password',
  'no_account',
  'email_taken',
  'user_already_exists',
  'email_not_confirmed',
  'not_confirmed',
]);

/**
 * @param {string} reason provider or domain error code
 * @param {'signIn'|'signUp'|'session'} context
 * @returns {string} a sentence safe to show a player
 */
export function authErrorToMessage(reason, context = 'signIn') {
  if (context === 'signIn' && ENUMERATION_SENSITIVE.has(reason)) {
    return NEUTRAL_SIGN_IN;
  }

  const known = MESSAGES[reason];
  if (known) return known;

  // Unmapped provider code: never surface the raw string, it may be a URL or a
  // stack fragment. Bucket by what it looks like instead.
  if (/network|fetch|offline|timeout|abort/i.test(reason)) return MESSAGES.offline;
  if (/limit|too_many|rate/i.test(reason)) return MESSAGES.too_many_requests;

  return context === 'signUp'
    ? 'That did not work. Check the form and try again.'
    : NEUTRAL_SIGN_IN;
}

/**
 * Whether a reason means "we could not reach the server", which the panel shows
 * differently because guest play is still available.
 */
export function isConnectivityReason(reason) {
  return /network|fetch|offline|timeout|abort|server_error/i.test(reason);
}

/**
 * Whether a reason means the account exists but has not confirmed its email.
 * Checked at sign-up time, where telling the player is the whole point.
 */
export function isUnconfirmedReason(reason) {
  return /not_confirmed|unconfirmed|verify/i.test(reason);
}