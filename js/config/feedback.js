/**
 * Bug reporting settings.
 *
 * The report goes to Web3Forms, whose free plan allows 250 submissions per month.
 * The access key is a *public* client key by design: Web3Forms expects it to be
 * shipped in the page, and it can only send a message to the inbox the key was
 * created for. That is why it lives here rather than in a server environment.
 *
 * Get a key from https://web3forms.com and replace the placeholder below.
 *
 * Pure data, so the endpoint and limits live in one place and tests can assert on
 * them.
 */

/** Web3Forms' submission endpoint. */
export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

/**
 * The Web3Forms access key.
 *
 * Reports are delivered to the inbox this key was created for. If the key is
 * ever removed, the form explains that reporting is not set up instead of
 * sending a request that can only fail.
 */
export const WEB3FORMS_ACCESS_KEY = 'bb091973-d91c-4e4e-938b-7fac25de81bc';

/** The subject line every report arrives with. */
export const REPORT_SUBJECT = 'Forecast Farm - bug report';

/** The name the report arrives from. */
export const REPORT_FROM_NAME = 'Forecast Farm';

/** Shortest description worth sending, after trimming. */
export const REPORT_MESSAGE_MIN = 10;

/** Longest description the form accepts. */
export const REPORT_MESSAGE_MAX = 2000;

/** The placeholder is deliberately obvious, so it can never be mistaken for a key. */
const PLACEHOLDER_KEY = 'YOUR_WEB3FORMS_ACCESS_KEY';

/* --- test override ---------------------------------------------------------
 * Read through a function rather than the exported constant, because an ES module
 * namespace is frozen: a test cannot assign to it. Same pattern as
 * `config/supabase.js`.
 *
 * Test-only. Nothing in `js/` calls `__setForTest()`.
 */
let accessKey = WEB3FORMS_ACCESS_KEY;

/** The live key, for the service to read on each call. */
export function reportAccessKey() {
  return accessKey;
}

/** Whether a real key has been supplied. */
export function isReportConfigured() {
  return Boolean(accessKey) && accessKey !== PLACEHOLDER_KEY;
}

/** @param {{key?: string}} next */
export function __setForTest(next = {}) {
  if ('key' in next) accessKey = next.key;
}
