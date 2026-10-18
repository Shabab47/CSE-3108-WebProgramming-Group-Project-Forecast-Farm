import { clear, el } from '../utils/dom.js';
import { SHOP_IMG } from '../config/assets.js';

export function mountShopLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open the seed shop',
  });

  link.append(el('img', {
    class: 'sidebar-btn__img',
    src: SHOP_IMG,
    alt: '',
    'aria-hidden': 'true',
  }));

  root.append(link);

  return { unmount() { clear(root); } };
}
