/**
 * The almanac page, mounted.
 *
 * The page is static, so there is no store and no network to stub — it mounts
 * into the same fake DOM the seed picker uses. What this proves is the join
 * `AGENTS.md` warns about: that the numbers a player reads are the numbers in
 * `config/crops.js` and `config/cropWeatherMatrix.js`, and that the five crops
 * the shop sells are the five the almanac describes.
 *
 * What it cannot see: layout and CSS, same as every other UI test here.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { mountAlmanac } from '../js/ui/almanac.js';
import { harvestValue, shopCrops } from '../js/config/crops.js';
import { weatherRating } from '../js/config/cropWeatherMatrix.js';

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** Mount the page and return its crop cards. */
function mount() {
  mountAlmanac(root, { backHref: 'index.html' });
  return root.querySelectorAll('.almanac-card');
}

test('the almanac lists every crop the shop sells', () => {
  const cards = mount();
  assert.equal(cards.length, shopCrops().length);
  assert.equal(cards.length, 5);
});

test('the back link points where the entry script told it', () => {
  mountAlmanac(root, { backHref: 'index.html?guest=1' });
  assert.equal(root.querySelector('.almanac__back').getAttribute('href'), 'index.html?guest=1');
});

test('a crop card states its grow time and full-health harvest', () => {
  const [rice] = mount();
  const text = visibleText(rice).join(' ');

  assert.match(text, /6 hours/);
  assert.match(text, new RegExp(`${harvestValue('rice')} gold`));
});

test('every crop has a row for every weather event', () => {
  for (const card of mount()) {
    assert.equal(card.querySelectorAll('.almanac-weather__row').length, 9);
  }
});

test('high humidity has no crop opinion, so it reads fine', () => {
  const [rice] = mount();
  const humidity = Array.from(rice.querySelectorAll('.almanac-weather__row'))
    .find((row) => row.querySelector('.almanac-weather__event').textContent === 'High humidity');

  assert.ok(humidity, 'the almanac lists high humidity');
  assert.equal(humidity.querySelector('.almanac-weather__rating').textContent, 'fine');
});

test('the reaction words come from the weather matrix, not a copy', () => {
  const [rice] = mount();
  const frost = Array.from(rice.querySelectorAll('.almanac-weather__row'))
    .find((row) => row.querySelector('.almanac-weather__event').textContent === 'Frost');

  assert.ok(frost, 'the almanac lists frost');
  assert.equal(frost.querySelector('.almanac-weather__rating').textContent, 'harmed');
  assert.equal(weatherRating('rice', 'frost'), -2);
});

/**
 * The entry script, not just the view.
 *
 * `AGENTS.md` is blunt that a test which imports a module directly cannot catch a
 * bug in the entry point that wires it. This imports `js/almanac-main.js` for real,
 * so it proves the `#almanac-root` guard fires and the guest flag is forwarded —
 * the two things only the entry knows.
 */
test('the entry script mounts the page on #almanac-root and forwards guest mode', async () => {
  const mount = document.createElement('div');
  mount.id = 'almanac-root';
  root.append(mount);

  Object.defineProperty(globalThis, 'location', {
    value: { search: '?guest=1', href: 'http://localhost:5173/almanac.html' },
    configurable: true,
    writable: true,
  });

  await import('../js/almanac-main.js');

  assert.equal(mount.querySelector('.almanac__title').textContent, 'Crop Almanac');
  assert.equal(mount.querySelector('.almanac__back').getAttribute('href'), 'index.html?guest=1');
});
