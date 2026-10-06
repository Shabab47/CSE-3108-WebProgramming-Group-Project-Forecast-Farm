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
import { SUPABASE_NOT_CONFIGURED, connection, isSupabaseConfigured } from '../config/supabase.js';

const log = createLog('gotrue');

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
  try {
    response = await fetch(`${connection().url}/auth/v1/${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Offline, DNS failure, CORS rejection. Already player-safe.
    log.warn('network failure -', error.message);
    return { ok: false, reason: 'network_request_failed' };
  }

  const payload = await readBody(response);

  if (!response.ok) {
    // Log the reason, never the credential that produced it.
    const reason = reasonFor(String(payload?.error_description ?? payload?.msg ?? ''));
    log.warn('auth refused -', reason, '(status', response.status + ')');
    return { ok: false, reason };
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

  try {
    const response = await fetch(`${connection().url}/auth/v1/${path}`, {
      method,
      headers: headers({ Authorization: `Bearer ${token}` }),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      log.warn('authed call refused, status', response.status);
      return { ok: false, reason: reasonFor(await errorText(response)) };
    }

    return { ok: true, data: await readBody(response) };
  } catch (error) {
    log.warn('authed call failed -', error.message);
    return { ok: false, reason: 'network_request_failed' };
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