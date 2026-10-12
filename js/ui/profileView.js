/**
 * The profile page: who is signed in, and the way out.
 *
 * The account card used to sit on the settings page. It moved here because it is
 * not a setting — it is an answer to "whose farm am I playing", and reaching it
 * should not require walking past two destructive actions. Sign-out moved with
 * it for the same reason: it is a profile action, not a configuration one.
 *
 * Render and events only. Every outside call arrives through `actions`, so this
 * file never imports `store.js` — the same rule the rest of `js/ui/` keeps, and
 * the reason `profile-main.js` is the only module that knows about the provider.
 */

import { clear, el } from '../utils/dom.js';
import { accountCard } from './accountCard.js';

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

  const signOut = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: isGuest ? 'Leave guest farm' : 'Sign out',
    on: { click: () => actions.onSignOut() },
  });

  root.append(
    el('div', { class: 'profile-top' }, [
      el('div', { class: 'profile-top__lead' }, [
        el('a', { class: 'profile-top__back', href: actions.backHref, text: '← Back to the farm' }),
        el('h1', { class: 'profile-top__title', text: 'Profile' }),
      ]),
    ]),
    accountCard(session),
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Session' })]),
      el('div', { class: 'card__body' }, [
        el('p', {
          class: 'field__hint',
          text: isGuest
            ? 'This farm lives in this browser only. Create an account to keep it.'
            : 'You are signed in.',
        }),
        signOut,
      ]),
    ]),
  );

  return { unmount() { clear(root); } };
}
