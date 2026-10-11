/**
 * The opening menu: the logo, and the three ways into the game.
 *
 * Render and events only. Every outside call arrives through `actions`, so this
 * file has no idea how an account is made or what a session is — it draws three
 * buttons and hands back whichever one was pressed. `js/auth-main.js` is the only
 * caller and the only thing that knows where each one goes.
 *
 *   mountMenuPanel(root, actions) → { unmount() }
 *
 * actions:
 *   onSignIn()    → show the sign-in view
 *   onRegister()  → show the create-account view
 *   onGuest()     → continue without an account
 *   focus         → whether to move focus onto the first button (see below)
 */

import { clear, el } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { TITLE_IMG } from '../config/assets.js';

const log = createLog('menuPanel');

export function mountMenuPanel(root, actions) {
  clear(root);

  /** One pill button. `track` is what the log line says was pressed. */
  function pill(label, track, onClick) {
    return el('button', {
      class: 'btn btn--menu',
      type: 'button',
      text: label,
      on: {
        click: () => {
          log.trace(track);
          onClick();
        },
      },
    });
  }

  // The logo is the page's only heading rather than a picture sitting above an
  // `h1` that says the same thing twice. `alt` is the accessible name, so the
  // page still announces itself with the image switched off.
  const logo = el('h1', { class: 'menu__heading' }, [
    el('img', { class: 'menu__logo', src: TITLE_IMG, alt: 'Forecast Farm' }),
  ]);

  const buttons = el('div', { class: 'menu__actions' }, [
    pill('Sign in', 'sign in chosen', actions.onSignIn),
    pill('Create Account', 'register chosen', actions.onRegister),
    pill('Play as guest', 'guest chosen', actions.onGuest),
  ]);

  root.append(
    el('div', { class: 'menu' }, [
      logo,
      buttons,
      // Worth saying before the button is pressed rather than after: a guest farm
      // lives in this browser only and cannot be exported.
      el('p', {
        class: 'menu__note',
        text: 'A guest farm stays in this browser and cannot be exported.',
      }),
    ]),
  );

  // Focus only when arriving here from another view — Back, or Create account
  // from the sign-in sign. On a first page load there is nothing to recover from
  // and moving focus would paint a focus ring the visitor never asked for.
  if (actions.focus !== false) {
    buttons.querySelector('button')?.focus();
  }

  return { unmount() { clear(root); } };
}