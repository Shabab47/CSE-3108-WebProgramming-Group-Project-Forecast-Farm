import { clear, el } from '../utils/dom.js';
import { iconEl } from './icons.js';

export function mountShopLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open the seed shop',
  });

  link.append(iconEl('store', 'sidebar-btn__icon'));

  root.append(link);

  return { unmount() { clear(root); } };
}
