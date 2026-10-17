/**
 * The suggestion list, which is the part of the search bar that can actually go wrong quietly.
 *
 * Nothing here touches the network. `onSuggest` is injected, which is the whole reason the panel
 * takes places rather than calling `searchPlaces` itself — so these tests can make the service
 * answer late, answer wrongly, answer twice, or not answer at all, and assert on what the player
 * ends up looking at.
 *
 * **The assertions are on what is on screen, not on what was called.** "The list shows the row for
 * Ohio" survives a rewrite of the request. "The list called `searchPlaces` once" does not, and is
 * not what anyone would notice if it broke.
 *
 * The one thing these cannot check is layout: whether the list is actually visible, unclipped and
 * on top of the board is `css/weather.css`'s job and this harness has no CSS at all.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

import { mountLocationBar } from '../js/ui/locationBar.js';
import { SUGGEST_DEBOUNCE_MS, SUGGEST_MIN_QUERY } from '../js/config/api.js';
import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';

/** Longer than the debounce, so a pending timer has always fired by the time we look. */
const SETTLED = SUGGEST_DEBOUNCE_MS + 60;

const DHAKA = { name: 'Dhaka', context: 'Dhaka Division · Bangladesh', lat: 23.71, lon: 90.4, tz: 'Asia/Dhaka' };
const OHIO = { name: 'Dhaka', context: 'Ohio · United States', lat: 40.02, lon: -83.99, tz: 'America/New_York' };

/**
 * Mount the bar and hand back the pieces a test wants to poke.
 *
 * @param {{suggest?: (query: string, signal: AbortSignal) => any}} [options]
 */
function mount(options = {}) {
  const root = document.body;
  const calls = { searched: [], chosen: [], suggested: [], located: 0 };

  const bar = mountLocationBar(root, {
    onSearch: (query) => calls.searched.push(query),
    onChoose: (place) => calls.chosen.push(place),
    onSuggest: (query, signal) => {
      calls.suggested.push(query);
      return options.suggest ? options.suggest(query, signal) : [DHAKA, OHIO];
    },
    onUseDeviceLocation: () => { calls.located += 1; },
  });

  return {
    bar,
    calls,
    input: root.querySelector('#location-input'),
    form: root.querySelector('.location-bar'),
    list: root.querySelector('#location-suggest'),
    rows: () => root.querySelectorAll('.location-bar-suggest-item'),
    /** Press Enter on the search field. */
    submit: () => root.querySelector('.location-bar').dispatch('submit'),
  };
}

beforeEach(() => {
  installDom();
});

afterEach(() => {
  uninstallDom();
});

/* --- asking only when there is something worth asking about ---------------- */

test('one keystroke is not a question', async () => {
  const ui = mount();
  // One character matches most of the planet, and the list comes back with places the player
  // did not mean. The first letter is where "S" stops being a start and starts being a worse
  // answer than no answer.
  await ui.input.type('d');
  await sleep(SETTLED);

  assert.deepEqual(ui.calls.suggested, []);
  assert.equal(ui.list.hidden, true, 'nothing was asked, so nothing should be on screen');
});

test('a burst of keystrokes is one question, not one per letter', async () => {
  // The reason the debounce exists at all. Without it `d`, `dh`, `dha`, `dhak` are four live
  // requests racing to paint the list.
  const ui = mount();
  await ui.input.type('d');
  await ui.input.type('dh');
  await ui.input.type('dha');
  await ui.input.type('dhak');
  await ui.input.type('dhaka');

  await sleep(SETTLED);

  assert.deepEqual(ui.calls.suggested, ['dhaka']);
});

test('deleting back below the minimum closes the list and asks nothing', async () => {
  const ui = mount();
  await ui.input.type('dh');
  await sleep(SETTLED);
  assert.equal(ui.list.hidden, false);

  await ui.input.type('d');
  await sleep(SETTLED);

  assert.deepEqual(ui.calls.suggested, ['dh']);
  assert.equal(ui.list.hidden, true);
});

