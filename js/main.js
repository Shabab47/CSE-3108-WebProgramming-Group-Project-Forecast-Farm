import { qsOrNull, el } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { signInAsGuest } from './services/localAuth.js';
import { buildServerSave } from './remoteSave.js';
import { mountConnectionStatus, wireSaveOnExit } from './connection.js';
import { adoptState, apply, emit, exportPayload, flushPendingSave, getState, getSync, init, on, reset, saveNow, subscribe } from './state/store.js';
import { mountBootLoader } from './ui/loadingTips.js';
import { mountBlockedScreen } from './ui/blockedScreen.js';
import { mountConnectionBanner } from './ui/connectionBanner.js';
import { mountToastStack } from './ui/toastStack.js';
import { mountNavbar } from './ui/navbar.js';
import { mountShopLauncher } from './ui/shopLauncher.js';
import { mountInventoryLauncher } from './ui/inventoryLauncher.js';
import { mountSeasonCard } from './ui/seasonCard.js';
import { mountWeatherPanel } from './ui/weatherPanel.js';
import { mountFarmView } from './ui/farmView.js';
import { mountLocationBar } from './ui/locationBar.js';
import { fetchWeather } from './services/weatherApi.js';
import { formatCoordinates, reverseGeocode, searchPlaces } from './services/geocodeApi.js';
import { AUTOSAVE_MS } from './config/game.js';
import { REFRESH_MS } from './config/api.js';

const log = createLog('main');

const LOGIN_URL = 'login.html';
const SHOP_URL = 'shop.html';
const FARM_URL = 'index.html';
const SETTINGS_URL = 'settings.html';
const PROFILE_URL = 'profile.html';

export function shopHref(session) {
  return session?.status === 'guest' ? `${SHOP_URL}?guest=1` : SHOP_URL;
}

export function farmHref(session) {
  return session?.status === 'guest' ? `${FARM_URL}?guest=1` : FARM_URL;
}

export function settingsHref(session) {
  return session?.status === 'guest' ? `${SETTINGS_URL}?guest=1` : SETTINGS_URL;
}

export function profileHref(session) {
  return session?.status === 'guest' ? `${PROFILE_URL}?guest=1` : PROFILE_URL;
}

/**
 * The session for this page load, or the reason there isn't one.
 *
 * **This is the function ISS-048 turned upside down.** It used to answer
 * `session | null`, and `null` meant three unrelated things at once: the refresh
 * token is invalid, the network is down, or Supabase is having a bad day. The
 * callers all treated it as the first one, which is why a dropped connection
 * became a logout.
 *
 * So a falsy session is no longer enough to act on. Callers branch on `reason`:
 *
 *   `{ ok: true, session }`                 play
 *   `{ ok: false, reason: 'offline' }`      no network — show it, do not sign out
 *   `{ ok: false, reason: 'server_error' }` our problem, not the player's
 *   `{ ok: false, reason: 'invalid_token' }` genuinely signed out — redirect
 *
 * `null` is still returned for a guest, which is a real session with `status:
 * 'guest'`, so it never reaches the branch below.
 *
 * @returns {Promise<{ok:true, session:object}|{ok:false, reason:string}>}
 */
export async function resolveSession(provider) {
  const current = provider.currentSession();
  if (current) return { ok: true, session: current };

  // `restoreSession()` answers an object (ISS-048). `localAuth` keeps the old
  // `session | null` shape and has no network in it at all — a local account is
  // already in storage, so a null there really does mean signed out.
  const restored = await provider.restoreSession?.();
  if (restored && typeof restored === 'object' && 'ok' in restored) {
    if (restored.ok) return { ok: true, session: restored.session };
    // A guest query still wins over an offline failure: the farm is local, so
    // there is nothing to reach the server for.
    if (isGuestRequest()) {
      const guest = signInAsGuest().session;
      if (guest) return { ok: true, session: guest };
    }
    return { ok: false, reason: restored.reason ?? 'invalid_token' };
  }

  if (restored) return { ok: true, session: restored };

  if (isGuestRequest()) {
    const guest = signInAsGuest().session;
    if (guest) return { ok: true, session: guest };
  }

  return { ok: false, reason: 'invalid_token' };
}

