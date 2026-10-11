/**
 * Navbar.
 *
 * Logo, the signed-in player, and sign-out. The location search belongs to the
 * weather panel, not here — see ui/locationBar.js and T-11.
 */

import { el, clear } from '../utils/dom.js';
import { createLog } from '../utils/log.js';

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

  const signOut = el('button', {
    class: 'btn btn--ghost',
    type: 'button',
    text: isGuest ? 'Leave guest farm' : 'Sign out',
    on: {
      click: () => {
        log.trace('sign out requested by', session.userId);
        onSignOut();
      },
    },
  });

  const card = el('div', { class: 'card navbar' }, [
    el('a', { class: 'navbar__logo', href: 'index.html', 'aria-label': 'Forecast Farm home' }, [
      el('span', { class: 'navbar__mark', 'aria-hidden': 'true', text: '🌾' }),
      el('span', { class: 'navbar__name', text: 'Forecast Farm' }),
    ]),

    el('div', { class: 'navbar__account' }, [
      // The farmer name is visible once authed, not only on the login card, so a
      // returning player can see at a glance which farm is open.
      el('span', {
        class: isGuest ? 'badge' : 'badge badge--accent',
        title: session.username || session.email || 'Not signed in',
        text: session.farmerName || 'Guest farmer',
      }),
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