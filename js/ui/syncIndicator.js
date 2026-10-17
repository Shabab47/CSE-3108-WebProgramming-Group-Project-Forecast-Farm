/**
 * The corner chip that says whether the farm is reaching the server.
 *
 * ## Why it is `position: fixed`
 *
 * This was `connectionBanner.js`, a full-width bar in normal flow above `.app`,
 * which is `height: 100dvh` — so showing it pushed the whole shell down and grew
 * the document past the viewport, and the interface lurched. `copyFor('saving')`
 * returned copy as well, so with `AUTOSAVE_MS` at 10 s a *successful* save caused
 * it on a timer. That is ISS-076, and no restyle of an in-flow element fixes it.
 *
 * ## Why the amber label is still persistent, not a toast
 *
 * "Your farm is only on this device" is a fact to act on but cannot afford to
 * miss, so the label never self-dismisses. The toast is a separate, one-shot
 * thing raised on the first failed write only, in `js/connection.js` because it
 * needs the bus — and that pairing is what keeps ISS-050 fixed now that the
 * permanent fixture is small enough to ignore.
 *
 * ## Why it follows the save outcome, not the event
 *
 * `window.online` is wrong in both directions — a captive portal reports "online"
 * with nothing reachable, a healthy local connection reports "offline" while
 * Supabase is fine. A successful write proves the server is reachable whatever
 * the event says, so the outcome wins.
 *
 * The full text, the ageing "last reached your account" line, and both buttons
 * (the `.farm` export, DEC-021, and retry) live in the popover behind the dots.
 *
 * @typedef {'synced'|'saving'|'pending'} SyncState
 */

import { clear, el, listen, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';

const log = createLog('syncIndicator');

/**
 * Human phrasing for how long a save has been stuck, so the popover can age
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
 * The words printed beside the dots, or null when there is nothing to say.
 *
 * Separate from `copyFor` on purpose: the dots are permanent, but a *label* on a
 * permanent fixture stops being read within a day, so the chip prints exactly one
 * — the condition a player must not miss. Everything else is one click away.
 *
 * @param {SyncState} sync
 * @returns {string|null}
 */
export function chipLabelFor(sync) {
  return sync === 'pending' ? 'No connection' : null;
}

/**
 * @param {SyncState} sync
 * @param {number} sinceMs when the condition began, for the ageing text
 * @returns {{title:string, body:string, since:string}|null} null when synced
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
 * What the popover says when everything is fine.
 *
 * `copyFor('synced')` is null, which is right for the chip — but the dots are
 * clickable, so the popover must not open onto a blank panel.
 */
export const SYNCED_NOTE = {
  title: 'Saved',
  body: 'Your farm is on your account and up to date.',
};

/**
 * Mount the chip into `root`.
 *
 * Render and events only. The save state arrives through `actions`, so this file
 * imports no service and has no idea what a farm or a server is.
 *
 * @param {HTMLElement} root
 * @param {{getSync?: () => SyncState, now?: () => number, onExport?: () => void, onRetry?: () => void}} actions
 * @returns {{unmount: () => void, refresh: () => void, setOpen: (open:boolean) => void}}
 */
export function mountSyncIndicator(root, actions = {}) {
  clear(root);

  const getSync = actions.getSync ?? (() => 'synced');
  const now = actions.now ?? (() => Date.now());

  /** When the current condition began, for the ageing text. */
  let since = null;

  const dots = el('span', { class: 'sync-indicator__dots', 'aria-hidden': 'true' }, [
    el('span', { class: 'sync-indicator__dot' }),
    el('span', { class: 'sync-indicator__dot' }),
  ]);
  const label = el('span', { class: 'sync-indicator__label' });

  const title = el('p', { class: 'sync-indicator__title' });
  const detail = el('p', { class: 'sync-indicator__detail' });

  /** The popover's buttons. Export is the way out of the one situation the chip
   *  cannot fix on its own: needing the farm somewhere else while it is down. */
  const popoverButton = (label, run) => el('button', {
    class: 'sync-indicator__btn',
    type: 'button',
    text: label,
    on: { click: () => { log.info(`${label} requested from the sync popover`); run(); } },
  });

  const exportButton = popoverButton('Export your farm', () => actions.onExport?.());
  const retryButton = popoverButton('Retry now', () => actions.onRetry?.());

  const popover = el('div', { class: 'sync-indicator__popover', id: 'sync-popover', hidden: true }, [
    title, detail,
    el('div', { class: 'sync-indicator__actions' }, [exportButton, retryButton]),
  ]);

  const chip = el('button', {
    class: 'sync-indicator__chip',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'sync-popover',
    on: { click: () => setOpen(popover.hidden) },
  }, [dots, label]);

  const indicator = el('div', { class: 'sync-indicator', 'data-sync': 'synced' }, [chip, popover]);
  root.append(indicator);

  function setOpen(open) {
    popover.hidden = !open;
    chip.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) paint();
  }

  function paint() {
    const sync = getSync();
    const text = chipLabelFor(sync);

    // `data-sync` drives the dot colour and the wave in css/components.css, and is
    // always written so the chip is never left showing the previous state.
    indicator.dataset.sync = sync;
    setText(label, text ?? '');

    const copy = copyFor(sync, since === null ? 0 : now() - since) ?? SYNCED_NOTE;
    setText(title, copy.title);
    setText(detail, copy.since ? `${copy.body} Last reached your account ${copy.since}.` : copy.body);

    // Both actions are optional. A guest has no exportable farm and nothing to
    // retry, and a button that does nothing is worse than no button.
    exportButton.hidden = typeof actions.onExport !== 'function';
    retryButton.hidden = typeof actions.onRetry !== 'function';

    if (since === null) since = now();
  }

  // A click anywhere else closes the popover, and Escape always does. Without the
  // outside click, a panel left open over the farm is an overlay nobody asked for.
  const offDocumentClick = listen(document, 'click', (event) => {
    if (popover.hidden) return;
    if (indicator.contains?.(event.target)) return;
    setOpen(false);
  });
  const offKeydown = listen(document, 'keydown', (event) => {
    if (popover.hidden || event.key !== 'Escape') return;
    setOpen(false);
    chip.focus();
  });

  paint();

  return {
    refresh: paint,

    setOpen,

    unmount() {
      offDocumentClick();
      offKeydown();
      clear(root);
    },
  };
}
