/**
 * The real auth provider: Supabase over plain `fetch()`.
 *
 * No `supabase-js`, per DEC-002 and DEC-018. The SDK would be one package and a
 * dependency tree, and this project has neither.
 *
 * Implements the same contract as `localAuth.js`, so nothing in `js/ui/` changes
 * when the two swap:
 *
 *   signIn({email, password})            → Promise<{ok:true, session}|{ok:false, reason}>
 *   signUp({email, password, farmerName}) → same, or {ok:true, session:null, needsConfirmation:true}
 *   signOut()                             → Promise<{ok:true}>
 *   currentSession()                      → session | null
 *   requestPasswordReset({email})         → Promise<{ok:true}|{ok:false, reason}>
 *   updatePassword({accessToken, password}) → Promise<{ok:true}|{ok:false, reason}>
 *   restoreSession()                      → Promise<session|null>
 *
 * This file is the game's view of an account: it shapes sessions and decides
 * which failures are allowed to be distinguishable. The HTTP lives in
 * `gotrue.js` and knows none of that.
 *
 * Two things it does that the local provider could not:
 *
 *  1. **Sign-in never leaks which emails exist.** `email_not_confirmed` is folded
 *     into `invalid_credentials` here as well as in the message layer, so the two
 *     layers agree (DEC-019, defence in depth).
 *
 *  2. **Password reset works**, because there is a server to email from. On the
 *     local provider there is nowhere to send a link, which is why ISS-031 calls
 *     this out as needing a configured project.
 */

import { createLog } from '../utils/log.js';
import { normaliseEmail, normaliseName } from '../utils/normalize.js';
import { SUPABASE_NOT_CONFIGURED, isSupabaseConfigured } from '../config/supabase.js';
import { bestEffort, post, postAuthed } from './gotrue.js';
import { readRefreshToken, writeRefreshToken } from './tokenStore.js';

const log = createLog('authApi');

/**
 * The live session, held in memory only — never persisted. A token in localStorage
 * is readable by any script on the origin, which is the one thing a Supabase
 * session is designed to avoid. Only the refresh token is stored, in
 * `tokenStore.js`, so a reload can restore silently.
 */
let session = null;

/** The live access token, alongside the session. See `accessToken()`. */
let token = null;

/** Reasons that must all look like "those details did not work" on sign-in. */
const CREDENTIAL_REASONS = ['invalid_credentials', 'email_not_confirmed', 'not_confirmed'];

/** Reasons a reset request swallows, so it cannot become an enumeration oracle. */
const RESET_SWALLOWED = ['invalid_credentials', 'auth_unknown'];

/* --- session shaping -------------------------------------------------------- */

/**
 * Same shape as `localAuth.makeSession`, so nothing downstream can tell which
 * provider produced it. Returns null when the payload has no user, which the
 * callers treat as a failure rather than a half-built session.
 */
function toSession(data) {
  const user = data?.user;
  if (!user?.id) return null;

  return {
    status: 'authed',
    userId: user.id,
    email: normaliseEmail(user.email ?? ''),
    // The name we sent at sign-up comes back in metadata. Falling back to the
    // email's local part means a session is never nameless if that write failed.
    farmerName: normaliseName(
      user.user_metadata?.farmer_name ?? String(user.email ?? '').split('@')[0],
    ),
  };
}

/* --- adopting a session ------------------------------------------------------ */

/** Store the refresh token and adopt the session, or report why we could not. */
function adopt(data) {
  const built = toSession(data);
  if (!built) return { ok: false, reason: 'auth_unknown' };

  session = built;
  token = data?.access_token ?? null;
  writeRefreshToken(data?.refresh_token ?? null);
  return { ok: true, session };
}

/* --- the contract ----------------------------------------------------------- */

/** @returns {object|null} */
export function currentSession() {
  return session;
}

/**
 * The current access token, for another service that has to authenticate as this
 * player — currently `services/saveApi.js`.
 *
 * Exposed rather than kept private because `services/` may not import another
 * service, so the token cannot simply be fetched where it is needed. It is
 * deliberately **not** given to any UI module: a panel must never see a token,
 * or a template could render it into the page. Only an entry point may read this.
 *
 * @returns {string|null} null when signed out, or before the first sign-in
 */
export function accessToken() {
  return session ? token : null;
}

/** Sign in with email and password. Every refusal is `invalid_credentials`. */
export async function signIn({ email, password }) {
  const result = await post('token?grant_type=password', {
    email: normaliseEmail(email),
    password,
  });

  if (!result.ok) {
    const reason = CREDENTIAL_REASONS.includes(result.reason) ? 'invalid_credentials' : result.reason;
    return { ok: false, reason };
  }

  const adopted = adopt(result.data);
  if (adopted.ok) log.info('signed in');
  return adopted;
}

