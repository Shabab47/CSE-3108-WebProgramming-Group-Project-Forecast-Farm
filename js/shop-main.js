/**
 * Entry point for shop.html.
 *
 * The shop is a page of its own, so it repeats the two steps the farm page does
 * before any UI exists — resolve the session, load the save — and then hands the
 * player a link back. The player signs in once: a Supabase session is restored
 * from the refresh token, and a guest arrives with `?guest=1`, which is the flag
 * `shopHref` in `js/main.js` puts on the button that got them here.
 *
 * **Why this is a second entry point rather than a dialog on index.html.** The
 * team asked for a separate page to keep the files easy to read. The cost is
 * paid honestly below: both entry points must answer the session question the
 * same way, so `resolveSession` is imported from `js/main.js` rather than copied.
 * Importing that module does not boot the farm — its `start()` is guarded on
 * `#top-bar`, which shop.html does not have.
 *
 * As on the farm page, this is the only module allowed to join the UI to the
 * store: the panel receives callbacks and never imports `store.js`.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { resolveSession, shopHref } from './main.js';
import { buildServerSave } from './remoteSave.js';
import { apply, emit, init, saveNow, subscribe } from './state/store.js';
import { buySeeds } from './domain/shop.js';
import { mountShop } from './ui/shopView.js';
import { mountToastStack } from './ui/toastStack.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('shop-main');

const LOGIN_URL = 'login.html';

/**
 * The shop's callbacks — the one place the panel meets the store.
 *
 * `buy` is the whole purchase: `apply` runs the rule, writes the new state,
 * notifies the panel and queues a save. The extra `saveNow` is deliberate. The
 * debounced write is 800 ms away, and the likeliest thing after a purchase is the
 * player pressing "Back to the farm", which unloads the page — so the gold is
 * made durable now rather than hoping the timer fires first. With a server save
 * attached this is also the only write that reaches the farm's own row before the
 * page goes away; `saveNow` never throws out of a failure.
 *
 * `backHref` is not here: it depends on the session, so `start` adds it.
 */
function shopActions() {
  return {
    onState: subscribe,
    buy(cropId, quantity) {
      const result = apply(buySeeds, cropId, quantity);
      if (result.ok) saveNow();
      return result;
    },
    toast(message, tone) {
      emit('toast', { message, tone });
    },
  };
}

async function start() {
  // Boot 0: no session means the shop is never mounted. A guest gets the same farm
  // as before, because a guest's save is keyed on the fixed user id `guest`.
  const provider = await loadProvider();
  const session = await resolveSession(provider);
  if (!session) {
    log.info('no session, handing off to login');
    location.replace(LOGIN_URL);
    return;
  }

  // Boot 1: the same save the farm page uses, so gold and the seed bag agree
  // whichever direction the player is travelling.
  const { loaded } = await init(session, undefined, buildServerSave(provider, session));
  log.info(loaded ? 'shop opened on a resumed farm' : 'shop opened on a new farm');

  // Boot 2
  mountToastStack();
  mountShop(qsOrNull('#shop-root'), { ...shopActions(), backHref: shopHref(session) });

  // Boot 4: autosave, identical to the farm page. The purchase above saves on its
  // own; this is the safety net for anything else that changes the state here.
  setInterval(saveNow, AUTOSAVE_MS);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  log.trace('shop ready for', session.userId);
}

/**
 * Only on the real page. `#shop-root` is on shop.html and nowhere else, so it
 * marks "this is the page, not an import" — the same guard `js/main.js` uses for
 * `#top-bar`, and the reason importing `resolveSession` from there is safe.
 */
if (qsOrNull('#shop-root')) {
  start();
}