/**
 * The "Account" card on the settings page: who is signed in, and what that means.
 *
 * Split out of `settingsView.js` for the reason every file here is split out — that one
 * went over the ~200-line budget once both destructive actions landed, and this is the
 * cleanest seam in it: a card with no behaviour, which is the first thing a reader wants
 * to skim past.
 *
 * It knows about the session shape and nothing else. No store, no provider, no actions —
 * the guest case is decided from the session's own status, because "is there an account
 * here" is a fact about the session rather than a question for someone else.
 */

import { el } from '../utils/dom.js';

/** One `key: value` line, or nothing when the value is empty. */
function row(key, value) {
  if (!value) return null;
  return el('p', { class: 'settings-accounts__row' }, [
    el('span', { class: 'settings-accounts__key', text: `${key}:` }),
    el('span', { class: 'settings-accounts__value', text: value }),
  ]);
}

/**
 * @param {{status:string, farmerName?:string, username?:string, email?:string}} session
 * @returns {HTMLElement}
 */
export function accountCard(session) {
  const isGuest = session?.status === 'guest';

  return el('div', { class: 'card' }, [
    el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Account' })]),
    el('div', { class: 'card__body' }, [
      // `.filter(Boolean)` drops the rows a guest cannot have, so there is never a
      // "Username:" label sitting next to nothing.
      el('dl', { class: 'settings-accounts' }, [
        row('Farmer', session?.farmerName),
        row('Username', session?.username),
        row('Email', session?.email),
      ].filter(Boolean)),
      el('p', {
        class: 'field__hint',
        // A guest has no account to name and nothing to come back to, so say the way
        // out rather than listing empty rows.
        text: isGuest
          ? 'You are playing as a guest, so this farm lives in this browser only. Create an account to keep it.'
          : 'These are the details you signed up with.',
      }),
    ]),
  ]);
}
