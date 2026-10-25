/**
 * The navbar's profile tile.
 *
 * The tile is the one place the chosen avatar follows the player out of the profile
 * page, so the assertions are about which face it paints and where it still goes.
 * `navbar.js` imports its href helpers from `main.js`, which asks `document` for
 * `#top-bar` at import time; the module is therefore loaded after the fake DOM is
 * installed, not with a static import.
 */

import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';

const SESSION = { status: 'authed', farmerName: 'JM' };

let root;
let mountNavbar;

before(async () => {
  root = installDom();
  ({ mountNavbar } = await import('../js/ui/navbar.js'));
});

beforeEach(() => {
  root.replaceChildren();
});

after(() => {
  uninstallDom();
});

/** Mount the bar and return the profile tile, which is always a link. */
function mount(overrides = {}) {
  mountNavbar(root, { session: SESSION, ...overrides });
  const link = root.querySelector('.navbar__tile--avatar');
  assert.ok(link, 'the profile tile is missing');
  return link;
}

test('with no chosen avatar the tile shows the same gray person as the profile page', () => {
  const link = mount();

  assert.equal(link.getAttribute('href'), 'profile.html');
  assert.equal(link.getAttribute('aria-label'), 'Your profile');
  assert.ok(link.classList.contains('navbar__tile--default'), 'the default face needs its neutral style');
  assert.ok(link.querySelector('.navbar__avatar-default'), 'the gray person is missing');
  assert.equal(link.querySelector('.navbar__avatar-art'), null, 'the default is not preset art');
});

test('a chosen preset replaces the gray person with its artwork', () => {
  const link = mount({ avatar: 'farmer4' });

  assert.ok(link.querySelector('.navbar__avatar-art'), 'the preset artwork is missing');
  assert.equal(link.querySelector('.navbar__avatar-default'), null, 'the gray person should be gone');
  assert.equal(link.classList.contains('navbar__tile--default'), false, 'preset art is not the default tile');
  assert.equal(link.getAttribute('href'), 'profile.html');
});

test('an unknown avatar id falls back to the gray person', () => {
  const link = mount({ avatar: 'farmer9' });

  assert.ok(link.querySelector('.navbar__avatar-default'));
  assert.equal(link.querySelector('.navbar__avatar-art'), null);
});

test('a guest still reaches the guest profile page', () => {
  const link = mount({ session: { status: 'guest' }, avatar: 'farmer1' });

  assert.equal(link.getAttribute('href'), 'profile.html?guest=1');
  assert.ok(link.querySelector('.navbar__avatar-art'));
});

test('the sound and settings tiles are unchanged', () => {
  mount();

  const sound = root.querySelectorAll('.navbar__tile').find((tile) => tile.getAttribute('title') === 'Sound — coming soon');
  assert.ok(sound, 'the decorative sound tile is missing');
  assert.equal(sound.getAttribute('aria-hidden'), 'true');

  const settings = root.querySelectorAll('a').find((link) => link.getAttribute('aria-label') === 'Settings');
  assert.ok(settings, 'the settings tile is missing');
  assert.equal(settings.getAttribute('href'), 'settings.html');
  assert.ok(settings.querySelector('.navbar__tile-icon'), 'the settings icon is missing');
});

test('the report tile is a button on the right that opens its dialog', async () => {
  mount();

  const report = root.querySelector('.navbar__tile--report');
  assert.ok(report, 'the report tile is missing');
  assert.equal(report.tagName, 'BUTTON');
  assert.equal(report.getAttribute('aria-label'), 'Report a bug');
  assert.equal(report.getAttribute('aria-haspopup'), 'dialog');
  assert.ok(report.querySelector('.navbar__tile-icon'), 'the bug icon is missing');

  const dialog = root.querySelector('.report-bug');
  assert.ok(dialog, 'the report dialog was never mounted');
  assert.equal(dialog.hidden, true, 'the dialog starts out of the way');

  await report.click();

  assert.equal(dialog.hidden, false, 'the button did not open the dialog');
  assert.equal(root.querySelector('.report-bug__message').focusCount, 1, 'the message field should take focus');
});
