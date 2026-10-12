/**
 * The persistent banner shown when the game cannot reach the server.
 *
 * ## Why it is not a toast
 *
 * A toast dismisses itself after a few seconds. This has to stay on screen for
 * as long as the condition holds, because the player is being told their farm is
 * only on this device — a fact they can act on (export it) rather than one they
 * can notice once and forget.
 *
 * ## Why it listens to both things
 *
 * `window.online` is the browser's guess and it is often wrong in both
 * directions. A laptop on captive-portal wifi reports "online" with nothing
 * reachable, and a working connection to a local server reports "offline" while
 * Supabase is fine. So the banner is driven by the *save outcome* as well as the
 * event: a successful write proves the server is reachable whatever the event
 * says, and a failed one proves it is not.
 *
 * ## What it tells the player
 *
 * Three things, in this order, because they are the three questions a player
 * actually has when the banner is up:
 *
 *   1. is my farm safe?          → yes, on this device, and nothing is lost
 *   2. what has stopped?          → live weather is paused
 *   3. what can I do about it?    → export it, and reconnect
 *
 * The export button is not decoration. `.farm` files are the escape hatch that
 * already exists (DEC-021), so the banner points at it rather than inventing a
 * way to keep a server copy working without a server.
 *
 * @typedef {'synced'|'saving'|'pending'} SyncState
 */

import { clear, el } from '../utils/dom.js';
import { createLog } from '../utils/log.js';

const log = createLog('connectionBanner');

/**
 * Human phrasing for how long a save has been stuck, so the banner can age
 * without re-rendering on a timer.
 *
 * @param {number} ms
 */
export function describeStaleFor(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

/**
 * @param {SyncState} sync
 * @param {number} sinceMs when the banner appeared, for the ageing text
 * @returns {{title:string, body:string}|null} null when there is nothing to say
 */
export function copyFor(sync, sinceMs) {
  if (sync === 'pending') {
    return {
      title: 'No connection — your farm is saved on this device',
      body:
        `Progress is safe here and nothing has been lost, but it is not reaching your account, ` +
        `and live weather is paused. It will sync on its own when you reconnect.`,
      since: describeStaleFor(sinceMs),
    };
  }
  if (sync === 'saving') {
    return { title: 'Saving…', body: 'Sending your farm to your account.', since: '' };
  }
  return null;
}

/**
 * Mount the banner into `root`.
 *
 * Render and events only. The save state arrives through `actions`, so this file
 * imports no service and has no idea what a farm or a server is.
 *
 * @param {HTMLElement} root
 * @param {{
 *   getSync?: () => SyncState,
 *   now?: () => number,
 *   onExport?: () => void,
 *   onRetry?: () => void,
 * }} actions
 * @returns {{unmount: () => void, refresh: () => void, show: () => void, hide: () => void}}
 */
export function mountConnectionBanner(root, actions = {}) {
  clear(root);

  const getSync = actions.getSync ?? (() => 'synced');
  const now = actions.now ?? (() => Date.now());

  /** When the banner last became visible, for the ageing text. */
  let shownAt = null;

  const title = el('p', { class: 'connection-banner__title' });
  const detail = el('p', { class: 'connection-banner__detail' });

  // The player's way out of the one situation the banner cannot fix on its own:
  // needing the farm somewhere else while the connection is down.
  const exportButton = el('button', {
    class: 'connection-banner__btn',
    type: 'button',
    text: 'Export your farm',
    on: {
      click: () => {
        log.info('export requested from the connection banner');
        actions.onExport?.();
      },
    },
  });

  const retryButton = el('button', {
    class: 'connection-banner__btn',
    type: 'button',
    text: 'Retry now',
    on: {
      click: () => {
        log.info('retry requested from the connection banner');
        actions.onRetry?.();
      },
    },
  });

  const banner = el('div', {
    class: 'connection-banner',
    // `role="status"` rather than `alert`: this is not urgent, and interrupting a
    // screen reader mid-gameplay for a sync state would be worse than the delay.
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  }, [
    el('span', { class: 'connection-banner__dot', 'aria-hidden': 'true' }),
    el('div', { class: 'connection-banner__body' }, [title, detail]),
    el('div', { class: 'connection-banner__actions' }, [exportButton, retryButton]),
  ]);

  root.append(banner);

  function paint() {
    const sync = getSync();
    const copy = copyFor(sync, shownAt === null ? 0 : now() - shownAt);

    if (!copy) {
      banner.hidden = true;
      shownAt = null;
      return;
    }

    banner.hidden = false;
    banner.dataset.sync = sync;

    title.textContent = copy.title;
    detail.textContent = copy.since
      ? `${copy.body} Last reached your account ${copy.since}.`
      : copy.body;

    // Both actions are optional. A guest has no exportable farm and nothing to
    // retry, and a button that does nothing is worse than no button.
    exportButton.hidden = typeof actions.onExport !== 'function';
    retryButton.hidden = typeof actions.onRetry !== 'function';

    // `saving` is a moment, not a condition — the banner hides itself once the
    // write settles, so it must not linger showing an empty state.
    if (shownAt === null) shownAt = now();
  }

  paint();

  return {
    refresh: paint,

    show() {
      shownAt = now();
      paint();
    },

    hide() {
      banner.hidden = true;
      shownAt = null;
    },

    unmount() {
      clear(root);
    },
  };
}