/**
 * The real auth provider: Supabase over plain `fetch()`.
 *
 * No `supabase-js`, per DEC-002 and DEC-018. The SDK would be one package and a
 * dependency tree, and this project has neither.
 *
 * Implements the same contract as `localAuth.js`, so nothing in `js/ui/` changes
 * when the two swap:
 *
 *   signIn({identifier, password})            → Promise<{ok:true, session}|{ok:false, reason}>
 *   signUp({email, password, farmerName, username}) → same, or {ok:true, session:null, needsConfirmation:true}
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
import { normaliseEmail, normaliseName, normaliseUsername } from '../utils/normalize.js';
import { SUPABASE_NOT_CONFIGURED, connection, isSupabaseConfigured } from '../config/supabase.js';
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
    username: normaliseUsername(user.user_metadata?.username ?? ''),
  };
}

/* --- the usernames table ----------------------------------------------------
 *
 * GoTrue's password grant takes an email and nothing else, so a username sign-in
 * has to become an email address before it can be sent anywhere. `username` is the
 * primary key of `public.usernames`, which is what makes it unique — enforced by
 * the database rather than by a read-then-write here, so two players racing for the
 * same name cannot both win. See `supabase/migrations/002_usernames.sql`.
 *
 * These calls live here rather than in a sibling service because `services/` may
 * not import another service, and the token only exists in this module. That is the
 * same constraint that put `accessToken()` on the public surface of the provider.
 */

/** PostgREST headers. `onConflict` needs the unique index on `user_id`. */
function restHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: connection().anonKey,
    ...extra,
  };
}

/**
 * A request with a deadline, so a half-open PostgREST connection cannot hang the game.
 *
 * Both callers below are awaited from `adopt()`, which sits on the boot path — a
 * request that never answers would stop `restoreSession()` resolving, and with it the
 * redirect to the login form. The player would get a permanently blank page with no
 * way forward. `saveApi.js` and `accountApi.js` both arm an `AbortController` for the
 * same reason; these two did not, which is why `restoreSession()` is now wrapped in
 * `Promise.race` below as a second line of defence.
 */
const REST_TIMEOUT_MS = 10_000;

/**
 * @param {string} path path under `/rest/v1`
 * @param {{method?:string, headers?:object, body?:object}} options
 * @returns {Promise<{ok:true, data:any}|{ok:false, reason:string, status?:number}>}
 */
