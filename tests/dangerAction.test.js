/**
 * The shared gate on both destructive settings actions.
 *
 * This file exists because the bug it guards against was invisible to the suite. The
 * original erase-progress handler called `clearSave()` **before** anything checked the
 * password, so a wrong password wiped the farm and the panel still reported "nothing was
 * changed". Every unit test passed: `store.js`, `localAuth.js` and `accountApi.js` were
 * all individually correct, and the mistake was in the order of six lines in an entry
 * script that no test imported.
 *
 * `runDestructive` is the fix, and it is testable because it takes its collaborators as
 * arguments rather than importing them. The ordering invariant is asserted here as
 * behaviour — with fakes recording the order — rather than by reading the source, which
 * is the only way to catch this class of regression without a DOM.
 *
 * The file is named for the feature rather than the module: it tests the gate both
 * destructive actions share, which spans `runDestructive.js`, `passwordGate.js` and
 * `dangerMessages.js`.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runDestructive } from '../js/ui/runDestructive.js';
import {
  accountDeletionFailure,
  isAboutPassword,
  progressErasureFailure,
  WRONG_PASSWORD,
} from '../js/ui/dangerMessages.js';

/* --- fakes ------------------------------------------------------------------ */

/**
 * A stand-in for `dangerAction` + `passwordGate`.
 *
 * `events` is the point: the assertion is about the *order* things happened in, so
 * everything appends to one list and the test reads it back.
 */
function harness({ password = 'correct horse', work, onDone } = {}) {
  const events = [];
  let armed = true;
  let busy = false;
  let visible = false;

  const gate = {
    wrap: {},
    read: () => password,
    forgive: () => events.push('gate:forgive'),
    setVisible: (on) => { visible = on; },
    complain: (text) => events.push(`gate:complain:${text}`),
  };

  const action = {
    trigger: {},
    confirmButton: {},
    node: {},
    setBusy(on) { busy = on; events.push(`action:busy:${on}`); },
    isBusy: () => busy,
    restore: () => events.push('action:restore'),
    reset: () => { armed = false; events.push('action:reset'); },
    clearSecret: () => events.push('action:clearSecret'),
  };

  const announce = (text, tone) => events.push(`announce:${tone ?? 'error'}:${text}`);

  const run = () => runDestructive({
    action,
    gate,
    asksForPassword: true,
    announce,
    work: work ?? (async (pwd) => { events.push(`work:${pwd}`); return { ok: true }; }),
    onDone: onDone ?? (() => events.push('done')),
    failure: progressErasureFailure,
  });

  return { run, events, isArmed: () => armed, isBusy: () => busy, gateVisible: () => visible, action };
}

/* --- the invariant ---------------------------------------------------------- */

test('a refused password means the success path never runs', async () => {
  // The regression this whole file is here for, stated precisely.
  //
  // Note what is *not* being asserted: that `work` is never called on a wrong password.
  // It is called — that call is the check. `erase_progress` and `delete_my_account` both
  // compare the password and delete in one statement, because a separate verification
  // step is one the browser could skip. So `work` is reached exactly once, with the typed
  // password, and its refusal is what stops everything after it.
  //
  // The old handler's flaw was on the other side of this call: it cleared the save first
  // and asked afterwards. Here the only thing `runDestructive` owns after `work` is
  // `onDone`, so pinning `onDone` as unreachable on a refusal is pinning the ordering.
  const refused = async (pwd) => {
    h.events.push(`work:${pwd}`);
    return { ok: false, reason: 'invalid_credentials' };
  };
  const h = harness({ password: 'wrong password', work: refused });

  await h.run();

  assert.deepEqual(
    h.events.filter((e) => e.startsWith('work:')),
    ['work:wrong password'],
    'exactly one call, carrying the typed password',
  );
  assert.equal(h.events.includes('done'), false, 'nothing on the success path may run');
  assert.equal(h.isArmed(), true);
});