/** `?guest=1`, read the same way on every page. */
function isGuestRequest() {
  return new URLSearchParams(location.search).get('guest') === '1';
}

function placeholder(label, detail) {
  return el('div', { class: 'placeholder' }, [
    el('span', { class: 'placeholder__label', text: label }),
    el('span', { text: detail }),
  ]);
}

function mountShell(session) {
  mountNavbar(qsOrNull('#top-bar'), { session });
  mountShopLauncher(qsOrNull('#shop-launch'), { href: shopHref(session) });

  mountLocationBar(qsOrNull('#location-bar'), {
    onSearch: searchFor,
    onUseDeviceLocation: useDeviceLocation,
  });

  mountSeasonCard(qsOrNull('#season-card'));
  mountShopLauncher(qsOrNull('#shop-launch'), { href: shopHref(session) });
  mountInventoryLauncher(qsOrNull('#inventory-launch'), { href: farmHref(session) });

  qsOrNull('#right-rail').append(
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Gold' })]),
      el('p', { id: 'gold-value', text: '—' }),
    ]),
    placeholder('Meters', 'Water and heat — T-09'),
    placeholder('Environment', 'Humidity and wind — T-11'),
  );

}

function renderPanels(state) {
  mountWeatherPanel(qsOrNull('#forecast-card'), {
    location: state?.location,
    weather: state?.weather,
    sync: getSync(),
  });

  mountFarmView(qsOrNull('#farm-view'), {
    plots: state?.plots ?? [],
    selection: state?.selection,
    onPlotClick: (plotId) => log.trace('plot clicked', plotId),
  });

  const goldEl = qsOrNull('#gold-value');
  if (goldEl && state) goldEl.textContent = `${state.gold} gold`;
}

function setLocation(next) {
  return apply((state) => ({ ok: true, state: { ...state, location: next } }));
}

function setWeather(weather) {
  return apply((state) => ({ ok: true, state: { ...state, weather } }));
}

async function refreshWeather({ quiet = false } = {}) {
  const location = getState()?.location;
  if (!location) return;

  const result = await fetchWeather(location);

  if (!result.ok) {
    log.warn('weather fetch failed -', result.reason);
    if (!quiet) emit('toast', { message: 'Could not reach the weather service.', tone: 'error' });
    return;
  }

  setWeather(result);
}

function useDeviceLocation({ announce = true } = {}) {
  if (announce) emit('toast', { message: 'Finding your location…', tone: 'info' });

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      emit('toast', { message: 'This browser cannot share a location.', tone: 'error' });
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const named = await reverseGeocode(latitude, longitude);

        const next = {
          // Either the lookup named the place or it did not, and both answers are
          // true. The coordinates are the fallback rather than a placeholder
          // string, because a farm pinned at `23.81° N, 90.41° E` tells the player
          // something "Current location" never did — and a lookup that cannot
          // reach the network must not leave the board blank. ISS-077.
          name: named.ok ? named.name : formatCoordinates(latitude, longitude),
          country: named.ok ? named.country : '',
          lat: latitude,
          lon: longitude,
          tz: 'auto',
          pinned: true,
        };

        setLocation(next);
        await refreshWeather({ quiet: true });
        emit('toast', { message: `Showing weather for ${next.name}.`, tone: 'success' });
        resolve(true);
      },
      () => {
        emit('toast', { message: 'Location permission denied, keeping the saved farm.', tone: 'error' });
        resolve(false);
      },
      { timeout: 10000, maximumAge: 600000, enableHighAccuracy: false },
    );
  });
}

async function searchFor(query) {
  emit('toast', { message: `Looking for “${query}”…`, tone: 'info' });

  const result = await searchPlaces(query);
  const place = result.ok ? result.results?.[0] : null;

  if (!place) {
    emit('toast', { message: `No place found for “${query}”.`, tone: 'error' });
    return;
  }

  setLocation({
    name: place.name,
    country: place.country,
    lat: place.lat,
    lon: place.lon,
    tz: place.tz,
    pinned: true,
  });

  await refreshWeather({ quiet: true });
  emit('toast', { message: `Farm moved to ${place.name}.`, tone: 'success' });
}

function bootWeather() {
  const saved = getState()?.location;
  const needsDeviceFix = !saved?.pinned;

  refreshWeather({ quiet: true }).then(() => {
    if (!needsDeviceFix) return;
    return useDeviceLocation({ announce: false });
  });

  setInterval(() => refreshWeather({ quiet: true }), REFRESH_MS);
}

