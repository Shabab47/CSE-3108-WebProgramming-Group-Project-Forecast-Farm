/**
 * The "Account" card: who is signed in, and what that means.
 *
 * Lives on the profile page. It used to sit on the settings page, which put the
 * one card that answers "whose farm am I playing" underneath two destructive
 * actions — the account card is not a setting, and reaching it should not require
 * walking past erase-progress and delete-account.
 *
 * It knows the session shape and the chosen avatar id. No store, no provider, no
 * actions beyond the avatar callback — the guest case is decided from the session's
 * own status, because "is there an account here" is a fact about the session rather
 * than a question for someone else.
 *
 * Shape matches the painted frame: an avatar side on the left, the account facts on
 * the right, all inside one cream card. The avatar is a preset picker, not an upload;
 * see DEC-051.
 */

import { AVATARS } from '../config/avatars.js';
import { el } from '../utils/dom.js';
import { iconEl } from './icons.js';
import { avatarArt } from './avatarArt.js';

/** One `key: value` line, or nothing when the value is empty. */
function row(key, value) {
  if (!value) return null;
  return el('div', { class: 'account-list__row' }, [
    el('dt', { class: 'account-list__key', text: `${key}:` }),
    el('dd', { class: 'account-list__value', text: value }),
  ]);
}

/** The main circle: preset art when there is some, otherwise the gray person. */
function avatarFace(id) {
  const art = avatarArt(id);
  if (!art) return iconEl('user', 'profile-avatar__default');
  return el('span', { class: 'profile-avatar__art', html: art, 'aria-hidden': 'true' });
}

/**
 * @param {{status:string, farmerName?:string, username?:string, email?:string}} session
 * @param {object} [options]
 * @param {string|null} [options.avatar] a preset id, or null for the default
 * @param {(id:string|null) => {ok:boolean, reason?:string}} [options.onChange]
 * @returns {HTMLElement}
 */
export function accountCard(session, { avatar = null, onChange = null } = {}) {
  const isGuest = session?.status === 'guest';
  let current = avatar;

  const badge = el('div', { class: 'profile-avatar' });
  const choices = el('div', {
    class: 'profile-avatars',
    role: 'group',
    'aria-label': 'Choose avatar',
  });

  function paint() {
    const hasArt = Boolean(avatarArt(current));
    badge.className = hasArt ? 'profile-avatar' : 'profile-avatar profile-avatar--default';
    badge.replaceChildren(avatarFace(current));

    choices.replaceChildren(
      option(null, 'Default avatar'),
      ...AVATARS.map((preset) => option(preset.id, preset.label)),
    );
  }

  function option(id, label) {
    const selected = id === current;
    const art = id ? avatarArt(id) : null;
    const face = art
      ? el('span', { class: 'profile-avatar-option__art', html: art, 'aria-hidden': 'true' })
      : iconEl('user', 'profile-avatar-option__default');

    return el('button', {
      type: 'button',
      class: `profile-avatar-option${selected ? ' profile-avatar-option--selected' : ''}`,
      'aria-label': label,
      'aria-pressed': selected ? 'true' : 'false',
      title: label,
      on: { click: () => choose(id) },
    }, [face]);
  }

  function choose(id) {
    if (id === current) return;

    // The callback is the store write. If it refuses, keep the picture the player can
    // actually see rather than painting an option that was not saved.
    const result = onChange?.(id);
    if (result && result.ok === false) return;

    current = id;
    paint();
  }

  paint();

  const rule = el('div', { class: 'profile-account__rule' }, [
    el('span', { class: 'profile-account__rule-line', 'aria-hidden': 'true' }),
    iconEl('sprout', 'profile-account__sprout'),
    el('span', { class: 'profile-account__rule-line', 'aria-hidden': 'true' }),
  ]);

  const guestHint = isGuest
    ? el('p', {
      class: 'field__hint',
      // A guest has no account to name and nothing to come back to, so say the way
      // out rather than listing empty rows.
      text: 'You are playing as a guest, so this farm lives in this browser only. Create an account to keep it.',
    })
    : null;

  return el('div', { class: 'card card--account' }, [
    el('div', { class: 'card__body' }, [
      el('div', { class: 'profile-account' }, [
        el('div', { class: 'profile-account__avatar' }, [badge, choices, rule]),
        el('div', { class: 'profile-account__details' }, [
          el('div', { class: 'card__head' }, [
            el('span', { class: 'card__title', text: 'Account' }),
          ]),
          el('dl', { class: 'account-list' }, [
            row('Farmer', session?.farmerName),
            row('Username', session?.username),
            row('Email', session?.email),
          ].filter(Boolean)),
          guestHint,
        ]),
      ]),
    ]),
  ]);
}
