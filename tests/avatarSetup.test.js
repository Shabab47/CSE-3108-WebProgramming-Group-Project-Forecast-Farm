/**
 * The avatar step after sign-up. `node --test tests/`
 *
 * The screen has one job: guarantee that the id handed to the game is one of the
 * four presets. The provider and the store are covered elsewhere; this file checks
 * what the player sees and what the button reports.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { AVATARS } from '../js/config/avatars.js';
import { mountAvatarSetup } from '../js/ui/avatarSetup.js';

let root;
let choices;

beforeEach(() => {
  root = installDom();
  root.replaceChildren();
  choices = [];
});

afterEach(() => {
  uninstallDom();
});

function mount() {
  return mountAvatarSetup(root, {
    onConfirm: (avatar) => choices.push(avatar),
  });
}

const options = () => root.querySelectorAll('.sign-avatar__option');
const start = () => root.querySelectorAll('button').find((button) => button.textContent === 'Start farming');
const caption = () => root.querySelector('.sign-avatar__caption')?.textContent;

test('the avatar step is a sign with the four presets, Farmer 1 preselected', () => {
  mount();

  assert.equal(root.querySelector('.sign__title')?.textContent, 'Choose your avatar');
  assert.equal(options().length, AVATARS.length);
  assert.deepEqual(
    options().map((button) => button.getAttribute('aria-label')),
    AVATARS.map((preset) => preset.label),
  );

  assert.equal(options()[0].getAttribute('aria-pressed'), 'true');
  assert.equal(options()[0].focusCount, 1, 'the preselected option takes focus');
  assert.equal(options().slice(1).every((button) => button.getAttribute('aria-pressed') === 'false'), true);
  assert.equal(caption(), 'Farmer 1');

  const art = root.querySelector('.sign-avatar__art');
  assert.match(art?.innerHTML.trimStart() ?? '', /^<svg[\s>]/, 'the preview is the inline preset art');
});

test('choosing another preset repaints the preview and reports that id', async () => {
  mount();

  await options()[2].click();

  assert.equal(options()[2].getAttribute('aria-pressed'), 'true');
  assert.equal(options()[0].getAttribute('aria-pressed'), 'false');
  assert.equal(caption(), 'Farmer 3');
  assert.equal(options()[2].focusCount, 1, 'and the chosen option keeps focus');

  await start().click();
  assert.deepEqual(choices, ['farmer3']);
});

test('pressing Start without touching the picker reports the preselected preset', async () => {
  mount();

  await start().click();

  assert.deepEqual(choices, ['farmer1']);
});

test('the login page loads the stylesheet that paints the step', () => {
  const html = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="css\/avatar-setup\.css" \/>/);
});
