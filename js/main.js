import { qsOrNull, el } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { loadProvider } from './auth-main.js';
import { signInAsGuest } from './services/localAuth.js';
import { buildServerSave } from './remoteSave.js';
import { mountConnectionStatus, wireSaveOnExit } from './connection.js';
import { adoptState, apply, emit, exportPayload, flushPendingSave, getState, getSync, init, on, reset, saveNow, subscribe } from './state/store.js';
import { mountBootLoader } from './ui/loadingTips.js';
import { mountBlockedScreen } from './ui/blockedScreen.js';
import { mountToastStack } from './ui/toastStack.js';
import { mountNavbar } from './ui/navbar.js';
import { mountShopLauncher } from './ui/shopLauncher.js';
import { mountInventoryLauncher } from './ui/inventoryLauncher.js';
import { mountSeasonCard } from './ui/seasonCard.js';
import { mountPumpPanel } from './ui/pumpPanel.js';
import { setPump, tick } from './domain/water.js';
import { alertsToRaise, currentTrouble } from './domain/notifications.js';
import { mountWeatherPanel } from './ui/weatherPanel.js';
import { mountFarmView } from './ui/farmView.js';
import { mountLocationBar } from './ui/locationBar.js';
import { nextUnlockable } from './land_squares/index.js';
import { onPlotClick } from './farmActions.js';
import { fetchWeather } from './services/weatherApi.js';
import { formatCoordinates, isPlaceholderName, placeLabel, reverseGeocode, searchPlaces } from './services/geocodeApi.js';
import { AUTOSAVE_MS, TICK_MS } from './config/game.js';
import { REFRESH_MS, SUGGEST_COUNT } from './config/api.js';

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
    onChoose: moveFarmTo,
    onSuggest: suggestFor,
    onUseDeviceLocation: useDeviceLocation,
  });

  mountSeasonCard(qsOrNull('#season-card'), { location: getState()?.location });
  mountShopLauncher(qsOrNull('#shop-launch'), { href: shopHref(session) });
  mountInventoryLauncher(qsOrNull('#inventory-launch'), { href: farmHref(session) });

  qsOrNull('#right-rail').append(
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [el('span', { class: 'card__title', text: 'Gold' })]),
      el('p', { id: 'gold-value', text: '—' }),
    ]),
    placeholder('Environment', 'Humidity and wind — T-11'),
  );

  // The pump panel replaces the `Meters` placeholder, which is what it was reserved
  // for. It is the one panel whose read-out has to keep up with a per-second tick,
  // so it is the one that gets a `refresh()` rather than being rebuilt.
  pumpPanel = mountPumpPanel(el('div'), {
    getState,
    onToggle: (on) => {
      apply((s) => ({ ok: true, state: setPump(s, on) }));
      emit('toast', {
        message: on ? 'Pump on. Click one of your plots to water it.' : 'Pump off.',
        tone: on ? 'info' : 'success',
      });
    },
  });
}

/**
 * Repaint the field, and nothing else.
 *
 * Split out of `renderPanels` because **a repaint is not a state change**, and the two
 * need different amounts of the page. The 1 Hz tick exists so a growing crop visibly
 * changes sprite, and on that tick nothing has been spent, planted or fetched —
 * `plantedAt` has not moved. Sending the tick through `renderPanels` rebuilt the whole
 * page once a second, forecast board included, and it used to dismiss the seed picker
 * on the way past, so a player could open the picker and had under a second to choose a
 * seed. See ISS-085.
 *
 * `mountFarmView()` clears `#farm-view` wholesale, so nothing that is not the field may
 * be mounted inside it — the seed picker's host is a sibling for exactly that reason.
 */
/** The pump panel, mounted once and refreshed thereafter. See `renderPanels`. */
let pumpPanel = null;

/**
 * Raise a toast for each crop that has bad weather in the next 6–24 hours.
 *
 * Checked on the weather refresh rather than on the 1 Hz tick, because this is about
 * the **forecast** and the forecast only changes when it is refetched — checking it
 * every second would compute the same answer sixty times a minute. The standing-
 * condition warning ("this plot is running dry") is the other half and lives in
 * `tickFarm`, where it belongs.
 *
 * Dedupe is `cropId:event` keyed on the **start of the event window**, so a six-hour
 * run of heavy rain warns once rather than six times.
 */