/**
 * Create an account.
 *
 * With email confirmation on, GoTrue emails a link and returns **no tokens**, so
 * `session` is null and `needsConfirmation` is set. That is a success the player
 * has to act on, not a failure — checking for a user-shaped result instead of an
 * access token would sign an unconfirmed player straight in and skip the
 * `CONFIRM_EMAIL` state entirely.
 *
 * The farmer name goes in `data`, not as a top-level field: GoTrue stores `data`
 * as `raw_user_meta_data`, and an unknown top-level key would be rejected.
 */
export async function signUp({ email, password, farmerName }) {
  const result = await post('signup', {
    email: normaliseEmail(email),
    password,
    data: { farmer_name: normaliseName(farmerName) },
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  if (!result.data?.access_token) {
    log.info('registered, awaiting email confirmation');
    return { ok: true, session: null, needsConfirmation: true };
  }

  const adopted = adopt(result.data);
  if (adopted.ok) log.info('registered and signed in');
  return adopted;
}

/**
 * End the session.
 *
 * Best effort: the local session is cleared first and unconditionally, because
 * leaving a player apparently signed in after they asked to leave is worse than a
 * refresh token lingering until it expires. `scope: 'local'` asks GoTrue to drop
 * only this device's refresh token rather than signing out everywhere.
 */
export async function signOut() {
  const refreshToken = readRefreshToken();
  session = null;
  token = null;
  writeRefreshToken(null);

  if (refreshToken && isSupabaseConfigured()) {
    await bestEffort('logout', refreshToken, { scope: 'local' });
  }

  return { ok: true };
}

/**
 * Send a password-reset email.
 *
 * `redirectTo` is passed in rather than computed here, so this module keeps no
 * knowledge of where it is running — `js/auth-main.js` derives it from `location`
 * and hands it over. It matters: GoTrue sends the recovery link to the project's
 * **Site URL** unless told otherwise, and this project reads the token out of the
 * fragment on `login.html` only. If Site URL were anything else the link would land
 * on a page that ignores the fragment and the reset would silently fail. Sending it
 * explicitly removes the dependency on a dashboard setting nobody will remember.
 *
 * **Always reports success for an account-existence reason**, because a reset
 * form that says "no such account" is the same enumeration oracle as sign-in
 * (DEC-019). The panel shows one confirmation either way. Rate limiting *is*
 * surfaced: it says nothing about whether the address is registered.
 */
export async function requestPasswordReset({ email, redirectTo }) {
  const body = { email: normaliseEmail(email) };
  if (redirectTo) body.redirect_to = redirectTo;

  const result = await post('recover', body);

  if (!result.ok && !RESET_SWALLOWED.includes(result.reason)) {
    return { ok: false, reason: result.reason };
  }

  log.info('password reset requested');
  return { ok: true };
}

/**
 * Set a new password, after the player returns from the emailed link.
 *
 * The recovery link carries an access token in the URL fragment. `js/auth-main.js`
 * reads and clears that fragment, then hands the token in here — this function
 * stays free of DOM so it stays testable.
 */
export async function updatePassword({ accessToken, password }) {
  if (!isSupabaseConfigured()) return { ok: false, reason: SUPABASE_NOT_CONFIGURED };
  if (!accessToken) return { ok: false, reason: 'no_recovery_session' };

  const result = await postAuthed('user', accessToken, { password }, 'PUT');

  if (!result.ok) {
    log.warn('password update refused -', result.reason);
    // GoTrue's own reason is usually about the new password, so keep that if we
    // recognised it, and only fall back when we did not.
    return { ok: false, reason: result.reason === 'auth_unknown' ? 'password_weak' : result.reason };
  }

  log.info('password updated');
  return { ok: true };
}

/**
 * Restore a session on boot from the stored refresh token.
 *
 * Called before `store.init` so a reload does not bounce the player to the login
 * form. Any failure returns null and signs out: a player with no usable token is
 * simply signed out, which is correct and needs no error message.
 */
export async function restoreSession() {
  const refreshToken = readRefreshToken();
  if (!refreshToken || !isSupabaseConfigured()) return null;

  const result = await post('token?grant_type=refresh_token', { refresh_token: refreshToken });
  if (!result.ok) {
    log.warn('refresh failed, signing out');
    writeRefreshToken(null);
    return null;
  }

  const adopted = adopt(result.data);
  // Keep the old token if the response carried none, so a refresh that omits it
  // does not sign the player out on the next reload.
  if (!result.data?.refresh_token) writeRefreshToken(refreshToken);
  return adopted.ok ? session : null;
}