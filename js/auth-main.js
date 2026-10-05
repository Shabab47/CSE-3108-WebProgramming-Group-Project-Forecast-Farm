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

/**
 * Entry point for login.html.
 *
 * Wiring only. This is the one module allowed to import both a UI panel and the
 * auth provider, which is exactly the arrangement `docs/architecture.md`
 * describes: callbacks go in through `mountX(root, actions)`.
 *
 * ## Provider swap
 *
 * `PROVIDER` below is the only line that names a provider. It is imported
 * dynamically from a string so the module graph stays swappable without an edit
 * here — set `USE_LOCAL_PROVIDER = false` and the real Supabase provider loads
 * instead. Both implement the identical contract (DEC-017), so no panel changes.
 *
 *   USE_LOCAL_PROVIDER = true   localAuth.js  — accounts in localStorage, no backend
 *   USE_LOCAL_PROVIDER = false  authApi.js    — Supabase over REST, real accounts
 *
 * Local stays the default until a Supabase project exists and
 * `js/config/supabase.js` has a URL and anon key in it. Without the key,
 * `authApi.js` refuses every call rather than sending requests to nowhere.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { mountLoginPanel } from './ui/loginPanel.js';
import { mountPasswordReset } from './ui/passwordReset.js';
import * as localAuth from './services/localAuth.js';

const log = createLog('auth-main');

const GAME_URL = 'index.html';

/**
 * Flip to false once Supabase is configured. Kept as a named constant so the
 * switch is one line and greppable, not a commented-out import.
 */
const USE_LOCAL_PROVIDER = true;

/** Loaded lazily so a missing or broken provider module cannot break the page. */
async function loadProvider() {
  if (USE_LOCAL_PROVIDER) {
    log.info('using the local provider (accounts live in this browser only)');
    return localAuth;
  }

  try {
    const provider = await import('./services/authApi.js');
    log.info('using the Supabase provider');
    return provider;
  } catch (error) {
    // Better a working local login than a dead page, and the reason is logged.
    log.error('authApi.js failed to load, falling back to local -', error.message);
    return localAuth;
  }
}

/** Carry the intent across the redirect, so the game can say why it is showing. */
function goToGame(query = '') {
  const target = new URL(GAME_URL, location.href);
  if (query) target.search = query;
  location.replace(target.href);
}

/**
 * Supabase sends the recovery link back with the access token in the URL
 * fragment. Fragments never reach a server, so this is the one place the value is
 * read, and it is passed into the panel rather than used to call the provider
 * directly. Read once at boot: the fragment stays out of `location` afterwards so
 * a token cannot be copied out of the address bar or a screenshot.
 */
function readRecoveryToken() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!raw) return null;

  const token = new URLSearchParams(raw).get('access_token');
  if (!token) return null;

  history.replaceState(null, '', location.pathname + location.search);
  return token;
}

async function start() {
  const root = qsOrNull('#auth-root');
  if (!root) return;

  const provider = await loadProvider();
  const recoveryToken = readRecoveryToken();

  // Already signed in, and not arriving to change a password: the form has
  // nothing to offer. Guests are not signed in, so a guest who comes back here
  // sees the form again rather than a dead end.
  if (provider.currentSession() && !recoveryToken) {
    log.trace('session already active, going to the farm');
    goToGame();
    return;
  }

  let panel = null;

  /** Swap the login panel and the reset flow inside the same root. */
  function showLogin(notice) {
    panel?.unmount();
    panel = mountLoginPanel(root, {
      currentSession: provider.currentSession,
      signIn: provider.signIn,
      signUp: provider.signUp,
      // Part of the panel contract. The login page has no session to end, so
      // this is passed and never called here; the game page is where it is used.
      signOut: provider.signOut,
      notice,

      onAuthenticated(session) {
        // The address and farmer name would be safe to log, but the panel hands
        // us nothing secret and this is not the place to start.
        if (!session) {
          // Sign-up succeeded but issued no session: GoTrue has emailed a
          // confirmation link. authErrors.js owns that sentence.
          log.info('registered, awaiting confirmation');
          showLogin('Almost there — check your inbox for the confirmation link, then sign in.');
          return;
        }
        log.info('authenticated, entering the farm');
        goToGame(session?.status === 'guest' ? '?guest=1' : '');
      },

      onGuest() {
        const result = localAuth.signInAsGuest();
        log.info(result.ok ? 'continuing as guest' : 'guest play failed');
        goToGame('?guest=1');
      },

      onForgotPassword() {
        panel?.unmount();
        panel = mountPasswordReset(root, {
          requestPasswordReset: provider.requestPasswordReset,
          updatePassword: provider.updatePassword,
          recoveryToken: () => recoveryToken,
          onBack(notice) {
            showLogin(notice);
          },
        });
      },
    });
  }

  showLogin();
}

start();