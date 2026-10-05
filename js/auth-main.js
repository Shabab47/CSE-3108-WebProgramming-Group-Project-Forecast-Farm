/**
 * Entry point for login.html.
 *
 * Wiring only. This is the one module allowed to import both a UI panel and the
 * auth provider, which is exactly the arrangement `docs/architecture.md`
 * describes: callbacks go in through `mountX(root, actions)`.
 *
 * **Provider swap point.** `localAuth` below is a local stand-in. When
 * `js/services/authApi.js` lands (Shabab, Supabase over REST), change this one
 * import and delete `localAuth.js`. Nothing in `js/ui/` moves.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { mountLoginPanel } from './ui/loginPanel.js';
import { currentSession, signIn, signInAsGuest, signOut, signUp } from './services/localAuth.js';

const log = createLog('auth-main');

const GAME_URL = 'index.html';

/** Carry the intent across the redirect, so the game can say why it is showing. */
function goToGame(query = '') {
  const target = new URL(GAME_URL, location.href);
  if (query) target.search = query;
  location.replace(target.href);
}

function start() {
  const root = qsOrNull('#auth-root');
  if (!root) return;

  // Already signed in: the form has nothing to offer. Guests are not signed in,
  // so a guest who comes back here sees the form again rather than a dead end.
  if (currentSession()) {
    log.trace('session already active, going to the farm');
    goToGame();
    return;
  }

  mountLoginPanel(root, {
    currentSession,
    signIn,
    signUp,
    // Part of the panel contract. The login page has no session to end, so this
    // is passed and never called here; the game page is where it is used.
    signOut,

    onAuthenticated(session) {
      // The address and farmer name would be safe to log, but the panel hands us
      // nothing secret and this is not the place to start.
      log.info('authenticated, entering the farm');
      goToGame(session?.status === 'guest' ? '?guest=1' : '');
    },

    onGuest() {
      const result = signInAsGuest();
      log.info(result.ok ? 'continuing as guest' : 'guest play failed');
      goToGame('?guest=1');
    },
  });
}

start();