/**
 * Weather warnings about what is planted.
 *
 * ## Why this exists
 *
 * The farm reacts to weather at two moments: when a seed goes in (the verdict in
 * `domain/weather.js`) and while a crop is standing (the water and health in
 * `domain/water.js`). The second one happens to a player who is not watching, so
 * without this they find out by harvesting.
 *
 * ## The rule from `docs/notifications.md`
 *
 * A crop is *interested* in an event when its matrix rating is **worse than neutral**.
 * `thrives`, `content` and neutral produce nothing, which is what keeps the toast
 * stack quiet during settled weather — and a quiet stack is what makes a toast worth
 * reading.
 *
 * Dedupe is `cropId + event`, keyed on the **start of the event window** rather than
 * a boolean. A run of heavy rain from 14:00 to 20:00 alerts once, at 14:00, and does
 * not repeat hourly for six hours; a *new* window has a later start and fires again.
 * `state.notified` holds the map, and it is persisted, because otherwise a page
 * reload would re-fire everything.
 */

import { cropOf } from '../config/crops.js';
import { weatherRating } from '../config/cropWeatherMatrix.js';
import { classifyHour } from '../config/weatherEvents.js';
import { indexOfHour } from './weather.js';

/** How far ahead to look, in hours. The spec says 6 to 24. */
export const LOOK_AHEAD_MIN = 6;
export const LOOK_AHEAD_MAX = 24;

/**
 * The words, by crop and event.
 *
 * The tone is the same as the seed picker's `growNote`: practical rather than
 * alarmed. A player is told what is coming and what to do about it, because a warning
 * with no action attached is just anxiety.
 */
const MESSAGES = {
  rice: {
    drought: 'Drought coming — rice will dry out. Run the pump.',
    frost: 'Frost forecast — rice is the first crop to suffer. Water it.',
    strongWind: 'Strong wind coming — rice lays flat in it.',
    hail: 'Hail forecast — rice takes real damage.',
    heavyRain: 'Heavy rain coming — rice thrives on it.',
  },
  wheat: {
    drought: 'Drought coming — wheat is thirsty once it is growing. Run the pump.',
    frost: 'Frost forecast — wheat copes, but the young shoots will suffer.',
    heavyRain: 'Heavy rain coming — wheat rots in standing water.',
    hail: 'Hail forecast — wheat takes real damage.',
    strongWind: 'Strong wind coming — wheat is prone to lodging.',
  },
  potato: {
    heat: 'Heat coming — potatoes want cool ground. Water them.',
    drought: 'Drought coming — potatoes lift and stop growing.',
    heavyRain: 'Heavy rain coming — potatoes rot below ground.',
    frost: 'Frost forecast — potatoes are damaged by frost.',
  },
  tomato: {
    frost: 'Frost forecast — tomatoes die in a frost. Cover them or lose the crop.',
    heavyRain: 'Heavy rain coming — tomatoes split.',
    strongWind: 'Strong wind coming — tomatoes lose their fruit.',
    heat: 'Heat coming — tomato flowers drop above 38°C.',
    hail: 'Hail forecast — tomatoes shred.',
  },
  corn: {
    drought: 'Drought coming — corn is the thirstiest crop here. Run the pump.',
    strongWind: 'Strong wind coming — corn lays flat and never recovers.',
    hail: 'Hail forecast — corn takes real damage.',
    heat: 'Heat coming — corn pollinates poorly above 38°C.',
  },
};

/** The fallback for a crop with no line written for this event. */
const GENERIC = {
  drought: 'Drought coming — your crops will dry out. Run the pump.',
  frost: 'Frost forecast — your crops will suffer.',
  heavyRain: 'Heavy rain coming.',
  strongWind: 'Strong wind coming.',
  hail: 'Hail forecast — your crops will take damage.',
  heat: 'Heat coming — your crops will struggle.',
};

/**
 * Every planted crop on an owned, living plot, with the crop id.
 *
 * A plot with nothing in it is not a reason to hear about the weather.
 *
 * @param {object} state
 * @returns {Array<{cropId: string, plotId: number}>}
 */
export function plantedCrops(state) {
  const seen = new Set();
  const out = [];

  for (const plot of state?.plots ?? []) {
    if (!plot.owned || plot.dead || plot.cropId == null) continue;
    if (seen.has(plot.cropId)) continue;
    seen.add(plot.cropId);
    out.push({ cropId: plot.cropId, plotId: plot.id });
  }

  return out;
}

