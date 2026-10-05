/**
 * Import / export controls.
 *
 * Render and events only. Every state call arrives through `actions`, so this file
 * never imports `store.js` and the pure format logic in `state/transfer.js` stays
 * testable without a browser.
 *
 * **The DOM half lives here deliberately.** `Blob`, `URL.createObjectURL` and
 * `<input type="file">` are DOM APIs, and the layering rules put that kind of
 * thing in `js/ui/`. `state/transfer.js` therefore knows nothing about files —
 * it turns a state into text and text into a state, and this panel decides what to
 * do with the bytes.
 *
 * Two things this panel is careful about:
 *
 *  1. **Import asks before it overwrites.** A player opens this panel when
 *     something has already gone wrong. Replacing a farm without a confirmation
 *     naming whose farm it is and how old it is would be the worst possible
 *     failure for the one tool people reach for in a bad situation.
 *
 *  2. **A guest cannot export.** There is no account to bind the file to, so an
 *     exported guest farm would carry an empty owner — see `owner` in
 *     `state/transfer.js`. The button explains that rather than producing a file
 *     that cannot be verified later.
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { SAVE_EXTENSION } from '../state/transfer.js';

const log = createLog('savePanel');

/** Human phrasing for a file age, so "3 weeks old" beats a millisecond count. */
function describeAge(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'moments old';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} old`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} old`;

  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} old`;

  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} old`;
}

/** Reasons from `state/transfer.js`, as sentences. */
const REASONS = {
  file_empty: 'That file was empty.',
  file_not_readable: 'That file could not be read. It may be damaged or not a save file.',
  file_not_a_save: 'That is not a Forecast Farm save file.',
  file_version_newer:
    'That save came from a newer version of the game. Update the game, then try again.',
  file_no_state: 'That save file is missing its farm.',
  file_state_version_mismatch:
    'That save is from a different version of the game and cannot be loaded yet.',
  file_damaged: 'That save file looks damaged — part of it may have changed.',
  file_not_yours: 'That save file was not issued for this account.',
  store_not_initialised: 'The farm is not ready yet. Try again in a moment.',
  nothing_to_import: 'There was nothing in that file to import.',
  not_a_farm: 'That file does not contain a farm.',
};

export function reasonToMessage(reason) {
  return REASONS[reason] ?? 'That did not work. Try again in a moment.';
}

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {() => boolean} actions.canExport false for a guest farm
 * @param {() => number} actions.now
 * @param {() => {ok:boolean, text?:string, filename?:string, reason?:string}} actions.exportPayload
 * @param {(text:string, now:number) => object} actions.readImport
 * @param {(state:object) => {ok:boolean, reason?:string}} actions.adoptState
 * @param {(msg:string, tone:string) => void} actions.toast
 * @returns {{unmount: () => void}}
 */