/* --- what the list shows ---------------------------------------------------- */

test('each row carries the context that tells same-named places apart', async () => {
  // The whole reason a list beats a best guess. Six rows all labelled "Dhaka" would be worse
  // than no list, because the only thing distinguishing them would be invisible.
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  assert.deepEqual(ui.rows().map((row) => row.textContent), [
    'DhakaDhaka Division · Bangladesh',
    'DhakaOhio · United States',
  ]);
  assert.deepEqual(visibleText(ui.list), [
    'Dhaka',
    'Dhaka Division · Bangladesh',
    'Dhaka',
    'Ohio · United States',
  ]);
});

test('the field announces itself as a combobox and says whether it is open', async () => {
  const ui = mount();
  assert.equal(ui.input.getAttribute('role'), 'combobox');
  assert.equal(ui.input.getAttribute('aria-expanded'), 'false');
  assert.equal(ui.input.getAttribute('aria-autocomplete'), 'list');

  await ui.input.type('dhaka');
  await sleep(SETTLED);

  assert.equal(ui.input.getAttribute('aria-expanded'), 'true');
  assert.equal(ui.list.getAttribute('role'), 'listbox');
  for (const row of ui.rows()) assert.equal(row.getAttribute('role'), 'option');
});

test('no matches says so, because silence reads as a service that is down', async () => {
  const ui = mount({ suggest: () => [] });
  await ui.input.type('zzzz');
  await sleep(SETTLED);

  assert.deepEqual(visibleText(ui.list), ['No places found']);
  assert.equal(ui.list.hidden, false);
});

test('a failed lookup leaves the bar working instead of throwing at the player', async () => {
  const ui = mount({ suggest: () => { throw new Error('offline'); } });

  await ui.input.type('dhaka');
  await sleep(SETTLED);

  assert.deepEqual(ui.rows(), []);
  assert.equal(ui.list.hidden, true);

  // And the plain search still works, which is the point of keeping it.
  await ui.input.type('Dhaka');
  await ui.submit();
  assert.deepEqual(ui.calls.searched, ['Dhaka']);
});

/* --- the race the debounce and the signal exist to prevent ------------------ */

test('a slow answer for an old query never overwrites the new one', async () => {
  // The failure this prevents is not "wrong data" but data from the wrong moment: `dh` answers
  // after `dhak` has, and the list flickers back through the previous question's results.
  let releaseDh;
  const dhAnswered = new Promise((resolve) => { releaseDh = resolve; });

  const ui = mount({
    suggest: (query) => (query === 'dh' ? dhAnswered : Promise.resolve([DHAKA])),
  });

  await ui.input.type('dh');
  await sleep(SETTLED); // the request for "dh" is now in flight

  await ui.input.type('dhaka');
  releaseDh([OHIO]); // the stale answer lands, after the newer question was asked
  await sleep(SETTLED);

  assert.deepEqual(ui.rows().map((row) => row.textContent), ['DhakaDhaka Division · Bangladesh']);
});

/* --- choosing --------------------------------------------------------------- */

test('picking a row moves the farm to *that* row, not to the best match', async () => {
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  await ui.rows()[1].click();

  assert.deepEqual(ui.calls.chosen, [OHIO]);
  assert.deepEqual(ui.calls.searched, [], 'the row was an answer, not a new question');
  assert.equal(ui.list.hidden, true, 'the list closes behind the answer');
  assert.equal(ui.input.value, '', 'the question is answered, so the field is cleared');
});

