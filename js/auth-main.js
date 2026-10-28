/**
 * Entry point for login.html — the menu, the sign-in and create-account forms,
 * the avatar step after registration, and the password reset flow.
 *
 * Wiring only. This is the one module allowed to import both a UI panel and the
 * auth provider, which is exactly the arrangement `docs/architecture.md`
 * describes: callbacks go in through `mountX(root, actions)`.
 *
 * What lives here is the boot: resolve the provider, decide where to open,
 * hand the callbacks over. The view graph — which button leads to which screen,
 * and what carries focus — belongs to `ui/authViews.js`, which imports no
 * provider and calls no service.
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
import { mountBootLoader } from './ui/loadingTips.js';
import { mountBlockedScreen } from './ui/blockedScreen.js';
import { mountAuthViews } from './ui/authViews.js';
import { authErrorToMessage } from './ui/authErrors.js';
import { parseAuthArrival } from './domain/authArrival.js';
import { isAvatarId } from './config/avatars.js';
import { MENU_BG } from './config/assets.js';
import * as localAuth from './services/localAuth.js';
import { play } from './utils/sound.js';

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
 * Paint the scene behind every view.
 *
 * Set from here rather than from `css/auth.css` because every image path in the
 * project lives in `js/config/assets.js` -- see the note at the top of that file.
 * `login.html` preloads the file so this normally lands before first paint.
 */
function paintScene() {
  const scene = qsOrNull('.auth__scene');
  if (!scene) return;
  scene.style.backgroundImage = `url('${MENU_BG}')`;
}

/**
 * The recovery link, whatever shape it arrived in.
 *
 * Read once at boot, and passed into the panel rather than used to call the provider
 * directly — except for the `token_hash`, which has to be exchanged before the panel
 * exists.
 *
 * `scrub` is returned rather than called here: a `token_hash` must stay in the
 * address bar until it has been exchanged, or a slow connection would throw away the
 * only copy of a one-time token we have. Fragments are cleared immediately, because
 * nothing needs them again.
 */
function readAuthArrival() {
  const arrival = parseAuthArrival(location.search, location.hash);
  const scrub = () => history.replaceState(null, '', location.pathname);
  return { arrival, scrub };
}

/**
 * A notice for arriving from the settings page having deleted an account.
 *
 * Read from the query and cleared from the URL, for the same reason the recovery token
 * is: a flag should not sit in the address bar where it can be shared, bookmarked or
 * screenshotted and mean something different next time.
 *
 * Shown as information, not as an error -- being signed out was the point, not a
 * failure. One wording, because both providers now delete immediately and behind the
 * same password check, so there is no longer a difference to describe.
 */
function readArrivalNotice() {
  const params = new URLSearchParams(location.search);
  if (params.get('deleted') !== '1') return null;

  history.replaceState(null, '', location.pathname);

  return 'Your account, farm and username have been deleted, and you are signed out. You can register again with the same email whenever you like.';
}

/**
 * Where to open, and why not somewhere else.
 *
 * Two arrivals override the menu. Both are a case of the player following a link
 * for one specific thing, and the menu — three equally-weighted buttons — would
 * bury the reason they are here.
 *
 *   a recovery arrival                 -> the reset form: they clicked a link in
 *                                        their inbox to choose a password
 *   ?deleted=1                         -> sign in, with a notice: the sentence
 *                                        is about an account they had
 */
function chooseStartView({ arrival, arrivalNotice }) {
  // A *broken* link opens the reset flow too — the address form, with the reason on
  // screen. Falling through to the menu was the old behaviour, and it left the
  // player holding an expired link with nothing to read and nowhere to go.
  if (arrival.tokenHash || arrival.accessToken || arrival.error) return 'reset';
  if (arrivalNotice) return 'signIn';
  return 'menu';
}

