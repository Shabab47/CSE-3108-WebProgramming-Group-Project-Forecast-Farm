/**
 * The recovery link's arrival, and the bounce that used to eat it.
 *
 * Two bugs live here and both were invisible to the suite until now:
 *
 *   1. `#error=otp_expired` carried no `access_token`, so the old reader returned
 *      null and the page fell through to the main menu without a word.
 *   2. `js/main.js` bounced an anonymous visitor with `location.replace('login.html')`,
 *      which drops the fragment — so a recovery link that landed on `/` arrived at
 *      the login page with its token already gone.
 *
 * Pure functions, no DOM, so this runs in milliseconds.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { carriesAuthFragment, parseAuthArrival, recoveryRedirect } from '../js/domain/authArrival.js';

/* --- parseAuthArrival ------------------------------------------------------ */

test('a token_hash link is recognised, and is not an error', () => {
  assert.deepEqual(parseAuthArrival('?token_hash=abc123&type=recovery', ''), {
    tokenHash: 'abc123',
    accessToken: null,
    error: null,
  });
});

test('a token_hash is found without the leading question mark', () => {
  const arrival = parseAuthArrival('token_hash=abc123&type=recovery', '');
  assert.equal(arrival.tokenHash, 'abc123');
});

test('an implicit-flow fragment still works, for links already in an inbox', () => {
  assert.deepEqual(parseAuthArrival('', '#access_token=tok&type=recovery'), {
    tokenHash: null,
    accessToken: 'tok',
    error: null,
  });
});

test('an expired link reports its code instead of looking like a plain page load', () => {
  assert.deepEqual(parseAuthArrival('', '#error=access_denied&error_code=otp_expired'), {
    tokenHash: null,
    accessToken: null,
    error: 'otp_expired',
  });
});

test('the specific error_code wins over the coarse error', () => {
  assert.equal(parseAuthArrival('', '#error_code=otp_expired').error, 'otp_expired');
  assert.equal(parseAuthArrival('', '#error=access_denied').error, 'access_denied');
});

test('a token wins over an error, because a token is the useful half', () => {
  const arrival = parseAuthArrival('', '#access_token=tok&error=access_denied');
  assert.equal(arrival.accessToken, 'tok');
  assert.equal(arrival.error, null);
});

test('nothing at all reads as nothing, not as a failure', () => {
  for (const [search, hash] of [['', ''], ['', '#'], ['?deleted=1', ''], ['?guest=1', '#type=recovery']]) {
    assert.deepEqual(parseAuthArrival(search, hash), {
      tokenHash: null,
      accessToken: null,
      error: null,
    });
  }
});

/* --- carriesAuthFragment --------------------------------------------------- */

test('only an auth payload counts as a fragment worth keeping', () => {
  assert.equal(carriesAuthFragment('#access_token=tok'), true);
  assert.equal(carriesAuthFragment('#error_code=otp_expired'), true);
  assert.equal(carriesAuthFragment('#error=access_denied'), true);
  assert.equal(carriesAuthFragment('#type=recovery'), false, 'a type alone carries nothing');
  assert.equal(carriesAuthFragment(''), false);
  assert.equal(carriesAuthFragment('#'), false);
});

/* --- recoveryRedirect ------------------------------------------------------ */

test('a plain bounce goes to the login page and nothing else', () => {
  assert.equal(recoveryRedirect('http://127.0.0.1:5173/'), 'login.html');
});

test('a recovery fragment survives the bounce — the bug that cost a session', () => {
  assert.equal(
    recoveryRedirect('http://127.0.0.1:5173/#access_token=tok&type=recovery'),
    'login.html#access_token=tok&type=recovery',
  );
});

test('a token_hash query survives the bounce', () => {
  assert.equal(
    recoveryRedirect('http://127.0.0.1:5173/?token_hash=h&type=recovery'),
    'login.html?token_hash=h&type=recovery',
  );
});

test('a guest flag is dropped: it means something else on the login page', () => {
  assert.equal(recoveryRedirect('http://127.0.0.1:5173/?guest=1'), 'login.html');
  assert.equal(recoveryRedirect('http://127.0.0.1:5173/?avatar=farmer2'), 'login.html');
});

test('a broken-link fragment is kept so the page can explain it', () => {
  assert.equal(
    recoveryRedirect('http://127.0.0.1:5173/#error=access_denied&error_code=otp_expired'),
    'login.html#error=access_denied&error_code=otp_expired',
  );
});

test('any other page bounced to login loses its query', () => {
  assert.equal(recoveryRedirect('http://127.0.0.1:5173/index.html'), 'login.html');
});
