/**
 * The settings panel.
 *
 * Render and events only. Every outside call arrives through `actions`, so this
 * file never imports `store.js` — the same rule `ui/savePanel.js` keeps. That is
 * what lets the delete logic live in the entry point, where the session and the
 * server-save adapter are both in hand.
 *
 * ## The delete button
 *
 * Two clicks, never one. The first only reveals the confirm and cancel pair; the
 * second is the only thing that destroys anything. A single destructive button
 * that wipes a farm on a stray click is the worst possible failure for the one
 * control people reach for when something has already gone wrong, and the
 * warning sentence names the cost rather than saying "are you sure?".
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';

const log = createLog('settingsView');

/** One `key: value` line, or nothing when the value is empty. */
function row(key, value) {
  if (!value) return null;
  return el('p', { class: 'settings-accounts__row' }, [
    el('span', { class: 'settings-accounts__key', text: `${key}:` }),
    el('span', { class: 'settings-accounts__value', text: value }),
  ]);
}

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {{status:string, farmerName:string, username?:string, email?:string}} actions.session
 * @param {() => Promise<{ok:boolean, reason?:string}>} actions.deleteProgress wipes the save
 * @param {(msg:string, tone:string) => void} actions.toast
 * @param {string} actions.backHref
 * @returns {{unmount: () => void}}
 */
export function mountSettings(root, actions) {
  clear(root);

  const { session } = actions;
  const isGuest = session?.status === 'guest';

  let busy = false;

  const message = el('p', {
    class: 'form-message form-message--error',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  /** `tone` is error | success | info, so a notice is not styled as a fault. */
  function announce(text, tone = 'error') {
    setText(message, text ?? '');
    message.className = `form-message form-message--${tone}`;
    message.hidden = !text;
  }

  /* --- account ----------------------------------------------------------- */

  const accountCard = el('div', { class: 'card' }, [
    el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Account' })]),
    el('div', { class: 'card__body' }, [
      el('dl', { class: 'settings-accounts' }, [
        row('Farmer', session?.farmerName),
        row('Username', session?.username),
        row('Email', session?.email),
      ].filter(Boolean)),
      el('p', {
        class: 'field__hint',
        // A guest has no account to name and nothing to come back to, so say the
        // way out rather than listing empty rows.
        text: isGuest
          ? 'You are playing as a guest, so this farm lives in this browser only. Create an account to keep it.'
          : 'These are the details you signed up with.',
      }),
    ]),
  ]);

  /* --- danger zone ------------------------------------------------------- */

  const confirmButton = el('button', {
    class: 'btn btn--danger btn--block',
    type: 'button',
    text: 'Yes, erase my farm',
    hidden: true,
    on: { click: onConfirm },
  });

  const cancelButton = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Keep my farm',
    hidden: true,
    on: { click: reset },
  });

  const deleteButton = el('button', {
    class: 'btn btn--danger btn--block',
    type: 'button',
    text: 'Erase all progress',
    on: { click: onArm },
  });

  /** Back to the single-button state, whether by cancel or by finishing. */
  function reset() {
    deleteButton.hidden = false;
    confirmButton.hidden = true;
    cancelButton.hidden = true;
  }

  function onArm() {
    announce(null);
    reset();
    deleteButton.hidden = true;
    confirmButton.hidden = false;
    cancelButton.hidden = false;
    // The next control a keyboard user reaches is the one that destroys things,
    // so Cancel is what takes focus here.
    cancelButton.focus();
  }

  function setBusy(isBusy) {
    busy = isBusy;
    for (const node of [deleteButton, confirmButton, cancelButton]) node.disabled = isBusy;
  }

  async function onConfirm() {
    if (busy) return;
    setBusy(true);
    setText(confirmButton, 'Erasing…');
    announce('Erasing your farm and starting a new one.', 'info');

    let result;
    try {
      result = await actions.deleteProgress();
    } catch (error) {
      log.error('delete threw -', error.message);
      result = { ok: false, reason: 'exception' };
    }

    setBusy(false);
    setText(confirmButton, 'Yes, erase my farm');

    if (!result?.ok) {
      // The farm is still there, so say so plainly and put the button back.
      log.warn('delete refused -', String(result?.reason));
      reset();
      announce(
        result?.reason === 'not_signed_in'
          ? 'Sign in again before erasing your farm, so we know whose it is.'
          : 'Your farm could not be erased. Nothing was changed — try again.',
      );
      return;
    }

    log.info('progress erased');
    actions.toast?.('Progress erased. You have a brand new farm.', 'success');
    reset();
    announce('Progress erased. You have a brand new farm.', 'success');
    deleteButton.focus();
  }

  const dangerCard = el('div', { class: 'card card--danger' }, [
    el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Danger zone' })]),
    el('div', { class: 'card__body' }, [
      el('p', {
        class: 'field__hint',
        text: 'Erases your gold, your crops and your fields, and starts you a brand new farm — as if you had just made an account. Your account and sign-in details are kept, so you will not have to register again. This cannot be undone.',
      }),
      deleteButton,
      confirmButton,
      cancelButton,
      message,
    ]),
  ]);

  /* --- shell ------------------------------------------------------------- */

  root.append(
    el('div', { class: 'settings-top' }, [
      el('div', { class: 'settings-top__lead' }, [
        el('a', { class: 'settings-top__back', href: actions.backHref, text: '← Back to the farm' }),
        el('h1', { class: 'settings-top__title', text: 'Settings' }),
      ]),
    ]),
    accountCard,
    dangerCard,
  );

  return { unmount() { clear(root); } };
}
