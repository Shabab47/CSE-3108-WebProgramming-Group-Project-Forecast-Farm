import { qsOrNull, el } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { signInAsGuest } from './services/localAuth.js';
import { buildServerSave } from './remoteSave.js';
import { adoptState, apply, emit, exportPayload, getState, init, readImport, reset, saveNow, subscribe } from './state/store.js';
import { mountToastStack } from './ui/toastStack.js';
import { mountTopBar } from './ui/topBar.js';
import { mountSavePanel } from './ui/savePanel.js';
import { mountShopLauncher } from './ui/shopLauncher.js';
import { mountSettingsLauncher } from './ui/settingsLauncher.js';
import { mountWeatherPanel } from './ui/weatherPanel.js';
import { mountFarmView } from './ui/farmView.js';
import { mountLocationBar } from './ui/locationBar.js';
import { fetchWeather } from './services/weatherApi.js';
import { reverseGeocode, searchPlaces } from './services/geocodeApi.js';
import { AUTOSAVE_MS } from './config/game.js';
import { REFRESH_MS } from './config/api.js';

const log = createLog('main');

const LOGIN_URL = 'login.html';
const SHOP_URL = 'shop.html';
const FARM_URL = 'index.html';
const SETTINGS_URL = 'settings.html';

export function shopHref(session) {
  return session?.status === 'guest' ? `${SHOP_URL}?guest=1` : SHOP_URL;
}

export function farmHref(session) {
  return session?.status === 'guest' ? `${FARM_URL}?guest=1` : FARM_URL;
}

export function settingsHref(session) {
  return session?.status === 'guest' ? `${SETTINGS_URL}?guest=1` : SETTINGS_URL;
}

export async function resolveSession(provider) {
  const live = provider.currentSession() ?? (await provider.restoreSession?.());
  if (live) return live;

  const guest = new URLSearchParams(location.search).get('guest') === '1';
  if (guest) return signInAsGuest().session;

  return null;
}

function placeholder(label, detail) {
  return el('div', { class: 'placeholder' }, [
    el('span', { class: 'placeholder__label', text: label }),
    el('span', { text: detail }),
  ]);
}

function mountShell(session, onSignOut) {
  mountTopBar(qsOrNull('#top-bar'), { session, onSignOut });
  mountShopLauncher(qsOrNull('#shop-launch'), { href: shopHref(session) });
  mountSettingsLauncher(qsOrNull('#settings-launch'), { href: settingsHref(session) });

  mountLocationBar(qsOrNull('#location-bar'), {
    onSearch: searchFor,
    onUseDeviceLocation: useDeviceLocation,
  });

  qsOrNull('#sidebar').append(
    placeholder('Season', 'Season card — T-11'),
    placeholder('Inventory', 'Seeds and harvest — T-08'),
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

function renderPanels(state) {
  mountWeatherPanel(qsOrNull('#forecast-card'), {
    location: state?.location,
    weather: state?.weather,
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
          name: named.ok ? named.name : 'Current location',
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

async function signOut(provider) {
  saveNow();
  try {
    await provider.signOut();
  } catch (error) {
    log.warn('sign out failed -', error.message);
  }
  reset();
  location.replace(LOGIN_URL);
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
  const provider = await loadProvider();
  const session = await resolveSession(provider);

  if (!session) {
    location.replace(LOGIN_URL);
    return;
  }

  const { loaded } = await init(session, undefined, buildServerSave(provider, session));
  log.info(loaded ? 'resumed farm' : 'started a new farm');

  mountToastStack();
  mountShell(session, () => signOut(provider));
  renderPanels(getState());

  subscribe((state) => {
    if (state) renderPanels(state);
  });

  bootWeather();

  setInterval(saveNow, AUTOSAVE_MS);
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}

if (qsOrNull('#top-bar')) {
  start().catch((error) => {
    log.error('boot failed -', error.message);
    document.body.textContent = 'Forecast Farm could not start. Check the browser console.';
  });
}