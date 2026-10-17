/**
 * Wiring for the sync indicator and the offline retry loop.
 *
 * ## Why this is a module and not four copies
 *
 * Every entry point — the farm, the shop, the settings page, the login menu —
 * needs the same three things after boot: the chip, a `sync` subscription, and an
 * `online` listener that flushes whatever queued while the connection was down.
 * Copy-pasting that into four `main` files is how they drift apart, and
 * `shop-main.js` and `settings-main.js` had already been copy-pasted from
 * `main.js` down to the `pagehide` line.
 *
 * It lives at the top of `js/`, beside `main.js`, for the same reason
 * `remoteSave.js` does: **a module outside every layer has no import rules.**
 * This one needs `ui/`, `state/` and the toast bus at once.
 *
 * ## Why both signals
 *
 * `window.online` is a guess, and a bad one in both directions — a captive portal
 * reports "online" with nothing reachable, and a healthy local connection to
 * everything *but* Supabase reports "offline". So the chip follows the actual
 * save outcome, and the `online` event is only used as a cheap hint to retry
 * sooner than the backoff would otherwise wait. See ISS-050.
 */

import { createLog } from './utils/log.js';
import { emit, flushPendingSave, getSync, on, saveNow } from './state/store.js';
import { mountSyncIndicator } from './ui/syncIndicator.js';

const log = createLog('connection');

/**
 * The one-time notice raised the first time a write fails.
 *
 * The chip's `No connection` label is persistent, but it is small and it lives in
 * a corner, and a small permanent fixture is exactly what a player stops seeing.
 * So the *first* failure of an outage still gets a toast — which is transient,
 * loud, and impossible to scroll past. After that the label holds the floor and
 * the toast is not repeated, because a notification that fires every 30 s for the
 * length of an outage is how people learn to ignore notifications.
 *
 * The wording is the reassurance, not the alarm: nothing is lost, and saying so
 * is the whole reason ISS-050 counts as fixed.
 */
const FIRST_FAILURE_NOTICE = 'No connection — your farm is safe on this device.';

/**
 * Mount the chip and wire the retry loop.
 *
 * @param {HTMLElement|null} root where to put the chip; null mounts nothing
 * @param {{
 *   onExport?: () => void,
 *   onRetry?: () => void,
 *   now?: () => number,
 * }} [actions]
 * @returns {{ refresh: () => void, unmount: () => void, flush: () => boolean }}
 */
export function mountConnectionStatus(root, actions = {}) {
  const indicator = mountSyncIndicator(root, {
    getSync,
    now: actions.now,
    // A guest farm is local-only and cannot be exported (`state/transfer.js`), so
    // the button would fail. Omitting the handler hides it rather than showing a
    // button that cannot work.
    onExport: actions.onExport,
    onRetry: () => {
      log.info('manual retry');
      void saveNow();
    },
  });

  // The store emits `sync` on every transition, so the chip follows the real
  // outcome rather than polling for it.
  let announced = false;
  const offSync = on('sync', (next) => {
    indicator.refresh();

    if (next === 'synced') announced = false;
    else if (next === 'pending' && !announced) {
      announced = true;
      log.info('server save failed - raising the first-failure notice');
      emit('toast', { message: FIRST_FAILURE_NOTICE, tone: 'error' });
    }
  });

  // `online` is a hint, not the source of truth — it only exists to flush sooner
  // than SAVE_RETRY_BACKOFF_MS would otherwise wait.
  const onOnline = () => {
    log.trace('connection reported back; flushing anything queued');
    const flushed = flushPendingSave();
    if (flushed) indicator.refresh();
  };
  const onOffline = () => indicator.refresh();

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return {
    refresh: () => indicator.refresh(),

    /** Force a save and re-read the outcome — used by the popover's retry button. */
    flush: () => {
      void saveNow();
      indicator.refresh();
      return getSync();
    },

    unmount() {
      offSync();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      indicator.unmount();
    },
  };
}

/**
 * Save on the way out, and again when the tab comes back.
 *
 * Shared by all four entry points for the same reason as above.
 *
 * `pagehide` is the right event rather than `beforeunload`: it fires on mobile
 * Safari's back gesture and on bfcache eviction, where `beforeunload` does not.
 *
 * **The remote write will not survive the unload** — it needs an `Authorization`
 * header, and `navigator.sendBeacon` cannot set one. The synchronous localStorage
 * write inside `saveNow()` is what actually persists here, and it does. That is
 * also why the popover offers an export rather than promising a server save on
 * close.
 *
 * Takes the document as an argument rather than reaching for the global, because
 * this module sits outside `js/ui/` and `check-imports.mjs` rightly refuses `document`
 * there — see ISS-016, which is still open. Passing it in keeps the rule intact
 * instead of widening the whitelist for one call.
 */
export function wireSaveOnExit(doc = globalThis.document) {
  if (!doc) return () => {};

  const onPageHide = () => {
    void saveNow();
  };
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') void saveNow();
  };

  globalThis.window.addEventListener('pagehide', onPageHide);
  doc.addEventListener('visibilitychange', onVisibility);

  return () => {
    globalThis.window.removeEventListener('pagehide', onPageHide);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
}