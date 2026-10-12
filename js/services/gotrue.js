/**
 * The GoTrue transport: URL building, headers, and turning a response into
 * `{ok, data}` or `{ok, reason}`.
 *
 * Split out of `authApi.js` because it is the part most likely to change — GoTrue
 * moves its error strings around — and it is the part that must never throw. The
 * provider above it only deals in reasons, never in HTTP.
 *
 * Nothing here knows what a farm, a session or a password is.
 */

import { createLog } from '../utils/log.js';
import { AUTH_TIMEOUT_MS } from '../config/game.js';
import { SUPABASE_NOT_CONFIGURED, connection, isSupabaseConfigured } from '../config/supabase.js';

const log = createLog('gotrue');

/**
 * Arm a deadline on a request.
 *
 * **This was missing until ISS-049, and its absence is why players were logged out
 * on their own.** A `fetch` with no signal hangs forever on a half-open connection.
 * This module sits on the boot path, so a hang meant `restoreSession()`'s 15 s
 * `Promise.race` fired, which reported "signed out" and threw away the refresh
 * token — a slow network was indistinguishable from a dead session.
 *
 * `saveApi.js` and `authApi.rest()` already did this. Every request in the project
 * now has a deadline, for the same reason: a game that cannot be played is worse
 * than one that fails fast and says so.
 *
 * @returns {{signal: AbortSignal, cancel: () => void}}
 */
function withDeadline() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  // Do not hold the event loop open for this timer once the request settles.
  const cancel = () => {
    clearTimeout(timer);
    timer.unref?.();
  };
  return { signal: controller.signal, cancel };
}

/**
 * GoTrue error text to our neutral reason names.
 *
 * Matched on substrings because GoTrue answers in human sentences, not codes, so
 * there is nothing stable to switch on. Every entry maps to a reason name that
 * `js/ui/authErrors.js` already has a sentence for; anything unmatched becomes
 * `auth_unknown` rather than passing the raw string through.
 *
 * `email_not_confirmed` maps to `invalid_credentials` deliberately: a distinct
 * reason would tell the caller the account exists but is unconfirmed, which is
 * the enumeration oracle DEC-019 exists to prevent. The useful "check your inbox"
 * sentence still reaches the player on the *sign-up* path, where they just typed
 * the address and learn nothing they did not already know.
 */
const REASONS = [
  [/invalid login credentials/i, 'invalid_credentials'],
  [/email not confirmed/i, 'invalid_credentials'],
  [/user already registered/i, 'email_taken'],
  [/user already exists/i, 'email_taken'],
  [/password should be at least/i, 'password_weak'],
  // GoTrue's actual wording for a refused address is
  // `Email address "someone@example.com" is invalid` — not "invalid email", which is what this
  // pattern originally expected and why ISS-035 happened. The wording was confirmed against the
  // live project, not taken from the docs.
  [/unable to validate email|invalid email|is invalid/i, 'email_invalid'],
  [/email rate limit|too many|rate limit|over_request/i, 'too_many_requests'],
  [/fetch|network|failed to fetch|load failed/i, 'network_request_failed'],
];

/** @param {string} message provider text */
export function reasonFor(message) {
  for (const [pattern, reason] of REASONS) {
    if (pattern.test(message)) return reason;
  }
  return 'auth_unknown';
}

function headers(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: connection().anonKey,
    ...extra,
  };
}

/**
 * Read a response body, tolerating a non-JSON one.
 *
 * A reverse proxy in front of the project can answer with HTML, and `json()` then
 * throws. That must not take the login page down with it.
 */
async function readBody(response) {
  try {
    return await response.json();
  } catch {
    log.warn('non-JSON response, status', response.status);
    return null;
  }
}

/**
 * One call to GoTrue. Always resolves, never rejects.
 *
 * @param {string} path e.g. 'token?grant_type=password'
 * @param {object} body JSON payload; never contains a logging call site
 * @returns {Promise<{ok:true, data:object|null}|{ok:false, reason:string}>}
 */
export async function post(path, body) {
  if (!isSupabaseConfigured()) {
    log.warn('Supabase is not configured; refusing to call it');
    return { ok: false, reason: SUPABASE_NOT_CONFIGURED };
  }

  let response;
  const deadline = withDeadline();
  try {
    response = await fetch(`${connection().url}/auth/v1/${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
      signal: deadline.signal,
    });
  } catch (error) {
    // Offline, DNS failure, CORS rejection, or our own deadline. Already player-safe.
    //
    // `timeout` is separated from `network_request_failed` because they are not the
    // same thing to the caller: one means we gave up waiting, the other means the
    // request never left. Neither is a credential problem, and ISS-048 depends on
    // both being treated as "keep the token".
    const reason = error.name === 'AbortError' ? 'timeout' : 'network_request_failed';
    log.warn('network failure -', reason);
    return { ok: false, reason };
  } finally {
    deadline.cancel();
  }

  const payload = await readBody(response);

  if (!response.ok) {
    // Log the reason, never the credential that produced it.
    const reason = reasonFor(String(payload?.error_description ?? payload?.msg ?? ''));
    log.warn('auth refused -', reason, '(status', response.status + ')');
    // The status comes back too, and it is not decoration. ISS-048: `restore()` must
    // clear the refresh token on a 401 and keep it on a 5xx, and a 5xx body carries no
    // `error_description` — so it maps to `auth_unknown`, which tells the caller
    // nothing. Without the status there is no way to make that distinction, and the
    // default would stay "destroy the credential", which is what caused the bug.
    return { ok: false, reason, status: response.status };
  }

  return { ok: true, data: payload };
}

/**
 * One authenticated call, for the endpoints that need a bearer token rather than
 * the anon key alone (signing out, updating a password).
 *
 * @param {string} path
 * @param {string} token an access or refresh token
 * @param {object} body
 * @param {string} method
 */
export async function postAuthed(path, token, body, method = 'POST') {
  if (!isSupabaseConfigured()) return { ok: false, reason: SUPABASE_NOT_CONFIGURED };

  const deadline = withDeadline();
  try {
    const response = await fetch(`${connection().url}/auth/v1/${path}`, {
      method,
      headers: headers({ Authorization: `Bearer ${token}` }),
      body: JSON.stringify(body),
      signal: deadline.signal,
    });

    if (!response.ok) {
      log.warn('authed call refused, status', response.status);
      return { ok: false, reason: reasonFor(await errorText(response)), status: response.status };
    }

    return { ok: true, data: await readBody(response) };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timeout' : 'network_request_failed';
    log.warn('authed call failed -', reason);
    return { ok: false, reason };
  } finally {
    deadline.cancel();
  }
}

async function errorText(response) {
  const body = await readBody(response);
  return String(body?.error_description ?? body?.msg ?? '');
}

/**
 * Fire-and-forget: used only by sign-out, where a failure must not stop the local
 * session being cleared. Returns nothing on purpose — the caller has no use for it.
 */
export async function bestEffort(path, token, body) {
  try {
    await fetch(`${connection().url}/auth/v1/${path}`, {
      method: 'POST',
      headers: headers({ Authorization: `Bearer ${token}` }),
      body: JSON.stringify(body),
    });
  } catch (error) {
    log.warn('best-effort call failed -', error.message);
  }
}