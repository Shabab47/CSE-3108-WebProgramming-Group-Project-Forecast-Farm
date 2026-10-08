/**
 * Normalisation helpers.
 *
 * Small pure functions shared by the auth rules and the account store, so
 * `A@B.com` and `a@b.com` can never become two accounts.
 */

/** Trim and lowercase an email. */
export function normaliseEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/** Trim a display name and collapse internal runs of whitespace. */
export function normaliseName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Trim and lowercase a username. */
export function normaliseUsername(username) {
  return String(username ?? '')
    .trim()
    .toLowerCase();
}