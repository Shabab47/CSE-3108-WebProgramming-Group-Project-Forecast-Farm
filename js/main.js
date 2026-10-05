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
import { currentSession, signInAsGuest, signOut as endAuth } from './services/localAuth.js';
import { init, reset, saveNow, subscribe, getState } from './state/store.js';
import { mountToastStack } from './ui/toastStack.js';
import { mountTopBar } from './ui/topBar.js';
import { AUTOSAVE_MS } from './config/game.js';

const log = createLog('main');

const LOGIN_URL = 'login.html';

/**
 * Boot step 0: who is playing?
 *
 * `?guest=1` is how the login page hands a guest session over without putting it
 * in storage, so a guest's farm cannot be resumed by anyone else on the machine.
 *
 * @returns {object|null} a session, or null when the visitor must sign in
 */
export function resolveSession() {
  const stored = currentSession();
  if (stored) return stored;

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

function mountShell(session) {
  mountTopBar(qsOrNull('#top-bar'), { session, onSignOut: signOut });

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
}

/** Keep the gold readout honest, so the shell already behaves like the game. */
function wireHud() {
  const goldEl = qsOrNull('#gold-value');
  if (!goldEl) return;

  subscribe((state) => {
    if (state) goldEl.textContent = `${state.gold} gold`;
  });
}

/** Sign out: flush the save, clear the session and the state, go back to login. */
function signOut() {
  saveNow();
  endAuth();
  reset();
  log.info('signed out');
  location.replace(LOGIN_URL);
}

function start() {
  // Boot 0: no session means the game is never mounted at all.
  const session = resolveSession();
  if (!session) {
    log.info('no session, handing off to login');
    location.replace(LOGIN_URL);
    return;
  }

  // Boot 1
  const { loaded } = init(session);
  log.info(loaded ? 'resumed farm' : 'started a new farm');

  // Boot 2
  mountToastStack();
  mountShell(session);
  wireHud();

  // Boot 4, partial: the simulator arrives in T-09. Autosave is safe now.
  setInterval(saveNow, AUTOSAVE_MS);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });

  log.trace('boot complete for', getState()?.session?.userId);
}

start();