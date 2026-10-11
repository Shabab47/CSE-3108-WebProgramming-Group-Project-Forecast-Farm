/**
 * The view graph on the login page: menu, sign in, create account, reset.
 *
 * One page, four faces, and `show(view)` is the only thing that swaps between
 * them. Each view is mounted alone and the previous one unmounted, so only what
 * the player is looking at is ever in the DOM. That replaced a tabbed panel that
 * built both forms and hid one — a form that exists only to be hidden is a form
 * a screen reader and a test both have to reason around.
 *
 * This module owns that decision and nothing else. It imports no provider and
 * calls no service: everything it needs arrives through `actions`, which is the
 * same arrangement every other panel uses. `js/auth-main.js` resolves the
 * provider, decides the entry view, and passes the callbacks in.
 *
 *   mountAuthViews(root, actions) → { show(view, notice) }
 *
 * actions:
 *   startView        'menu' | 'signIn' | 'signUp' | 'reset' — where to open
 *   notice           sentence to show on arrival, or undefined
 *   signIn({identifier, password}) → Promise<{ok, session?, reason?}>
 *   signUp({email, password, farmerName, username}) → same
 *   signOut()        → Promise<{ok}>
 *   requestPasswordReset({email}) → Promise<{ok}>
 *   updatePassword({accessToken, password}) → Promise<{ok}>
 *   recoveryToken()  → string | null, the token out of the URL fragment
 *   onAuthenticated(session | null) → route onward; null means awaiting confirmation
 *   onGuest()        → continue without an account
 */

import { createLog } from '../utils/log.js';
import { mountLoginPanel } from './loginPanel.js';
import { mountMenuPanel } from './menuPanel.js';
import { mountPasswordReset } from './passwordReset.js';

const log = createLog('authViews');

export function mountAuthViews(root, actions) {
  let panel = null;

  /**
   * Whether anything has been mounted yet.
   *
   * The first `show()` is the page opening on its own view; every later one is
   * the player moving, and moving is what should carry focus. See the menu
   * branch below.
   */
  let hasMounted = false;

  function show(view, notice) {
    panel?.unmount();
    panel = null;

    // Read before it is set: the menu branch asks whether this is the first view
    // of the session or a move back to it.
    const returning = hasMounted;
    hasMounted = true;

    if (view === 'menu') {
      panel = mountMenuPanel(root, {
        onSignIn: () => show('signIn'),
        onRegister: () => show('signUp'),
        onGuest: actions.onGuest,
        // Only take focus when arriving here from a form — Back, or the sign-in
        // sign's Create account link. On a first load the menu is what the
        // browser already opened on, and moving focus would paint a focus ring
        // the visitor never asked for.
        focus: returning,
      });
      return;
    }

    if (view === 'reset') {
      panel = mountPasswordReset(root, {
        requestPasswordReset: actions.requestPasswordReset,
        updatePassword: actions.updatePassword,
        recoveryToken: actions.recoveryToken,
        // Back from a reset goes to the form the player left, not to the menu:
        // "I forgot my password" is only ever said from the sign-in form.
        onBack(resetNotice) {
          show('signIn', resetNotice);
        },
      });
      return;
    }

    panel = mountLoginPanel(root, view, {
      signIn: actions.signIn,
      signUp: actions.signUp,
      // Part of the panel contract. This page has no session to end, so this is
      // passed and never called here; the game page is where it is used.
      signOut: actions.signOut,
      notice,

      onAuthenticated(session) {
        if (!session) {
          // Sign-up succeeded but issued no session: GoTrue has emailed a
          // confirmation link. authErrors.js owns that sentence.
          log.info('registered, awaiting confirmation');
          show('signIn', 'Almost there — check your inbox for the confirmation link, then sign in.');
          return;
        }
        actions.onAuthenticated(session);
      },

      onBack() {
        show('menu');
      },

      onSwitch(next) {
        show(next);
      },

      onGuest: actions.onGuest,

      onForgotPassword() {
        show('reset');
      },
    });
  }

  show(actions.startView ?? 'menu', actions.notice);

  return { show };
}