function announceForecast() {
  const state = getState();
  if (!state) return;

  const { alerts, notified } = alertsToRaise(state, Date.now());
  if (alerts.length === 0) return;

  apply((s) => ({ ok: true, state: { ...s, notified } }));
  for (const alert of alerts) {
    emit('toast', { message: alert.message, tone: 'warning' });
  }
}

function repaintFarm(state) {  const offer = nextUnlockable(state);

  mountFarmView(qsOrNull('#farm-view'), {
    plots: state?.plots ?? [],
    selection: state?.selection,
    clock: state?.clock,
    nextPrice: offer?.price ?? 0,
    onPlotClick,
  });
}

/**
 * The whole page, for when the state itself has changed.
 *
 * **This does not dismiss the seed picker**, and that is deliberate. The only thing that
 * can change the seed bag under an open picker is planting, and planting dismisses it
 * itself in `farmActions.js`. A save completing, the clock ticking or the weather
 * refreshing are all reasons to redraw the page and none of them are a reason to take a
 * choice away from a player who is halfway through making it.
 */
function renderPanels(state) {
  mountWeatherPanel(qsOrNull('#forecast-card'), {
    location: state?.location,
    weather: state?.weather,
    sync: getSync(),
  });

  repaintFarm(state);
  pumpPanel?.refresh();

  const goldEl = qsOrNull('#gold-value');
  if (goldEl && state) goldEl.textContent = `${state.gold} gold`;
}

/**
 * Advance water, bill the pump, and raise any weather warning.
 *
 * Every second, and computed from **elapsed** time rather than a fixed step — see
 * `domain/water.js`. That is what makes a closed tab catch up: six hours away dries
 * and waters exactly as six hours of ticking would have.
 *
 * The notifications are checked here rather than on the 15-minute weather refresh
 * because the interesting one — a plot actually running dry — is a condition, not a
 * forecast, and a player who plants into a heatwave should not wait a quarter of an
 * hour to be told.
 */