test('a refused password is never retried on the client', async () => {
  // There is no "try again" loop anywhere in here, deliberately. A retry would mean
  // sending the same password a second time for a decision the database has already made.
  let calls = 0;
  const h = harness({ password: 'typo', work: async () => { calls += 1; return { ok: false, reason: 'invalid_credentials' }; } });

  await h.run();

  assert.equal(calls, 1);
});

test('the empty password is refused before the action is even marked busy', async () => {
  const h = harness({ password: '' });

  await h.run();

  assert.ok(
    h.events.includes(`gate:complain:Enter your password to confirm.`),
    'the player is told what is missing, under the field',
  );
  assert.equal(h.events.some((e) => e.startsWith('work:')), false);
  assert.equal(h.isBusy(), false, 'nothing should have been in flight');
  assert.equal(h.events.includes('done'), false);
});

test('the accepted password reaches the work and then reports success', async () => {
  const h = harness({ password: 'correct horse' });

  await h.run();

  assert.deepEqual(h.events, [
    'action:busy:true',
    'action:clearSecret',
    'announce:info:Checking your password.',
    'work:correct horse',
    'done',
  ]);
});

test('the password field is cleared as soon as the work starts', async () => {
  // A password that was accepted has no business sitting in the DOM while a request is
  // in flight, and one that was rejected must not survive for a shoulder-surfer either.
  const h = harness();

  await h.run();

  const clearIndex = h.events.indexOf('action:clearSecret');
  const workIndex = h.events.indexOf('work:correct horse');
  assert.ok(clearIndex >= 0 && clearIndex < workIndex, 'clear before the call, not after');
});

test('a failure leaves the action armed so a mistyped password costs one field', async () => {
  // `restore()`, not `reset()`. Disarming would mean re-clicking the trigger and
  // re-reading the warning before trying again, which is a punishment for a typo.
  const h = harness({ password: 'typo', work: async () => ({ ok: false, reason: 'invalid_credentials' }) });

  await h.run();

  assert.ok(h.events.includes('action:restore'));
  assert.equal(h.events.includes('action:reset'), false);
  assert.equal(h.isArmed(), true);
});

test('a thrown error becomes a reported failure, not an unhandled rejection', async () => {
  const h = harness({ work: async () => { throw new Error('boom'); } });

  await h.run();

  assert.equal(h.events.includes('done'), false);
  assert.ok(
    h.events.some((e) => e.startsWith('announce:') && e.includes('Your farm could not be erased')),
    'and the player gets a sentence saying nothing changed',
  );
});

test('a duplicate click while busy is ignored', async () => {
  let release;
  const gate1 = new Promise((resolve) => { release = resolve; });
  const h = harness({ work: async (pwd) => { h.events.push(`work:${pwd}`); await gate1; return { ok: true }; } });

  const first = h.run();
  await Promise.resolve();
  assert.equal(h.isBusy(), true);

  const second = await h.run();
  release();
  await first;

  assert.equal(
    h.events.filter((e) => e.startsWith('work:')).length,
    1,
    'the second click must not start a second erase',
  );
  assert.equal(second, undefined);
});

/* --- guests ----------------------------------------------------------------- */

test('a guest is asked for no password and nothing is blocked', async () => {
  // A guest has an account-less session, so there is no credential to verify — and the
  // panel must not show a field it cannot check. `asksForPassword: false` is the whole
  // mechanism, and the work still runs.
  const events = [];
  let received;

  await runDestructive({
    action: {
      setBusy: () => events.push('busy'),
      isBusy: () => false,
      restore: () => {},
      reset: () => {},
      clearSecret: () => events.push('clearSecret'),
    },
    gate: null,
    asksForPassword: false,
    announce: () => {},
    work: async (pwd) => { received = pwd; return { ok: true }; },
    onDone: () => events.push('done'),
    failure: progressErasureFailure,
  });

  assert.equal(received, '', 'no credential is invented for a guest');
  assert.ok(events.includes('done'));
});