test('the keyboard moves the highlight and wraps around the ends', async () => {
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  await ui.input.key('ArrowDown');
  assert.match(ui.input.getAttribute('aria-activedescendant'), /-0$/);
  assert.equal(ui.rows()[0].classList.contains('is-active'), true);

  await ui.input.key('ArrowDown');
  await ui.input.key('ArrowDown');
  assert.match(ui.input.getAttribute('aria-activedescendant'), /-0$/, 'past the end, back to the first');

  await ui.input.key('ArrowUp');
  assert.match(ui.input.getAttribute('aria-activedescendant'), /-1$/, 'past the start, back to the last');
});

test('Enter takes the highlighted row and does not also submit the form', async () => {
  // Both, if it fell through, would mean two location changes from one keypress — and the
  // submitted one is a *fresh* query, so the farm could land somewhere else entirely.
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  await ui.input.key('ArrowDown');
  await ui.input.key('ArrowDown');
  const event = await ui.input.key('Enter');

  assert.deepEqual(ui.calls.chosen, [OHIO]);
  assert.deepEqual(ui.calls.searched, []);
  assert.equal(event.defaultPrevented, true, 'the form submit must be swallowed');
});

test('Enter with nothing highlighted searches for what was typed', async () => {
  // The path a player takes who never opened the list, and the one that has to keep working on
  // a slow connection. Arrow keys are a shortcut, not a toll gate.
  const ui = mount();
  await ui.input.type('Dhaka');
  await ui.submit();

  assert.deepEqual(ui.calls.searched, ['Dhaka']);
  assert.deepEqual(ui.calls.chosen, []);
});

test('the arrow keys are not swallowed while the list is closed', async () => {
  // A `preventDefault` on every arrow key would break caret movement in the field for a player
  // who is not using the list at all.
  const ui = mount();
  const down = await ui.input.key('ArrowDown');
  const escape = await ui.input.key('Escape');

  assert.equal(down.defaultPrevented, false);
  // Escape is only swallowed when it closed something, so it still reaches a dialog above.
  assert.equal(escape.defaultPrevented, false);
});

test('Escape closes the list, and only swallows the key when it did something', async () => {
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  const closing = await ui.input.key('Escape');
  assert.equal(ui.list.hidden, true);
  assert.equal(closing.defaultPrevented, true);

  const idle = await ui.input.key('Escape');
  assert.equal(idle.defaultPrevented, false, 'nothing left to close, so the page keeps its Escape');
});

test('clicking away drops the list but keeps the typed text', async () => {
  // Closing the list is not a decision about what was typed — that text is still a valid
  // question, and throwing it away would make the next submit silently search for nothing.
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  await ui.input.dispatch('blur');

  assert.equal(ui.list.hidden, true);
  assert.equal(ui.input.value, 'dhaka');
});

test('pressing a row cannot take focus away from the field', async () => {
  // The bug this prevents is invisible on a desktop and fatal on a phone. `mousedown` is what
  // moves focus, and losing focus closes the list — so the row is removed a fraction of a
  // millisecond before the `click` that chose it arrives, and the tap does nothing. Cancelling
  // the default stops the focus change instead.
  //
  // `mousedown` rather than `pointerdown` deliberately: a tap on a touch screen produces a
  // compatibility `mousedown` too, so this one handler covers mouse, pen and finger. Deferring
  // the close instead would work until someone pressed a row and held for a moment.
  const ui = mount();
  await ui.input.type('dhaka');
  await sleep(SETTLED);

  const press = await ui.list.dispatch('mousedown');

  assert.equal(press.defaultPrevented, true, 'focus must not move, or the row is gone before it is clicked');
  assert.equal(ui.list.hidden, false, 'the list is still open for the click that follows');
});

/* --- the controls that were already here ------------------------------------ */

test('the pin still asks for the device location', async () => {
  const ui = mount();
  const pin = document.body.querySelector('.location-bar-locate');

  await pin.click();

  assert.equal(ui.calls.located, 1);
});

test('an empty search does nothing at all', async () => {
  const ui = mount();
  await ui.input.type('   ');
  await ui.submit();

  assert.deepEqual(ui.calls.searched, []);
});
