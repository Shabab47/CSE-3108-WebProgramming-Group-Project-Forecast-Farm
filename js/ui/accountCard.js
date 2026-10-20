/**
 * The "Account" card: who is signed in, and what that means.
 *
 * Lives on the profile page. It used to sit on the settings page, which put the
 * one card that answers "whose farm am I playing" underneath two destructive
 * actions — the account card is not a setting, and reaching it should not require
 * walking past erase-progress and delete-account.
 *
 * It knows about the session shape and nothing else. No store, no provider, no
 * actions — the guest case is decided from the session's own status, because
 * "is there an account here" is a fact about the session rather than a question
 * for someone else.
 *
 * Shape now matches the painted frame: an avatar side on the left, the account
 * facts on the right, all inside one cream card.
 */

import { el } from '../utils/dom.js';
import { iconEl } from './icons.js';

/** One `key: value` line, or nothing when the value is empty. */
function row(key, value) {
  if (!value) return null;
  return el('div', { class: 'account-list__row' }, [
    el('dt', { class: 'account-list__key', text: `${key}:` }),
    el('dd', { class: 'account-list__value', text: value }),
  ]);
}

/** Initials for the avatar: first letters of up to two words, or the first two
 * letters of a single-word name. */
function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'G';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

/**
 * @param {{status:string, farmerName?:string, username?:string, email?:string}} session
 * @returns {HTMLElement}
 */
export function accountCard(session) {
  const isGuest = session?.status === 'guest';

  const avatar = el('span', {
    class: 'profile-avatar',
    'aria-hidden': 'true',
    text: initials(session?.farmerName),
  });

  const rule = el('div', { class: 'profile-account__rule' }, [
    el('span', { class: 'profile-account__rule-line', 'aria-hidden': 'true' }),
    iconEl('sprout', 'profile-account__sprout'),
    el('span', { class: 'profile-account__rule-line', 'aria-hidden': 'true' }),
  ]);

  return el('div', { class: 'card card--account' }, [
    el('div', { class: 'card__body' }, [
      el('div', { class: 'profile-account' }, [
        el('div', { class: 'profile-account__avatar' }, [avatar, rule]),
        el('div', { class: 'profile-account__details' }, [
          el('div', { class: 'card__head' }, [
            el('span', { class: 'card__title', text: 'Account' }),
          ]),
          el('dl', { class: 'account-list' }, [
            row('Farmer', session?.farmerName),
            row('Username', session?.username),
            row('Email', session?.email),
          ].filter(Boolean)),
          el('p', {
            class: 'field__hint',
            // A guest has no account to name and nothing to come back to, so say the way
            // out rather than listing empty rows.
            text: 'You are playing as a guest, so this farm lives in this browser only. Create an account to keep it.'
          }),
        ]),
      ]),
    ]),
  ]);
}
