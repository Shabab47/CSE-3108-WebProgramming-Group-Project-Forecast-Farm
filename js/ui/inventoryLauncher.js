import { clear, el } from '../utils/dom.js';
import { cropSeedImg } from '../config/assets.js';

export function mountInventoryLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open inventory',
  });

  link.append(el('img', {
    class: 'sidebar-btn__img',
    src: cropSeedImg('rice'),
    alt: '',
    'aria-hidden': 'true',
  }));

  root.append(link);

  return { unmount() { clear(root); } };
}
