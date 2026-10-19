/**
 * Environment: what the weather is doing to the farm, not what the weather is.
 *
 * ## Why this is separate from the board
 *
 * `weatherPanel.js` **reports** the weather — 32°C, 55% humidity, 15 km/h, six hours of
 * icons. That is the right thing for a player who wants to know what it is like outside.
 *
 * This **answers for the farm**. The same 32°C is a number until you know it is drying
 * plots at 12 units an hour and that there is frost coming at four o'clock. Both are
 * already in the same API response and neither is on the board, because the board is
 * showing you the sky and this is showing you your crops.
 *
 * **Rain, wind and humidity are deliberately not rows here.** The board already prints
 * those three numbers; repeating them in the rail, with a sentence attached, was the
 * card saying the same thing twice. What is left is what the board cannot show: how
 * fast the ground is losing water, whether the cold will bite, and how hard the sun is.
 *
 * ## Every threshold and fill scale is the game's own
 *
 * Nothing in this file invents a number. Frost at 2°C is the comparison `classifyHour()`
 * makes in `config/weatherEvents.js`; the fill scales read the game's own range — 24/h
 * is the fastest bare soil can dry, 11 is the top of the UV index, and 10°C is the point
 * below which frost is worth a bar. A card can therefore never call a day frost-free
 * while `verdictFor()` is charging the player for frost.
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
/** The frost bar's zero point: at or above this, frost is not worth filling the bar. */
export const FROST_NEAR_C = 10;

/** The fixed order of the calm rows, so the card does not reshuffle when nothing changes. */
const ORDER = ['drying', 'frost', 'uv'];
/** UV at or above this is worth mentioning to a player standing in a field. */
export const UV_HIGH = 8;
/** The top of the UV index, and the heat bar's full mark. */
export const UV_MAX = 11;

/**
 * The fastest bare soil can dry, in units per hour — the water bar's full mark.
 *
 * `drought` is the strongest evaporation event the game defines, so this is not a
 * number somebody picked: it is the top of the table in `config/weatherEvents.js`
 * multiplied by the same base decay every plot uses.
 */
const MAX_DRY_PER_HOUR = WATER.baseDecayPerHour
  * Math.max(...Object.values(EVAPORATION_PER_HOUR));

/**
 * The facts, most urgent first.
 *
 * Each fact is `{ id, label, value, note, tone, fill }`, where `tone` is `'calm'`,
 * `'warn'` or `'danger'` and `fill` is 0–100 for the card's meter bar.
 *
 * **All three rows are always present.** The first version dropped anything calm, on the
 * reasoning that a list where most rows say "fine" is a list nobody reads. That was a
 * reasonable-sounding guess and it was wrong: on an ordinary day the card showed a single
 * row, so it read as *broken* rather than as *quiet*. There is no way for a player to tell
 * "the sky is fine" from "this panel has failed" if the only thing it says when nothing is
 * wrong is nothing at all.
 *
 * So every reading is always there and the **tone** is what changes. Three meters, and the
 * one that is red is the one to act on. Sorting still puts the urgent rows on top, so a
 * calm card is all three in a fixed order and a dangerous one leads with what to do about.
 *
 * The fill is computed here rather than in the UI because it is a reading, not a style:
 * the bar must agree with the number beside it, and a UI that divides by its own maximum
 * is a second rule that can disagree with the first.
 *
 * @param {object} state
 * @param {number} [now]
 * @returns {Array<{id: string, label: string, value: string, note: string,
 *   tone: string, fill: number}>}
 */
export function environmentFacts(state, now = Date.now()) {
  const current = state?.weather?.current;
  const hourly = state?.weather?.hourly;
  if (!current && !hourly?.time?.length) return [];

  const from = hourlyIndex(hourly, now);
  const window = slice(hourly, from, 12);

  const facts = [];

  // --- Water. Always present, and always about the fastest thing on the farm. ---
  const event = currentEventOf(state, now);
  const dry = evaporationFor(event);
  const rain = rainFor(event);
  facts.push({
    id: 'drying',
    label: 'Water',
    value: `${round(dry)} /h`,
    note: rain > 0
      ? `rain is adding ${rain}/h at the same time`
      : 'nothing is coming in, so this only goes one way',
    tone: rain > 0 ? 'calm' : (dry >= 20 ? 'danger' : (dry >= 10 ? 'warn' : 'calm')),
    fill: fillOf(dry, MAX_DRY_PER_HOUR),
  });

  // --- Frost. The coldest hour in the next twelve, not the current one. ---
  const temps = numbers(window, 'temperature');
  const coldest = temps.length ? Math.min(...temps) : null;
  facts.push(coldest == null ? missing('frost', 'Frost') : {
    id: 'frost',
    label: 'Frost',
    value: `${Math.round(coldest)}°C`,
    note: coldest <= 0
      ? `freezing in ${describeAway(temps.indexOf(coldest))} — frost damages crops`
      : (coldest <= FROST_C
        ? `frost in ${describeAway(temps.indexOf(coldest))} — frost damages crops`
        : `coldest in the next 12h — nothing freezing`),
    tone: coldest <= 0 ? 'danger' : (coldest <= FROST_C ? 'warn' : 'calm'),
    // Inverted: the bar fills as the coldest hour gets *colder*, so a full frost
    // meter is a warning and an empty one is an ordinary night.
    fill: fillOf(FROST_NEAR_C - coldest, FROST_NEAR_C),
  });

  // --- Heat. The UV peak, not the current reading. ---
  const uvs = numbers(window, 'uvIndex').filter((n) => n > 0);
  const peak = uvs.length ? Math.max(...uvs) : null;
  facts.push(peak == null ? missing('uv', 'Heat') : {
    id: 'uv',
    label: 'Heat',
    value: String(Math.round(peak)),
    note: peak >= UV_MAX
      ? 'very high — avoid the field at midday'
      : (peak >= UV_HIGH ? 'high — sun on your neck' : 'nothing to worry about'),
    tone: peak >= UV_MAX ? 'danger' : (peak >= UV_HIGH ? 'warn' : 'calm'),
    fill: fillOf(peak, UV_MAX),
  });

  // Most urgent first, so the card's top row is the one to act on. `drying` is pinned to
  // the top when nothing is wrong, because on a calm day it is the row that is still
  // telling you something: the number every water decision is made against.
  const rank = { danger: 0, warn: 1, calm: 2 };
  return facts.sort((a, b) => (
    rank[a.tone] - rank[b.tone]
    || (a.id === 'drying' ? -1 : 0) - (b.id === 'drying' ? -1 : 0)
    || ORDER.indexOf(a.id) - ORDER.indexOf(b.id)
  ));
}

/**
 * A row for a reading the API did not send.
 *
 * Still a row, still in place, still in order — the shape of the card does not change
 * because one field is missing, or the list visibly reflows and the player has to find
 * their place in it again.
 */
function missing(id, label) {
  return { id, label, value: '—', note: 'not reported right now', tone: 'calm', fill: 0 };
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
    uvIndex: pick('uvIndex'),
  };
}

/** The numeric values of one parallel array, holes dropped. */
function numbers(window, key) {
  return (window[key] ?? []).filter((n) => typeof n === 'number' && Number.isFinite(n));
}

/** A reading as a 0–100 meter fill, clamped. Anything missing is an empty bar. */
function fillOf(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
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