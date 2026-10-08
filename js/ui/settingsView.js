/**
 * The settings panel.
 *
 * Render and events only. Every outside call arrives through `actions`, so this file
 * never imports `store.js` — the same rule `ui/savePanel.js` keeps. That is what lets
 * the delete logic live in the entry point, where the session and the server-save
 * adapter are both in hand.
 *
 * ## The two actions, and why they are not the same severity
 *
 * **Erase all progress** throws the farm away and gives a new one. The account
 * survives and the player stays signed in, so this is recoverable in the only sense
 * that matters — they are playing. Two clicks, no password: the thing being destroyed
 * is entirely the player's own and they get a replacement for it immediately.
 *
 * **Delete my account** deletes the account, its farm and its username immediately, and
 * signs the player out. Two clicks *and* a password, because there is no replacement
 * and no undo at all. See `js/settings-main.js` for what is actually removed, and
 * DEC-024 for why the password is checked in the database rather than here.
 *
 * Both go through `dangerAction`, so both arm before they act and neither can be
 * fired by reaching for the other.
 *
 * The account facts card is `accountCard.js`, and the arm-and-confirm control with its
 * password gate is `dangerAction.js` — both extracted to keep this file inside the
 * budget it holds panels to.
 */

import { clear, el, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { accountCard } from './accountCard.js';
import { dangerAction, passwordGate } from './dangerAction.js';

const log = createLog('settingsView');

/**
 * @param {HTMLElement} root
 * @param {object} actions
 * @param {{status:string, farmerName:string, username?:string, email?:string}} actions.session
 * @param {() => Promise<{ok:boolean, reason?:string}>} actions.deleteProgress wipes the save
 * @param {() => Promise<{ok:boolean, reason?:string}>} [actions.requestAccountDeletion]
 * @param {(msg:string, tone:string) => void} actions.toast
 * @param {string} actions.backHref
 * @returns {{unmount: () => void}}
 */
export function mountSettings(root, actions) {
  clear(root);

  const { session } = actions;
  const isGuest = session?.status === 'guest';

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

  const onArm = () => announce(null);

  /**
   * Whether this action asks for a password at all.
   *
   * True for every provider that has one to check, which after `005` is both of them —
   * the local provider verifies against its own PBKDF2 hash. Kept as a flag because the
   * guest case genuinely has nothing to ask for, and because a provider with no
   * passwords would otherwise be asked to collect a credential nothing reads.
   */
  const asksForPassword = !isGuest;

  /* --- erase all progress ------------------------------------------------ */

  const progress = dangerAction({
    label: 'Erase all progress',
    confirmLabel: 'Yes, erase my farm',
    cancelLabel: 'Keep my farm',
    busyLabel: 'Erasing…',
    description:
      'Erases your gold, your crops and your fields, and starts you a brand new farm — as if you had just made an account. Your account and sign-in details are kept, so you will not have to register again. This cannot be undone.',
    onArm,
  });

  progress.confirmButton.addEventListener('click', () => onConfirm(progress, actions.deleteProgress, {
    onDone() {
      log.info('progress erased');
      actions.toast?.('Progress erased. You have a brand new farm.', 'success');
      announce('Progress erased. You have a brand new farm.', 'success');
    },
    onFailed(result) {
      announce(failureSentence(result, 'Your farm could not be erased. Nothing was changed — try again.'));
    },
  }));

  /* --- delete my account ------------------------------------------------- */

  const gate = passwordGate({ id: 'settings-delete-password', label: 'Your password' });

  const account = isGuest
    ? null
    : dangerAction({
      label: 'Delete my account',
      confirmLabel: 'Delete my account permanently',
      cancelLabel: 'Keep my account',
      busyLabel: 'Deleting…',
      // Immediate and irreversible, so the copy says exactly that, and the button
      // matches — an earlier version read "Schedule my account for deletion", which
      // promised a delay this no longer has.
      //
      // What stands between a misclick and a lost farm is two clicks plus the password,
      // and the password is the load-bearing part: it is verified in the database before
      // anything is deleted, so a stolen session token cannot reach this at all
      // (DEC-024).
      description: 'Your account, farm and username are deleted immediately, along with your progress. This cannot be undone. We will ask for your password to be sure it is you.',
      onArm,
      // Only wired up when the action really checks it.
      gate: asksForPassword ? gate : null,
    });

  account?.confirmButton.addEventListener('click', async () => {
    if (account.isBusy()) return;

    const password = gate.read();
    // On a provider that deletes immediately there is nothing to check, so an empty
    // field is not a blocker. The password prompt is only shown where it is used.
    if (asksForPassword && !password) {
      gate.complain('Enter your password to confirm.');
      return;
    }

    account.setBusy(true);
    account.clearSecret();
    announce('Checking your password.', 'info');

    let result;
    try {
      result = await actions.requestAccountDeletion(password);
    } catch (error) {
      log.error('account deletion threw -', error.message);
      result = { ok: false, reason: 'exception' };
    }

    if (!result?.ok) {
      account.setBusy(false);
      account.restore();
      log.warn('account not deleted -', String(result?.reason));

      // Only a genuine credential rejection is reported under the password field.
      // Anything else — an expired token, a timeout, a missing migration — arrives
      // with a different reason, and telling a player whose password was fine that
      // "that password is not right" sends them off retyping it against a problem that
      // is not the password.
      const aboutPassword = result?.reason === 'invalid_credentials' || result?.reason === 'password_required';

      if (aboutPassword) {
        // Under the field, not as a banner: the message is about that input, and
        // `aria-describedby` already points at the error node.
        gate.complain('That password is not right. Nothing was changed — try again.');
        return;
      }

      if (result?.reason === 'not_signed_in') {
        announce('Sign in again before doing that, so we know whose it is.');
        return;
      }

      announce(deletionFailureSentence(result));
      return;
    }

    // The caller signs the player out and navigates, so there is nothing left on this
    // page to say anything into — the login page owns the next sentence.
    log.info('account deleted');
    location.replace('login.html?deleted=1');
  });

  /* --- shell ------------------------------------------------------------- */

  root.append(
    el('div', { class: 'settings-top' }, [
      el('div', { class: 'settings-top__lead' }, [
        el('a', { class: 'settings-top__back', href: actions.backHref, text: '← Back to the farm' }),
        el('h1', { class: 'settings-top__title', text: 'Settings' }),
      ]),
    ]),
    accountCard(session),
    el('div', { class: 'card card--danger' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Erase progress' })]),
      el('div', { class: 'card__body' }, [progress.node, message]),
    ]),
    // `null` for a guest: there is no account to delete, and a button saying so would
    // be a dead end. `el()` skips null children.
    account ? el('div', { class: 'card card--danger' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Delete account' })]),
      el('div', { class: 'card__body' }, [
        account.node,
        // Only where a password is actually asked for — a credential field that
        // nothing reads is worse than no field.
        asksForPassword ? gate.wrap : null,
      ]),
    ]) : null,
  );

  return { unmount() { clear(root); } };
}

/* --- internals ------------------------------------------------------------ */

/**
 * Run one destructive action, and report what happened.
 *
 * The shared half of erase-progress, so it cannot drift. Nothing is announced here —
 * each outcome says its own sentence.
 */
async function onConfirm(action, work, { onDone, onFailed }) {
  if (action.isBusy()) return;

  action.setBusy(true);

  let result;
  try {
    result = await work();
  } catch (error) {
    log.error('destructive action threw -', error.message);
    result = { ok: false, reason: 'exception' };
  }

  if (!result?.ok) {
    action.setBusy(false);
    action.restore();
    action.reset();
    onFailed(result);
    return;
  }

  onDone(result);
}

/** The not-signed-in case deserves its own sentence; it is a different problem. */
function failureSentence(result, fallback) {
  if (result?.reason === 'not_signed_in') {
    return 'Sign in again before doing that, so we know whose it is.';
  }
  return fallback ?? 'That did not work. Try again in a moment.';
}

/**
 * Why an account deletion failed, when it was not the password.
 *
 * The distinction that matters is **whose problem it is**. "Could not reach the server"
 * sends a player off debugging their own wifi, and two of these reasons are not that at
 * all — they are the project not being set up yet, which no amount of retrying will fix.
 * So they get their own sentences rather than falling through to the generic one.
 *
 * `not_migrated` in particular is the single most likely thing to hit while
 * `005_immediate_account_deletion.sql` has not been run, and it arrives as a bare 404
 * from PostgREST — indistinguishable from a wrong URL without this mapping.
 *
 * @param {{reason?:string}} result
 * @returns {string}
 */
function deletionFailureSentence(result) {
  if (result?.reason === 'not_signed_in') {
    return 'Sign in again before deleting your account, so we know whose it is.';
  }

  if (result?.reason === 'not_migrated') {
    return 'Account deletion is not switched on on this project yet. Nothing was changed — tell the team to run the latest database migration.';
  }

  // The fail-closed case in `005`: pgcrypto could not verify the stored hash, so the
  // function refuses rather than deleting without a password. Worth saying plainly,
  // because "could not verify your password" sounds like the player typed it wrong.
  if (result?.reason === 'cannot_verify_password') {
    return 'This project cannot check passwords on the server yet, so deletion is switched off rather than allowed without one. Nothing was changed.';
  }

  if (result?.reason === 'timeout' || result?.reason === 'network_request_failed') {
    return 'We could not reach the account server, so nothing was changed — your farm is untouched. Try again in a moment.';
  }

  return 'Your account could not be deleted. Nothing was changed — try again in a moment.';
}

