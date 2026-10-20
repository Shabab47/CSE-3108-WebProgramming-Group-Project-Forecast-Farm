/**
 * Entry point for profile.html.
 *
 * The same three boot steps as `settings-main.js` and for the same reasons:
 * resolve the session, load the save, then mount. The session answer and the
 * blocked-screen branch are shared rather than copied, because a page that
 * answered "you are signed out" differently from the farm page would be a bug
 * waiting to happen — see ISS-048.
 *
 * `js/main.js` is imported for `resolveSession` and `farmHref` only. Importing it
 * does not boot the farm: that module's `start()` is guarded on `#top-bar`, which
 * profile.html does not have.
 *
 * This is the only module that joins the UI to the store. The panel receives
 * callbacks and never imports `store.js`.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { farmHref, resolveSession } from './main.js';
import { buildServerSave } from './remoteSave.js';
import { mountConnectionStatus, wireSaveOnExit } from './connection.js';
import { getState, init, reset, saveNow, setAvatar } from './state/store.js';
import { mountProfile } from './ui/profileView.js';
import { mountBlockedScreen } from './ui/blockedScreen.js';
import { mountBootLoader } from './ui/loadingTips.js';
import { mountToastStack } from './ui/toastStack.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('profile-main');

const LOGIN_URL = 'login.html';

/**
 * Sign out, save first.
 *
 * Saves synchronously-ish before the provider call so a farm written in the last
 * few seconds is not lost to the redirect. The provider call is allowed to fail:
 * a session that cannot be cleared remotely must still be cleared locally, or the
 * player reloads into a page that believes they are signed in.
 */
function makeSignOut(provider) {
  let leaving = false;

  return async function signOut() {
    if (leaving) return; // ignore double clicks while the request is in flight
    leaving = true;

    log.trace('sign out requested by', getState()?.session?.userId);

    try {
      await saveNow();
    } catch (error) {
      log.warn('save before sign out failed -', error.message);
    }

    try {
      await provider.signOut();
    } catch (error) {
      log.warn('sign out failed -', error.message);
    }

    reset();
    location.replace(LOGIN_URL);
  };
}
function profileActions(session, provider) {
  return {
    session,
    avatar: getState()?.profile?.avatar ?? null,
    // The avatar is state, so it takes the same path as difficulty and every other
    // write: a pure rule in the store, then an immediate save so a page closed right
    // after the click keeps the picture. The panel only paints after `ok`.
    onAvatarChange(avatar) {
      const result = setAvatar(avatar);
      if (result.ok) saveNow();
      return result;
    },
    onSignOut: makeSignOut(provider),
    toast(message, tone) {
      log.trace(message, tone);
    },
    backHref: farmHref(session),
  };
}

async function start() {
  const root = qsOrNull('#profile-root');
  if (!root) return;

  const loader = mountBootLoader({ label: 'Loading profile' });

  const provider = await loadProvider();
  const resolved = await resolveSession(provider);

  if (!resolved.ok) {
    if (resolved.reason === 'invalid_token') {
      log.info('no session, handing off to login');
      loader.done();
      location.replace(LOGIN_URL);
      return;
    }

    log.warn('cannot open profile -', resolved.reason);
    loader.done();
    mountBlockedScreen(root, { reason: resolved.reason });
    return;
  }

  const session = resolved.session;

  const remote = buildServerSave(provider, session);
  await init(session, undefined, remote);

  mountToastStack();
  mountConnectionStatus(qsOrNull('#sync-indicator'));
  mountProfile(root, profileActions(session, provider));
  loader.done();

  setInterval(saveNow, AUTOSAVE_MS);
  wireSaveOnExit();

  log.trace('profile ready for', session.userId);
}

if (qsOrNull('#profile-root')) {
  start();
}
