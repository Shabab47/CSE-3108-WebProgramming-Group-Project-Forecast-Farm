/**
 * The settings page, rendered for real.
 *
 * `AGENTS.md` records the suite's blind spot and its own blind spot: it has no DOM, and
 * the two headless smoke tests that do exist live outside the repo. This is that test,
 * moved inside it.
 *
 * It exists because of a specific bug. The page had **one** status node, rendered inside
 * the *erase progress* card. So when the account action ran, every sentence it said —
 * "Checking your password.", "That password is not right", and the deletion-failure
 * explanations — appeared in the wrong card, above a button the player had not clicked.
 * Nothing in the unit tests could see it, because the panel was never mounted.
 *
 * So: assert on what a player can *read*, and on *which card* says it.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

import { closestWith, installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { appendAll, el } from '../js/utils/dom.js';
import { mountSettings } from '../js/ui/settingsView.js';

const SESSION = {
  status: 'authed',
  farmerName: 'Abdul Karim',
  username: 'farmer_joe',
  email: 'farmer@rice.bd',
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

function passwordField(root, id) {
  const input = root.querySelector(`#${id}`);
  assert.ok(input, `no password field #${id}`);
  return input;
}

/**
 * The Save data card's callbacks.
 *
 * Every call site needs these. The card is rendered unconditionally (ISS-051) and
 * `savePanel.js` calls `actions.canExport()` at mount time — before the player has
 * touched anything — so a mount without them throws rather than merely rendering an empty
 * card. That is a deliberate change from the old gating, where a missing `canExport`
 * silently skipped the whole card and the tests never exercised a line of it.
 */
function saveActions(overrides = {}) {
  return {
    canExport: () => true,
    now: () => 1_700_000_000_000,
    exportPayload: () => ({ ok: true, text: 'FFARM/1\n{}', filename: 'forecast-farm.farm' }),
    readImport: () => ({ ok: false, reason: 'file_not_a_save' }),
    adoptState: () => ({ ok: false, reason: 'store_not_initialised' }),
    ...overrides,
  };
}

/**
 * Mount the page, run one destructive action, and report what was visible while the
 * request was in flight.
 *
 * `duringWork` is snapshotted **synchronously** when the action calls its work function,
 * which is the moment "Checking your password." is on screen — before the promise
 * settles. Awaiting the click is therefore safe: there is nothing to release.
 *
 * The per-card snapshot matters. A failure replaces the info message with its own
 * sentence, so re-reading the tree after the click has settled shows the *ending*, not
 * the window being tested — which is how this test first failed against a correct fix.
 *
 * @param {object} options
 * @param {(password: string) => Promise<{ok:boolean, reason?:string}>} options.work
 * @param {string} options.trigger the arming button's label
 * @param {string} options.confirm the confirming button's label
 * @param {string} options.fieldId the password input's id
 * @param {string} options.password what to type
 */
