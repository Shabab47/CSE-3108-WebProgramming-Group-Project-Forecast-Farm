/**
 * Tests for the Web3Forms bug-report transport.
 *
 * The request body is the interesting part: Web3Forms takes one flat object, and
 * the game URL is the field that turns "something broke" into a report somebody
 * can act on. `fetch` is injected, so no test touches the network or a real key.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { submitBugReport, validateReport } from '../js/services/reportApi.js';
import {
  WEB3FORMS_ENDPOINT,
  __setForTest,
} from '../js/config/feedback.js';

const json = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

let calls = [];
let reply = () => json(200, { success: true, message: 'Email sent successfully!' });

function fetchStub(url, init) {
  calls.push({ url, init });
  return reply(url, init);
}

beforeEach(() => {
  calls = [];
  reply = () => json(200, { success: true, message: 'Email sent successfully!' });
  __setForTest({ key: 'test-access-key' });
});

afterEach(() => {
  __setForTest({ key: '' });
});

test('a report posts to Web3Forms with the key, message and game URL', async () => {
  const result = await submitBugReport({
    message: 'The rain came through the roof of the farm.',
    gameUrl: 'https://example.test/index.html?guest=1',
    userAgent: 'TestBrowser/1.0',
    session: { status: 'guest' },
  }, { fetchImpl: fetchStub });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WEB3FORMS_ENDPOINT);
  assert.equal(calls[0].init.method, 'POST');

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.access_key, 'test-access-key');
  assert.equal(body.message, 'The rain came through the roof of the farm.');
  assert.equal(body.game_url, 'https://example.test/index.html?guest=1');
  assert.equal(body.user_agent, 'TestBrowser/1.0');
  assert.equal(body.player_type, 'guest');
  assert.equal(body.botcheck, false);
});

test('a reply address is only included when one was typed', async () => {
  await submitBugReport({ message: 'A long enough report.' }, { fetchImpl: fetchStub });
  assert.equal('email' in JSON.parse(calls[0].init.body), false);

  calls = [];
  await submitBugReport({
    message: 'A long enough report.',
    email: 'farmer@example.test',
    session: { status: 'authed', farmerName: 'JM' },
  }, { fetchImpl: fetchStub });

  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.email, 'farmer@example.test');
  assert.equal(body.farmer_name, 'JM');
});

test('a short message is refused before the network is touched', async () => {
  const result = await submitBugReport({ message: 'oops' }, { fetchImpl: fetchStub });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'message_too_short');
  assert.equal(calls.length, 0, 'a request that cannot succeed should not be sent');
});

test('an impossible email is refused before the network is touched', async () => {
  assert.equal(validateReport({ message: 'A long enough report.', email: 'nope' }), 'email_invalid');

  const result = await submitBugReport({
    message: 'A long enough report.',
    email: 'nope',
  }, { fetchImpl: fetchStub });

  assert.equal(result.reason, 'email_invalid');
  assert.equal(calls.length, 0);
});

test('without a configured key the form says so and never posts', async () => {
  __setForTest({ key: '' });

  const result = await submitBugReport({ message: 'A long enough report.' }, { fetchImpl: fetchStub });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_configured');
  assert.equal(calls.length, 0);
});

test('a dropped connection is reported as network, not thrown', async () => {
  const result = await submitBugReport({
    message: 'A long enough report.',
  }, {
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'network');
});

test('a rejected submission is reported, not treated as success', async () => {
  reply = () => json(200, { success: false, message: 'Invalid access key' });

  const result = await submitBugReport({
    message: 'A long enough report.',
  }, { fetchImpl: fetchStub });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'rejected');
});

test('an HTTP failure keeps its status for the log', async () => {
  reply = () => json(429, { success: false });

  const result = await submitBugReport({
    message: 'A long enough report.',
  }, { fetchImpl: fetchStub });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'http_429');
});
