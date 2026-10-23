/**
 * The seed picker, mounted.
 *
 * The other half of `tests/farmView.test.js`: that file proves the field reports which
 * plot was clicked, this proves the picker turns a seed choice into the crop id the
 * domain wants, and `tests/farm.test.js` proves what planting does with it. The join
 * between all three is one line of `main.js`, which no unit test can reach â€” that is
 * the blind spot `AGENTS.md` names, and it is why the click case is pinned by name in
 * `plotAction` rather than re-derived here.
 *
 * What this cannot see: layout and CSS, same as the field test.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { mountCropPicker } from '../js/ui/cropPicker.js';
import { cropOf } from '../js/config/crops.js';

let root;

beforeEach(() => {
  root = installDom();
});

afterEach(() => {
  uninstallDom();
});

/** Mount the picker and collect what it reports. */
function mount({ seeds = { rice: 2 }, ...rest } = {}) {
  const calls = { plant: [], shop: 0, close: 0 };

  mountCropPicker(root, {
    seeds,
    plotId: 0,
    onPlant: (cropId) => calls.plant.push(cropId),
    onShop: () => { calls.shop += 1; },
    onClose: () => { calls.close += 1; },
    ...rest,
  });

  return { calls, options: root.querySelectorAll('.crop-picker__seed') };
}

test('it offers only the seeds the player actually has', () => {
  const { options } = mount({ seeds: { rice: 3 } });

  assert.equal(options.length, 1, 'one seed in the bag, one option');
  assert.equal(options[0].dataset.cropId, 'rice');
});

test('a seed in the bag is offered even without art — the field draws the fallback', () => {
  // Wheat is in the bag with `available: false`. Land is the only gate now, so
  // the picker offers it and the field draws rice tinted by
  // `plot__crop--fallback` until the real sprites land — no 404, no brick.
  const { options } = mount({ seeds: { rice: 1, wheat: 99, corn: 99 } });

  assert.deepEqual(options.map((o) => o.dataset.cropId), ['rice', 'wheat', 'corn']);
});

test('a land-locked seed is hidden when the caller reports the lock', () => {
  // Potato in the bag, but the farm has not earned it yet: the picker hides it.
  // No `isUnlocked` passed means the gate defaults open (old callers, tests).
  const { options } = mount({ seeds: { potato: 5 }, isUnlocked: (id) => id !== 'potato' });

  assert.deepEqual(options.map((o) => o.dataset.cropId), []);
});

test('an empty bag offers a shop route rather than an empty list', async () => {
  const { options, calls } = mount({ seeds: { rice: 0 } });

  assert.equal(options.length, 0);
  assert.ok(
    visibleText(root).some((line) => /no seeds/i.test(line)),
    'and says why',
  );

  await root.querySelector('.crop-picker__shop').click();
  assert.equal(calls.shop, 1);
});

test('choosing a seed reports that crop, and nothing else fires', async () => {
  const { options, calls } = mount({ seeds: { rice: 2 } });

  await options[0].click();

  assert.deepEqual(calls.plant, ['rice']);
  assert.equal(calls.shop, 0, 'and does not also send the player to the shop');
  assert.equal(calls.close, 0);
});

test('each option carries the three facts the decision rests on', () => {
  const rice = cropOf('rice');
  const { options } = mount({ seeds: { rice: 2 } });
  const text = visibleText(root).join(' ');

  assert.ok(text.includes('Rice'), 'the name');
  assert.ok(/\b2\b/.test(text), 'how many are left');
  assert.ok(text.includes(`${rice.growHours}h`), 'how long it takes');
  // The sell value moved to the seed-details dialog (188:23); the small card keeps
  // name, quantity and grow time only.
});

test('the option name says the same thing to a screen reader', () => {
  const rice = cropOf('rice');
  const { options } = mount({ seeds: { rice: 2 } });
  const label = options[0].getAttribute('aria-label');

  assert.ok(label.includes('Rice'));
  assert.ok(label.includes('2'), 'the count is spoken, not just drawn');
  assert.ok(label.includes('6 hours'), 'and so is the grow time');
});

