/**
 * Navbar.
 *
 * The wordmark matches the login page's top bar (css/auth.css `.auth__word`).
 * The right side carries the action tiles — sound, settings and account — plus
 * sign-out. The location search belongs to the weather panel, not here — see
 * ui/locationBar.js and T-11.
 */

import { el, clear } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { icon } from './icon.js';
import { settingsHref } from '../main.js';

const log = createLog('navbar');

/**
 * @param {HTMLElement} root
 * @param {{ session: object, onSignOut: Function }} actions
 * @returns {{ unmount: Function }}
 */
export function mountNavbar(root, actions) {
  const { session, onSignOut } = actions;
  clear(root);

  const isGuest = session.status === 'guest';
  // Logged-in players see their name; guests get the person icon + a label,
  // since "Guest farmer" is not an identity worth reading as a headline.
  const playerName = session.farmerName || session.username || session.email;

  const signOut = el('button', {
    class: 'navbar__btn',
    type: 'button',
    text: isGuest ? 'Leave guest farm' : 'Sign out',
    on: {
      click: () => {
        log.trace('sign out requested by', session.userId);
        onSignOut();
      },
    },
  });

  const account = isGuest
    ? el('span', { class: 'navbar__account' }, [
        el('span', { class: 'navbar__tile', 'aria-hidden': 'true' }, [
          icon('user', 'navbar__tile-icon'),
        ]),
        el('span', { class: 'navbar__account-name', text: 'Guest farmer' }),
      ])
    : el('span', {
        class: 'navbar__account-name',
        title: session.username || session.email || 'Signed in',
        text: playerName || 'Farmer',
      });

  const card = el('div', { class: 'navbar' }, [
    el('a', { class: 'navbar__logo', href: 'index.html', 'aria-label': 'Forecast Farm home' }, [
      el('span', { class: 'navbar__word', text: 'Forecast Farm' }),
    ]),

    el('div', { class: 'navbar__actions' }, [
      // Sound is out of scope (ISS-023), so this is a decorative tile, not a
      // working control: no handler, and `aria-hidden` so it is skipped by AT.
      el('span', {
        class: 'navbar__tile',
        'aria-hidden': 'true',
        title: 'Sound — coming soon',
      }, [
        icon('volume-2', 'navbar__tile-icon'),
      ]),

      el('a', {
        class: 'navbar__tile',
        href: settingsHref(session),
        'aria-label': 'Settings',
        title: 'Settings',
      }, [
        icon('settings', 'navbar__tile-icon'),
      ]),

      account,
      signOut,
    ]),
  ]);

  root.append(card);

  return {
    unmount() {
      clear(root);
    },
  };
}