async function start() {
  const root = qsOrNull('#auth-root');
  if (!root) return;

// Before the first `await`, same as the other three entry points. `#auth-root`
  // is empty until the view is mounted, and getting here means a dynamic import
  // plus a session restore, so the screen can take a moment to appear.
  const loader = mountBootLoader({ label: 'Loading' });

  paintScene();

  const provider = await loadProvider();
  const { arrival, scrub } = readAuthArrival();
  const arrivalNotice = readArrivalNotice();

  let recoveryToken = arrival.accessToken;

  // A `token_hash` is exchanged before anything else: it is the only arrival that can
  // become a working session, and restoring an unrelated session first would redirect
  // to the farm and drop the player's intent. The address bar is cleared only once the
  // exchange has settled, so a slow connection does not lose the token.
  if (arrival.tokenHash) {
    const verified = await provider.verifyRecovery?.({ tokenHash: arrival.tokenHash });
    scrub();

    if (verified?.ok) {
      recoveryToken = verified.accessToken;
    } else {
      log.warn('recovery link refused -', String(verified?.reason));
      arrival.error = verified?.reason ?? 'recovery_link_invalid';
    }
  } else if (arrival.accessToken || arrival.error) {
    scrub();
  }

  const recoveryNotice = arrival.error
    ? authErrorToMessage(arrival.error, 'session')
    : null;

  // The Supabase access token lives in memory only, so on any fresh page load
  // `currentSession()` is null even for a player who is genuinely signed in.
  // `restoreSession()` mints a new one from the stored refresh token, which is
  // what makes this check see a real session. Absent on the local provider, hence
  // the optional call -- there the session is in storage already.
  //
  // It answers `{ok, session|reason}` rather than `session | null`, so an
  // unreachable server is not mistaken for a signed-out one. That distinction is
  // ISS-048, and it matters most *here*: this page is where someone lands after
  // being wrongly logged out, so treating "offline" as "signed out" is what turned
  // one dropped connection into a password prompt. `localAuth` still returns a
  // bare session, so both shapes are handled.
  //
  // Skipped entirely when a recovery token is in hand: the player is here to change
  // a password, and a session cannot redirect them while that token exists.
  const restored = recoveryToken ? null : await provider.restoreSession?.();
  const session =
    provider.currentSession() ??
    (restored && typeof restored === 'object' && 'ok' in restored
      ? (restored.ok ? restored.session : null)
      : (restored ?? null));

  // A stored token we could not use, because we could not reach the server. Show
  // the blocked screen rather than the sign-in form: the player is not signed out,
  // and showing them a password box implies they are. The token is untouched, so a
  // retry works.
  const offlineReason =
    restored && typeof restored === 'object' && 'ok' in restored && !restored.ok &&
    restored.reason !== 'invalid_token'
      ? restored.reason
      : null;

  // A broken link is not a connection problem, so it must not be replaced by the
  // blocked screen: the player needs the address form and the reason, both of which
  // are local.
  if (offlineReason && !session && !recoveryToken && !arrival.error) {
    log.warn('cannot reach the server; showing the connection screen -', offlineReason);
    loader.done();
    mountBlockedScreen(root, { reason: offlineReason, onRetry: () => location.reload() });
    return;
  }

  // Already signed in, and not arriving to change a password: there is nothing to
  // offer. Guests are not signed in, so a guest who comes back here sees the menu
  // again rather than a dead end.
  if (session && !recoveryToken) {
    log.trace('session already active, going to the farm');
    loader.done();
    goToGame();
    return;
  }

  /** Guest play, from the menu or from either form. Same path both ways. */
  function goAsGuest() {
    const result = localAuth.signInAsGuest();
    log.info(result.ok ? 'continuing as guest' : 'guest play failed');
    goToGame('?guest=1');
  }

mountAuthViews(root, {
    startView: chooseStartView({ arrival, arrivalNotice }),
    notice: recoveryNotice ?? arrivalNotice ?? undefined,

    signIn: provider.signIn,
    signUp: provider.signUp,
    signOut: provider.signOut,

    // `redirect_to` is still sent, but it no longer decides anything: the recovery
    // template now links straight to this page with a `token_hash`, so GoTrue never
    // builds a redirect. It is kept because links already sitting in inboxes use the
    // old shape, and those still need to come back here rather than to the Site URL
    // (ISS-031). Remove it once the old links have aged out.
    requestPasswordReset: (options) => provider.requestPasswordReset({
      ...options,
      redirectTo: new URL('login.html', location.href).href,
    }),
    updatePassword: provider.updatePassword,
    recoveryToken: () => recoveryToken,

    onAuthenticated(authenticated, { avatar } = {}) {
      if (authenticated?.status === 'authed') play('login.mp3');
      // The address and farmer name would be safe to log, but the panel hands us
      // nothing secret and this is not the place to start.
      log.info('authenticated, entering the farm');

      // A new account's choice reaches the first farm in the URL. The login page
      // has no store, and writing game state here would make this a second save
      // writer; `js/main.js` reads this once and clears it from the address bar.
      const params = new URLSearchParams();
      if (authenticated?.status === 'guest') params.set('guest', '1');
      if (isAvatarId(avatar)) params.set('avatar', avatar);

      const query = params.toString();
      goToGame(query ? `?${query}` : '');
    },

    onGuest: goAsGuest,
  });

  loader.done();
}

/**
 * Only on the real page.
 *
 * `js/main.js` imports `loadProvider` from here (ISS-033), so this module is no
 * longer only ever loaded by login.html. Without the guard, importing it from
 * the game page would boot the login form and redirect the player away from their
 * farm. `#auth-root` is on login.html and nowhere else, so it is the marker for
 * "this is the page, not an import".
 */
if (qsOrNull('#auth-root')) {
  start();
}