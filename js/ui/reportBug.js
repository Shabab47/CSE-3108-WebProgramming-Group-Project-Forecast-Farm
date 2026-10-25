/**
 * The "Report a bug" dialog behind the navbar button.
 *
 * Render and events only. The send itself arrives through `onSubmit`, because UI
 * modules never import a service — `js/main.js` is the entry script that joins
 * `services/reportApi.js` to this panel. The same callback shape the project uses
 * everywhere: the panel owns the form and the words, the entry point owns the
 * network.
 *
 *   mountReportBug(trigger, { session, onSubmit }) → { open, close, unmount }
 *
 * The current page URL is included automatically. A report without the page it
 * happened on is a guessing game, so the URL is shown in the dialog before it is
 * sent rather than collected silently.
 */

import { el } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { REPORT_MESSAGE_MAX, REPORT_MESSAGE_MIN } from '../config/feedback.js';

const log = createLog('reportBug');

/**
 * One sentence per failure the service can answer with.
 *
 * Kept here rather than in the service because this is the player-facing half:
 * `reportApi.js` deals in reason codes, and the panel decides how to say them.
 */
const REASON_TEXT = {
  not_configured: 'Bug reporting is not set up yet. Please try again later.',
  message_too_short: `Please describe the bug in a little more detail (at least ${REPORT_MESSAGE_MIN} characters).`,
  message_too_long: `That report is too long. Please keep it under ${REPORT_MESSAGE_MAX.toLocaleString()} characters.`,
  email_invalid: 'That email address does not look right.',
  network: 'Could not reach the bug report service. Check your connection and try again.',
  rejected: 'The report was not accepted. Please try again later.',
  bad_json: 'The bug report service sent an unexpected answer. Please try again.',
};

function reasonText(reason) {
  return REASON_TEXT[reason] ?? 'The report could not be sent. Please try again later.';
}

/** `location.href` without assuming either exists in a test harness. */
function currentGameUrl() {
  try {
    return typeof location !== 'undefined' ? location.href : '';
  } catch {
    return '';
  }
}

/** Browser details, when there are any. */
function currentUserAgent() {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent : '';
  } catch {
    return '';
  }
}

/**
 * @param {HTMLElement} trigger the navbar button that opens this dialog
 * @param {object} actions
 * @param {object} actions.session the player's session, for context only
 * @param {(report: object) => Promise<{ok: boolean, reason?: string}>} [actions.onSubmit]
 * @returns {{open: Function, close: Function, unmount: Function}}
 */
