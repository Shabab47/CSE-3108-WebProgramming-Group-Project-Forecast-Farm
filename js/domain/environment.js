/**
 * Environment: what the weather is doing to the farm, not what the weather is.
 *
 * ## Why this is separate from the board
 *
 * `weatherPanel.js` **reports** the weather — 32°C, 50% humidity, 9 km/h, six hours of
 * icons. That is the right thing for a player who wants to know what it is like outside.
 *
 * This **answers for the farm**. The same 32°C is a number until you know it is drying
 * plots at 10.8 units an hour and that there is frost coming at four o'clock. Both are
 * already in the same API response and neither is on the board, because the board is
 * showing you the sky and this is showing you your crops.
 *
 * ## Every threshold here is the game's own
 *
 * Nothing in this file invents a number. Frost at 2°C, strong wind at 40 km/h, high
 * humidity at 85% are the comparisons `classifyHour()` already makes in
 * `config/weatherEvents.js`, read from the same place so a card can never call a day
 * frost-free while `verdictFor()` is charging the player for frost.
 */

import { WATER } from '../config/game.js';
import {
  EVAPORATION_PER_HOUR,
  RAIN_WATER_PER_HOUR,
  classifyHour,
  rateFor,
} from '../config/weatherEvents.js';

/** Below this the sky counts as frost. Matches `classifyHour`. */
export const FROST_C = 2;
/** Above this the frost row is not worth a line on the card. See `environmentFacts`. */
export const FROST_NEAR_C = 10;
/** At or above this the wind counts as strong. Matches `classifyHour`. */
export const STRONG_WIND_KMH = 40;
/** At or above this the air counts as humid enough to matter. Matches `classifyHour`. */
export const HIGH_HUMIDITY = 85;
/** UV at or above this is worth mentioning to a player standing in a field. */
export const UV_HIGH = 8;

/**
 * The facts, most urgent first.
 *
 * Each fact is `{ id, label, value, note, tone }`, where `tone` is `'calm'`, `'warn'` or
 * `'danger'` — the card colours by tone **and** prints the note, because a red row that
 * says nothing is a red row that cannot be acted on.
 *
 * Facts that are calm and uninteresting are dropped rather than printed in grey: a list of
 * six rows where four say "fine" is a list nobody reads, and the ones that matter get lost
 * in it. Drying is the exception — it is always shown, because it is the number every
 * water decision is made against.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {Array<{id: string, label: string, value: string, note: string, tone: string}>}
 */
