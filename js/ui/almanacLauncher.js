/**
 * The almanac button — the open book on the farm screen, directly under the shop
 * button.
 *
 * The almanac is a page of its own (`almanac.html`), so this is an `<a>` and not a
 * button with a click handler: middle-click, ctrl-click and "open in new tab" all
 * work, and none of them needs code here.
 *
 * The picture is the whole control, so the naming sits on the `aria-label`, which is
 * the only thing giving this link an accessible name — the image's own `alt` is
 * deliberately empty, because a screen reader should announce "Open the almanac,
 * link" once rather than read out the artwork.
 *
 * The href is passed in rather than derived here. It carries `?guest=1` for a guest,
 * because a guest session lives in the URL rather than in storage — see
 * `almanacHref` in `js/main.js` — and the almanac page forwards that flag on its
 * "Back to farm" link.
 */

import { clear, el } from '../utils/dom.js';
import { BOOK_IMG } from '../config/assets.js';

/**
 * @param {HTMLElement} root
 * @param {{href: string}} actions
 * @returns {{unmount: () => void}}
 */
export function mountAlmanacLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open the almanac',
  });

  link.append(el('img', {
    class: 'sidebar-btn__img',
    src: BOOK_IMG,
    alt: '',
    'aria-hidden': 'true',
  }));

  root.append(link);

  return { unmount() { clear(root); } };
}
