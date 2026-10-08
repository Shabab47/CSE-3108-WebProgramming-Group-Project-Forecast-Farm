/**
 * The settings button — the gear sign on the farm screen.
 *
 * The settings is a page of its own (`settings.html`), so this is an `<a>` and not a
 * button with a click handler: middle-click, ctrl-click and "open in new tab" all
 * work, and none of them needs code here.
 *
 * The picture is the whole control, so there is no caption under it and no frame
 * around it. That puts the naming on the `aria-label`, which is the only thing
 * giving this link an accessible name now — the image's own `alt` is deliberately
 * empty, because a screen reader should announce "Open settings, link" once
 * rather than read out the artwork. The gold glow on hover lives in `css/settings.css`.
 *
 * The href is passed in rather than derived here. It carries `?guest=1` for a
 * guest, because a guest session lives in the URL rather than in storage — see
 * `resolveSession` in `js/main.js` — and the settings page needs the same hint or it
 * would send the player back to the login form they have already passed.
 */

import { clear, el } from '../utils/dom.js';
import { SETTINGS_IMG } from '../config/assets.js';

/**
 * @param {HTMLElement} root
 * @param {{href: string}} actions
 * @returns {{unmount: () => void}}
 */
export function mountSettingsLauncher(root, actions) {
  clear(root);

  root.append(
    el('a', { class: 'settings-launch', href: actions.href, 'aria-label': 'Open settings' }, [
      el('img', {
        class: 'settings-launch__art',
        src: SETTINGS_IMG,
        alt: '',
        width: 1254,
        height: 1254,
        loading: 'lazy',
      }),
    ]),
  );

  return { unmount() { clear(root); } };
}
