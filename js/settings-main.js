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
import { deleteAccount } from './services/accountApi.js';
import { adoptState, clearSave, emit, getState, init, reset, saveNow } from './state/store.js';
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
 *     the cache, which is the failure this feature must not have. Its result is checked
 *     because the next step overwrites that same row (ISS-041).
 *  2. `adoptState(buildInitialState(session))` puts a freshly built farm in memory
 *     under the *same* session, so the player stays signed in and their username,
 *     email and farmer name are untouched — "as if he had just opened an account"
 *     means the farm, not the account.
 *  3. `adoptState` already writes immediately rather than waiting for the debounce,
 *     which matters here: the page is likely to be reloaded next, and a reset that
 *     had not reached disk yet would come back from the old save.
 *
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
async function deleteProgress() {
  const session = getState()?.session;

  if (session?.status !== 'authed') {
    return { ok: false, reason: 'not_signed_in' };
  }

  // Checked, because step 2 writes a fresh farm over the same row: if the delete had
  // been refused we would be telling the player their old farm is gone while leaving
  // it on the server for them to sign back into (ISS-041).
  const cleared = await clearSave();
  if (cleared?.ok === false) {
    log.warn('server farm was not cleared, so a fresh one was not written -', cleared.reason);
    return { ok: false, reason: cleared.reason ?? 'server_delete_failed' };
  }

  const adopted = adoptState(buildInitialState(session));
  if (!adopted.ok) return adopted;

  await saveNow();
  return { ok: true };
}

/**
 * Build the settings page's "delete my account" action.
 *
 * Three steps, and the order is the whole thing:
 *
 *  1. The panel has already asked for the password and refused an empty one.
 *  2. The provider deletes — and **verifies that password in the same call.** On
 *     Supabase that is `delete_my_account()`, which compares against the bcrypt hash
 *     GoTrue stored before touching anything; on the local provider it is the existing
 *     PBKDF2 comparison. An earlier version checked the password in the browser and
 *     asked the server only to delete, which meant the check could be skipped by
 *     calling the delete directly — survivable behind a 7-day grace period, not
 *     survivable now that deletion is immediate (ISS-040).
 *  3. Sign out and clear the local copy.
 *
 * **Nothing is deleted before step 2 succeeds.** An earlier version cleared the save
 * first, "so an offline player still ends up with nothing" — which meant a *wrong*
 * password wiped the farm and then reported that nothing had changed.
 *
 * @param {object} provider the loaded auth provider
 * @returns {(password: string) => Promise<{ok:boolean, reason?:string}>}
 */
function makeDeleteAccount(provider) {
  // The two providers genuinely do different things, so the branch lives in the entry
  // point — `services/` may not import another service, which is the same reason
  // `remoteSave.js` exists.
  const local = provider.deletesAccountsInPlace === true;

  /** Sign out and drop the in-memory state. Best effort on the network side. */
  async function leave() {
    try {
      await provider.signOut();
    } catch (error) {
      // The local session is cleared regardless, so a provider that throws cannot
      // leave the player apparently still signed in after asking to leave.
      log.warn('sign out after deletion failed -', error.message);
    }
    reset();
  }

  return async function deleteAccount(password) {
    const state = getState();
    if (state?.session?.status !== 'authed') {
      return { ok: false, reason: 'not_signed_in' };
    }

    let result;
    try {
      result = local
        // The local provider deletes its own accounts, and verifies the password in the
        // same call — there is no RPC to reach.
        ? await provider.deleteAccountData({ password })
        // Supabase: one RPC that checks the password against the bcrypt hash GoTrue
        // stored and deletes the row if it matches. The check is server-side, so a
        // stolen access token is not enough on its own (ISS-040).
        : await deleteAccount({ token: provider.accessToken?.(), password });
    } catch (error) {
      log.error('account deletion threw -', error.message);
      result = { ok: false, reason: 'exception' };
    }

    if (!result?.ok) {
      // Nothing has been deleted on any path, and that is what the panel says. An
      // earlier version cleared the save *before* checking the password, so a wrong one
      // wiped the farm and still reported "nothing was changed".
      log.warn('account not deleted -', String(result?.reason));
      return result;
    }

    // Gone. The server rows went with the account by cascade, so `clearSave()` now has
    // only the localStorage copy left to remove — and it is the one thing the cascade
    // cannot reach.
    //
    // Its result is checked even though the account is already deleted, because it is
    // the only way to know whether a farm row survived (ISS-041). It is a warning, not a
    // failure: the account is gone whatever this returns, and refusing to sign the
    // player out of a deleted account would be absurd.
    try {
      const cleared = await clearSave();
      if (cleared?.ok === false) {
        log.warn('account deleted but a farm copy may have survived -', cleared.reason);
      }
    } catch (error) {
      log.warn('could not clear the local save -', error.message);
    }

    await leave();
    return { ok: true };
  };
}

/* --- the panel's callbacks -------------------------------------------------- */

function settingsActions(session, provider) {
  return {
    session,
    deleteProgress,
    requestAccountDeletion: makeDeleteAccount(provider),
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
  mountSettings(root, settingsActions(session, provider));

  // Boot 4: autosave, identical to the farm and shop pages. Both destructive actions
  // write through immediately, so this is only the safety net for anything else.
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