export function mountSavePanel(root, actions) {
  clear(root);

  /** A pending import, held until the player confirms. Nothing is written yet. */
  let pending = null;

  const message = el('p', {
    class: 'form-message form-message--info',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });

  function announce(text, tone = 'info') {
    setText(message, text ?? '');
    message.className = `form-message form-message--${tone}`;
    message.hidden = !text;
  }

  /* --- export ------------------------------------------------------------- */

  /**
   * Hand a string to the browser as a download.
   *
   * `revokeObjectURL` on the next tick rather than immediately: revoking it in the
   * same statement races the download in some browsers, and the file arrives
   * empty. The anchor is removed too, so repeated exports do not pile up nodes.
   */
  function download(text, filename) {
    // `application/octet-stream` rather than `application/json`: the file is not
    // JSON, it is a `.farm` that happens to contain JSON after a header line.
    // The extension is what identifies it; the MIME type only affects what some
    // download managers guess.
    const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
    const anchor = el('a', { href: url, download: filename });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const exportButton = el('button', {
    class: 'btn btn--secondary btn--block',
    type: 'button',
    text: 'Export my farm',
    on: { click: onExport },
  });

  const guestNote = el('p', {
    class: 'field__hint',
    hidden: true,
    text: 'Guest farms stay in this browser and cannot be exported. Create an account to take your farm with you.',
  });

  function onExport() {
    if (!actions.canExport()) {
      announce('Create an account first — a guest farm has nothing to attach the file to.', 'error');
      return;
    }

    const result = actions.exportPayload(actions.now());
    if (!result?.ok) {
      announce(reasonToMessage(result?.reason), 'error');
      return;
    }

    try {
      download(result.text, result.filename);
      log.info('exported', result.filename);
      announce(`Saved ${result.filename}`, 'success');
    } catch (error) {
      log.error('export failed -', error.message);
      announce('The browser would not start the download. Try again.', 'error');
    }
  }

  /* --- import ------------------------------------------------------------- */

  const fileInput = el('input', {
    type: 'file',
    accept: `.${SAVE_EXTENSION},application/json,.json`,
    class: 'input',
    id: 'import-file',
    'aria-describedby': 'import-file-hint',
  });

  const confirmButton = el('button', {
    class: 'btn btn--primary btn--block',
    type: 'button',
    text: 'Replace my farm with this one',
    hidden: true,
    on: { click: onConfirm },
  });

  const cancelButton = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Cancel',
    hidden: true,
    on: {
      click: () => {
        pending = null;
        fileInput.value = '';
        showPending(null);
        announce(null);
      },
    },
  });

  function showPending(next) {
    const on = Boolean(next);
    confirmButton.hidden = !on;
    cancelButton.hidden = !on;
    guestNote.hidden = on || actions.canExport();
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    announce(null);
    pending = null;
    showPending(null);

    let text;
    try {
      text = await file.text();
    } catch (error) {
      log.warn('could not read the chosen file -', error.message);
      announce(reasonToMessage('file_not_readable'), 'error');
      return;
    }

    // Big files are refused rather than parsed. A save is a few tens of kB; a
    // 20 MB "save" is either the wrong file or an attempt to hang the tab.
    if (file.size > 2 * 1024 * 1024) {
      announce('That file is far too large to be a save file.', 'error');
      return;
    }

    const result = actions.readImport(text, actions.now());
    if (!result?.ok) {
      log.warn('import refused -', String(result?.reason));
      announce(reasonToMessage(result?.reason), 'error');
      return;
    }

    pending = result;
    const who = result.owner?.farmerName || result.owner?.email || 'another farm';
    announce(
      `${who}, ${describeAge(result.ageMs)}. This replaces the farm you are playing now, and cannot be undone.`,
      'error',
    );
    showPending(result);
    confirmButton.focus();
  }

  function onConfirm() {
    if (!pending) return;

    const result = actions.adoptState(pending.state);
    if (!result?.ok) {
      announce(reasonToMessage(result?.reason), 'error');
      return;
    }

    log.info('imported a farm', `(${describeAge(pending.ageMs)})`);
    actions.toast?.('Farm replaced from your file.', 'success');
    pending = null;
    fileInput.value = '';
    showPending(null);
    announce(null);
  }

  /* --- shell -------------------------------------------------------------- */

  root.append(
    el('div', { class: 'card__body' }, [
      el('h2', { class: 'card__title', text: 'Your farm' }),

      el('p', { class: 'field__hint', text: 'Export writes a file you can keep or move to another computer. Import reads one back.' }),

      exportButton,
      guestNote,

      el('hr', { class: 'divider' }),

      el('label', { class: 'field__label', for: 'import-file', text: 'Import a farm file' }),
      fileInput,
      el('p', { class: 'field__hint', id: 'import-file-hint', text: 'Importing replaces the farm you are playing now.' }),

      message,
      confirmButton,
      cancelButton,
    ]),
  );

  guestNote.hidden = actions.canExport();

  fileInput.addEventListener('change', onFile);

  return { unmount() { clear(root); } };
}