async function runAction({ work, trigger, confirm, fieldId, password = 'rice2026' }) {
  const root = installDom();

  /** Snapshot of every dangerous card's own text, keyed by its heading. */
  let duringWork = null;

  const snapshotCards = () => {
    const cards = {};
    for (const heading of root.querySelectorAll('span')) {
      const title = heading.textContent;
      if (title !== 'Erase progress' && title !== 'Delete account') continue;
      const card = closestWith(heading, 'card');
      if (card) cards[title] = card.textContent;
    }
    return cards;
  };

  const watch = async (pwd) => {
    duringWork = { text: visibleText(root), cards: snapshotCards(), root };
    return work(pwd);
  };

  mountSettings(root, {
    session: SESSION,
    deleteProgress: watch,
    requestAccountDeletion: watch,
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, trigger).click();
  passwordField(root, fieldId).value = password;
  await button(root, confirm).click();

  return { root, duringWork, after: visibleText(root) };
}

beforeEach(() => {
  // `location.replace` is called when the account action succeeds. The page is not
  // really navigating in a test, so stub it and note that it happened.
  globalThis.location = { replace: (url) => { globalThis.__navigatedTo = url; } };
});

afterEach(() => {
  uninstallDom();
  delete globalThis.location;
  delete globalThis.__navigatedTo;
});

/* --- difficulty ---------------------------------------------------------- */

/**
 * Mount the settings page with a difficulty card wired to a recording stub.
 *
 * Every other test in this file mounts without `setDifficulty`, and that is deliberate —
 * `difficultyCard` tolerates a missing one so an older call site cannot break the page.
 * These tests pass one so the write can be observed.
 */
function mountWithDifficulty(overrides = {}) {
  const root = installDom();
  const calls = [];

  const actions = {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: (message, tone) => { calls.push({ toast: message, tone }); },
    backHref: 'index.html',
    difficulty: 'normal',
    setDifficulty: (value) => {
      calls.push({ setDifficulty: value });
      return { ok: true };
    },
    ...saveActions(),
    ...overrides,
  };

  const view = mountSettings(root, actions);
  return { root, calls, view, actions };
}

function radioFor(root, value) {
  const found = root.querySelectorAll('input')
    .find((input) => input.getAttribute('value') === value);
  assert.ok(found, `no difficulty radio for "${value}"`);
  return found;
}

/** Whether a player could see this node: it and every ancestor must be un-hidden. */
function isShown(node) {
  for (let n = node; n; n = n.parentNode) {
    if (n.hidden) return false;
  }
  return true;
}

/** The writes the card made, ignoring the toasts it said about them. */
const writes = (calls) => calls.filter((c) => 'setDifficulty' in c);

/* --- the painted frame --------------------------------------------------- */

test('the page is mounted inside the painted frame, with every card on the board', () => {
  // ISS-109. `mountSettings` appended the empty board and then the four cards beside it.
  // The sign, the way back and the frame never reached the page, the cards bypassed the
  // board's max-width, and nothing could scroll — so the Save data card was unreachable.
  const { root } = mountWithDifficulty();

  assert.ok(root.querySelector('.page-scene'), 'the page is not inside a page-scene');
  assert.ok(root.querySelector('.page-frame'), 'the painted frame is missing');
  assert.ok(root.querySelector('.page-top'), 'the top row is missing');
  assert.equal(
    root.querySelector('.page-frame__base'),
    null,
    'the account frame should stop at the wall, with no stone base for the board to scroll behind',
  );

  const sign = root.querySelector('.page-sign');
  assert.ok(sign, 'the hanging sign is missing');
  assert.equal(sign.textContent.trim(), 'Settings');

  const back = root.querySelector('.page-back');
  assert.ok(back, 'the way back to the farm is missing');
  assert.equal(back.getAttribute('href'), 'index.html');

  const board = root.querySelector('.page-board');
  assert.ok(board, 'the scrolling board is missing');

  const cards = root.querySelectorAll('.card');
  assert.equal(cards.length, 4, `expected the four settings cards, found ${cards.length}`);
  for (const card of cards) {
    assert.ok(board.contains(card), 'a settings card sits outside the board, so it cannot scroll with it');
  }
});

/**
 * Choose a difficulty the way a browser does: the radio becomes checked, the rest of its
 * group lets go, and only then does `change` fire.
 *
 * The fake DOM does none of that on its own, and the card's handler ignores a `change`
 * from an unchecked radio — correctly, since a real browser never sends one. Dispatching
 * a bare `change` therefore tests a click no player can make, and the card (rightly) does
 * nothing with it.
 */
async function choose(root, value) {
  for (const input of root.querySelectorAll('input')) {
    if (input.getAttribute('name') === 'difficulty') input.checked = false;
  }
  const radio = radioFor(root, value);
  radio.checked = true;
  await radio.dispatch('change');
}

test('the difficulty card shows what each mode does, not just its name', () => {
  const { root } = mountWithDifficulty();
  const card = cardTitled(root, 'Difficulty');
  // `visibleText` returns an array of sentences, so join before matching — the copy is
  // split across nodes and a per-element match would miss most of it.
  const text = visibleText(card).join(' ');

  assert.match(text, /Normal/, 'both modes are named');
  assert.match(text, /Easy/, 'both modes are named');

  // The load-bearing part. "Easy" reads as a promise about the whole crop, and it is not
  // one — a crop that has not ripened is still vulnerable. If this sentence goes, the
  // card is misleading rather than merely terse.
  assert.match(
    text,
    /not ripened yet are still\s+vulnerable/i,
    'Easy must say that growing crops are still vulnerable',
  );
  assert.match(text, /pump is free/i, 'and that the pump is free');
  assert.match(
    text,
    /loses value|dry/i,
    'and Normal must say what leaving a ripe crop alone costs',
  );
});

test('the difficulty card shows the mode actually in force', () => {
  const normal = mountWithDifficulty().root;
  assert.equal(radioFor(normal, 'normal').checked, true, 'a normal farm');
  assert.equal(radioFor(normal, 'easy').checked, false);

  uninstallDom();

  const easy = mountWithDifficulty({ difficulty: 'easy' }).root;
  assert.equal(radioFor(easy, 'easy').checked, true, 'an easy farm');
  assert.equal(radioFor(easy, 'normal').checked, false);
});

test('choosing a difficulty does not write until it is confirmed', async () => {
  // The reason this card is arm-then-confirm rather than a plain radio group: a setting
  // that changes how the whole farm behaves must not change because a radio sat under the
  // cursor. Selecting arms; confirming writes.
  const { root, calls } = mountWithDifficulty();

  await choose(root, 'easy');

  assert.deepEqual(calls, [], 'selecting writes nothing');
  assert.equal(isShown(button(root, 'Confirm')), true, 'and arms a visible Confirm instead');

  await button(root, 'Confirm').click();

  assert.deepEqual(writes(calls), [{ setDifficulty: 'easy' }], 'confirming writes exactly once');
  assert.ok(
    calls.some((c) => c.toast && /Easy/.test(c.toast) && c.tone === 'success'),
    'and says so in a toast',
  );
});

test('cancelling an armed change writes nothing and puts the old mode back', async () => {
  const { root, calls } = mountWithDifficulty();

  await choose(root, 'easy');
  await button(root, 'Keep normal').click();

  assert.deepEqual(calls, [], 'a cancelled choice leaves no trace — no write, no toast');
  assert.equal(radioFor(root, 'normal').checked, true, 'and the radio is back where it was');
  assert.equal(isShown(button(root, 'Confirm')), false, 'with the confirm pair hidden again');
  assert.equal(isShown(button(root, 'Keep normal')), false);
});

test('after switching to easy, the way back offers to keep easy — not a stale label', async () => {
  const { root } = mountWithDifficulty();

  await choose(root, 'easy');
  await button(root, 'Confirm').click();
  await choose(root, 'normal');

  assert.equal(isShown(button(root, 'Keep easy')), true, 'the cancel button names the mode in force');
});

test('choosing the mode already in force asks for no confirmation', async () => {
  const { root, calls } = mountWithDifficulty();

  await choose(root, 'normal');

  assert.equal(isShown(button(root, 'Confirm')), false, 'nothing to confirm');
  assert.deepEqual(calls, [], 'and nothing written');
});

test('a refused change is reported in the card rather than looking like it worked', async () => {
  // The store toasts its own refusals; the card says so too, so a click that did not
  // take cannot look like it did.
  const { root } = mountWithDifficulty({
    setDifficulty: () => ({ ok: false, reason: 'That is not a difficulty this game knows about.' }),
  });

  await choose(root, 'easy');
  await button(root, 'Confirm').click();

  const card = cardTitled(root, 'Difficulty');
  assert.match(
    visibleText(card).join(' '),
    /not a difficulty/i,
    'the card says the change was refused',
  );
});

test('the difficulty card is above the danger cards', async () => {
  // It is the only control on the page that is neither destructive nor about data, so it
  // must not read as one more way to lose things.
  const { root } = mountWithDifficulty();
  const titles = root.querySelectorAll('span')
    .map((n) => n.textContent)
    .filter((t) => ['Difficulty', 'Erase progress', 'Delete account', 'Save data'].includes(t));

  assert.deepEqual(titles, ['Difficulty', 'Erase progress', 'Delete account', 'Save data'],
    'in that order, from the safe to the dangerous');
});

test('the two danger cards share one row, below difficulty and above save data', () => {
  // Side by side halves the height the two destructive cards take, which is what keeps
  // Save data within reach on a laptop. DOM order is still Erase then Delete, so the
  // keyboard and screen-reader order match the visual one.
  const { root } = mountWithDifficulty();
  const board = root.querySelector('.page-board');
  const row = root.querySelector('.settings-danger-row');

  assert.ok(row, 'the two danger cards are not wrapped in a row');
  assert.ok(row.contains(cardTitled(root, 'Erase progress')), 'Erase progress is outside the row');
  assert.ok(row.contains(cardTitled(root, 'Delete account')), 'Delete account is outside the row');
  assert.equal(
    cardTitled(root, 'Save data').parentNode,
    board,
    'Save data should stay a full-width board child below the row',
  );
});

test('a guest gets no danger row, so the erase card keeps the full width', () => {
  // The delete card does not exist for a guest. A two-column row would leave an empty
  // half, so the erase card goes straight onto the board instead.
  const root = installDom();
  mountSettings(root, {
    session: { status: 'guest', farmerName: 'Guest' },
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  assert.equal(root.querySelector('.settings-danger-row'), null, 'a guest has no pair to put in a row');
  assert.equal(
    cardTitled(root, 'Erase progress').parentNode,
    root.querySelector('.page-board'),
    'the lone erase card should fill the board',
  );
});

/* --- the bug this file was written for -------------------------------------- */

test('erasing progress shows "Checking your password." in its own card', async () => {
  const { duringWork } = await runAction({
    work: async () => ({ ok: false, reason: 'server_error' }),
    trigger: 'Erase all progress',
    confirm: 'Yes, erase my farm',
    fieldId: 'settings-erase-password',
  });

  assert.ok(
    duringWork.text.includes('Checking your password.'),
    `expected the sentence to be on screen, saw: ${JSON.stringify(duringWork.text)}`,
  );

  // And in the *progress* card. This is the assertion that failed before: the single
  // shared status node meant this could have been the account card's message.
  assert.ok(
    duringWork.cards['Erase progress'].includes('Checking your password.'),
    'the sentence must be in the card whose button the player just clicked',
  );
  assert.equal(
    duringWork.cards['Delete account'].includes('Checking your password.'),
    false,
    'and not in the other card',
  );
});

test('deleting an account shows it in the account card, not the progress card', async () => {
  // The regression. One shared status node lived in the progress card, so the account
  // action's messages appeared above the erase-progress button — a card the player may
  // have scrolled past, and one they did not click.
  const { duringWork } = await runAction({
    work: async () => ({ ok: false, reason: 'server_error' }),
    trigger: 'Delete my account',
    confirm: 'Delete my account permanently',
    fieldId: 'settings-delete-password',
  });

  assert.ok(duringWork.text.includes('Checking your password.'));
  assert.ok(
    duringWork.cards['Delete account'].includes('Checking your password.'),
    'the account action must report into the account card',
  );
  assert.equal(
    duringWork.cards['Erase progress'].includes('Checking your password.'),
    false,
    'and not into the progress card, which the player did not click',
  );
});

test('a wrong password is reported under the field, in the right card', async () => {
  const { after, root } = await runAction({
    work: async () => ({ ok: false, reason: 'invalid_credentials' }),
    trigger: 'Erase all progress',
    confirm: 'Yes, erase my farm',
    fieldId: 'settings-erase-password',
    password: 'wrong-one',
  });

  const card = cardTitled(root, 'Erase progress');
  assert.ok(
    card.textContent.includes('That password is not right'),
    'the field-level complaint belongs to the card that asked for it',
  );
  assert.ok(after.some((t) => t.includes('Nothing was changed')));
});

test('the two cards do not share a status line', async () => {
  // Structural, and the thing that let the original bug in: one node reused by two
  // actions cannot report two actions at once, and arming one clears the other's words.
  //
  // Counted *per card*, not across the page. Counting the whole page made this a hostage
  // to every other panel: the Save data card added a third `role="status"` node of its own
  // when it started rendering (ISS-051), and the assertion failed on a page that was correct.
  // A screen reader announces a change in the region it happened in, so what matters is
  // that each destructive action reports into its own card — not how many regions the
  // settings page ends up with.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  const isLiveRegion = (node) => node.getAttribute('role') === 'status';

  for (const title of ['Erase progress', 'Delete account']) {
    const card = cardTitled(root, title);
    const regions = [...card.descendants()].filter(isLiveRegion);
    assert.equal(
      regions.length,
      1,
      `"${title}" has ${regions.length} live regions; one node cannot report two actions at once`,
    );
  }

  // And they are genuinely different nodes, not one reached two ways.
  const [progressRegion] = [...cardTitled(root, 'Erase progress').descendants()].filter(isLiveRegion);
  const [accountRegion] = [...cardTitled(root, 'Delete account').descendants()].filter(isLiveRegion);
  assert.notEqual(progressRegion, accountRegion, 'the two cards do not share one node');
});

test('arming one action does not clear the other card status', async () => {
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    // Refused, so the progress card has something to say.
    deleteProgress: async () => ({ ok: false, reason: 'invalid_credentials' }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Erase all progress').click();
  passwordField(root, 'settings-erase-password').value = 'wrong-one';
  await button(root, 'Yes, erase my farm').click();

  const progressCard = cardTitled(root, 'Erase progress');
  assert.ok(
    progressCard.textContent.includes('That password is not right'),
    'precondition: the progress card is complaining',
  );

  // Now arm the account action, which used to call `announce(null)` on the shared node.
  await button(root, 'Delete my account').click();

  assert.ok(
    progressCard.textContent.includes('That password is not right'),
    'the progress card keeps its own message',
  );
});

/* --- the gate itself -------------------------------------------------------- */

test('the password field is hidden until the action is armed', async () => {
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  assert.equal(passwordField(root, 'settings-erase-password').hidden, false, 'the field itself is built');
  assert.equal(
    closestWith(passwordField(root, 'settings-erase-password'), 'field').hidden,
    true,
    'but its label and error are hidden with it, so no orphan label is left visible',
  );

  await button(root, 'Erase all progress').click();

  assert.equal(closestWith(passwordField(root, 'settings-erase-password'), 'field').hidden, false);
});

test('the field takes focus when armed, not the confirm button', async () => {
  // A keyboard user reaching the destructive button first is the worst order.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Delete my account').click();

  const field = passwordField(root, 'settings-delete-password');
  const confirm = button(root, 'Delete my account permanently');
  assert.ok(field.focusCount > 0, 'the field is focused');
  assert.equal(confirm.focusCount, 0, 'and the confirm is not');
});

test('the typed password is not left in the field after a failed check', async () => {
  const { root } = await runAction({
    work: async () => ({ ok: false, reason: 'invalid_credentials' }),
    trigger: 'Erase all progress',
    confirm: 'Yes, erase my farm',
    fieldId: 'settings-erase-password',
    password: 'wrong-one',
  });

  assert.equal(passwordField(root, 'settings-erase-password').value, '');
});

test('cancelling hides the field and empties it', async () => {
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Erase all progress').click();
  passwordField(root, 'settings-erase-password').value = 'rice2026';
  await button(root, 'Keep my farm').click();

  const field = passwordField(root, 'settings-erase-password');
  assert.equal(field.value, '', 'a half-finished credential is not left in the DOM');
  assert.equal(closestWith(field, 'field').hidden, true);
});

test('an empty password is refused without calling the work', async () => {
  let called = false;
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => { called = true; return { ok: true }; },
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Erase all progress').click();
  await button(root, 'Yes, erase my farm').click();

  assert.equal(called, false);
  assert.ok(
    cardTitled(root, 'Erase progress').textContent.includes('Enter your password to confirm'),
    'and the player is told what is missing',
  );
});

/* --- the styling this page actually loads ------------------------------------ */

test('every styled class the settings page renders is styled by a file it loads', async () => {
  // The real cause of "Checking your password." being invisible.
  //
  // `.form-message` lived in `css/auth.css`, and `settings.html` does not load
  // `auth.css`. So the sentence was in the DOM, correct, and styled by nothing: no
  // padding, no background, no way to tell it from body text. Reading the tree would
  // never have shown it, because the markup was never the problem — the stylesheet the
  // page never loaded was.
  //
  // The assertion is deliberately **not** "every class has a rule". Structural hooks are
  // legitimate and have none: `card__body` is styled nowhere in the project and always
  // was, which is fine because `.card` carries the padding. So the rule is narrower and
  // more useful — *if* a class is styled somewhere, *then* this page's stylesheets must
  // be where it is styled. That is precisely the shape of the bug, and it is what fails
  // if the rules move back to a file `settings.html` does not link.
  //
  // The resolver is crude — it checks whether any rule mentions the class, not whether
  // that rule applies to that element. Enough for the failure it is aimed at, and honest
  // about what it is.
  const cssDir = new URL('../css/', import.meta.url);
  const read = (name) => readFileSync(new URL(name, cssDir), 'utf8');

  const html = readFileSync(new URL('../settings.html', import.meta.url), 'utf8');
  const linked = [...html.matchAll(/href="css\/([\w-]+\.css)"/g)].map((m) => m[1]);

  assert.ok(linked.includes('components.css'), 'the page loads the shared component styles');
  assert.equal(
    linked.includes('auth.css'),
    false,
    'precondition: the page does NOT load auth.css, which is why this test exists',
  );

  const here = linked.map(read).join('\n');
  const everywhere = readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .map(read)
    .join('\n');

  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: false, reason: 'invalid_credentials' }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  // Arm both actions so the revealed gates and their error nodes exist too.
  await button(root, 'Erase all progress').click();
  await button(root, 'Delete my account').click();

  const misplaced = new Set();
  for (const node of root.descendants()) {
    for (const name of node.classList._names) {
      const pattern = new RegExp(`\\.${name}(?![\\w-])`);
      if (pattern.test(everywhere) && !pattern.test(here)) misplaced.add(name);
    }
  }

  assert.deepEqual(
    [...misplaced],
    [],
    `styled, but not by a stylesheet this page loads: ${[...misplaced].join(', ')}`,
  );
});

test('a structural hook with no rules anywhere is not a bug', async () => {
  // The carve-out above, pinned. `card__body` has never had a rule: `.card` carries the
  // padding. If this ever starts failing, the test above has started flagging semantics
  // as styling, and its real signal is worth re-checking.
  const cssDir = new URL('../css/', import.meta.url);
  const everywhere = readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(new URL(name, cssDir), 'utf8'))
    .join('\n');

  assert.equal(/\.card__body(?![\w-])/.test(everywhere), false);
});

test('the status line says something in every tone the panel uses', async () => {
  // A `--tone` class with no rule falls back to the neutral base and reads as a fault,
  // which is the wrong signal for "Checking your password."
  const css = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');

  for (const tone of ['error', 'success', 'info']) {
    assert.ok(
      css.includes(`.form-message--${tone}`),
      `.form-message--${tone} has no rule, so it renders unstyled`,
    );
  }
});

/* --- no leaked values ------------------------------------------------------- */

test('appendAll skips null children, and a bare append does not', async () => {
  // The two halves of ISS-052, pinned so nobody "simplifies" the fix away. `appendAll`
  // exists because `node.append(null)` and `el('div', {}, [null])` behave differently,
  // and the fake DOM now reproduces that difference on purpose.
  const root = installDom();

  appendAll(root, el('p', { text: 'kept' }), null, undefined, false, 'also kept');

  assert.deepEqual(
    visibleText(root),
    ['kept', 'also kept'],
    'appendAll must drop null, undefined and false',
  );

  const bare = installDom();
  bare.append(null);

  assert.deepEqual(
    visibleText(bare),
    ['null'],
    'precondition: the bare append still stringifies null, as the browser does',
  );
});

test('a guest is not shown the word "null"', async () => {
  // The regression, ISS-052. `mountSettings` ended with the *native* `root.append(...)`,
  // whose signature is `(Node or DOMString)` — so `account ? el(...) : null`, null for
  // every guest, was stringified into a text node and rendered between the two cards.
  //
  // This passed against a visibly broken page for as long as the guest existed, because
  // `fakeDom.append()` skipped null where the browser does not. That divergence was the
  // real defect: a test double that is laxer than the thing it stands in for hides the
  // bug it exists to find.
  const root = installDom();
  mountSettings(root, {
    session: { status: 'guest', farmerName: 'Guest' },
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions({ canExport: () => false }),
  });

  const leaked = visibleText(root).filter((text) => /^(null|undefined|false)$/.test(text.trim()));
  assert.deepEqual(leaked, [], `a conditional child reached append(): ${leaked.join(' | ')}`);
});

test('an authed player is not shown it either', async () => {
  // The same call with an account present, so this cannot pass by the guest branch
  // simply not running.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  const leaked = visibleText(root).filter((text) => /^(null|undefined|false)$/.test(text.trim()));
  assert.deepEqual(leaked, [], `a conditional child reached append(): ${leaked.join(' | ')}`);
});

/* --- the Save data card ------------------------------------------------------ */

test('the Save data card mounts the import/export controls', async () => {
  // The regression, ISS-051. `mountSavePanel` returns `{ unmount }` rather than a node, and
  // passing that straight into `el()` stringified it: the card rendered the text
  // `[object Object]` and the panel itself was mounted into a detached `<div>` that never
  // reached the page. Reading the code showed a save panel wired into the settings page.
  // Only looking at the page showed that there was nothing there to press.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  assert.ok(root.querySelector('#import-file'), 'the file input is in the page');
  assert.ok(
    root.querySelectorAll('button').some((b) => b.textContent === 'Export my farm'),
    `no Export button. Present: ${root.querySelectorAll('button').map((b) => b.textContent).join(' | ')}`,
  );
});

test('nothing on the page renders as a stringified mount result', async () => {
  // The symptom, pinned on its own so a future refactor reports *what* broke. Any panel
  // whose `mountX()` return value reaches `el()` as a child lands here as this string.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  const leaked = visibleText(root).filter((text) => text.includes('[object'));
  assert.deepEqual(leaked, [], `a mount result was stringified into the page: ${leaked.join(' | ')}`);
});

test('the save card is inside the Save data card, not loose on the page', async () => {
  // Mounting into a detached div and forgetting to embed it is a different bug with the
  // same cause, and it is invisible unless something asserts the panel is *in* the card.
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  assert.ok(root.querySelector('#import-file'), 'precondition: the file input exists');
  assert.ok(
    closestWith(root.querySelector('#import-file'), 'card'),
    'the file input is not inside any card, so the Save data card did not take it',
  );
});

/* --- guests ----------------------------------------------------------------- */

test('a guest is shown no password field for either action', async () => {
  const root = installDom();
  mountSettings(root, {
    session: { status: 'guest', farmerName: 'Guest' },
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    // A guest farm has no account to attach a file to, which is the one thing `canExport`
    // decides. Mirrors `settingsActions()` in `js/settings-main.js`.
    ...saveActions({ canExport: () => false }),
  });

  // No credential exists to collect, so no field: a field nothing reads is worse than
  // no field.
  assert.equal(root.querySelector('#settings-erase-password'), null);
  assert.equal(root.querySelector('#settings-delete-password'), null);

  // And no account card at all — there is no account to delete.
  assert.equal(root.querySelectorAll('span').some((n) => n.textContent === 'Delete account'), false);
});

test('a guest gets the Save data card and an explanation, not an empty space', async () => {
  // The card is deliberately not gated on `canExport` (ISS-051). It never really was — the
  // old check tested the function rather than calling it, so it was always truthy — but the
  // code read as a guest gate and would have become one the moment someone "fixed" it.
  //
  // Shown rather than hidden is the better of the two: a guest cannot export, and
  // `savePanel.js` says exactly why in the place where the button would have been. A
  // missing card leaves the player wondering whether the feature exists at all.
  const root = installDom();
  mountSettings(root, {
    session: { status: 'guest', farmerName: 'Guest' },
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions({ canExport: () => false }),
  });

  assert.ok(root.querySelector('#import-file'), 'the import half is still there');

  const note = visibleText(root).find((text) => text.includes('cannot be exported'));
  assert.ok(note, `a guest is told why export is unavailable. Saw: ${JSON.stringify(visibleText(root))}`);
});

/* --- success ---------------------------------------------------------------- */

test('a successful erase says so and offers a toast', async () => {
  const toasts = [];
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: (message, tone) => toasts.push({ message, tone }),
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Erase all progress').click();
  passwordField(root, 'settings-erase-password').value = 'rice2026';
  await button(root, 'Yes, erase my farm').click();

  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].tone, 'success');
  assert.match(toasts[0].message, /brand new farm/);
  assert.ok(
    cardTitled(root, 'Erase progress').textContent.includes('brand new farm'),
    'and the card says it too, in case the toast was missed',
  );
});

test('a successful deletion hands off to the login page', async () => {
  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => ({ ok: true }),
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Delete my account').click();
  passwordField(root, 'settings-delete-password').value = 'rice2026';
  await button(root, 'Delete my account permanently').click();

  assert.equal(globalThis.__navigatedTo, 'login.html?deleted=1');
});

test('the busy label replaces the confirm label while in flight', async () => {
  // Held open deliberately: the busy state only exists while the promise is pending, so
  // this one test cannot await its own click.
  let release;
  const gate = new Promise((resolve) => { release = resolve; });

  const root = installDom();
  mountSettings(root, {
    session: SESSION,
    deleteProgress: async () => { await gate; return { ok: true }; },
    requestAccountDeletion: async () => ({ ok: true }),
    toast: () => {},
    backHref: 'index.html',
    ...saveActions(),
  });

  await button(root, 'Erase all progress').click();
  passwordField(root, 'settings-erase-password').value = 'rice2026';

  const clicked = button(root, 'Yes, erase my farm').click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(button(root, 'Erasing…').disabled, true, 'a second click cannot get through');
  assert.ok(visibleText(root).includes('Checking your password.'));

  release();
  await clicked;
});
