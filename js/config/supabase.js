/**
 * Supabase connection settings.
 *
 * Pure data, so the URLs live in one place and tests can assert on them.
 *
 * **Both values are safe to commit.** The anon key is a *publishable* client key:
 * Supabase's own docs describe it as a "low priority key" intended to be shipped
 * in client code, and it is only useful together with Row Level Security, which
 * is enforced on the server and cannot be bypassed by anyone holding the key.
 *
 * **Never put a service_role key or the export signing secret in this file or
 * any other file in the repo.** Those bypass RLS entirely and must live only in a
 * server environment. See DEC-018.
 *
 * Left as empty strings on purpose until the project exists: `authApi.js` refuses
 * to call anything until both are filled in, so a half-configured deploy fails
 * loudly instead of sending requests to a URL that does not exist.
 */

export const SUPABASE_URL = '';

/** The `anon` / publishable key from Project Settings → API. */
export const SUPABASE_ANON_KEY = '';

/** True when both values are present and the provider can be used. */
export function isSupabaseConfigured() {
  return url.startsWith('https://') && anonKey.length > 0;
}

/** Why the provider is unavailable, for the UI to show instead of a network error. */
export const SUPABASE_NOT_CONFIGURED = 'auth_not_configured';

/* --- test override ---------------------------------------------------------
 * `SUPABASE_URL` and `SUPABASE_ANON_KEY` are read through functions rather than
 * directly by `authApi.js`, because an ES module namespace is frozen: a test
 * cannot assign to it. Without this, the whole provider suite would be limited to
 * the "not configured" path until someone fills in real credentials, and the error
 * mapping — the part most likely to be wrong — would go untested.
 *
 * Test-only. Nothing in `js/` calls it.
 */
let url = SUPABASE_URL;
let anonKey = SUPABASE_ANON_KEY;

/** The live values, for the provider to read on each call. */
export function connection() {
  return { url, anonKey };
}

/** @param {{url?:string, key?:string}} next */
export function __setForTest(next = {}) {
  if ('url' in next) url = next.url;
  if ('key' in next) anonKey = next.key;
}