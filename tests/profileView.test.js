/**
 * The profile page, rendered for real.
 *
 * Mirrors `tests/settingsDom.test.js`: assert on what a player can read, on which
 * card says it, and that every class the page renders is styled by a stylesheet the
 * page actually loads.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

import { closestWith, installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { el } from '../js/utils/dom.js';
import { mountProfile } from '../js/ui/profileView.js';

const SESSION = {
  status: 'authed',
  farmerName: 'JM',
  username: 'aaj6000',
  email: 'abdullahalhaijm2@gmail.com',
};

/** Find the card whose heading names it, so assertions say which card said what. */
function cardTitled(root, title) {
  const heading = root.querySelectorAll('span').find((n) => n.textContent === title);
  assert.ok(heading, `no card titled "${title}"`);
  const card = closestWith(heading, 'card');
  assert.ok(card, `the "${title}" heading is not inside a card`);
  return card;
}

/** Click a button by its exact label. */
function button(root, label) {
  const found = root.querySelectorAll('button').find((b) => b.textContent === label);
  assert.ok(found, `no button labelled "${label}". Present: ${root.querySelectorAll('button').map((b) => b.textContent).join(' | ')}`);
  return found;
}

function mountProfilePage(overrides = {}) {
  const root = installDom();
  let signedOut = false;

  const actions = {
    session: SESSION,
    onSignOut: () => { signedOut = true; },
    toast: () => {},
    backHref: 'index.html',
    ...overrides,
  };

  mountProfile(root, actions);
  return { root, actions, signedOut: () => signedOut };
}

beforeEach(() => {
  globalThis.location = { replace: (url) => { globalThis.__navigatedTo = url; } };
});

afterEach(() => {
  uninstallDom();
  delete globalThis.location;
  delete globalThis.__navigatedTo;
});

/* --- the frame ------------------------------------------------------------ */

test('both cards sit on the scrolling board inside the painted frame', () => {
  const { root } = mountProfilePage();

  assert.ok(root.querySelector('.page-frame'), 'the painted frame is missing');
  assert.equal(
    root.querySelector('.page-frame__base'),
    null,
    'the account frame should stop at the wall, with no stone base for the board to scroll behind',
  );

  const sign = root.querySelector('.page-sign');
  assert.ok(sign, 'the hanging sign is missing');
  assert.equal(sign.textContent.trim(), 'Profile');

  const board = root.querySelector('.page-board');
  assert.ok(board, 'the scrolling board is missing');

  const cards = root.querySelectorAll('.card');
  assert.equal(cards.length, 2, `expected two cards, found ${cards.length}`);
  for (const card of cards) {
    assert.ok(board.contains(card), 'a profile card sits outside the board, so it cannot scroll with it');
  }
});

/* --- account -------------------------------------------------------------- */

test('the account card lists the signed-in details', () => {
  const { root } = mountProfilePage();
  const card = cardTitled(root, 'Account');
  const text = visibleText(card).join(' ');

  assert.match(text, /JM/, 'farmer name');
  assert.match(text, /aaj6000/, 'username');
  assert.match(text, /abdullahalhaijm2@gmail\.com/, 'email');
  assert.match(text, /These are the details you signed up with/, 'sign-up hint');
});

test('the account card shows the avatar initials', () => {
  const { root } = mountProfilePage();
  const card = cardTitled(root, 'Account');
  const avatar = card.querySelector('.profile-avatar');
  assert.ok(avatar, 'no avatar badge');
  assert.equal(avatar.textContent, 'JM', 'initials from the farmer name');
});

test('a guest sees no account rows and the guest hint instead', () => {
  const { root } = mountProfilePage({ session: { status: 'guest' } });
  const card = cardTitled(root, 'Account');
  const text = visibleText(card).join(' ');

  assert.equal(text.match(/Farmer:/g)?.length ?? 0, 0, 'no farmer row for a guest');
  assert.equal(text.match(/Username:/g)?.length ?? 0, 0, 'no username row for a guest');
  assert.equal(text.match(/Email:/g)?.length ?? 0, 0, 'no email row for a guest');
  assert.match(text, /guest/, 'the guest hint');
});

test('the session card says the player is signed in and signs them out', () => {
  const { root, signedOut } = mountProfilePage();
  const card = cardTitled(root, 'Session');
  const text = visibleText(card).join(' ');

  assert.match(text, /You are signed in\./);
  assert.ok(button(root, 'Sign out'), 'the sign-out button');

  button(root, 'Sign out').click();
  assert.equal(signedOut(), true, 'sign-out was called');
});

test('a guest session offers to leave the guest farm', () => {
  const { root, signedOut } = mountProfilePage({ session: { status: 'guest' } });
  const card = cardTitled(root, 'Session');
  const text = visibleText(card).join(' ');

  assert.match(text, /playing as a guest/);
  assert.ok(button(root, 'Leave guest farm'));
  button(root, 'Leave guest farm').click();
  assert.equal(signedOut(), true);
});

/* --- navigation ----------------------------------------------------------- */

test('the back link returns to the farm', () => {
  const { root } = mountProfilePage();
  const back = root.querySelector('.page-back');
  assert.ok(back, 'no back-to-farm pill');
  assert.equal(back.getAttribute('href'), 'index.html');
  assert.match(back.textContent, /Back to farm/);
});

/* --- the styling this page actually loads --------------------------------- */

test('every styled class the profile page renders is styled by a file it loads', () => {
  const cssDir = new URL('../css/', import.meta.url);
  const read = (name) => readFileSync(new URL(name, cssDir), 'utf8');

  const html = readFileSync(new URL('../profile.html', import.meta.url), 'utf8');
  const linked = [...html.matchAll(/href="css\/([\w-]+\.css)"/g)].map((m) => m[1]);

  assert.ok(linked.includes('components.css'), 'the page loads the shared component styles');
  assert.ok(linked.includes('page-frame.css'), 'precondition: the page loads page-frame.css');
  assert.ok(linked.includes('page-card.css'), 'precondition: the page loads page-card.css');

  const here = linked.map(read).join('\n');
  const everywhere = readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .map(read)
    .join('\n');

  const root = installDom();
  mountProfilePage();
  const authedClasses = new Set();
  for (const node of root.descendants()) {
    for (const name of node.classList._names) authedClasses.add(name);
  }

  const guestRoot = installDom();
  mountProfilePage({ session: { status: 'guest' } });
  const guestClasses = new Set();
  for (const node of guestRoot.descendants()) {
    for (const name of node.classList._names) guestClasses.add(name);
  }

  const misplaced = new Set();
  for (const name of [...authedClasses, ...guestClasses]) {
    const pattern = new RegExp(`\\.${name}(?![\\w-])`);
    if (pattern.test(everywhere) && !pattern.test(here)) misplaced.add(name);
  }

  assert.deepEqual(
    [...misplaced],
    [],
    `styled, but not by a stylesheet this page loads: ${[...misplaced].join(', ')}`,
  );
});