export function environmentFacts(state, now = Date.now()) {
  const current = state?.weather?.current;
  const hourly = state?.weather?.hourly;
  if (!current && !hourly?.time?.length) return [];

  const from = hourlyIndex(hourly, now);
  const window = slice(hourly, from, 12);

  const facts = [];

  // --- Drying. Always present, and always about the fastest thing on the farm. ---
  const event = currentEventOf(state, now);
  const dry = evaporationFor(event);
  const rain = rainFor(event);
  facts.push({
    id: 'drying',
    label: 'Drying',
    value: `${round(dry)} /h`,
    note: rain > 0
      ? `rain is adding ${rain}/h at the same time`
      : 'nothing is coming in, so this only goes one way',
    tone: rain > 0 ? 'calm' : (dry >= 20 ? 'danger' : (dry >= 10 ? 'warn' : 'calm')),
  });

  // --- Frost. The coldest hour in the next twelve, not the current one. ---
  // **Only when it is actually near.** A row reading "Frost 32°C — safe" is worse than no
  // row: it makes the player scan past the one that said something true. The gate is 10°C,
  // which is well above the 2°C the game calls frost, so the row appears while it is still
  // a decision to think about rather than after it has already happened.
  const temps = numbers(window, 'temperature');
  if (temps.length) {
    const coldest = Math.min(...temps);
    if (coldest <= FROST_NEAR_C) {
      const at = temps.indexOf(coldest);
      facts.push({
        id: 'frost',
        label: 'Frost',
        value: `${Math.round(coldest)}°C`,
        note: coldest <= FROST_C
          ? `frost in ${describeAway(at)} — frost damages crops`
          : 'cold enough to watch, not yet freezing',
        tone: coldest <= 0 ? 'danger' : (coldest <= FROST_C ? 'warn' : 'calm'),
      });
    }
  }

  // --- Rain. The chance in the next hour, and whether it is actually falling. ---
  const chances = numbers(window, 'precipitationProbability').slice(0, 3);
  const nowChance = chances.length ? Math.max(...chances) : null;
  if (nowChance != null && nowChance >= 20) {
    facts.push({
      id: 'rain',
      label: 'Rain',
      value: `${Math.round(nowChance)}%`,
      note: current?.precipitation > 0
        ? 'and it is falling now — the pump is redundant'
        : 'likely within the hour',
      tone: 'calm',
    });
  }

  // --- Wind. The strongest gust coming, because that is what lays a crop flat. ---
  const winds = numbers(window, 'windSpeed');
  if (winds.length) {
    const strongest = Math.max(...winds);
    if (strongest >= 20) {
      facts.push({
        id: 'wind',
        label: 'Wind',
        value: `${Math.round(strongest)} km/h`,
        note: strongest >= STRONG_WIND_KMH
          ? 'strong wind — crops take damage'
          : 'breezy, nothing to worry about',
        tone: strongest >= STRONG_WIND_KMH ? 'danger' : 'calm',
      });
    }
  }

  // --- Humidity, and what it means rather than what it is. ---
  const hum = typeof current?.humidity === 'number' ? current.humidity : null;
  if (hum != null && (hum >= HIGH_HUMIDITY || hum <= 35)) {
    facts.push({
      id: 'humidity',
      label: 'Humidity',
      value: `${Math.round(hum)}%`,
      note: hum >= HIGH_HUMIDITY
        ? 'the air is saturated — drying all but stops'
        : 'dry air — plots lose water faster than the number above suggests',
      tone: hum >= HIGH_HUMIDITY ? 'calm' : 'warn',
    });
  }

  // --- UV. Only when it is worth standing in a field. ---
  const uv = numbers(window, 'uvIndex').filter((n) => n > 0);
  if (uv.length) {
    const peak = Math.max(...uv);
    if (peak >= UV_HIGH) {
      facts.push({
        id: 'uv',
        label: 'UV',
        value: String(Math.round(peak)),
        note: peak >= 11 ? 'very high — avoid the field at midday' : 'high — sun on your neck',
        tone: peak >= 11 ? 'danger' : 'warn',
      });
    }
  }

  // Most urgent first, so the card's top row is the one to act on.
  const rank = { danger: 0, warn: 1, calm: 2 };
  return facts.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

/* --- reading the forecast ----------------------------------------------------- */

/** Index of the hour containing `now`. Falls back to the first hour. */
function hourlyIndex(hourly, now) {
  const time = hourly?.time;
  if (!time?.length) return 0;

  const nowMs = new Date(now).getTime();
  for (let i = 0; i < time.length; i += 1) {
    if (new Date(time[i]).getTime() <= nowMs) return i;
  }
  return 0;
}

/** The next `hours` entries, as one object of parallel arrays. */
function slice(hourly, from, hours) {
  const time = (hourly?.time ?? []).slice(from, from + hours);
  const pick = (key) => (hourly?.[key] ?? []).slice(from, from + hours);
  return {
    time,
    temperature: pick('temperature'),
    windSpeed: pick('windSpeed'),
    precipitationProbability: pick('precipitationProbability'),
    uvIndex: pick('uvIndex'),
  };
}

/** The numeric values of one parallel array, holes dropped. */
function numbers(window, key) {
  return (window[key] ?? []).filter((n) => typeof n === 'number' && Number.isFinite(n));
}

/** "in 3h", or "soon", from an offset into the window. */
function describeAway(index) {
  if (index == null || index < 0) return 'soon';
  if (index === 0) return 'the next hour';
  return `${index}h`;
}

/** One decimal at most, and never `12.300000000000001`. */
function round(n) {
  return Math.round(n * 10) / 10;
}

/* --- the event, and what it means --------------------------------------------- */

/** The classified event right now, or `'cloudy'` with no forecast. */
function currentEventOf(state, now) {
  const hourly = state?.weather?.hourly;
  if (!hourly?.time?.length) return 'cloudy';

  const i = hourlyIndex(hourly, now);
  // Imported lazily to keep this file free of a cycle: `water.js` imports `plotWater.js`,
  // and both of those are heavier than this needs to be for a card.
  return classifyHour({
    weatherCode: hourly.weatherCode?.[i],
    temperature: hourly.temperature?.[i],
    humidity: hourly.humidity?.[i],
    windSpeed: hourly.windSpeed?.[i],
    precipitationProbability: hourly.precipitationProbability?.[i],
  });
}

/** Bare-soil evaporation for an event: the fastest anything on the farm dries. */
function evaporationFor(event) {
  return rateFor(EVAPORATION_PER_HOUR, event) * WATER.baseDecayPerHour;
}

/** Rain falling for an event, in units per hour. */
function rainFor(event) {
  return rateFor(RAIN_WATER_PER_HOUR, event);
}