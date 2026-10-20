/**
 * The profile page: who is signed in, and the way out.
 *
 * The account card answers "whose farm am I playing"; reaching it should not
 * require walking past two destructive actions. Sign-out moved with it for the
 * same reason: it is a profile action, not a configuration one.
 *
 * The whole page sits inside the painted frame shared with settings.html, so
 * both pages read like one menu. Render and events only — every outside call
 * arrives through `actions`, so this file never imports `store.js`.
 */

import { clear, el } from '../utils/dom.js';
import { pageFrame } from './pageFrame.js';
import { accountCard } from './accountCard.js';
import { iconEl } from './icons.js';

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {{status:string, farmerName?:string, username?:string, email?:string}} actions.session
 * @param {() => void} actions.onSignOut
 * @param {(msg:string, tone:string) => void} actions.toast
 * @param {string} actions.backHref
 * @returns {{unmount: () => void}}
 */
export function mountProfile(root, actions) {
  clear(root);

  const { session } = actions;
  const isGuest = session?.status === 'guest';

  const { node, board } = pageFrame({ title: 'Profile', backHref: actions.backHref });
  root.append(node);

  const dot = el('span', { class: 'profile-session__dot', 'aria-hidden': 'true' });

  const signOut = el('button', {
    class: 'btn btn--secondary profile-session__signout',
    type: 'button',
    'aria-label': isGuest ? 'Leave guest farm' : 'Sign out',
    on: { click: () => actions.onSignOut() },
  }, [iconEl('logout', 'profile-session__signout-icon'), isGuest ? 'Leave guest farm' : 'Sign out']);

  board.append(
    accountCard(session),
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        iconEl('session', 'card__icon'),
        el('span', { class: 'card__title', text: 'Session' }),
      ]),
      el('div', { class: 'card__body' }, [
        el('div', { class: 'profile-session' }, [
          el('span', { class: 'profile-session__icon', 'aria-hidden': 'true' }, [iconEl('session')]),
          el('span', { class: 'profile-session__status' }, [
            dot,
            isGuest ? 'You are playing as a guest.' : 'You are signed in.',
          ]),
          signOut,
        ]),
      ]),
    ]),
  );

  return { unmount() { clear(root); } };
}