export function mountReportBug(trigger, actions = {}) {
  const { session = null, onSubmit } = actions;

  let sending = false;
  let lastFocus = null;

  const messageInput = el('textarea', {
    class: 'report-bug__input report-bug__message',
    id: 'report-bug-message',
    name: 'message',
    rows: 6,
    maxlength: REPORT_MESSAGE_MAX,
    required: true,
    placeholder: 'What happened? What did you expect instead?',
  });

  const emailInput = el('input', {
    class: 'report-bug__input',
    id: 'report-bug-email',
    name: 'email',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'you@example.com (optional)',
  });

  const status = el('p', {
    class: 'report-bug__status',
    role: 'status',
    'aria-live': 'polite',
  });

  const urlNode = el('code', { class: 'report-bug__url', text: '' });

  const cancelButton = el('button', {
    class: 'report-bug__button report-bug__button--ghost',
    type: 'button',
    text: 'Cancel',
  });

  const submitButton = el('button', {
    class: 'report-bug__button',
    type: 'submit',
    text: 'Send report',
  });

  const closeButton = el('button', {
    class: 'report-bug__close',
    type: 'button',
    'aria-label': 'Close bug report',
    html: '<span aria-hidden="true">&times;</span>',
  });

  const form = el('form', {
    class: 'report-bug__dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'report-bug-title',
    novalidate: true,
  }, [
    el('header', { class: 'report-bug__head' }, [
      el('div', { class: 'report-bug__heading' }, [
        el('h2', { class: 'report-bug__title', id: 'report-bug-title', text: 'Report a bug' }),
        el('p', {
          class: 'report-bug__lead',
          text: 'Tell us what went wrong and we will look into it.',
        }),
      ]),
      closeButton,
    ]),

    el('p', { class: 'report-bug__context' }, [
      'We will include this game page with your report: ',
      urlNode,
    ]),

    el('label', {
      class: 'report-bug__label',
      for: 'report-bug-message',
      text: 'What happened?',
    }),
    messageInput,

    el('label', {
      class: 'report-bug__label',
      for: 'report-bug-email',
      text: 'Your email (optional)',
    }),
    emailInput,
    el('p', {
      class: 'report-bug__hint',
      text: 'Add an email if you would like a reply. Otherwise the report is still sent.',
    }),

    status,

    el('footer', { class: 'report-bug__actions' }, [
      cancelButton,
      submitButton,
    ]),
  ]);

  const overlay = el('div', {
    class: 'report-bug',
    hidden: true,
  }, [form]);

  /** Fresh form, whether this is the first open or the one after a cancel. */
  function reset() {
    sending = false;
    messageInput.value = '';
    emailInput.value = '';
    messageInput.disabled = false;
    emailInput.disabled = false;
    submitButton.disabled = false;
    cancelButton.disabled = false;
    submitButton.hidden = false;
    submitButton.textContent = 'Send report';
    cancelButton.textContent = 'Cancel';
    status.className = 'report-bug__status';
    status.textContent = '';
  }

  function setStatus(text, tone = '') {
    status.textContent = text;
    status.className = `report-bug__status${tone ? ` report-bug__status--${tone}` : ''}`;
  }

  function setSending(next) {
    sending = next;
    messageInput.disabled = next;
    emailInput.disabled = next;
    submitButton.disabled = next;
    cancelButton.disabled = next;
    submitButton.textContent = next ? 'Sending…' : 'Send report';
  }

  function open() {
    if (!overlay.hidden) return;

    lastFocus = document.activeElement ?? trigger;
    reset();
    urlNode.textContent = currentGameUrl() || 'this page';
    overlay.hidden = false;
    document.body?.classList?.add?.('report-bug-open');
    messageInput.focus();
  }

  function close() {
    if (overlay.hidden || sending) return;

    overlay.hidden = true;
    document.body?.classList?.remove?.('report-bug-open');

    const target = lastFocus?.isConnected === false ? trigger : lastFocus ?? trigger;
    target.focus();
  }

  function showSuccess() {
    sending = false;
    messageInput.disabled = true;
    emailInput.disabled = true;
    submitButton.disabled = true;
    submitButton.hidden = true;
    cancelButton.disabled = false;
    cancelButton.textContent = 'Close';
    setStatus('Thanks — your report is on its way.', 'ok');
    cancelButton.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setStatus('Sending your report…');

    let result;
    try {
      result = await onSubmit?.({
        message: messageInput.value,
        email: emailInput.value,
        gameUrl: currentGameUrl(),
        userAgent: currentUserAgent(),
        session,
      }) ?? { ok: false, reason: 'not_configured' };
    } catch (error) {
      log.warn('bug report failed -', error.message);
      result = { ok: false, reason: 'network' };
    }

    if (result.ok) {
      showSuccess();
      return;
    }

    setSending(false);
    setStatus(reasonText(result.reason), 'error');
  }

  trigger.addEventListener('click', open);
  cancelButton.addEventListener('click', close);
  closeButton.addEventListener('click', close);
  form.addEventListener('submit', handleSubmit);

  // A click on the dimmed backdrop closes. A click inside the dialog does not,
  // because the dialog stops the event at itself.
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  form.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault?.();
      close();
    }
  });

  document.body.append(overlay);

  return {
    open,
    close,
    unmount() {
      trigger.removeEventListener('click', open);
      overlay.remove();
      document.body?.classList?.remove?.('report-bug-open');
    },
  };
}
