/**
 * The shop button — the sign on the farm screen.
 *
 * The shop is a page of its own (`shop.html`), so this is an `<a>` and not a
 * button with a click handler: middle-click, ctrl-click and "open in new tab" all
 * work, and none of them needs code here. The art does the talking, with a text
 * label under it so the control is not an unlabelled image to a screen reader or
 * to anyone who cannot see it.
 *
 * The href is passed in rather than derived here. It carries `?guest=1` for a
 * guest, because a guest session lives in the URL rather than in storage — see
 * `resolveSession` in `js/main.js` — and the shop page needs the same hint or it
 * would send the player back to the login form they have already passed.
 */

import { clear, el } from '../utils/dom.js';
import { SHOP_IMG } from '../config/assets.js';

/**
 * @param {HTMLElement} root
 * @param {{href: string}} actions
 * @returns {{unmount: () => void}}
 */
export function mountShopLauncher(root, actions) {
  clear(root);

  root.append(
    el('a', { class: 'shop-launch', href: actions.href, 'aria-label': 'Open the seed shop' }, [
      el('img', {
        class: 'shop-launch__art',
        src: SHOP_IMG,
        alt: '',
        width: 1254,
        height: 1254,
        loading: 'lazy',
      }),
      el('span', { class: 'shop-launch__label', text: 'Shop' }),
    ]),
  );

  return { unmount() { clear(root); } };
}