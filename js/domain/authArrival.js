/**
 * How a recovery link arrives, and where an anonymous bounce should go.
 *
 * Three shapes exist, and only the first was ever handled:
 *
 *   ?token_hash=abc&type=recovery        verified by JS — the shape we now email
 *   #access_token=…&type=recovery        the old implicit flow: GoTrue already
 *                                        exchanged the token and handed back a session
 *   #error=access_denied&error_code=otp_expired
 *                                        an expired or already-used link
 *
 * The third one carries no token, which is exactly why it used to fall through to
 * the main menu in silence: `readRecoveryToken()` asked for `access_token`, did not
 * find one, and returned null without looking at what *was* there.
 *
 * Why the shape changed at all: a one-time token inside a URL that GoTrue exchanges
 * on `GET` is spent by anything that fetches the URL — a mail scanner, a link
 * preview, a tracking redirector. Nothing in the app can defend against that. A
 * token *hash* only becomes a session when JavaScript calls `verifyOtp`, so a
 * prefetcher gets static HTML and spends nothing.
 *
 * Pure, no DOM, no provider, so `npm test` can cover it without a browser.
 * `domain` may import nothing (see the table in `AGENTS.md`).
 */

/** Strip a leading `?` or `#`, and tolerate `null`. */
function params(raw) {
  return new URLSearchParams(String(raw ?? '').replace(/^[?#]/, ''));
}

/**
 * @param {string} search `location.search`, with or without the leading '?'
 * @param {string} hash `location.hash`, with or without the leading '#'
 * @returns {{tokenHash: string|null, accessToken: string|null, error: string|null}}
 *   `error` is GoTrue's own code (`otp_expired`, `access_denied`), never a sentence:
 *   wording belongs to `js/ui/authErrors.js`, which has the player-facing table.
 */
export function parseAuthArrival(search, hash) {
  const query = params(search);
  const fragment = params(hash);

  const accessToken = fragment.get('access_token');
  if (accessToken) return { tokenHash: null, accessToken, error: null };

  const tokenHash = query.get('token_hash');
  // `error_code` is the specific one (`otp_expired`); `error` is the coarse one
  // (`access_denied`). Either is enough to know the link did not work.
  const error = fragment.get('error_code') ?? fragment.get('error');

  return { tokenHash: tokenHash || null, accessToken: null, error: error || null };
}

/**
 * Whether a fragment carries anything the login page must see.
 *
 * Kept separate from `parseAuthArrival` because `js/main.js` needs to ask the
 * question about a URL it is *not* on, before deciding where to send the player.
 *
 * @param {string} hash
 * @returns {boolean}
 */
export function carriesAuthFragment(hash) {
  const fragment = params(hash);
  return fragment.has('access_token') || fragment.has('error') || fragment.has('error_code');
}

/**
 * Where `js/main.js` should send an anonymous visitor who landed on `/`.
 *
 * `location.replace('login.html')` silently dropped `#access_token=…`, so every
 * recovery link that GoTrue redirected to the root arrived at the login page with
 * nothing left — and the player saw the main menu. That single `replace` is what
 * hid a working token from us for an entire debugging session.
 *
 * Only auth payload survives the hop. Anything else in the query (`?guest=1`, a
 * stale `?avatar=`) is dropped, because it means something different on a different
 * page.
 *
 * @param {string} href `location.href`, absolute
 * @returns {string} a relative target for `location.replace`, e.g.
 *   `login.html`, `login.html?token_hash=…&type=recovery`, `login.html#access_token=…`
 */
export function recoveryRedirect(href) {
  const url = new URL(href, 'http://localhost/');
  const keepHash = carriesAuthFragment(url.hash);

  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const kept = new URLSearchParams();
  if (tokenHash) {
    kept.set('token_hash', tokenHash);
    // `type` only matters alongside a hash, and GoTrue rejects the pair without it.
    if (type) kept.set('type', type);
  }

  const search = kept.toString();
  return `login.html${search ? `?${search}` : ''}${keepHash ? url.hash : ''}`;
}
