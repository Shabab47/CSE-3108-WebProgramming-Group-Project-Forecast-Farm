/**
 * Tests for provider error codes → sentences.
 *
 * The enumeration tests are the important ones. A login form that answers
 * differently for "no such email" and "wrong password" lets anyone confirm which
 * addresses have accounts, which is the sort of thing that gets someone doxxed.
 * This is the only place that mapping lives, so it is the only place worth
 * testing it in — and it is testable with no DOM at all.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIRM_EMAIL,
  NEUTRAL_SIGN_IN,
  authErrorToMessage,
  isConnectivityReason,
  isUnconfirmedReason,
} from '../js/ui/authErrors.js';

/** The connectivity sentence, without hard-coding it a second time. */
const MESSAGES_OFFLINE = authErrorToMessage('offline', 'signUp');

/** Every reason that could reveal whether an email is registered. */
const ENUMERATION_SENSITIVE = [
  'invalid_credentials',
  'wrong_password',
  'no_account',
  'email_taken',
  'user_already_exists',
  'email_not_confirmed',
  'not_confirmed',
];

test('every enumeration-sensitive reason is neutral on the sign-in path', () => {
  for (const reason of ENUMERATION_SENSITIVE) {
    const message = authErrorToMessage(reason, 'signIn');
    assert.equal(message, NEUTRAL_SIGN_IN, `"${reason}" leaks account existence`);
  }
});

test('sign-in and sign-up may say different things about the same reason', () => {
  // The player typed this address a moment ago, so naming the problem helps them.
  assert.equal(authErrorToMessage('email_taken', 'signUp'), 'That email already has an account. Sign in instead.');
  assert.notEqual(authErrorToMessage('email_taken', 'signUp'), authErrorToMessage('email_taken', 'signIn'));
});

test('an unconfirmed account is told to check their inbox', () => {
  // This is the state most likely to ship broken: signup succeeds, no session is
  // issued, and without this the player bounces back to the form with no idea why.
  assert.equal(authErrorToMessage('not_confirmed', 'signUp'), CONFIRM_EMAIL);
});

test('validation reasons read the same on both paths', () => {
  for (const context of ['signIn', 'signUp']) {
    assert.equal(authErrorToMessage('email_invalid', context), 'That does not look like an email address.');
    assert.equal(authErrorToMessage('password_weak', context), 'Use at least 8 characters, with a letter and a number.');
  }
});

test('throttling is surfaced, never retried around', () => {
  assert.match(authErrorToMessage('too_many_requests', 'signIn'), /too many attempts/i);
});

test('an unmapped provider code never reaches the player verbatim', () => {
  const raw = 'https://internal.supabase.invalid/v1/token?trace=secret-value';
  const message = authErrorToMessage(raw, 'signIn');

  assert.notEqual(message, raw);
  assert.ok(!message.includes('secret-value'));
});

test('an unmapped code is bucketed by what it looks like', () => {
  assert.equal(authErrorToMessage('some_network_thing', 'signUp'), MESSAGES_OFFLINE);
  assert.equal(authErrorToMessage('rate_limit_exceeded', 'signUp'), 'Too many attempts. Wait a minute, then try again.');
});

test('an unmapped code on sign-in falls back to the neutral message', () => {
  assert.equal(authErrorToMessage('brand_new_reason', 'signIn'), NEUTRAL_SIGN_IN);
});

test('connectivity reasons are recognisable, so guest play can be offered', () => {
  assert.equal(isConnectivityReason('network_request_failed'), true);
  assert.equal(isConnectivityReason('offline'), true);
  assert.equal(isConnectivityReason('invalid_credentials'), false);
});

test('unconfirmed reasons are recognisable', () => {
  assert.equal(isUnconfirmedReason('email_not_confirmed'), true);
  assert.equal(isUnconfirmedReason('invalid_credentials'), false);
});