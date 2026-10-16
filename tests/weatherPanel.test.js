/**
 * Tests for the big sticky note on the weather board — `js/ui/weatherPanel.js`.
 *
 * The board is drawn in CSS, so nothing here can assert a pixel. What it can pin
 * down is the note's *content*, which is where the reports have actually come
 * from: the farm's place name was squeezed into one ellipsised line above the
 * condition while the right half of the paper sat empty at every width (ISS-062),
 * and a farm with no location printed nothing at all — an empty span, invisible
 * on the page and silent in the console (ISS-063).
 *
 * The fake DOM is the one `tests/connectionStatus.test.js` and
 * `tests/loadingTips.test.js` use, kept deliberately identical: a second, subtly
 * different fake would drift from `el()`'s real contract and quietly stop testing
 * anything.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mountWeatherPanel } from '../js/ui/weatherPanel.js';

/* --- a minimal DOM --------------------------------------------------------- */

class FakeNode {}

class FakeElement extends FakeNode {
  constructor(tag) {
    super();
    this.tag = String(tag).toLowerCase();
    this.className = '';
    this.textContent = '';
    this.dataset = {};
    this.children = [];
    this.attributes = {};
    this.listeners = {};
  }

  append(...kids) {
    for (const kid of kids) this.children.push(kid);
  }

  /** `clear()` in `utils/dom.js` calls this, so a mount can empty a root. */
  replaceChildren(...kids) {
    this.children = kids;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(event, handler) {
    (this.listeners[event] ??= []).push(handler);
  }

  remove() {}
}

globalThis.Node = FakeNode;
globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => ({ textContent: String(text) }),
};

/* --- the note under test --------------------------------------------------- */

const DHAKA = { name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41, tz: 'Asia/Dhaka' };

/** A live reading, in the shape `weatherApi.js` hands back. */
function reading(overrides = {}) {
  return {
    fetchedAt: Date.UTC(2026, 9, 16, 12, 5),
    current: {
      temperature: 24,
      feelsLike: 26,
      humidity: 60,
      precipitation: 0,
      isDay: true,
      weatherCode: 1,
      windSpeed: 9,
      windDirection: 180,
      time: '2026-10-16T18:05',
    },
    hourly: {
      time: ['2026-10-16T18:00'],
      temperature: [24],
      weatherCode: [1],
      precipitationProbability: [10],
    },
    ...overrides,
  };
}

/** Every element carrying `className` as a whole class, depth first. */
function findAll(root, className) {
  const found = [];

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (String(node.className ?? '').split(/\s+/).includes(className)) found.push(node);
    for (const kid of node.children ?? []) walk(kid);
  };

  walk(root);
  return found;
}

/** Whether `target` is `root` or sits anywhere under it. */
function inTree(root, target) {
  if (root === target) return true;
  for (const kid of root.children ?? []) {
    if (kid && typeof kid === 'object' && inTree(kid, target)) return true;
  }
  return false;
}

/** Mount the panel into a fresh fake root, at a fixed clock so nothing ages. */
function mount(state) {
  const root = new FakeElement('div');
  mountWeatherPanel(root, state, () => 0);
  return root;
}

function placeLine(state) {
  const [line] = findAll(mount(state), 'note-loc');
  return line?.textContent;
}

/* --- the place line -------------------------------------------------------- */

test('the note names the farm place, town then country', () => {
  assert.equal(placeLine({ location: DHAKA, weather: reading() }), 'Dhaka, Bangladesh');
});

test('a place with no town still prints the country', () => {
  assert.equal(placeLine({ location: { country: 'Bangladesh' }, weather: reading() }), 'Bangladesh');
});

test('the place line is never empty', () => {
  // The bug this guards was invisible: an empty `<span>` renders as nothing, so a
  // farm with no location simply had no place on its board and no error anywhere.
  const cases = [
    ['no location at all', undefined],
    ['an empty location', {}],
    ['blank fields', { name: '', country: '' }],
    ['null fields', { name: null, country: null }],
  ];

  for (const [what, location] of cases) {
    assert.equal(placeLine({ location, weather: reading() }), 'Unknown location', what);
  }
});

test('the place line belongs to the big sticky note', () => {
  // DEC-033 moved it into the note's right-hand column. A place printed anywhere
  // else on the board — the search bar, say — would still pass the tests above.
  const root = mount({ location: DHAKA, weather: reading() });
  const [line] = findAll(root, 'note-loc');
  const [note] = findAll(root, 'note-current');

  assert.ok(line, 'the note must carry a place line');
  assert.ok(note, 'the big note must exist');
  assert.ok(inTree(note, line), 'the place line belongs to the big note');
});

test('a paused forecast adds its line without taking the place away', () => {
  const root = mount({ location: DHAKA, weather: reading(), sync: 'pending' });

  assert.equal(findAll(root, 'note-loc')[0].textContent, 'Dhaka, Bangladesh');
  assert.equal(findAll(root, 'note-status').length, 1, 'the paused line renders inside the note');
});
