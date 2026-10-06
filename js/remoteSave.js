/**
 * The server-side save, assembled from the pieces that cannot see each other.
 *
 * `state/store.js` may not import a service, and `services/saveApi.js` may not
 * import another service — so the access token cannot reach either from where it
 * is created. This module is the join, and `js/main.js` calls it.
 *
 * It lives at the top of `js/` rather than in `state/`, beside `main.js` and
 * `auth-main.js`, because those are the entry points: a module outside every
 * layer has no import rules, and this one needs both a state-shaped dependency
 * and a service. Putting it in `state/` fails `npm run check` with exactly the
 * error that prompted the move — which is the check doing its job.
 *
 * Its whole reason to exist is that join. Keeping it separate means `store.js`
 * stays testable with a plain object and `main.js` stays readable, instead of
 * either one growing an adapter inline.
 */

import { createLog } from './utils/log.js';
import { deleteRemoteSave, readRemoteSave, writeRemoteSave } from './services/saveApi.js';

const log = createLog('remoteSave');

/**
 * Build the store's server-save adapter, or null when there should not be one.
 *
 * Returns null for a guest and for the local provider:
 *
 *  - A guest has no token, so `auth.uid()` is null, the Row Level Security policy
 *    matches no row, and every request would come back 401. A guest farm is
 *    local-only, which `ui/savePanel.js` already says out loud.
 *  - The local provider has no token and no server to save to.
 *
 * The access token is captured **once**, here, rather than looked up per call.
 * That is deliberate: `authApi.signOut()` nulls the token, and an autosave that
 * fired after sign-out would otherwise post a farm under a session that no longer
 * exists. The captured token simply stops working on its own.
 *
 * @param {object} provider from `loadProvider()`
 * @param {{status:string, userId:string}|null} session
 * @returns {{read:Function, write:Function, delete:Function}|null}
 */
export function buildServerSave(provider, session) {
  if (!provider || session?.status !== 'authed') return null;

  const token = provider.accessToken?.();
  if (!token) {
    log.warn('no access token, so the farm stays local for this session');
    return null;
  }

  const { userId } = session;
  return {
    read: () => readRemoteSave(token),
    write: (state) => writeRemoteSave(token, userId, state),
    delete: () => deleteRemoteSave(token, userId),
  };
}
