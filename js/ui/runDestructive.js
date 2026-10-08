/**
 * The flow both destructive settings actions run: collect the password, refuse an empty
 * one, run the work, and say what happened.
 *
 * Its own file, and it takes its collaborators as arguments rather than importing them,
 * for one reason: **this is the ordering guarantee, and it needs to be testable without
 * a DOM.** The bug it exists to prevent was a wrong password wiping a farm, and every
 * unit test passed at the time — `store.js`, `localAuth.js` and `accountApi.js` were all
 * individually correct, and the mistake was the order of six lines in an entry script
 * that nothing imported. `tests/dangerAction.test.js` asserts this order as behaviour,
 * with fakes, because reading the source is the only other option and it is not a test.
 *
 * The ordering is the feature:
 *
 *  1. An empty password is refused **before** `work` is called. Nothing has been touched,
 *     so nothing has to be undone.
 *  2. `work(password)` verifies the password and does the destructive part in one call.
 *     There is no earlier verification to skip, because the browser is what sends it —
 *     so a wrong password *is* dispatched, and its refusal is what stops everything
 *     after. Nothing here may retry: a retry would send the same password twice for a
 *     decision the database has already made.
 *  3. `onDone` is reachable only when `work` said ok. Every caller keeps its own copy of
 *     the farm behind that line.
 *  4. The field is cleared as soon as the work starts, so no accepted password sits in
 *     the DOM while a request is in flight.
 */

import { EMPTY_PASSWORD, isAboutPassword, WRONG_PASSWORD } from './dangerMessages.js';
import { createLog } from '../utils/log.js';

const log = createLog('dangerAction');

/**
 * @param {object} args
 * @param {object} args.action from `dangerAction`
 * @param {object} args.gate from `passwordGate`, or null when nothing is asked for
 * @param {boolean} args.asksForPassword false for a guest, who has no password to give
 * @param {(text: string, tone?: string) => void} args.announce the page's status line
 * @param {(password: string) => Promise<{ok:boolean, reason?:string}>} args.work
 * @param {(result: object) => void} args.onDone only reached when `work` said ok
 * @param {(result: {reason?:string}) => string} args.failure the non-password sentence
 * @returns {Promise<void>}
 */
export async function runDestructive({ action, gate, asksForPassword, announce, work, onDone, failure }) {
  if (action.isBusy()) return;

  const password = asksForPassword ? gate.read() : '';

  if (asksForPassword && !password) {
    gate.complain(EMPTY_PASSWORD);
    return;
  }

  action.setBusy(true);
  action.clearSecret();
  announce('Checking your password.', 'info');

  let result;
  try {
    result = await work(password);
  } catch (error) {
    log.error('destructive action threw -', error.message);
    result = { ok: false, reason: 'exception' };
  }

  if (!result?.ok) {
    action.setBusy(false);
    // `restore()` and not `reset()`: the action stays armed, so correcting a mistyped
    // password costs one field rather than a second trip through the confirmation.
    action.restore();

    // Only a real credential rejection is reported under the field. See
    // `isAboutPassword` for why the alternative sends people off debugging the wrong
    // thing.
    if (asksForPassword && isAboutPassword(result)) {
      gate.complain(WRONG_PASSWORD);
      return;
    }

    announce(failure(result));
    return;
  }

  onDone(result);
}
