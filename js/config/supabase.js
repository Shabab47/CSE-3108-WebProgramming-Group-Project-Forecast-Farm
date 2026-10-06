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
 * Set 2026-10-06, closing ISS-028 and the accounts half of ISS-032 (T-29).
 *
 * **Only the `anon` key is here.** Its JWT payload carries `role: "anon"` and
 * the project ref, matching the URL above; a `service_role` key would carry
 * `role: "service_role"` and must never be pasted into this file. Row Level
 * Security is what makes the anon key safe, so it stays on — see DEC-018.
 */

export const SUPABASE_URL = 'https://ygfrvwyydxrocvywzysk.supabase.co';

/** The `anon` / publishable key from Project Settings → API. */
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnJ2d3l5ZHhyb2N2eXd6eXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNTI2MzUsImV4cCI6MjEwNjgyODYzNX0.y8XKvC6hqfIxxrf0T7NPa-4xgxyZHjH6uVUB8ABkRzA';

/**
 * True when both values are present and the provider can be used.
 *
 * Reads through `connection()`, the same accessor `gotrue.js` uses to build
 * requests, rather than the test-override variables below. ISS-034: it used to
 * read those, so "is the provider configured" and "what actually gets sent"
 * were answered from two different sources.
 */
export function isSupabaseConfigured() {
  const live = connection();
  return live.url.startsWith('https://') && live.anonKey.length > 0;
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