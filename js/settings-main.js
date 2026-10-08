/**
 * Entry point for settings.html.
 *
 * The settings page is a page of its own, so it repeats the two steps the farm page
 * does before any UI exists — resolve the session, load the save — and then hands the
 * player a link back. The player signs in once: a Supabase session is restored from
 * the refresh token, and a guest arrives with `?guest=1`, which is the flag the
 * `settingsHref` and `farmHref` helpers in `js/main.js` put on both links that cross
 * between the two pages — the settings gear on the farm, and "Back to the farm" here.
 *
 * **Why this is a second entry point rather than a panel on index.html.** The team
 * asked for a separate page to keep the files easy to read. Both entry points must
 * therefore answer the session question the same way, so `resolveSession` is imported
 * from `js/main.js` rather than copied. Importing that module does not boot the farm
 * — its `start()` is guarded on `#top-bar`, which settings.html does not have.
 *
 * As on the farm and shop pages, this is the only module that joins the UI to the
 * store: the panel receives callbacks and never imports `store.js`.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { farmHref, resolveSession } from './main.js';
import { buildServerSave } from './remoteSave.js';
import { adoptState, clearSave, emit, getState, init, saveNow } from './state/store.js';
import { buildInitialState } from './state/initialState.js';
import { mountSettings } from './ui/settingsView.js';
import { mountToastStack } from './ui/toastStack.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('settings-main');

const LOGIN_URL = 'login.html';

/**
 * Erase the farm and leave the player a brand new one.
 *
 * Three steps, in this order, and the order is the whole point:
 *
 *  1. `clearSave()` removes **both** copies — the localStorage cache and the server
 *     row. Clearing only the server would let a reload resurrect the old farm from
 *     the cache, which is the failure this feature must not have.
 *  2. `adoptState(buildInitialState(session))` puts a freshly built farm in memory
 *     under the *same* session, so the player stays signed in and their username,
 *     email and farmer name are untouched — "as if he had just opened an account"
 *     means the farm, not the account.
 *  3. `adoptState` already writes immediately rather than waiting for the debounce,
 *     which matters here: the page is likely to be reloaded next, and a reset that
 *     had not reached disk yet would come back from the old save.
 *
 * The session is read from the store rather than from the `session` argument
 * `start()` was given, because the store re-stamps the session onto a resumed farm
 * and that live copy is the authoritative one.
 *
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
async function deleteProgress() {
  const session = getState()?.session;

  if (session?.status !== 'authed') {
    return { ok: false, reason: 'not_signed_in' };
  }

  await clearSave();

  const adopted = adoptState(buildInitialState(session));
  if (!adopted.ok) return adopted;

  await saveNow();
  return { ok: true };
}

/* --- the panel's callbacks -------------------------------------------------- */

function settingsActions(session) {
  return {
    session,
    deleteProgress,
    toast(message, tone) {
      emit('toast', { message, tone });
    },
    backHref: farmHref(session),
  };
}

async function start() {
  const root = qsOrNull('#settings-root');
  if (!root) return;

  // Boot 0: no session means settings is never mounted, exactly as on the farm.
  const provider = await loadProvider();
  const session = await resolveSession(provider);
  if (!session) {
    log.info('no session, handing off to login');
    location.replace(LOGIN_URL);
    return;
  }

  // Boot 1: the same save the farm page uses, so the erase below acts on the farm
  // the player is actually playing rather than starting from a blank one.
  const remote = buildServerSave(provider, session);
  const { loaded } = await init(session, undefined, remote);
  log.info(loaded ? 'settings opened on a resumed farm' : 'settings opened on a new farm');

  // Boot 2
  mountToastStack();
  mountSettings(root, settingsActions(session));

  // Boot 4: autosave, identical to the farm and shop pages. Erasing writes through
  // immediately, so this is only the safety net for anything else.
  setInterval(saveNow, AUTOSAVE_MS);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  log.trace('settings ready for', session.userId);
}

/**
 * Only on the real page. `#settings-root` is on settings.html and nowhere else, so it
 * marks "this is the page, not an import" — the same guard `js/main.js` uses for
 * `#top-bar`, and the reason importing `resolveSession` from there is safe.
 */
if (qsOrNull('#settings-root')) {
  start();
}
