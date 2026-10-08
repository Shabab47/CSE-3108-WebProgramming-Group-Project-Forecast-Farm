/**
 * Entry point for login.html.
 *
 * Wiring only. This is the one module allowed to import both a UI panel and the
 * auth provider, which is exactly the arrangement `docs/architecture.md`
 * describes: callbacks go in through `mountX(root, actions)`.
 *
 * ## Provider swap
 *
 * `USE_LOCAL_PROVIDER` below is the only line that names a provider. It is
 * imported dynamically from a string so the module graph stays swappable without
 * an edit here — set it to `false` and the real Supabase provider loads instead.
 * Both implement the identical contract (DEC-017), so no panel changes.
 *
 *   USE_LOCAL_PROVIDER = true   localAuth.js  — accounts in localStorage, no backend
 *   USE_LOCAL_PROVIDER = false  authApi.js    — Supabase over REST, real accounts
 *
 * It is now `false`: `js/config/supabase.js` has a project URL and anon key.
 *
 * `loadProvider` is exported because `js/main.js` boots against the **same**
 * provider (ISS-033). It used to import `localAuth.js` directly, so with the flag
 * flipped here and not there, the login page issued a real Supabase session and
 * the game page then read localStorage, found nothing, and redirected back to
 * this form — a loop. Both entry points must ask the same question.
 */

import { qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { mountLoginPanel } from './ui/loginPanel.js';
import { mountPasswordReset } from './ui/passwordReset.js';
import * as localAuth from './services/localAuth.js';

const log = createLog('auth-main');

const GAME_URL = 'index.html';

/**
 * `false` since 2026-10-06: Supabase is configured (T-29). Kept as a named
 * constant so the switch is one line and greppable, not a commented-out import.
 */
const USE_LOCAL_PROVIDER = false;

/** Loaded lazily so a missing or broken provider module cannot break the page. */
export async function loadProvider() {
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

/**
 * A notice for arriving from the settings page having deleted an account.
 *
 * Read from the query and cleared from the URL, for the same reason the recovery token
 * is: a flag should not sit in the address bar where it can be shared, bookmarked or
 * screenshotted and mean something different next time.
 *
 * Shown as information, not as an error — being signed out was the point, not a
 * failure. One wording, because both providers now delete immediately and behind the
 * same password check, so there is no longer a difference to describe.
 */
function readArrivalNotice() {
  const params = new URLSearchParams(location.search);
  if (params.get('deleted') !== '1') return null;

  history.replaceState(null, '', location.pathname);

  return 'Your account, farm and username have been deleted, and you are signed out. You can register again with the same email whenever you like.';
}

async function start() {
  const root = qsOrNull('#auth-root');
  if (!root) return;

  const provider = await loadProvider();
  const recoveryToken = readRecoveryToken();
  const arrivalNotice = readArrivalNotice();

  // The Supabase access token lives in memory only, so on any fresh page load
  // `currentSession()` is null even for a player who is genuinely signed in.
  // `restoreSession()` mints a new one from the stored refresh token, which is
  // what makes this check see a real session. Absent on the local provider, hence
  // the optional call — there the session is in storage already.
  const session = provider.currentSession() ?? (await provider.restoreSession?.());

  // Already signed in, and not arriving to change a password: the form has
  // nothing to offer. Guests are not signed in, so a guest who comes back here
  // sees the form again rather than a dead end.
  if (session && !recoveryToken) {
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
          // Wrapped rather than passed straight through, so the redirect target
          // is derived from the page actually being served. Without it GoTrue sends
          // the recovery link to the project's Site URL, and this page is the only
          // one that reads the token out of the fragment — so a Site URL pointing
          // anywhere else means the reset silently never completes (ISS-031).
          requestPasswordReset: (options) => provider.requestPasswordReset({
            ...options,
            redirectTo: new URL('login.html', location.href).href,
          }),
          updatePassword: provider.updatePassword,
          recoveryToken: () => recoveryToken,
          onBack(notice) {
            showLogin(notice);
          },
        });
      },
    });
  }

  showLogin(arrivalNotice ?? undefined);
}

/**
 * Only on the real page.
 *
 * `js/main.js` imports `loadProvider` from here (ISS-033), so this module is no
 * longer only ever loaded by login.html. Without the guard, importing it from the
 * game page would boot the login form and redirect the player away from their
 * farm. `#auth-root` is on login.html and nowhere else, so it is the marker for
 * "this is the page, not an import".
 */
if (qsOrNull('#auth-root')) {
  start();
}