/**
 * The upcoming events worth warning about, for what is planted right now.
 *
 * Returns every candidate and **does not decide when to show it** — the firing rule,
 * which needs the dedupe map and the current clock, is `alertsToRaise()`. Splitting
 * them is what makes the interesting half testable without a store.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {Array<{cropId, event, hoursAway, message, windowStart}>}
 */
export function forProjection(state, now = Date.now()) {
  const hourly = state?.weather?.hourly;
  if (!hourly?.time?.length) return [];

  const start = indexOfHour(hourly.time, now);
  const alerts = [];

  for (const { cropId } of plantedCrops(state)) {
    let windowStart = null;

    for (let offset = 0; offset < LOOK_AHEAD_MAX; offset += 1) {
      const index = start + offset;
      if (index >= hourly.time.length) break;
      if (offset < LOOK_AHEAD_MIN) continue;

      const event = classifyHour({
        weatherCode: hourly.weatherCode?.[index],
        temperature: hourly.temperature?.[index],
        humidity: hourly.humidity?.[index],
        windSpeed: hourly.windSpeed?.[index],
        precipitationProbability: hourly.precipitationProbability?.[index],
      });

      // The *first* bad hour opens the window; the rest of the run is the same event.
      if (windowStart === null) windowStart = hourly.time[index];
      if (windowStart !== hourly.time[index]) continue;

      const rating = weatherRating(cropId, event);
      if (rating >= 0) continue;

      alerts.push({
        cropId,
        event,
        hoursAway: offset,
        message: MESSAGES[cropId]?.[event] ?? GENERIC[event] ?? `${event} coming.`,
        windowStart,
      });
      break; // one alert per crop per window
    }
  }

  return alerts;
}

/**
 * The alerts that have not been raised for their window yet.
 *
 * `state.notified` is keyed `cropId:event` → the window's start stamp. A candidate
 * whose key is missing, or whose stored stamp is *older* than this window, is new and
 * is returned with the updated map.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {{alerts: object[], notified: object}}
 */
export function alertsToRaise(state, now = Date.now()) {
  const candidates = forProjection(state, now);
  const notified = { ...(state?.notified ?? {}) };
  const alerts = [];

  for (const alert of candidates) {
    const key = `${alert.cropId}:${alert.event}`;
    const seen = notified[key];

    // An older stamp means a *new* window of the same event, which is a real change
    // and deserves a real message.
    if (seen && String(seen) >= String(alert.windowStart)) continue;

    notified[key] = alert.windowStart;
    alerts.push(alert);
  }

  return { alerts, notified };
}

/**
 * The trouble a standing crop is in right now, as one sentence.
 *
 * Separate from `forProjection`, which is about the future. This is about a plot
 * that is **already** dry under a hot sky, which is the "use the pump" the player
 * needs at the moment they can still afford it.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {{message: string, key: string}|null}
 */
export function currentTrouble(state, now = Date.now()) {
  const crops = plantedCrops(state);
  if (crops.length === 0) return null;

  const event = state?.weather?.hourly?.time?.length
    ? classifyHour(readHour(state.weather.hourly, indexOfHour(state.weather.hourly.time, now)))
    : 'cloudy';

  const dry = state.plots.filter((p) => p.owned && p.cropId && !p.dead && (p.waterLevel ?? 0) < 30);
  const thirsty = dry.map((p) => p.cropId);
  const crop = cropOf(thirsty[0]);

  if (dry.length === 0 && event !== 'drought') return null;

  const heat = event === 'drought' || event === 'sunny';
  if (heat && dry.length > 0) {
    return {
      key: 'drought_warning',
      message: dry.length === 1
        ? `${crop?.name ?? 'Your crop'} is running dry in ${event === 'drought' ? 'a drought' : 'this heat'}. Run the pump before it wilts.`
        : `${dry.length} plots are running dry in ${event === 'drought' ? 'a drought' : 'this heat'}. Run the pump before they wilt.`,
    };
  }

  return null;
}

/** One hour of forecast as a reading, for `classifyHour`. */
function readHour(hourly, index) {
  return {
    weatherCode: hourly.weatherCode?.[index],
    temperature: hourly.temperature?.[index],
    humidity: hourly.humidity?.[index],
    windSpeed: hourly.windSpeed?.[index],
    precipitationProbability: hourly.precipitationProbability?.[index],
  };
}
