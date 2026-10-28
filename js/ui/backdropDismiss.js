/**
 * Dismiss a dialog the way a player expects: click the dimmed background, or press Escape.
 *
 * Both dialogs (`plotInspector.js`, `cropPicker.js`) mount into `#farm-picker`, which is the
 * fixed, full-viewport overlay that dims the field and centres its child. So "outside the
 * card" already has an element, and a click on it is a click whose `target` is the overlay
 * itself — a click on the card, or on anything inside it, has that node as its target
 * instead. That one comparison is the whole rule, and it is the same one `reportBug.js`
 * uses for its own overlay.
 *
 * **Escape listens on the document, not the overlay.** Neither card takes focus when it
 * opens, so a keydown aimed at the overlay would only arrive after the player had already
 * clicked something inside it. A document listener fires wherever focus is; it is removed
 * by `stop()`, so pressing Escape with nothing open does nothing at all.
 *
 * **One listener per overlay.** `mountPlotInspector` runs again for every plot clicked, so
 * a naive `addEventListener` would leave a handler behind on each open and fire last
 * night's `onClose` three times on one click. The handler is kept in a `WeakMap` keyed by
 * the overlay: re-registering swaps which callback runs, and the listeners themselves are
 * installed once.
 */

import { listen } from '../utils/dom.js';

/** The live registration for each overlay: its handler and its `stop()`. */
const active = new WeakMap();

/**
 * Close `overlay`'s dialog on a backdrop click or Escape.
 *
 * @param {HTMLElement} overlay the host the dialog is mounted in
 * @param {() => void} onDismiss what closing means for that dialog
 * @returns {() => void} `stop()`, which detaches everything and clears the registration
 */
export function dismissOnBackdrop(overlay, onDismiss) {
  const existing = active.get(overlay);
  if (existing) {
    existing.handler = onDismiss;
    return existing.stop;
  }

  const registration = { handler: onDismiss, stop: null };

  // Registered before the listeners so an event can never arrive before the entry exists.
  active.set(overlay, registration);

  const offClick = listen(overlay, 'click', (event) => {
    // A click inside the card has the card (or a child of it) as its target, and is not a
    // dismissal — pressing a button must not also close the panel it belongs to.
    if (event.target !== overlay) return;
    active.get(overlay)?.handler?.();
  });

  const offKey = listen(document, 'keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault?.();
    active.get(overlay)?.handler?.();
  });

  registration.stop = () => {
    offClick();
    offKey();
    active.delete(overlay);
  };

  return registration.stop;
}