function tickFarm() {
  const before = getState();
  if (!before) return;

  const result = tick(before, Date.now());
  const moved = result.spent > 0
    || result.state.plots.some((plot, i) => plot.waterLevel !== before.plots[i].waterLevel);

  if (moved) apply(() => ({ ok: true, state: result.state }));

  if (result.autoOff === 'gold') {
    emit('toast', { message: 'Pump stopped — you are out of gold.', tone: 'error' });
  }

  // A crop that died of thirst is the most consequential thing this tick can do, and
  // `domain/water.js` is the only thing in the codebase that can do it. Say so, or the
  // player finds greyed-out ground and works out why on their own.
  if (result.deaths.length > 0) {
    const n = result.deaths.length;
    emit('toast', {
      message: n === 1
        ? 'A crop died of thirst. The pump would have saved it.'
        : `${n} crops died of thirst. The pump would have saved them.`,
      tone: 'error',
    });
  }

  const now = getState();
  if (!now) return;

  const trouble = currentTrouble(now, Date.now());
  if (trouble && now.notified[trouble.key] !== trouble.message) {
    apply((s) => ({
      ok: true,
      state: { ...s, notified: { ...s.notified, [trouble.key]: trouble.message } },
    }));
    emit('toast', { message: trouble.message, tone: 'error' });
  }
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
  announceForecast();
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

/**
 * Move the farm to a place that has already been resolved.
 *
 * Both ways of choosing a location end here — a row the player picked out of the suggestion list,
 * and the first hit from a submitted search — because they are the same decision with different
 * amounts of work already done, and one writer is what stops the two from drifting apart. The
 * suggestion path is the one that arrives with a fully-populated place and the search path is not,
 * so anything not filled in is defaulted here rather than at each call site.
 *
 * @param {{name: string, country?: string, lat: number, lon: number, tz?: string}} place
 */
async function moveFarmTo(place) {
  setLocation({
    name: place.name,
    country: place.country ?? '',
    lat: place.lat,
    lon: place.lon,
    // 'auto' rather than undefined: Open-Meteo reads a missing timezone as UTC, and a farm
    // pinned at 23.81° N shown in UTC is showing the wrong evening.
    tz: place.tz || 'auto',
    pinned: true,
  });

  await refreshWeather({ quiet: true });
  emit('toast', { message: `Farm moved to ${place.name}.`, tone: 'success' });
}

/**
 * Candidates for the suggestion list.
 *
 * Answers places, never the service's `{ok, results}` envelope, so `js/ui/locationBar.js` has one
 * shape to handle and no knowledge of what a failed lookup is. See `geocodeApi`'s note on why the
 * two layers do not share that envelope.
 *
 * `placeLabel` is applied here rather than in the panel for the same reason: the service has no
 * business knowing how a candidate should read in a list, and the panel has no business knowing
 * that `admin1` is a province.
 *
 * **Failure answers `null`, and "no matches" answers `[]`.** Those are not the same message to a
 * player: one is a service that was not reached, the other is a service that was asked and had
 * nothing. Collapsing them makes every dropped connection read as "no places found", which is how
 * a player learns to distrust a search box that was only ever offline.
 *
 * @param {string} query
 * @param {AbortSignal} [signal] cancels the request when a newer keystroke replaces it
 * @returns {Promise<object[]|null>} `[]` for no matches, `null` for a lookup that did not answer
 */
async function suggestFor(query, signal) {
  const result = await searchPlaces(query, { signal });

  if (!result.ok) {
    // 'aborted' is the player typing faster than the network answers, not a fault. Logging it
    // would fill the console with failures for every fast typist and teach us to ignore it.
    if (result.reason !== 'aborted') log.warn('place search failed -', result.reason);
    return null;
  }

  return result.results.map((place) => ({ ...place, ...placeLabel(place) }));
}

/**
 * The submitted search, which takes the single best match.
 *
 * Still here, and still `[0]`, because submitting the form is a decision to stop deliberating: the
 * player typed a place and pressed Enter, and the top hit is the answer they meant. The suggestion
 * list is for the case where that is not good enough.
 */
async function searchFor(query) {
  emit('toast', { message: `Looking for “${query}”…`, tone: 'info' });

  const result = await searchPlaces(query, { count: SUGGEST_COUNT });
  const place = result.ok ? result.results?.[0] : null;

  if (!place) {
    emit('toast', { message: `No place found for “${query}”.`, tone: 'error' });
    return;
  }

  await moveFarmTo(place);
}

/**
 * Whether this save's location has to be looked up again before the weather means
 * anything.
 *
 * Two cases, and the second is the subtle one.
 *
 * `!saved.pinned` is the original intent: a farm that was never pinned has no
 * coordinates to speak of.
 *
 * The placeholder comparison is the migration ISS-077 needed, and it is load-bearing
 * rather than defensive. The old code pinned the coordinates *successfully* and
 * failed only to name them, so it wrote `pinned: true` next to
 * `name: 'Current location'`. `pinned` therefore never returns to false, and a bare
 * `!saved.pinned` test means **no pre-fix farm is ever re-resolved** — the repair
 * would apply only to farms created after it, and every existing player would keep
 * the placeholder for the life of their save.
 *
 * **The comparison is `isPlaceholderName`, not `=== 'Current location'`, and that is
 * the fix for "it still says Current Location".** An equality test only recognises
 * its own spelling: a save written with a capital `L`, with a doubled space, or with
 * the phrase a hand-edited export carries all fail the gate, so the repair silently
 * declines to run and the placeholder stays for good. The gate is the part that
 * decides whether the repair happens, so a gate that is too narrow looks exactly like
 * no fix at all.
 *
 * Pure and exported so the gate itself can be tested — the gate is the part that
 * silently decides whether a repair ever runs.
 *
 * @param {{pinned?: boolean, name?: string}|null|undefined} saved
 * @returns {boolean}
 */
export function needsLocationRefresh(saved) {
  return !saved?.pinned || isPlaceholderName(saved?.name);
}

/**
 * Name the farm from the coordinates the save already holds.
 *
 * **This deliberately does not touch `navigator.geolocation`.** The farm's coordinates are already in
 * the save — the broken code stored them correctly and only failed to name them — so re-prompting for
 * a location permission just to repair a text label is both unnecessary and, as it turned out,
 * useless: with the prompt pending or denied the old migration silently did nothing on every single
 * load, which looks exactly like the fix not existing. Naming the farm where it *is* is also more
 * correct than naming it wherever the device happens to be standing now.
 *
 * Nothing is written unless the lookup succeeds, so a farm that cannot be named yet keeps its current
 * name and simply tries again — on the next refresh, not only on the next page load.
 *
 * @returns {Promise<boolean>} whether the name was repaired
 */
async function nameExistingLocation() {
  const saved = getState()?.location;
  if (!needsLocationRefresh(saved)) return false;
  if (!Number.isFinite(saved?.lat) || !Number.isFinite(saved?.lon)) return false;

  const named = await reverseGeocode(saved.lat, saved.lon);
  if (!named.ok) {
    log.warn('could not name the saved location -', named.reason);
    return false;
  }

  // Still a placeholder would mean the repair "succeeded" into the same nameless state and the
  // board looks unchanged, so there is nothing to show for the request. `placeNameFrom` already
  // guarantees a real name or a coordinate pair, but a hand-edited save can carry anything.
  if (isPlaceholderName(named.name)) {
    log.warn('the lookup answered with a placeholder, leaving the farm alone');
    return false;
  }

  setLocation({ ...saved, name: named.name, country: named.country, pinned: true });
  log.info(`named the saved location: ${named.name}`);
  return true;
}

/**
 * The first weather fetch, the name repair, and the interval that repeats both.
 *
 * **The repair is not chained onto the weather fetch.** It used to be, which made the name of a farm
 * depend on a service it has nothing to do with: the forecast request is the slowest call on boot and
 * the most likely to fail, so a weather timeout silently cancelled the naming too, forever, on every
 * load. Two unrelated promises, two independent jobs. The repair is cheap — it returns immediately
 * unless the name is a placeholder, which is the only case it exists for.
 */
function bootWeather() {
  void refreshWeather({ quiet: true });

  // Silent: quietly repairing a farm's name should not announce itself as a
  // location change the player did not ask for.
  void nameExistingLocation();

  setInterval(() => {
    void refreshWeather({ quiet: true });
    // Retried here as well as at boot, because the usual reason a farm is still
    // unnamed is that the device was offline when it was asked. Waiting for the
    // player to reload the page to fix a label is not a repair.
    void nameExistingLocation();
  }, REFRESH_MS);
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

    // Before `bootWeather()`, and before the veil lifts: the chip has to be on
    // screen before the first save can fail, or the player never learns their farm
    // stopped syncing.
    mountConnectionStatus(qsOrNull('#sync-indicator'), {
      onExport: exportFromBanner,
    });

    bootWeather();

    // The weather panel is the one place a paused forecast is visible, so a
  // dropped connection has to re-render it — a failed save produces no state
  // change to hang off. Only `pending`, though: `saving` and `synced` render
  // identically to each other, and rebuilding the whole shell on both of those
  // meant a full re-render twice every AUTOSAVE_MS. That is the second half of
  // ISS-076, and the chip is only the first.
  on('sync', (next) => {
    if (next === 'pending') renderPanels(getState());
  });

  // The shell is up and playable now, so the veil goes. Deliberately *not*
    // waiting for `bootWeather()` — that fetch is fire-and-forget and the farm
    // works without it; the forecast panel fills itself in when the response
    // lands. Holding the veil until then would mean a weather timeout keeps a
    // perfectly good farm hidden behind a veil.
    loader.done();

    // The field redraws once a second so a growing crop visibly changes sprite.
    //
    // **`repaintFarm`, not `renderPanels`.** Nothing here writes state: growth is
    // derived from `plantedAt` on every render, so a second passing is a repaint and not
    // a state change. Going through `renderPanels` rebuilt the forecast board sixty
    // times a minute and dismissed the seed picker each time, which made it impossible
    // to choose a seed. See ISS-085.
    //
    // **The tick is allowed to be naive about *when*; it is not naive about *what*.**
    // `mountFarmView` compares a signature of everything the field draws before it
    // touches the DOM, so almost every one of these calls returns without doing anything
    // at all. That matters because rebuilding the field means recreating ~34 `<img>`
    // elements over 313–712 KB of art, and a fresh `<img>` re-decodes even when the
    // bitmap is already in memory — about 16.4 MB of PNG per second, every second, which
    // is ISS-088 and the reason the whole page felt unresponsive.
    //
    // Skipped while the tab is hidden, which matters on a phone — a backgrounded tab
    // holding a 1 Hz timer is a battery complaint, and there is nothing visible to
    // repaint. The crop will have grown by the time the tab comes back, because
    // `plantedAt` did not move.
    setInterval(() => {
      if (document.hidden) return;
      repaintFarm(getState());
    }, TICK_MS);

    // Water, the pump bill, and the weather warnings.
    //
    // **This one is not skipped when the tab is hidden**, unlike the repaint above,
    // and the difference matters. A repaint has nothing to show a backgrounded tab.
    // Elapsed time is *not* skipped when it is skipped — `tick()` derives everything
    // from `lastTickAt`, so a tab left closed overnight catches up in one step when it
    // comes back rather than silently skipping six hours of evaporation.
    setInterval(tickFarm, TICK_MS);

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