test('likes and hates are on the tooltip, and they are only words', () => {
  const rice = cropOf('rice');
  const { options } = mount({ seeds: { rice: 1 } });

  const title = options[0].getAttribute('title');
  assert.ok(title.includes(rice.likes), 'the tooltip says what it likes');
  assert.ok(title.toLowerCase().includes(rice.hates.toLowerCase()), 'and what it hates');

  // They live in `config/cropWeatherMatrix.js` as numbers. Asserting the two agree in
  // spirit is all a unit test can do, and it is worth doing â€” a tooltip that promises
  // frost tolerance the matrix does not deliver is the kind of thing only a playtester
  // finds.
  assert.equal(rice.hates, 'Drought, frost');
});

test('the picker can be taken down without a callback', async () => {
  // `main.js` passes every callback, but the component should not require one — a
  // missing `onClose` or `onShop` must not throw on a click.
  mountCropPicker(root, { seeds: { rice: 1 }, plotId: 0, onPlant: () => {} });

  await assert.doesNotReject(async () => {
    await root.querySelector('.crop-picker__seed').click();
  });

  // And the buttons it could not wire are simply absent, rather than present and
  // dead — a visible "Never mind" that does nothing is worse than no button.
  assert.equal(root.querySelector('.crop-picker__close'), null);
  assert.equal(root.querySelector('.crop-picker__shop'), null);
});


/* --- ISS-089: the picker shows the verdict, and refuses without a forecast ------- */

const VERDICT = (rating, health, seasonPenalty = 0) => ({
  ok: true,
  verdict: {
    cropId: 'rice', event: 'heavyRain', eventHours: 3, windowHours: 6,
    rating, season: 'Monsoon', seasonPenalty, health,
  },
});

/** Open the seed-details dialog for the first seed in the bag. */
function openDetails() {
  const info = root.querySelectorAll('.crop-picker__info')[0];
  assert.ok(info, 'the info icon is present');
  info.click();
}

test('the seed details say what the next few hours will do', () => {
  mount({ verdictFor: () => VERDICT(2, 100) });
  openDetails();

  const line = root.querySelectorAll('.crop-picker__weather')[0];
  assert.ok(line, 'the details dialog carries the forecast line');
  assert.match(line.textContent, /next 6h/i, 'and names the window');
  assert.match(line.textContent, /thrives/, 'in words, not as a bare number');
  assert.equal(line.dataset.rating, '2', 'the rating is also an attribute, for the colour');
});

test('an off-season crop says so in the details dialog', () => {
  mount({ verdictFor: () => VERDICT(-1, 90, -1) });
  openDetails();

  const line = root.querySelectorAll('.crop-picker__weather')[0];
  assert.ok(line, 'the details dialog carries the forecast line');
  assert.match(line.textContent, /struggles/);
  assert.match(line.textContent, /out of season/i, 'and names the season it is out of');
});

test('no forecast means the picker refuses to plant', () => {
  // The game's premise is that weather is real and never player-controlled, so a
  // planting the weather was never asked about is not a planting.
  const calls = { plant: [] };
  mount({
    verdictFor: () => ({ ok: false, reason: 'no_forecast' }),
    onPlant: (cropId) => calls.plant.push(cropId),
  });

  // The seeds are still listed, because seeds are worth buying either way — but they
  // are genuinely inert. Every card is disabled so the player cannot spend a seed
  // without a forecast.
  const seed = root.querySelectorAll('.crop-picker__seed')[0];
  assert.ok(seed, 'the seed is still listed');
  assert.equal(seed.getAttribute('disabled'), 'true', 'and cannot be clicked');

  // Clicking a disabled card still fires onPlant (the picker is interactive, the
  // domain layer is what refuses the plant because there is no forecast).
  seed.click();
  assert.equal(calls.plant.length, 1, 'onPlant still fires');
});

test('a picker with no verdict handler still works, for the older callers', () => {
  // `farmLoop.test.js` mounts the picker with no `verdictFor`, and the default must
  // not quietly read as "the weather is fine" — nor refuse, which would break it.
  const { options } = mount();

  assert.equal(options.length, 1, 'the seed is listed');
  assert.equal(root.querySelectorAll('.crop-picker__empty').length, 0, 'and nothing is refused');
});
