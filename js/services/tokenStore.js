/**
 * Persistence for the auth refresh token.
 *
 * Its own file because it is the only part of the provider that touches storage,
 * and that fact needs to be obvious to anyone auditing the provider. It is also
 * the one place a token is written, so "where does the token live" has a
 * single-file answer.
 *
 * Why localStorage at all, given a token there is readable by any script on the
 * origin: this is the *refresh* token, it is only used to mint a new short-lived
 * access token on boot, and without it a reload would sign the player out. It is
 * a deliberate trade, not an oversight. The access token itself is never stored.
 */

import { createLog } from '../utils/log.js';

const log = createLog('tokenStore');

const KEY = 'forecastFarm.auth.refresh.v1';

/** @returns {string|null} */
export function readRefreshToken() {
  try {
    return localStorage.getItem(KEY);
  } catch (error) {
    // localStorage throws outright in some private-browsing modes. Signing the
    // player out is the correct degradation; crashing the login page is not.
    log.warn('refresh token unreadable -', error.message);
    return null;
  }
}

/** @param {string|null} token null clears it */
export function writeRefreshToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch (error) {
    log.warn('refresh token unwritable -', error.message);
  }
}
