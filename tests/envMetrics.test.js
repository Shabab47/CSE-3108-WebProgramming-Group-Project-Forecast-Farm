/**
 * The environment card, mounted.
 *
 * `tests/weatherPanel.test.js` proves `environmentFacts()` — the numbers, the tones and
 * the fills. This proves the card built out of them: three meters that each carry their
 * own reading, and one description behind an (i) at a time (DEC-063).
 *
 * What this cannot see: the wood. Layout and CSS are outside the harness, so "the plaque
 * looks like timber" is a job for eyes, not for this file.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { mountEnvMetrics } from '../js/ui/envMetrics.js';

const HOUR = 3600 * 1000;

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** A weather response shaped like `services/weatherApi.js` returns. */
function sky({ temp = 20, temps, uv = 2 } = {}) {
  const pad = (value) => String(value).padStart(2, '0');
  const now = Date.now();
  const stamp = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  };
  const hours = 24;
  return {
    current: {
      temperature: temp, feelsLike: temp, humidity: 50, precipitation: 0,
      isDay: true, weatherCode: 0, windSpeed: 5, windDirection: 180,
    },
    hourly: {
      time: Array.from({ length: hours }, (_, i) => stamp(now - HOUR * (3 - i))),
      temperature: temps ?? Array(hours).fill(temp),
      humidity: Array(hours).fill(50),
      precipitationProbability: Array(hours).fill(0),
      weatherCode: Array(hours).fill(0),
      windSpeed: Array(hours).fill(5),
      windDirection: Array(hours).fill(180),
      uvIndex: Array(hours).fill(uv),
    },
  };
}

/** Mount the card and hand back what a test needs to poke at it. */
function mount(weather = sky()) {
  const state = { weather };
  const card = mountEnvMetrics(root, state, Date.now());
  return {
    card,
    info: () => root.querySelectorAll('.env__pill-info'),
    desc: () => root.querySelectorAll('.env__desc'),
  };
}

test('every meter carries its own (i), and no label text takes up the row', () => {
  const { info, desc } = mount();

  assert.equal(info().length, 3, 'one info button per meter');
  assert.equal(desc().length, 0, 'nothing is described until it is asked for');

  // The label texts (WATER / FROST / HEAT) are gone; only readings remain.
  assert.equal(root.querySelectorAll('.env__pill-label').length, 0, 'no label text on any row');
  const values = root.querySelectorAll('.env__pill-value').map((n) => n.textContent);
  assert.ok(values.length === 3, 'three readings are still on the card');
});

test('the (i) opens the reading and the sentence that explains the meter', () => {
  const { info, desc } = mount();

  info()[0].click();

  const strip = desc()[0];
  assert.ok(strip, 'the description is in the card');
  assert.match(strip.textContent, /nothing is coming in/, 'the live note is the first line');
  assert.match(strip.textContent, /pump is the only thing you control/, 'and the meter explains itself');
  assert.deepEqual(visibleText(root).filter((t) => t.includes('pump is the only')), [
    'How fast the field loses water each hour. Rain tops it up; the pump is the only thing you control.',
  ], 'the help line is what a player reads, not just a string in the tree');
});

test('the open button says so, and points at what it opened', () => {
  const { info, desc } = mount();

  assert.equal(info()[0].getAttribute('aria-expanded'), 'false');
  info()[0].click();

  const button = info()[0];
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(button.getAttribute('aria-controls'), desc()[0].id);
});

test('one at a time: opening the next meter closes the last', () => {
  const { info, desc } = mount();

  info()[0].click();
  info()[1].click();

  assert.equal(desc().length, 1, 'one description is open, not two');
  assert.equal(info()[1].getAttribute('aria-expanded'), 'true');
  assert.equal(info()[0].getAttribute('aria-expanded'), 'false');
});

test('the same (i) closes it again', () => {
  const { info, desc } = mount();

  info()[0].click();
  info()[0].click();

  assert.equal(desc().length, 0);
  assert.equal(info()[0].getAttribute('aria-expanded'), 'false');
});

test('Escape closes the description', async () => {
  const { info, desc } = mount();
  info()[0].click();

  await root.querySelector('.env').key('Escape');

  assert.equal(desc().length, 0);
});

test('a click outside the card closes the description', async () => {
  const { info, desc } = mount();
  info()[0].click();

  await document.dispatch('click', { target: root });

  assert.equal(desc().length, 0);
});

test('a weather refresh does not click the description shut', () => {
  const { card, info, desc } = mount();
  info()[0].click();

  card.refresh(Date.now());

  assert.equal(desc().length, 1, 'the player did not close it, so neither does the card');
  assert.equal(info()[0].getAttribute('aria-expanded'), 'true');
});

test('no forecast is still a card, and it says what it is waiting for', () => {
  mountEnvMetrics(root, { weather: null }, Date.now());

  assert.equal(root.querySelectorAll('.env__pill').length, 0);
  assert.match(root.querySelector('.env__empty').textContent, /Reading the sky/);
});
