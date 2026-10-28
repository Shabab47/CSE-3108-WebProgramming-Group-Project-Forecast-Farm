/**
 * Routing on the login page. `node --test tests/`
 *
 * The rule this file exists for: creating an account is not finished at the form.
 * Sign-up must reach the avatar step and carry the chosen preset out through
 * `onAuthenticated`, while signing in stays a straight trip to the farm.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom } from './helpers/fakeDom.js';
import { mountAuthViews } from '../js/ui/authViews.js';
import { AVATARS } from '../js/config/avatars.js';

const SESSION = {
  status: 'authed',
  userId: 'acc_new',
  email: 'new@farm.bd',
  farmerName: 'New Farmer',
  username: 'new_farmer',
};

const SIGN_UP = {
  farmerName: 'New Farmer',
  username: 'new_farmer',
  email: 'new@farm.bd',
  password: 'rice2026',
  confirmPassword: 'rice2026',
};

let root;
let calls;

beforeEach(() => {
  root = installDom();
  calls = { authenticated: [] };
});

afterEach(() => {
  uninstallDom();
});

function mount(overrides = {}, startView = 'signUp') {
  mountAuthViews(root, {
    startView,
    signIn: async () => ({ ok: true, session: SESSION }),
    signUp: async () => ({ ok: true, session: SESSION }),
    signOut: async () => ({ ok: true }),
    requestPasswordReset: async () => ({ ok: true }),
    updatePassword: async () => ({ ok: true }),
    recoveryToken: () => null,
    onAuthenticated: (session, options) => calls.authenticated.push({ session, options }),
    onGuest: () => {},
    ...overrides,
  });
}

function fill(values) {
  for (const input of root.querySelectorAll('input')) {
    const name = input.getAttribute('name');
    if (name && name in values) input.value = values[name];
  }
}

async function submit() {
  await root.querySelector('form').dispatch('submit');
}

const avatarOptions = () => root.querySelectorAll('.sign-avatar__option');
const start = () => root.querySelectorAll('button').find((button) => button.textContent === 'Start farming');

test('a successful sign-up lands on the avatar step, and the choice is handed over', async () => {
  mount();

  fill(SIGN_UP);
  await submit();

  assert.equal(root.querySelector('.sign__title')?.textContent, 'Choose your avatar');
  assert.equal(avatarOptions().length, AVATARS.length);
  assert.deepEqual(calls.authenticated, [], 'nothing is routed before the avatar is chosen');

  await avatarOptions()[1].click();
  await start().click();

  assert.equal(calls.authenticated.length, 1);
  assert.equal(calls.authenticated[0].session, SESSION);
  assert.deepEqual(calls.authenticated[0].options, { avatar: 'farmer2' });
});

test('a successful sign-in goes straight to the farm with no avatar option', async () => {
  mount({}, 'signIn');

  fill({ identifier: 'new@farm.bd', password: 'rice2026' });
  await submit();

  assert.equal(root.querySelector('.sign-avatar'), null);
  assert.equal(calls.authenticated.length, 1);
  assert.equal(calls.authenticated[0].session, SESSION);
  assert.equal(calls.authenticated[0].options, undefined);
});

test('sign-up without a session keeps the inbox notice and never shows the avatar step', async () => {
  mount({ signUp: async () => ({ ok: true, session: null }) });

  fill(SIGN_UP);
  await submit();

  assert.equal(root.querySelector('.sign__title')?.textContent, 'Sign in');
  assert.match(root.querySelector('.form-message--info')?.textContent ?? '', /check your inbox/i);
  assert.equal(root.querySelector('.sign-avatar'), null);
  assert.deepEqual(calls.authenticated, []);
});