async function rest(path, { method = 'GET', headers = {}, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);

  try {
    const response = await fetch(`${connection().url}/rest/v1/${path}`, {
      method,
      headers: restHeaders(headers),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) return { ok: false, reason: 'server_error', status: response.status };

    // 204 and a scalar RPC both answer with no useful body in one case or another;
    // a parse failure is not an error worth propagating.
    try {
      return { ok: true, data: await response.json() };
    } catch {
      return { ok: true, data: null };
    }
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timeout' : 'network_request_failed';
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The email a username belongs to, or null when it is free or the table is missing.
 *
 * Anonymous by design: a username is being resolved *before* there is a session. This
 * goes through `email_for_username()` rather than reading the table, because the table
 * has no SELECT policy for `anon` — reading it directly was a full directory dump of
 * every username and email to anyone holding the shipped anon key. See
 * `002_usernames.sql`.
 *
 * Null covers "no such username", "function not migrated yet" and "offline" alike, and
 * the caller turns all three into `invalid_credentials`, which is also what a wrong
 * password produces.
 */
async function lookupEmailByUsername(username) {
  if (!isSupabaseConfigured() || !username) return null;

  // Function name and argument are separate, so the username is JSON-encoded rather
  // than interpolated into a URL: no escaping to get wrong, and no way for a crafted
  // username to alter the filter.
  const result = await rest('rpc/email_for_username', {
    method: 'POST',
    body: { wanted: username },
  });

  return result.ok && typeof result.data === 'string' ? result.data : null;
}

/**
 * Whether a username is already registered.
 *
 * Checked at sign-up so the player is told before the account exists, rather than
 * discovering at their next sign-in that the name they chose silently never worked.
 * It is still only a courtesy check — the primary key is what actually decides, and
 * a name taken between this call and the write below is caught there.
 */
async function usernameIsTaken(username) {
  if (!isSupabaseConfigured() || !username) return false;
  return (await lookupEmailByUsername(username)) !== null;
}

/**
 * Record the username for an account that has just become a session.
 *
 * Called from `adopt()` rather than from `signUp()`, and that ordering is the whole
 * design. With email confirmation on, `signUp()` gets back no session and no user
 * id, so there is nothing to attach a row to — the account does not exist yet as far
 * as the caller is concerned. Adopting a session is the first moment we hold a user
 * id, a bearer token the RLS policy will accept, and the metadata username together.
 * It also means an account created before this table existed heals itself the first
 * time its owner signs in, instead of needing a backfill.
 *
 * Failures are swallowed on purpose. The player is authenticated by this point: GoTrue
 * has already issued tokens and the farm is about to load. Refusing the sign-in
 * because a metadata row could not be written would turn a cosmetic failure into a
 * lockout, and the cost is only that this one account cannot sign in by username yet.
 *
 * @returns {Promise<boolean>} whether the row is on record
 */
async function recordUsername({ userId, username, email, accessToken }) {
  if (!isSupabaseConfigured() || !userId || !username || !accessToken) return false;

  // `Prefer: resolution=merge-duplicates` is deliberately absent: RLS refuses it (every
  // variant answers 403, the same body without the header answers 201), and there is no
  // owner SELECT policy at the time this was written — which is why the upsert had to
  // go. `002_usernames.sql` now grants the owner a SELECT policy on their own row, so
  // the update-and-reinsert path below is available again.
  const result = await rest('usernames', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { username, email, user_id: userId },
  });

  if (result.ok) return true;

  // 409 means a row already claims this username *or* this account already has one.
  // Which of the two changes what to do next, and the difference matters: the second
  // means the player's metadata username changed, and the row they are still holding
  // has to be released or it keeps the old name claimed forever (ISS-042).
  if (result.status !== 409) {
    log.warn('username not recorded -', result.status ?? result.reason);
    return false;
  }

  return (await releaseStaleUsername({ userId, accessToken })) ? true : false;
}

/**
 * Delete this account's username row so a new one can take its place.
 *
 * Runs when an insert conflicts, which is the signal that the account already holds a
 * row that no longer matches its metadata — the rename case. Without it the old username
 * stays claimed by an account that cannot answer to it, permanently and silently.
 *
 * Filtered on `user_id`, not on the username, so it can only ever touch this caller's own
 * row however the rename went. A failure is not fatal: the account still works, and the
 * name is a cosmetic loss, so this reports rather than throwing.
 */
async function releaseStaleUsername({ userId, accessToken }) {
  const result = await rest(`usernames?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (result.ok) {
    log.info('released a stale username row');
    return true;
  }

  // 404 means the migration has not been run, or the row is not there after all — in
  // which case there was nothing to release and the conflict was somebody else's name.
  if (result.status !== 404) {
    log.warn('could not release the stale username -', result.status ?? result.reason);
  }
  return false;
}

/* --- adopting a session ------------------------------------------------------ */

/**
 * Store the refresh token and adopt the session, or report why we could not.
 *
 * Async only because the username row is written here — see `recordUsername`. That
 * write cannot fail the sign-in, so awaiting it costs one request on a path that
 * already makes several and buys a username that works from the next page load rather
 * than the one after.
 */
async function adopt(data) {
  const built = toSession(data);
  if (!built) return { ok: false, reason: 'auth_unknown' };

  session = built;
  token = data?.access_token ?? null;
  writeRefreshToken(data?.refresh_token ?? null);

  // No pending-deletion check here any more. An earlier version cancelled a scheduled
  // 7-day deletion on every session adoption, which cost a request on every page load
  // to protect against a grace period that no longer exists.
  if (built.username) {
    await recordUsername({
      userId: built.userId,
      username: built.username,
      email: built.email,
      accessToken: token,
    });
  }

  // `built`, **not** the module-level `session`. The two awaits above are a window in
  // which a concurrent `signOut()` can null `session`, and returning it would hand the
  // caller `{ok: true, session: null}` — which the login page reads as "signed up but
  // awaiting confirmation" and answers with a confirmation-email notice for an account
  // that needed no confirmation. The session that was just built is the correct answer
  // regardless of what happened to the variable since.
  return { ok: true, session: built };
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

/**
 * Sign in with an identifier (email or username) and password.
 * Every refusal is `invalid_credentials`.
 */
export async function signIn({ identifier, password }) {
  const id = String(identifier ?? '').trim();
  const isEmail = id.includes('@');
  const email = isEmail ? normaliseEmail(id) : await lookupEmailByUsername(normaliseUsername(id));

  if (!email) {
    return { ok: false, reason: 'invalid_credentials' };
  }

  const result = await post('token?grant_type=password', {
    email,
    password,
  });

  if (!result.ok) {
    const reason = CREDENTIAL_REASONS.includes(result.reason) ? 'invalid_credentials' : result.reason;
    return { ok: false, reason };
  }

  const adopted = await adopt(result.data);
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
 * The farmer name and username go in `data`, not as top-level fields: GoTrue
 * stores `data` as `raw_user_meta_data`, and an unknown top-level key would be
 * rejected.
 *
 * The username is checked for being taken *first*, before the account is created.
 * A refusal is much cheaper than an account that exists and cannot sign in by
 * username, and the player still gets the specific "that username is taken"
 * message rather than a neutral one, because they are typing it into a sign-up
 * form and learn nothing they did not already know.
 */
export async function signUp({ email, password, farmerName, username }) {
  const wanted = normaliseUsername(username);
  if (wanted && await usernameIsTaken(wanted)) {
    return { ok: false, reason: 'username_taken' };
  }

  const result = await post('signup', {
    email: normaliseEmail(email),
    password,
    data: {
      farmer_name: normaliseName(farmerName),
      username: wanted,
    },
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  if (!result.data?.access_token) {
    log.info('registered, awaiting email confirmation');
    return { ok: true, session: null, needsConfirmation: true };
  }

  const adopted = await adopt(result.data);
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
 *
 * **The `Promise.race` is a second line of defence, not decoration.** `adopt()` awaits
 * two PostgREST calls now, and both have their own 10 s timeouts. This covers the case
 * where a future change makes one of them hang anyway: without it, `restoreSession()`
 * never settles, so `resolveSession()` never settles, so `start()` never reaches
 * `location.replace(LOGIN_URL)` — and the player is left staring at a blank page with no
 * way to reach the login form. A game that cannot be played is worse than one that asks
 * to sign in again.
 */
const RESTORE_HARD_LIMIT_MS = 15_000;

export async function restoreSession() {
  const refreshToken = readRefreshToken();
  if (!refreshToken || !isSupabaseConfigured()) return null;

  return Promise.race([
    restore(refreshToken),
    new Promise((resolve) => {
      const timer = setTimeout(() => {
        log.warn('restore did not settle in time, treating as signed out');
        writeRefreshToken(null);
        resolve(null);
      }, RESTORE_HARD_LIMIT_MS);
      // Do not hold the event loop open for this timer once the race is decided.
      timer.unref?.();
    }),
  ]);
}

async function restore(refreshToken) {
  const result = await post('token?grant_type=refresh_token', { refresh_token: refreshToken });
  if (!result.ok) {
    log.warn('refresh failed, signing out');
    writeRefreshToken(null);
    return null;
  }

  const adopted = await adopt(result.data);
  // Keep the old token if the response carried none, so a refresh that omits it
  // does not sign the player out on the next reload.
  if (!result.data?.refresh_token) writeRefreshToken(refreshToken);
  return adopted.ok ? adopted.session : null;
}
