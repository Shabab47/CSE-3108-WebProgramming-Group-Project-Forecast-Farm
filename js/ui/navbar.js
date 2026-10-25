/**
 * Navbar.
 *
 * The wordmark matches the login page's top bar (css/auth.css `.auth__word`).
 * The right side carries the action tiles — sound, settings and profile. The
 * profile tile shows the same chosen avatar as the account card, because it is
 * the shortest reminder of who the farm belongs to. The location search belongs
 * to the weather panel, not here — see ui/locationBar.js and T-11.
 */

import { el, clear } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { icon } from './icon.js';
import { iconEl } from './icons.js';
import { avatarArt } from './avatarArt.js';
import { mountReportBug } from './reportBug.js';
import { profileHref, settingsHref } from '../main.js';

const log = createLog('navbar');

/**
 * @param {HTMLElement} root
 * @param {{ session: object, avatar?: string|null, onSubmitBugReport?: Function }} actions
 * @returns {{ unmount: Function }}
 */
export function mountNavbar(root, actions) {
  const { session, avatar = null, onSubmitBugReport } = actions;
  clear(root);

  // The farmer's name and the sign-out button both live on the profile page now.
  // The bar carries only what you navigate with: the wordmark, settings and the
  // profile tile. That tile wears the chosen avatar, or the same gray person the
  // account card uses when nothing has been chosen.
  const art = avatarArt(avatar);
  const face = art
    ? el('span', { class: 'navbar__avatar-art', html: art, 'aria-hidden': 'true' })
    : iconEl('user', 'navbar__avatar-default');
  const account = el('a', {
    class: `navbar__tile navbar__tile--avatar${art ? '' : ' navbar__tile--default'}`,
    href: profileHref(session),
    'aria-label': 'Your profile',
    title: 'Profile',
  }, [face]);

  const report = el('button', {
    class: 'navbar__tile navbar__tile--report',
    type: 'button',
    'aria-label': 'Report a bug',
    'aria-haspopup': 'dialog',
    title: 'Report a bug',
  }, [
    icon('bug', 'navbar__tile-icon'),
  ]);
  const reportBug = mountReportBug(report, {
    session,
    onSubmit: onSubmitBugReport,
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

      report,

      el('a', {
        class: 'navbar__tile',
        href: settingsHref(session),
        'aria-label': 'Settings',
        title: 'Settings',
      }, [
        icon('settings', 'navbar__tile-icon'),
      ]),

      account,
    ]),
  ]);

  root.append(card);

  return {
    unmount() {
      reportBug.unmount();
      clear(root);
    },
  };
}