/* --- which failure is about the password ------------------------------------ */

test('only a real credential rejection is reported under the password field', async () => {
  // Every other reason is a different problem, and saying "that password is not right"
  // about a missing migration sends a player off retyping a correct password.
  assert.equal(isAboutPassword({ reason: 'invalid_credentials' }), true);
  assert.equal(isAboutPassword({ reason: 'password_required' }), true);

  for (const reason of [
    'not_signed_in', 'not_migrated', 'cannot_verify_password',
    'timeout', 'network_request_failed', 'network', 'server_error', 'exception',
    'account_not_found', 'storage_unavailable',
  ]) {
    assert.equal(isAboutPassword({ reason }), false, `${reason} must not blame the password`);
  }
});

test('a wrong password is reported under the field with the nothing-changed promise', async () => {
  const h = harness({ password: 'typo', work: async () => ({ ok: false, reason: 'invalid_credentials' }) });

  await h.run();

  assert.ok(h.events.includes(`gate:complain:${WRONG_PASSWORD}`));
  assert.ok(WRONG_PASSWORD.includes('Nothing was changed'));

  // Under the field, not as a banner. One message in one place: a banner saying the same
  // sentence puts "that password is not right" above a form the player is looking at for
  // another reason.
  assert.equal(
    h.events.filter((e) => e.startsWith('announce:error:')).length,
    0,
    'no error banner alongside the field message',
  );
});

/* --- the sentences ---------------------------------------------------------- */

test('a missing migration says so rather than "try again"', async () => {
  // Retrying cannot fix an unrun migration, and this is the most likely thing to hit in
  // development — it arrives as a bare 404.
  const account = accountDeletionFailure({ reason: 'not_migrated' });
  const progress = progressErasureFailure({ reason: 'not_migrated' });

  assert.match(account, /Account deletion is not switched on/);
  assert.match(progress, /Erasing progress is not switched on/);
  assert.match(account, /migration/);
  assert.match(progress, /migration/);
  for (const sentence of [account, progress]) {
    assert.match(sentence, /Nothing was changed/);
  }
});

test('a fail-closed project is not reported as a mistyped password', async () => {
  const sentence = progressErasureFailure({ reason: 'cannot_verify_password' });

  assert.match(sentence, /cannot check passwords on the server/);
  assert.notEqual(sentence, WRONG_PASSWORD, 'these are different problems and must not read the same');

  // The player's password was probably fine. Saying otherwise sends them round a loop
  // with a correct password while the project stays broken.
  assert.equal(isAboutPassword({ reason: 'cannot_verify_password' }), false);
});

test('being offline is never blamed on the player', async () => {
  for (const reason of ['timeout', 'network_request_failed', 'network']) {
    assert.match(progressErasureFailure({ reason }), /your farm is untouched/i);
    assert.match(accountDeletionFailure({ reason }), /We could not reach the account server/);
  }
});

test('an unknown reason still promises that nothing changed', async () => {
  // The one promise that must never be broken: whatever went wrong, say whether the
  // player's data was touched. Everything here destroys data, so "nothing was changed"
  // is the safe default and the honest one — nothing is deleted until a call says ok.
  for (const sentence of [
    accountDeletionFailure({ reason: 'server_error' }),
    progressErasureFailure({ reason: 'something_new' }),
    progressErasureFailure(undefined),
  ]) {
    assert.match(sentence, /Nothing was changed/);
  }
});

test('the two actions never fall back to the same sentence', async () => {
  // They erase different things. A copy-paste would tell a player their account is gone
  // when only their farm was, or the reverse, and both are alarming in the wrong way.
  assert.notEqual(
    accountDeletionFailure({ reason: 'server_error' }),
    progressErasureFailure({ reason: 'server_error' }),
  );
});
