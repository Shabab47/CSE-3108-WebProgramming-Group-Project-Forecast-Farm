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
const ERASE_ENDPOINT = 'rest/v1/rpc/erase_progress';

/** Longer than the usual 10 s: bcrypt is deliberately slow, and a timeout mid-delete
 *  would leave the player unsure whether their account is gone. */
const TIMEOUT_MS = 20_000;

/**
 * POST a password to a `security definer` RPC and read back its answer.
 *
 * Shared by the two destructive actions because they differ only in which function they
 * name: `delete_my_account` removes the account, `erase_progress` removes only the farm.
 * Both check the password inside the statement — neither verifies anything beforehand, so
 * there is no request an attacker could replay to skip the check.
 *
 * @returns {Promise<{status:number, body:unknown}>} `status` is 0 for a network failure.
 */
async function postPassword(rpcEndpoint, password, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${connection().url}/${rpcEndpoint}`, {
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

    return { status: response.status, body: await response.json().catch(() => null) };
  } catch (error) {
    return { status: 0, body: null, reason: error.name === 'AbortError' ? 'timeout' : 'network_request_failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Erase this player's farm progress, behind their password.
 *
 * One RPC call. `erase_progress` checks the password and deletes the row in the same
 * statement, so there is no "verify" step that could be passed over. `false` is the
 * function's own answer — the password did not match, and nothing was deleted.
 *
 * The account is untouched: `auth.users`, identities, username and farmer name all
 * survive and the player stays signed in. That is what separates this from
 * `deleteAccount`, and it is why `006` is a separate function rather than a flag.
 *
 * @param {string} token the player's access token
 * @param {string} password what the player typed
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export async function eraseProgress({ token, password }) {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'auth_not_configured' };
  if (!token) return { ok: false, reason: 'not_signed_in' };
  if (!password) return { ok: false, reason: 'password_required' };

  const { status, body, reason } = await postPassword(ERASE_ENDPOINT, password, token);

  if (status === 200 && body === true) {
    log.info('farm progress erased');
    return { ok: true };
  }

  if (status === 200 && body === false) {
    log.info('progress erase refused, wrong password');
    return { ok: false, reason: 'invalid_credentials' };
  }

  log.warn('progress erase refused, status', status || reason);
  return { ok: false, reason: status === 0 ? (reason ?? 'network') : classifyRefusal(status, body) };
}

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

  const { status, body, reason } = await postPassword(ENDPOINT, password, token);

  if (status === 0) {
    log.warn('account deletion call failed -', reason);
    return { ok: false, reason };
  }

  // `false` is the function's own answer: the password did not match. The one case
  // where we know for certain that nothing was deleted, so it gets its own reason and
  // the panel can blame the password rather than the network.
  if (status < 300 && body === false) {
    log.info('account deletion refused, wrong password');
    return { ok: false, reason: 'invalid_credentials' };
  }

  if (status >= 300) {
    log.warn('account deletion refused, status', status);
    return { ok: false, reason: classifyRefusal(status, body) };
  }

  log.info('account deleted');
  return { ok: true };
}

/**
 * Turn a refusal from either RPC into a reason the panel can put into a sentence.
 *
 * Shared because both functions fail for the same reasons and in the same words, and a
 * panel that could only describe one of them would tell a player with the other problem
 * that their migration was missing.
 */
function classifyRefusal(status, body) {
  if (status === 401) return 'not_signed_in';
  // 404 means the migration for *that* function has not been run — 005 for the account,
  // 006 for the farm. A project condition, and it says so rather than "try again".
  if (status === 404) return 'not_migrated';

  const detail = String(body?.message ?? '');
  // The fail-closed case: `crypt()` could not verify the stored hash. Worth naming,
  // because it means the delete was refused rather than permitted without a password.
  if (/unsupported password hash/i.test(detail)) return 'cannot_verify_password';
  if (/password/i.test(detail)) return 'password_required';

  return 'server_error';
}
