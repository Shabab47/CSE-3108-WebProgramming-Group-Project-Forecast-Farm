/**
 * The inventory button — the crate on the farm screen, directly under the almanac
 * button.
 *
 * The seed bag is a page of its own (`inventory.html`), so this is an `<a>` and not
 * a button with a click handler: middle-click, ctrl-click and "open in new tab" all
 * work, and none of them needs code here.
 *
 * The picture is the whole control, so the naming sits on the `aria-label`, which is
 * the only thing giving this link an accessible name — the image's own `alt` is
 * deliberately empty, because a screen reader should announce "Open your seed bag,
 * link" once rather than read out the artwork.
 *
 * The href is passed in rather than derived here. It carries `?guest=1` for a guest,
 * because a guest session lives in the URL rather than in storage — see
 * `inventoryHref` in `js/main.js` — and the seed-bag page needs the same hint or it
 * would send the player back to the login form they have already passed.
 */

import { clear, el } from '../utils/dom.js';
import { INVENTORY_IMG } from '../config/assets.js';

/**
 * @param {HTMLElement} root
 * @param {{href: string}} actions
 * @returns {{unmount: () => void}}
 */
export function mountInventoryLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open your seed bag',
  });

  link.append(el('img', {
    class: 'sidebar-btn__img',
    src: INVENTORY_IMG,
    alt: '',
    'aria-hidden': 'true',
  }));

  root.append(link);

  return { unmount() { clear(root); } };
}
