import { clear, el } from '../utils/dom.js';
import { iconEl } from './icons.js';

export function mountInventoryLauncher(root, actions) {
  clear(root);

  const link = el('a', {
    class: 'sidebar-btn',
    href: actions.href,
    'aria-label': 'Open inventory',
  });

  link.append(iconEl('package', 'sidebar-btn__icon'));

  root.append(link);

  return { unmount() { clear(root); } };
}