async function start() {
  const root = qsOrNull('#app') ?? document.body;

  // Mounted before the first `await` on purpose. Everything below is network:
  // the session restore and the remote save read. Without this the player
  // stares at an empty page for as long as those take — up to `AUTH_TIMEOUT_MS`,
  // now that `gotrue.js` has a deadline (ISS-049). It paints nothing until
  // `SHOW_AFTER_MS`, so a warm load still shows no loader at all.
  const loader = mountBootLoader({ label: 'Loading your farm' });

  const provider = await loadProvider();

  /** Where the boot actually goes, so a retry can re-run exactly this. */
  async function openFarm() {
    const resolved = await resolveSession(provider);

    if (!resolved.ok) {
      // **The branch that is not a redirect — ISS-048.** A dead connection used to
      // land here too, and answering it with `location.replace(LOGIN_URL)` is what
      // logged players out at random on the hosted build. Only a genuinely invalid
      // token goes to the login page; anything else says so and offers a retry,
      // because the player is disconnected, not signed out.
      if (resolved.reason === 'invalid_token') {
        log.info('no session, handing off to login');
        loader.done();
        location.replace(LOGIN_URL);
        return;
      }

      log.warn(`cannot open the farm -`, resolved.reason);
      loader.done();
      mountBlocked(root, resolved.reason, openFarm);
      return;
    }

    await play(resolved.session);
  }

  /** The farm, once there is a session to open it with. */
  async function play(session) {
    const { loaded } = await init(session, undefined, buildServerSave(provider, session));
    log.info(loaded ? 'resumed farm' : 'started a new farm');

    mountToastStack();
    mountShell(session);
    renderPanels(getState());

    subscribe((state) => {
      if (state) renderPanels(state);
    });

    // Before `bootWeather()`, and before the veil lifts: the banner has to be on
    // screen before the first save can fail, or the player never learns their farm
    // stopped syncing.
    mountConnectionStatus(qsOrNull('#connection-banner'), {
      onExport: exportFromBanner,
    });

    bootWeather();

    // The sync state changes over time, and the weather panel is the one place a
  // paused forecast is visible, so re-render on it rather than only on state
  // changes — a dropped connection produces no state change to hang off.
  on('sync', () => renderPanels(getState()));

  // The shell is up and playable now, so the veil goes. Deliberately *not*
    // waiting for `bootWeather()` — that fetch is fire-and-forget and the farm
    // works without it; the forecast panel fills itself in when the response
    // lands. Holding the veil until then would mean a weather timeout keeps a
    // perfectly good farm hidden behind a veil.
    loader.done();

    setInterval(saveNow, AUTOSAVE_MS);
    wireSaveOnExit();
  }

  await openFarm();
}

/**
 * The "no internet" screen, and the retry that replaces it.
 *
 * Kept out of `start()` so a retry re-runs the session resolution rather than
 * reloading the document — a reload throws away the local save's read and makes
 * the player wait through the whole boot again for a result we already expect to
 * be the same.
 */
function mountBlocked(root, reason, retry) {
  const blocked = mountBlockedScreen(root, {
    reason,
    onRetry: () => {
      void retry().catch((error) => {
        log.error('retry failed -', error.message);
        blocked.setBusy(false);
      });
    },
  });
  return blocked;
}

/** Download the farm from the banner. See `state/transfer.js` for the format. */
function exportFromBanner() {
  const result = exportPayload(Date.now());
  if (!result?.ok) {
    emit('toast', { message: 'Your farm could not be exported. Try again in a moment.', tone: 'error' });
    return;
  }

  const url = URL.createObjectURL(new Blob([result.text], { type: 'application/octet-stream' }));
  const anchor = el('a', { href: url, download: result.filename });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick, not inline: revoking in the same statement races the
  // download in some browsers and the file arrives empty.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  emit('toast', { message: `Saved ${result.filename}`, tone: 'success' });
}

if (qsOrNull('#top-bar')) {
  start().catch((error) => {
    log.error('boot failed -', error.message);
    document.body.textContent = 'Forecast Farm could not start. Check the browser console.';
  });
}