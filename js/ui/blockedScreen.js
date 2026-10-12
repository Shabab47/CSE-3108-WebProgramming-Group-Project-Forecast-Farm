/**
 * The screen shown when the farm cannot be opened yet.
 *
 * ## Why this exists
 *
 * Until ISS-048, "no session" meant the same thing as "signed out", so every
 * entry point answered a dead connection with `location.replace(LOGIN_URL)`. On
 * the hosted build that logged players out at random: a slow or dropped request
 * was indistinguishable from an invalid token, and the refresh token was thrown
 * away on the way out.
 *
 * The farm genuinely cannot be opened without a server session — RLS means the
 * row is unreachable without a verified token, so there is nothing honest to
 * render. But "you are signed out" is the wrong sentence for a player whose
 * network dropped thirty seconds ago. This screen says which of the two happened
 * and offers a retry, and it never touches the stored token.
 *
 * ## Why not a toast
 *
 * A toast dismisses itself and the page underneath is empty. There is nothing to
 * return to, so it has to be the whole screen, and it has to stay until the
 * retry succeeds.
 *
 * ## Copy
 *
 * "No internet connection" for anything the transport could not deliver;
 * "Forecast Farm is having trouble" for a 5xx. They look the same to a player and
 * mean opposite things to whoever has to fix it, so they get different sentences.
 *
 * @typedef {'offline'|'server_error'} BlockReason
 */

import { clear, el } from '../utils/dom.js';

const MESSAGES = {
  offline: {
    title: 'No internet connection',
    body: 'Forecast Farm needs a connection to open your farm, because your farm is saved to your account rather than to this device. Reconnect and try again — you have not been signed out.',
  },
  server_error: {
    title: 'Forecast Farm is having trouble',
    body: 'We could not reach the server. This is on us rather than on your connection. Try again in a moment — you have not been signed out.',
  },
};

/**
 * @param {string} reason one of `BlockReason`; anything unknown is treated as offline,
 *   which is the safer of the two mistakes to make with a message.
 */
export function messageFor(reason) {
  return MESSAGES[reason] ?? MESSAGES.offline;
}

/**
 * Replace `root`'s contents with the blocked screen.
 *
 * Render and events only — `actions.retry` is supplied by the entry point, so
 * this file imports no service and has no idea how a session is restored.
 *
 * @param {HTMLElement} root
 * @param {{reason?: BlockReason, onRetry?: () => void, busy?: boolean}} options
 * @returns {{unmount: () => void, setBusy: (busy: boolean) => void, setReason: (reason: BlockReason) => void}}
 */
export function mountBlockedScreen(root, { reason = 'offline', onRetry, busy = false } = {}) {
  clear(root);

  let current = reason;
  let isBusy = busy;

  const title = el('h1', { class: 'blocked__title', role: 'alert' });
  const body = el('p', { class: 'blocked__body' });

  const retryButton = el('button', {
    class: 'btn btn--primary btn--block',
    type: 'button',
    text: 'Try again',
    on: {
      click: () => {
        if (isBusy) return;
        isBusy = true;
        paint();
        onRetry?.();
      },
    },
  });

  function paint() {
    const copy = messageFor(current);

    title.textContent = copy.title;
    body.textContent = copy.body;

    // A retry with no handler would be a button that does nothing, which is worse
    // than no button. `auth-main.js` mounts this before it has a retry to give.
    retryButton.hidden = typeof onRetry !== 'function';
    retryButton.disabled = isBusy;
    retryButton.textContent = isBusy ? 'Trying…' : 'Try again';
    retryButton.setAttribute('aria-busy', String(isBusy));
  }

  root.append(
    el('div', { class: 'blocked', role: 'region', 'aria-label': 'Connection problem' }, [
      el('div', { class: 'blocked__card' }, [title, body, retryButton]),
    ]),
  );

  paint();

  return {
    /** Stop a retry that will never answer, so the player is not stuck on "Trying…". */
    setBusy(next) {
      isBusy = Boolean(next);
      paint();
    },

    /**
     * Re-word the screen without rebuilding it.
     *
     * Needed because the first attempt often reports `offline` while the real
     * answer is `server_error` — a player on a working connection should not be
     * told to check their wifi.
     */
    setReason(next) {
      current = next;
      paint();
    },

    unmount() {
      clear(root);
    },
  };
}