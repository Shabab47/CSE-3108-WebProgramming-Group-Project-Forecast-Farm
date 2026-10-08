/**
 * Immediate account deletion, over PostgREST RPC.
 *
 * One call: `delete_my_account(password)`. It verifies the password in the database
 * against the bcrypt hash GoTrue stored, and only then deletes the row from
 * `auth.users` — which cascades to the farm, the username and the identities.
 *
 * ## Why the password is sent to the database and not checked in the browser
 *
 * An earlier version checked it here (`verifyPassword` in `authApi.js`) and asked the
 * database only to delete. That is a hole with a short fuse: the RPC was callable with
 * any valid access token and no password at all, because the only credential the server
 * ever saw was the token. A 7-day grace period absorbed that — the owner signed back in
 * and cancelled, automatically. Deleting on the spot does not absorb anything, so the
 * check had to move to where it cannot be skipped. See `005_immediate_account_deletion.sql`
 * and ISS-040.
 *
 * ## What this service holds
 *
 * No secret, and no authority: the access token identifies the caller, the database
 * decides. The anon key is here only because PostgREST requires it to talk to the
 * project at all — `auth.uid()` comes from the bearer token, and RLS is enforced by
 * Postgres, so the anon key grants nothing here.
 */

import { createLog } from '../utils/log.js';
import { connection, isSupabaseConfigured } from '../config/supabase.js';

const log = createLog('accountApi');

const ENDPOINT = 'rest/v1/rpc/delete_my_account';

/** Longer than the usual 10 s: bcrypt is deliberately slow, and a timeout mid-delete
 *  would leave the player unsure whether their account is gone. */
const TIMEOUT_MS = 20_000;

/**
 * Delete this account, now, if the password is right.
 *
 * @param {string} token the player's access token
 * @param {string} password what the player typed
 * @returns {Promise<{ok:boolean, reason?:string}>}
 *   `ok: false` with `reason: 'invalid_credentials'` means the password was wrong and
 *   **nothing was deleted**. Any other reason is a failure that also deleted nothing.
 */
export async function deleteAccount({ token, password }) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'auth_not_configured' };

  // No token means no `auth.uid()`, so the function could not identify a caller even
  // with a correct password. Refused here rather than sent.
  if (!token) return { ok: false, reason: 'not_signed_in' };
  if (!password) return { ok: false, reason: 'password_required' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  let body;
  try {
    response = await fetch(`${connection().url}/${ENDPOINT}`, {
      method: 'POST',
      headers: {
        apikey: connection().anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // A bind parameter, not a query literal — PostgREST parameterises RPC calls, so
      // the password does not reach the Postgres statement log.
      body: JSON.stringify({ wanted_password: password }),
      signal: controller.signal,
    });

    body = await response.json().catch(() => null);
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timeout' : 'network_request_failed';
    log.warn('account deletion call failed -', reason);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }

  // `false` is the function's own answer: the password did not match. The one case
  // where we know for certain that nothing was deleted, so it gets its own reason and
  // the panel can blame the password rather than the network.
  if (response.ok && body === false) {
    log.info('account deletion refused, wrong password');
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (!response.ok) {
    // 401 is a dead or expired access token — re-authenticating fixes it. 404 means
    // `005_immediate_account_deletion.sql` has not been run, which is a project
    // condition and says so. The rest are the function raising: 'no session',
    // 'password required', 'account not found', or the fail-closed case where
    // `crypt()` could not verify the stored hash. That last one is worth naming,
    // because it means deletion is refused rather than permitted without a password.
    const detail = String(body?.message ?? '');
    log.warn('account deletion refused, status', response.status);

    if (response.status === 401) return { ok: false, reason: 'not_signed_in' };
    if (response.status === 404) return { ok: false, reason: 'not_migrated' };
    if (/unsupported password hash/i.test(detail)) {
      return { ok: false, reason: 'cannot_verify_password' };
    }
    if (/password/i.test(detail)) return { ok: false, reason: 'password_required' };

    return { ok: false, reason: 'server_error' };
  }

  log.info('account deleted');
  return { ok: true };
}
