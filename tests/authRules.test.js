/**
 * Tests for the pure auth rules. `node --test tests/`
 *
 * No DOM, no storage, no provider. Hashing lives behind the provider and is
 * verified in tests/localAuth.test.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  emailLooksValid,
  farmerNameLooksValid,
  normaliseEmail,
  normaliseName,
  normaliseUsername,
  passwordProblems,
  usernameLooksValid,
  validateSignIn,
  validateSignUp,
} from '../js/domain/authRules.js';

test('emails are normalised so case and padding cannot split one account', () => {
  assert.equal(normaliseEmail('  Farmer@Example.COM '), 'farmer@example.com');
  assert.equal(normaliseEmail(null), '');
});

test('display names are trimmed and whitespace-collapsed', () => {
  assert.equal(normaliseName('  Abdul   Karim  '), 'Abdul Karim');
});

test('usernames are normalised so case and padding cannot split one account', () => {
  assert.equal(normaliseUsername('  FarmerJoe  '), 'farmerjoe');
  assert.equal(normaliseUsername(null), '');
});

test('emailLooksValid rejects the obvious failures', () => {
  assert.equal(emailLooksValid('farmer@rice.bd'), true);
  assert.equal(emailLooksValid('  FARMER@rice.bd  '), true);
  assert.equal(emailLooksValid('nope'), false);
  assert.equal(emailLooksValid('a@b'), false);
  assert.equal(emailLooksValid(''), false);
  assert.equal(emailLooksValid('two@@rice.bd'), false);
});

test('passwordProblems names every rule the password fails', () => {
  assert.deepEqual(passwordProblems('short1'), ['length']);
  assert.deepEqual(passwordProblems('alllettersonly'), ['number']);
  assert.deepEqual(passwordProblems('12345678'), ['letter']);
  assert.deepEqual(passwordProblems('rice2026'), []);
});

test('farmer names must be a sensible length', () => {
  assert.equal(farmerNameLooksValid('Abdul Karim'), true);
  assert.equal(farmerNameLooksValid('A'), false);
  assert.equal(farmerNameLooksValid('x'.repeat(30)), false);
});

test('usernames must be alphanumeric with underscores, 3-20 chars', () => {
  assert.equal(usernameLooksValid('farmer_joe'), true);
  assert.equal(usernameLooksValid('FarmerJoe123'), true);
  assert.equal(usernameLooksValid('ab'), false);
  assert.equal(usernameLooksValid('x'.repeat(21)), false);
  assert.equal(usernameLooksValid('has space'), false);
  assert.equal(usernameLooksValid('has-dash'), false);
  assert.equal(usernameLooksValid(''), false);
});

test('sign-in collects every problem in one pass', () => {
  const result = validateSignIn({ identifier: '', password: '' });

  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['identifier', 'password']);
});

test('sign-in does not judge password strength', () => {
  // A weak password still might be the right one. Only the provider decides.
  assert.equal(validateSignIn({ identifier: 'farmer@rice.bd', password: 'weak' }).ok, true);
  assert.equal(validateSignIn({ identifier: 'farmer_joe', password: 'weak' }).ok, true);
});

test('sign-up validates every field at once', () => {
  const result = validateSignUp({
    email: 'bad',
    password: 'short',
    confirmPassword: 'different',
    farmerName: '',
    username: '',
  });

  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'confirmPassword',
    'email',
    'farmerName',
    'password',
    'username',
  ]);
});

test('a valid sign-up returns cleaned values, with no confirm field', () => {
  const result = validateSignUp({
    email: ' Abdul@Rice.BD ',
    password: 'rice2026',
    confirmPassword: 'rice2026',
    farmerName: '  Abdul   Karim ',
    username: '  Farmer_Joe  ',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.values, {
    email: 'abdul@rice.bd',
    password: 'rice2026',
    farmerName: 'Abdul Karim',
    username: 'farmer_joe',
  });
  assert.equal('confirmPassword' in result.values, false, 'the confirmation is never passed on');
});

test('a mismatched confirmation fails even when the password is strong', () => {
  const result = validateSignUp({
    email: 'abdul@rice.bd',
    password: 'rice2026',
    confirmPassword: 'rice2027',
    farmerName: 'Karim',
    username: 'farmer_joe',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.confirmPassword, 'password_mismatch');
});

test('an over-long password is rejected before the strength rules', () => {
  const result = validateSignUp({
    email: 'abdul@rice.bd',
    password: `${'a'.repeat(200)}1`,
    confirmPassword: `${'a'.repeat(200)}1`,
    farmerName: 'Karim',
    username: 'farmer_joe',
  });

  assert.equal(result.errors.password, 'password_too_long');
});

test('an invalid username is rejected on sign-up', () => {
  const result = validateSignUp({
    email: 'abdul@rice.bd',
    password: 'rice2026',
    confirmPassword: 'rice2026',
    farmerName: 'Karim',
    username: 'ab',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.username, 'username_invalid');
});