/**
 * The sentences a destructive action fails with.
 *
 * Split out of `settingsView.js` because both destructive actions need the same mapping
 * and the file was already past the size worth splitting at. Keeping them here also keeps
 * the reasoning in one place: **whose problem is it** is the question that decides the
 * wording, and it is the question most easily got wrong.
 *
 * Nothing here touches the DOM, so it can be reasoned about without a browser.
 */

import { createLog } from '../utils/log.js';

const log = createLog('dangerMessages');

/**
 * Was this refusal actually about the password?
 *
 * Only these two. Everything else — an expired token, a timeout, a missing migration — is
 * a different problem, and telling a player whose password was fine that "that password
 * is not right" sends them off retyping it against something else entirely.
 *
 * @param {{reason?:string}} result
 * @returns {boolean}
 */
export function isAboutPassword(result) {
  return result?.reason === 'invalid_credentials' || result?.reason === 'password_required';
}

/** Shown under the password field, not as a banner: it is about that input. */
export const WRONG_PASSWORD = 'That password is not right. Nothing was changed — try again.';

export const EMPTY_PASSWORD = 'Enter your password to confirm.';

/**
 * Delete my account, and it was not the password.
 *
 * @param {{reason?:string}} result
 * @returns {string}
 */
export function accountDeletionFailure(result) {
  const sentence = describe(result, {
    not_migrated:
      'Account deletion is not switched on on this project yet. Nothing was changed — tell the team to run the latest database migration.',
    cannot_verify_password:
      'This project cannot check passwords on the server yet, so deletion is switched off rather than allowed without one. Nothing was changed.',
    offline:
      'We could not reach the account server, so nothing was changed. Try again in a moment.',
  });

  return sentence ?? 'Your account could not be deleted. Nothing was changed — try again in a moment.';
}

/**
 * Erase all progress, and it was not the password.
 *
 * Same shape as the account one and for the same reason: `not_migrated` arrives as a bare
 * 404 from PostgREST, which is indistinguishable from a wrong URL unless something maps
 * it to words. Here the missing migration is `006`, not `005`, and saying "the latest
 * database migration" covers both without the panel knowing which is which.
 *
 * @param {{reason?:string}} result
 * @returns {string}
 */
export function progressErasureFailure(result) {
  const sentence = describe(result, {
    not_migrated:
      'Erasing progress is not switched on on this project yet. Nothing was changed — tell the team to run the latest database migration.',
    cannot_verify_password:
      'This project cannot check passwords on the server yet, so erasing is switched off rather than allowed without a password. Nothing was changed — your farm is untouched.',
    offline:
      'We could not reach the account server, so nothing was changed — your farm is untouched. Try again in a moment.',
    account_not_found:
      'We could not find your account in this browser, so there was nothing to check the password against. Nothing was changed.',
  });

  return sentence ?? 'Your farm could not be erased. Nothing was changed — try again in a moment.';
}

/**
 * The shared half of the mapping.
 *
 * Returns `null` for anything not listed, so each caller supplies its own fallback and
 * the two sentences above stay obviously different from each other.
 */
function describe(result, known) {
  if (result?.reason === 'not_signed_in') {
    return 'Sign in again before doing that, so we know whose it is.';
  }

  if (result?.reason === 'timeout' || result?.reason === 'network_request_failed' || result?.reason === 'network') {
    return known.offline;
  }

  const mapped = known[result?.reason];
  if (mapped) {
    log.info('destructive action refused -', String(result?.reason));
  }

  return mapped ?? null;
}
