/**
 * Server-side save storage: PostgREST, via plain `fetch()`.
 *
 * One row per account in `public.farm_saves`, holding that farm as JSONB. The
 * table and its Row Level Security policy are created by
 * `supabase/migrations/001_farm_saves.sql` — see the README, because this is the
 * only part of the save path that cannot be done from a browser.
 *
 * ## Why the token is passed in
 *
 * `check-imports.mjs` allows `services/` to import only `config` and `utils`, so
 * this cannot import `authApi.js` to get the access token. It is handed in per
 * call instead. That is the same rule that makes UI receive callbacks rather
 * than importing a service, so the shape is not new.
 *
 * ## What the anon key can and cannot do
 *
 * Every request carries the anon key **and** the player's own access token. The
 * anon key is what PostgREST requires to talk to the project at all; the access
 * token is what makes `auth.uid()` resolve, which is what the RLS policy matches
 * against. Neither can read another account's row — the policy is enforced by
 * Postgres, so neither can be talked out of it from here.
 *
 * ## Never
 *
 * There is no `service_role` key anywhere in this file or this repo. It bypasses
 * RLS completely. See DEC-018.
 */

import { createLog } from '../utils/log.js';
import { connection, isSupabaseConfigured } from '../config/supabase.js';

const log = createLog('saveApi');

const TABLE = 'farm_saves';
const ENDPOINT = 'rest/v1';

/** Long enough that a dropped connection does not stall a whole save. */
const TIMEOUT_MS = 10_000;

/**
 * One request to PostgREST. Always resolves; never throws.
 *
 * @returns {Promise<{ok:true, status:number, data:any}|{ok:false, reason:string}>}
 */
async function send(method, path, { token, body, prefer } = {}) {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'auth_not_configured' };
  }
  if (!token) {
    // A guest has no token, so there is no `auth.uid()` for the policy to match.
    // Not an error — a guest farm is local-only by design.
    return { ok: false, reason: 'no_session' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    const headers = {
      apikey: connection().anonKey,
      Authorization: `Bearer ${token}`,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;

    response = await fetch(`${connection().url}/${ENDPOINT}/${TABLE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // Abort, DNS failure, offline, CORS. All of them mean the same thing here:
    // the server did not answer, so the caller keeps whatever it had.
    const reason = error.name === 'AbortError' ? 'timeout' : 'network_request_failed';
    log.warn('save request failed -', reason);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // PostgREST error bodies carry a code and a message. Neither is shown to a
    // player, but logging the status is the difference between "saving is
    // broken" and "this account cannot write" at 2am.
    log.warn('save request refused, status', response.status);
    return { ok: false, reason: 'server_error', status: response.status };
  }

  // A 204 has no body; anything else is JSON.
  if (response.status === 204) return { ok: true, status: 204, data: null };

  try {
    return { ok: true, status: response.status, data: await response.json() };
  } catch {
    return { ok: true, status: response.status, data: null };
  }
}

/**
 * Fetch this account's farm, or null when they have none yet.
 *
 * `maybeSingle` returns HTTP 406 for zero rows, which is a legitimate "no farm
 * yet" rather than a failure — so that is translated to null instead of being
 * reported as an error.
 *
 * @param {string} token the player's access token
 * @returns {Promise<{ok:true, state:object|null}|{ok:false, reason:string}>}
 */
export async function readRemoteSave(token) {
  const result = await send('GET', '?select=state&limit=1', { token });

  // Only 406 means "no farm yet". It has to be caught before the generic
  // !result.ok branch below, because a 406 is also a failure at that point and
  // would otherwise be reported as a server error — showing an error to the
  // player who has simply never played before.
  //
  // 404 is deliberately NOT treated as "no farm". That is what a missing table
  // looks like, i.e. the migration has not been run, and calling it "no farm"
  // would make the caller start a new farm and then write over whatever the
  // player actually had. It stays a failure so the caller can fall back.
  if (result.ok === false && result.status === 406) {
    return { ok: true, state: null };
  }

  if (!result.ok) return result;

  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { ok: true, state: row?.state ?? null };
}

/**
 * Write this account's farm, replacing whatever was there.
 *
 * `resolution=merge-duplicates` with the primary key makes it an upsert, so the
 * same call serves a first save and every one after. `on_conflict` needs the
 * key named explicitly because PostgREST cannot infer it from the payload alone.
 *
 * The `user_id` in the body is checked against the token by the RLS policy, so a
 * mismatched one is rejected by the server rather than trusted.
 *
 * @param {string} token the player's access token
 * @param {string} userId this account's id
 * @param {object} state the farm
 */
export async function writeRemoteSave(token, userId, state) {
  if (!userId || !state) return { ok: false, reason: 'nothing_to_save' };

  return send('POST', `?on_conflict=user_id`, {
    token,
    body: { user_id: userId, state, updated_at: new Date().toISOString() },
    // Upsert rather than a plain insert, so the second save of the session does
    // not fail on the primary key.
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

/**
 * Delete this account's farm. Used by the debug panel, by the settings page, and
 * by tests.
 *
 * This is the *farm*, not the account: the row in `auth.users` is untouched. See
 * the note on account deletion in `js/settings-main.js` for why that cannot be
 * done from here.
 */
export async function deleteRemoteSave(token, userId) {
  if (!userId) return { ok: false, reason: 'nothing_to_delete' };
  return send('DELETE', `?user_id=eq.${encodeURIComponent(userId)}`, {
    token,
    prefer: 'return=minimal',
  });
}

/**
 * How many farms are stored. Reads no rows — `Prefer: count=exact` with `limit=0`
 * returns the count in a header — so it cannot leak one player's state to
 * another. RLS still applies, which means it only ever counts the caller's own
 * row. Useful for checking the migration took, from inside the game.
 */
export async function countRemoteSaves(token) {
  if (!token) return { ok: false, reason: 'no_session' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${connection().url}/${ENDPOINT}/${TABLE}?select=user_id&limit=0`, {
      headers: {
        apikey: connection().anonKey,
        Authorization: `Bearer ${token}`,
        Prefer: 'count=exact',
      },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: 'server_error' };
    return { ok: true, count: Number(response.headers.get('content-range')?.split('/')[1] ?? 0) };
  } catch (error) {
    log.warn('count failed -', error.message);
    return { ok: false, reason: 'network_request_failed' };
  } finally {
    clearTimeout(timer);
  }
}
