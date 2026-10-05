/**
 * Toast stack.
 *
 * Bottom-right stack of transient messages. Subscribes to the store's `toast`
 * event, which `store.apply` emits whenever a domain rule refuses an action.
 */

import { el, qsOrNull } from '../utils/dom.js';
import { on } from '../state/store.js';

const DEFAULT_TTL_MS = 4000;

/**
 * Mount the toast stack.
 * @param {HTMLElement} [root] defaults to #toast-stack
 * @returns {{ push: Function, unmount: Function }}
 */
export function mountToastStack(root = qsOrNull('#toast-stack')) {
  if (!root) return { push() {}, unmount() {} };

  const timers = new Set();

  function dismiss(node) {
    node.remove();
    for (const timer of timers) {
      if (timer.node === node) {
        clearTimeout(timer.id);
        timers.delete(timer);
      }
    }
  }

  function push({ message, tone = 'info', ttl = DEFAULT_TTL_MS }) {
    const node = el('div', { class: tone === 'error' ? 'toast toast--error' : 'toast', role: 'status', text: message });
    root.append(node);

    if (ttl > 0) {
      timers.add({ id: setTimeout(() => dismiss(node), ttl), node });
    }

    // Keep the stack short enough to read.
    while (root.children.length > 4) root.firstElementChild.remove();
  }

  const off = on('toast', push);

  return {
    push,
    unmount() {
      for (const timer of timers) clearTimeout(timer.id);
      timers.clear();
      off();
      root.replaceChildren();
    },
  };
}