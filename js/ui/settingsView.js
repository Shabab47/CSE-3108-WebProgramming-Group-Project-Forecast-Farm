/**
 * The settings panel.
 *
 * Render and events only. Every outside call arrives through `actions`, so this file
 * never imports `store.js` — the same rule `ui/savePanel.js` keeps. That is what lets
 * the delete logic live in the entry point, where the session and the server-save
 * adapter are both in hand.
 *
 * ## The two actions, and how they differ
 *
 * **Erase all progress** throws the farm away and gives a new one. The account survives
 * and the player stays signed in.
 *
 * **Delete my account** deletes the account, its farm and its username immediately, and
 * signs the player out. There is no replacement and no undo at all.
 *
 * They differ in what survives, not in whether they are protected: **both are behind two
 * clicks and the password.** Erase-progress used to ask for no password, on the argument
 * that a farm is the player's own and one click away from being rebuilt — but a farm is
 * the accumulated product of real play, and "easy to replace" is not "protected". A
 * stolen session token should not be able to destroy anything on its own. DEC-025.
 *
 * Both go through `dangerAction` and `runDestructive`, so both arm before they act,
 * neither can be fired by reaching for the other, and the two cannot drift apart in how
 * they treat a wrong password — which is exactly how they drifted before, when one of
 * them erased the farm *before* checking.
 *
 * See `js/settings-main.js` for what each actually removes, DEC-024 and DEC-025 for why
 * the password is checked in the database rather than here. The rest is split out to keep
 * this file inside its budget: `dangerAction.js` (arm and confirm), `passwordGate.js` (the
 * credential field), `runDestructive.js` (the ordering, which is testable without a DOM
 * and is where the wrong-password bug used to live), `statusLine.js` (one live region per
 * action — see below) and `dangerMessages.js` (the failure sentences).
 */

import { clear, el } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { accountCard } from './accountCard.js';
import { dangerAction } from './dangerAction.js';
import { passwordGate } from './passwordGate.js';
import { runDestructive } from './runDestructive.js';
import { statusLine } from './statusLine.js';
import { accountDeletionFailure, progressErasureFailure } from './dangerMessages.js';

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

  // One status line per destructive action, each inside its own card.
  //
  // The page used to have a single shared node rendered in the *progress* card, so every
  // sentence the account action said — "Checking your password.", the wrong-password
  // complaint, every failure explanation — appeared above the progress button, in a card
  // the player might have scrolled past and did not click. `onArm` then cleared that same
  // node, so arming one action wiped the other's words.
  //
  // Two is right for the visual reason and the accessibility one: a screen reader
  // announces a change in the region it happened in, so a shared node also narrated a
  // password check at the bottom of the page as page-level news. `settingsDom.test.js`
  // asserts both halves.
  const progressStatus = statusLine();
  const accountStatus = statusLine();

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

  const progressGate = passwordGate({ id: 'settings-erase-password', label: 'Your password' });

  const progress = dangerAction({
    label: 'Erase all progress',
    confirmLabel: 'Yes, erase my farm',
    cancelLabel: 'Keep my farm',
    busyLabel: 'Erasing…',
    // Says the password is coming, because it is — the copy used to promise a brand new
    // farm and nothing else, and then asked for one anyway.
    description:
      'Erases your gold, your crops and your fields, and starts you a brand new farm — as if you had just made an account. Your account and sign-in details are kept, so you will not have to register again. This cannot be undone. We will ask for your password to be sure it is you.',
    // Clears *this* card's status, not the other action's.
    onArm: () => progressStatus.announce(null),
    // Every provider that has a password checks it before erasing, in the database
    // (DEC-025). "Easily replaced" is not "protected".
    gate: asksForPassword ? progressGate : null,
  });

  progress.confirmButton.addEventListener('click', () => runDestructive({
    action: progress,
    gate: progressGate,
    asksForPassword,
    announce: progressStatus.announce,
    work: actions.deleteProgress,
    failure: progressErasureFailure,
    onDone() {
      log.info('progress erased');
      const text = 'Progress erased. You have a brand new farm.';
      actions.toast?.(text, 'success');
      progressStatus.announce(text, 'success');
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
      onArm: () => accountStatus.announce(null),
      // Only wired up when the action really checks it.
      gate: asksForPassword ? gate : null,
    });

  account?.confirmButton.addEventListener('click', () => runDestructive({
    action: account,
    gate,
    asksForPassword,
    announce: accountStatus.announce,
    work: actions.requestAccountDeletion,
    failure: accountDeletionFailure,
    onDone() {
      // The caller signs the player out and navigates, so there is nothing left on this
      // page to say anything into — the login page owns the next sentence.
      log.info('account deleted');
      location.replace('login.html?deleted=1');
    },
  }));

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
      el('div', { class: 'card__body' }, [
        progress.node,
        // Only where a password is actually asked for — a credential field that nothing
        // reads is worse than no field.
        asksForPassword ? progressGate.wrap : null,
        progressStatus.node,
      ]),
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
        // The account card had no status line of its own until now, which is why every
        // sentence it said landed in the progress card above.
        accountStatus.node,
      ]),
    ]) : null,
  );

  return { unmount() { clear(root); } };
}

