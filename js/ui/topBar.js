/**
 * Top bar.
 *
 * Logo, the signed-in player, and sign-out. The location search and the action
 * buttons belong here too, but they arrive with the weather work in T-11, so the
 * bar says what is missing rather than rendering a dead input.
 */

import { el, clear } from '../utils/dom.js';
import { createLog } from '../utils/log.js';

const log = createLog('topBar');

/**
 * @param {HTMLElement} root
 * @param {{ session: object, onSignOut: Function }} actions
 * @returns {{ unmount: Function }}
 */
export function mountTopBar(root, actions) {
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

  const card = el('div', { class: 'card topbar' }, [
    el('a', { class: 'topbar__logo', href: 'index.html', 'aria-label': 'Forecast Farm home' }, [
      el('span', { class: 'topbar__mark', 'aria-hidden': 'true', text: '🌾' }),
      el('span', { class: 'topbar__name', text: 'Forecast Farm' }),
    ]),

    el('div', { class: 'topbar__search' }, [
      el('label', { class: 'visually-hidden', for: 'location-search', text: 'Search for a place' }),
      el('input', {
        class: 'input',
        id: 'location-search',
        type: 'search',
        placeholder: 'Search a place — arrives with live weather (T-11)',
        disabled: true,
      }),
    ]),

    el('div', { class: 'topbar__account' }, [
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