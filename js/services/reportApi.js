/**
 * Sending a bug report to Web3Forms.
 *
 * The free plan allows 250 submissions a month, which is why the form is a
 * deliberate action rather than something the game fires on every error.
 *
 * Everything here returns `{ok: true}` or `{ok: false, reason}` and never throws,
 * so a player whose report fails is told so and can keep playing.
 *
 * **The game URL travels with the report.** A screenshot without the page a bug
 * happened on is a guessing game, so `gameUrl` is a first-class field rather than
 * something assembled in the inbox.
 */

import {
  REPORT_FROM_NAME,
  REPORT_MESSAGE_MAX,
  REPORT_MESSAGE_MIN,
  REPORT_SUBJECT,
  WEB3FORMS_ENDPOINT,
  isReportConfigured,
  reportAccessKey,
} from '../config/feedback.js';

/**
 * Why this report cannot be sent, or `null` when it can.
 *
 * Pure, so the form can say the same thing before and after a round trip.
 *
 * @param {{message?: string, email?: string}} report
 * @returns {string|null} a reason code
 */
export function validateReport({ message = '', email = '' } = {}) {
  const body = String(message).trim();
  if (body.length < REPORT_MESSAGE_MIN) return 'message_too_short';
  if (body.length > REPORT_MESSAGE_MAX) return 'message_too_long';

  const replyTo = String(email).trim();
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return 'email_invalid';

  return null;
}

/**
 * Send one report.
 *
 * @param {object} report
 * @param {string} report.message what went wrong
 * @param {string} [report.email] optional reply-to address
 * @param {string} [report.gameUrl] the page the bug happened on
 * @param {string} [report.userAgent]
 * @param {object|null} [report.session] the player's session, for context only
 * @param {{fetchImpl?: Function}} [options] injectable `fetch`, for tests
 * @returns {Promise<{ok: true, message: string}|{ok: false, reason: string}>}
 */
export async function submitBugReport(report = {}, options = {}) {
  if (!isReportConfigured()) return { ok: false, reason: 'not_configured' };

  const problem = validateReport(report);
  if (problem) return { ok: false, reason: problem };

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') return { ok: false, reason: 'network' };

  const body = {
    access_key: reportAccessKey(),
    subject: REPORT_SUBJECT,
    from_name: REPORT_FROM_NAME,
    message: String(report.message).trim(),
    // Web3Forms' documented honeypot. A real person never ticks it.
    botcheck: false,
  };

  const email = String(report.email ?? '').trim();
  if (email) body.email = email;

  const gameUrl = String(report.gameUrl ?? '').trim();
  if (gameUrl) body.game_url = gameUrl;

  const userAgent = String(report.userAgent ?? '').trim();
  if (userAgent) body.user_agent = userAgent;

  const status = report.session?.status;
  if (status) body.player_type = status;

  const farmerName = report.session?.farmerName;
  if (farmerName) body.farmer_name = farmerName;

  let res;
  try {
    res = await fetchImpl(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }

  if (data?.success === false) return { ok: false, reason: 'rejected' };

  return { ok: true, message: String(data?.message ?? '') };
}
