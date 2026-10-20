/**
 * Entry point for inventory.html.
 *
 * The seed bag is a page of its own, so it repeats the two steps the farm page does
 * before any UI exists — resolve the session, load the save — and then hands the
 * player a link back. Unlike the almanac, this page reads the save, so it resolves
 * a session and boots the auth provider exactly like `shop-main.js` does.
 *
 * `main.js` is imported for `resolveSession` and `farmHref`, and importing it does
 * not boot the farm — its `start()` is guarded on `#top-bar`, which inventory.html
 * does not have.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { farmHref, resolveSession } from './main.js';
import { buildServerSave } from './remoteSave.js';
import { mountConnectionStatus, wireSaveOnExit } from './connection.js';
import { init, saveNow, subscribe } from './state/store.js';
import { mountInventory } from './ui/inventoryView.js';
import { mountBlockedScreen } from './ui/blockedScreen.js';
import { mountBootLoader } from './ui/loadingTips.js';
import { mountToastStack } from './ui/toastStack.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('inventory-main');

const LOGIN_URL = 'login.html';

async function start() {
  // Before the first `await`, for the same reason as `js/main.js`: the wait
  // below is network, and this page is empty until it finishes. Shows nothing
  // for a load faster than `SHOW_AFTER_MS`.
  const loader = mountBootLoader({ label: 'Loading your inventory' });

  // Boot 0: no session means the bag is never mounted. A guest gets the same farm
  // as before, because a guest's save is keyed on the fixed user id `guest`.
  const provider = await loadProvider();
  const resolved = await resolveSession(provider);

  if (!resolved.ok) {
    // Only a genuinely invalid token is a logout. A dead connection shows the
    // blocked screen and offers a retry — see ISS-048.
    if (resolved.reason === 'invalid_token') {
      log.info('no session, handing off to login');
      loader.done();
      location.replace(LOGIN_URL);
      return;
    }

    log.warn('cannot open the seed bag -', resolved.reason);
    loader.done();
    mountBlockedScreen(qsOrNull('#inventory-root'), { reason: resolved.reason });
    return;
  }

  const session = resolved.session;

  // The same save the farm page uses, so the bag and the purse agree whichever
  // direction the player is travelling.
  const { loaded } = await init(session, undefined, buildServerSave(provider, session));
  log.info(loaded ? 'inventory opened on a resumed farm' : 'inventory opened on a new farm');

  mountToastStack();
  mountConnectionStatus(qsOrNull('#sync-indicator'));
  mountInventory(qsOrNull('#inventory-root'), { onState: subscribe, backHref: farmHref(session) });
  loader.done();

  // Autosave, identical to the farm and shop pages. The bag changes on the farm, so
  // this page only needs to keep the save durable while it is open.
  setInterval(saveNow, AUTOSAVE_MS);
  wireSaveOnExit();

  log.trace('inventory ready for', session.userId);
}

/**
 * Only on the real page. `#inventory-root` is on inventory.html and nowhere else,
 * so it marks "this is the page, not an import" — the same guard `js/main.js` uses
 * for `#top-bar`.
 */
if (qsOrNull('#inventory-root')) {
  start();
}
