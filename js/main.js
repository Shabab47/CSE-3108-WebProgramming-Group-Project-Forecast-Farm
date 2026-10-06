/**
 * Entry point for index.html.
 *
 * Boot order, per docs/architecture.md:
 *   0. Resolve the session. No session → the login page, and the game is never
 *      mounted, so a signed-out visitor never sees a flash of farm UI.
 *   1. Load the user's save, or build a fresh farm.
 *   2. Mount UI.
 *   3. Fetch weather. (T-11, not built yet.)
 *   4. Start the simulator and the autosave. (T-09/T-08, not built yet.)
 *
 * This is the only module that imports a service. UI receives callbacks through
 * `mountX(root, actions)`, never a service import.
 */

import { qsOrNull, el } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { signInAsGuest, signOut as endAuth } from './services/localAuth.js';
import { buildServerSave } from './remoteSave.js';
import { adoptState, emit, exportPayload, getState, init, readImport, reset, saveNow, subscribe } from './state/store.js';
import { mountToastStack } from './ui/toastStack.js';
import { mountTopBar } from './ui/topBar.js';
import { mountSavePanel } from './ui/savePanel.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('main');

const LOGIN_URL = 'login.html';

/**
 * Boot step 0: who is playing?
 *
 * Asked of the provider `js/auth-main.js` selected, which is the point of ISS-033.
 * This used to read the session out of localStorage via `localAuth.js`, which was
 * fine while that *was* the provider and stops being fine the moment it is not: the
 * login page would hold a Supabase session, this page would find nothing, and the
 * player would be redirected back to login forever.
 *
 * `restoreSession()` is awaited because the Supabase access token is memory-only
 * and a page navigation is a fresh module — without it every visit looks signed
 * out. It is absent on the local provider, where the session is already in storage,
 * hence the optional call.
 *
 * `?guest=1` is how the login page hands a guest session over without putting it
 * in storage, so a guest's farm cannot be resumed by anyone else on the machine.
 *
 * @param {object} provider from `loadProvider()`
 * @returns {Promise<object|null>} a session, or null when the visitor must sign in
 */
export async function resolveSession(provider) {
  const live = provider.currentSession() ?? (await provider.restoreSession?.());
  if (live) return live;

  const guest = new URLSearchParams(location.search).get('guest') === '1';
  if (guest) return signInAsGuest().session;

  return null;
}

/* --- placeholder panels --------------------------------------------------
 * The layout shell exists so the page matches the wireframe. Each panel is
 * filled in by its own module in later tasks; until then it says so plainly
 * rather than rendering an empty card. */

function placeholder(label, detail) {
  return el('div', { class: 'card' }, [
    el('div', { class: 'placeholder' }, [
      el('span', { class: 'placeholder__label', text: label }),
      el('span', { text: detail }),
    ]),
  ]);
}

function mountShell(session, onSignOut) {
  mountTopBar(qsOrNull('#top-bar'), { session, onSignOut });

  qsOrNull('#sidebar').append(
    placeholder('Season', 'Season card — T-11'),
    placeholder('Shop', 'Seeds, land and market — T-08, T-10'),
    placeholder('Inventory', 'Seeds and harvest — T-08'),
  );

  qsOrNull('#forecast-card').append(
    el('div', { class: 'placeholder' }, [
      el('span', { class: 'placeholder__label', text: 'Forecast area' }),
      el('span', { text: 'Current conditions and the 24-hour strip — T-11' }),
    ]),
  );

  qsOrNull('#farm-view').append(
    el('div', { class: 'placeholder' }, [
      el('span', { class: 'placeholder__label', text: 'Farm screen' }),
      el('span', { text: 'The isometric 4×4 field — T-06' }),
    ]),
  );

  qsOrNull('#right-rail').append(
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Gold' })]),
      el('p', { id: 'gold-value', text: '—' }),
    ]),
    placeholder('Meters', 'Water and heat — T-09'),
    placeholder('Environment', 'Humidity and wind — T-11'),
  );

  mountSavePanel(qsOrNull('#save-panel'), saveActions());
}

/**
 * The save panel's callbacks.
 *
 * `main.js` is the only module that may import both a UI panel and the store, so
 * this is the one place the two are joined. The panel itself never sees `store`.
 *
 * `canExport` is false for a guest: there is no account for a file to name, so an
 * exported guest farm would carry an empty owner and could never be verified
 * later. The panel says so rather than producing a hollow file.
 */
function saveActions() {
  return {
    canExport: () => getState()?.session?.status === 'authed',
    now: () => Date.now(),
    exportPayload,
    readImport,
    adoptState,
    toast(message, tone) {
      emit('toast', { message, tone });
    },
  };
}

/** Keep the gold readout honest, so the shell already behaves like the game. */
function wireHud() {
  const goldEl = qsOrNull('#gold-value');
  if (!goldEl) return;

  subscribe((state) => {
    if (state) goldEl.textContent = `${state.gold} gold`;
  });
}

/**
 * Sign out: flush the save, clear the session and the state, go back to login.
 *
 * The save is flushed *first*, so a slow network call cannot cost the player their
 * crops. On the Supabase provider `signOut` is async.
 */
async function signOut(provider) {
  saveNow();
  try {
    await provider.signOut();
  } catch (error) {
    // The provider clears its local session regardless; log and continue rather
    // than stranding the player on a page they asked to leave.
    log.warn('sign out failed -', error.message);
  }
  reset();
  log.info('signed out');
  location.replace(LOGIN_URL);
}

async function start() {
  // Boot 0: no session means the game is never mounted at all.
  const provider = await loadProvider();
  const session = await resolveSession(provider);
  if (!session) {
    log.info('no session, handing off to login');
    location.replace(LOGIN_URL);
    return;
  }

  // Boot 1. The server save is assembled in `state/remoteSave.js` because `state/`
  // may not import a service — it is the one place that knows about both.
  const { loaded } = await init(session, undefined, buildServerSave(provider, session));
  log.info(loaded ? 'resumed farm' : 'started a new farm');

  // Boot 2
  mountToastStack();
  mountShell(session, () => signOut(provider));
  wireHud();

  // Boot 4, partial: the simulator arrives in T-09. Autosave is safe now.
  setInterval(saveNow, AUTOSAVE_MS);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  log.trace('boot complete for', getState()?.session?.userId);
}

/**
 * Only on the real page.
 *
 * `tests/mainBoot.test.js` imports `resolveSession` to exercise the boot paths,
 * and a bare `start()` would redirect that test process to the login page.
 * `#top-bar` is on index.html and nowhere else, so it marks "the page, not an
 * import".
 */
if (qsOrNull('#top-bar')) {
  start();
}