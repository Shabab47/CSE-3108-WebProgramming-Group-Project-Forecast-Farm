/**
 * Tests for the store's persistence contract, against a fake localStorage.
 *
 * `store.js` is the only module that writes game saves, and its failure modes
 * -- corrupt JSON, a stale version, a malformed session -- are exactly the ones
 * a player hits after a bad reload. Each has to degrade into a new farm, never a
 * blank screen.
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as store from '../js/state/store.js';
import { clearSave, getState, init, load, reset, saveNow, subscribe } from '../js/state/store.js';
import { AUTH_KEYS } from '../js/config/auth.js';
import { STATE_VERSION } from '../js/config/game.js';
import { buildInitialState } from '../js/state/initialState.js';

const SESSION = { status: 'authed', userId: 'acc_test', email: 'farmer@rice.bd', farmerName: 'Abdul Karim' };
const KEY = `${AUTH_KEYS.savePrefix}${SESSION.userId}`;

/** Minimal localStorage stand-in, installed on globalThis for the test run. */
function installFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  globalThis.localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
    get size() {
      return data.size;
    },
  };

  return data;
}

beforeEach(() => {
  installFakeStorage();
  reset();
});

test('a new session gets a fresh farm and a save written immediately', async () => {
  const result = await init(SESSION);

  assert.equal(result.loaded, false);
  assert.equal(getState().gold, 200);
  assert.equal(getState().session.email, SESSION.email);
  assert.ok(localStorage.getItem(KEY), 'a fresh farm is saved right away');
});

test('the save key is derived from the session userId', async () => {
  await init(SESSION);
  await saveNow();

  assert.ok(localStorage.getItem(KEY), 'keyed by userId, not by a missing field');
});

test('re-initialising the same session resumes the save', async () => {
  await init(SESSION);
  getState().gold = 1234;
  await saveNow();
  reset();

  const result = await init(SESSION);
  assert.equal(result.loaded, true);
  assert.equal(getState().gold, 1234);
});

test('two users on one machine keep separate farms', async () => {
  await init(SESSION);
  getState().gold = 500;
  await saveNow();
  reset();

  const other = { ...SESSION, userId: 'acc_other', email: 'other@rice.bd' };
  const result = await init(other);

  assert.equal(result.loaded, false);
  assert.equal(getState().gold, 200, 'a different user starts fresh');
});

test('a resumed save takes the live session, not the one it was saved with', async () => {
  await init(SESSION);
  getState().gold = 500;
  await saveNow();
  reset();

  // A save can be days old. The live session is authoritative, or signing out and
  // back in would resurrect the old identity.
  const result = await init({ ...SESSION, email: 'farmer@newmail.bd', farmerName: 'Renamed' });

  assert.equal(result.loaded, true);
  assert.equal(getState().gold, 500, 'the farm survives');
  assert.equal(getState().session.email, 'farmer@newmail.bd', 'the identity is current');
});

test('a save whose session is malformed is repaired, not trusted', async () => {
  // `session` is read by the boot gate, so a hand-edited or stale value must not
  // be believed. `normaliseSession` in initialState.js coerces it.
  installFakeStorage({
    [KEY]: JSON.stringify({ version: STATE_VERSION, state: { gold: 999, session: 'nonsense' } }),
  });
  reset();

  const result = await init(SESSION);

  assert.equal(result.loaded, true, 'the farm itself is still good');
  assert.equal(getState().gold, 999);
  assert.equal(typeof getState().session, 'object');
  assert.equal(getState().session.userId, SESSION.userId);
});

test('a corrupt save falls back to a new farm instead of throwing', async () => {
  installFakeStorage({ [KEY]: '{not json' });
  reset();

  const result = await init(SESSION);
  assert.equal(result.loaded, false);
  assert.equal(getState().gold, 200);
});

test('a save from another version is ignored', async () => {
  installFakeStorage({
    [KEY]: JSON.stringify({ version: STATE_VERSION + 99, state: { gold: 999999 } }),
  });
  reset();

  assert.equal((await init(SESSION)).loaded, false);
  assert.equal(getState().gold, 200);
});

test('a save missing its state payload is ignored', async () => {
  installFakeStorage({ [KEY]: JSON.stringify({ version: STATE_VERSION }) });
  reset();

  assert.equal((await init(SESSION)).loaded, false);
});

test('load() is null before a session exists', async () => {
  assert.equal(load(), null);
});

test('clearSave removes the save', async () => {
  await init(SESSION);
  await saveNow();
  assert.ok(localStorage.getItem(KEY));

  await clearSave();
  assert.equal(localStorage.getItem(KEY), null);
});

test('saveNow writes the state it is given, not a stale copy', async () => {
  await init(SESSION);
  getState().gold = 777;
  await saveNow();

  const stored = JSON.parse(localStorage.getItem(KEY));
  assert.equal(stored.version, STATE_VERSION);
  assert.equal(stored.state.gold, 777);
});

test('subscribe delivers the current state immediately', async () => {
  await init(SESSION);
  reset();
  await init(SESSION);

  let seen = 'not called';
  const off = subscribe((state) => {
    seen = state?.gold;
  });

  assert.equal(seen, 200, 'a panel paints on subscribe, not on the next change');
  off();
});

test('storage that throws does not crash the save', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };

  // `init` and `saveNow` are async now, so this is `doesNotReject` rather than
  // `doesNotThrow`: a plain sync assertion would not see an async failure. Storage
  // that throws is caught inside saveFile.js and degrades to in-memory play, so
  // nothing may escape here.
  await assert.doesNotReject(async () => {
    await init(SESSION);
    await saveNow();
  });
  assert.equal(getState().gold, 200, 'the farm still runs in memory');
});

/* --- the server save --------------------------------------------------------- */

/** A stub standing in for services/saveApi.js, which state/ may not import. */
function fakeServer({ read = { ok: true, state: null }, writeFails = false } = {}) {
  const calls = { reads: 0, writes: 0 };
  return {
    calls,
    read: async () => { calls.reads += 1; return read; },
    write: async () => {
      calls.writes += 1;
      if (writeFails) throw new Error('offline');
      return { ok: true };
    },
    delete: async () => ({ ok: true }),
  };
}

test('the server save is consulted before the local copy', async () => {
  const server = fakeServer({ read: { ok: true, state: { ...buildInitialState(SESSION), gold: 9999 } } });

  const result = await init(SESSION, buildInitialState, server);

  assert.equal(result.fromServer, true, 'it must say the farm came from the server');
  assert.equal(getState().gold, 9999);
  assert.equal(server.calls.reads, 1);
});

test('an unreachable server falls back to the local farm, and keeps it', async () => {
  // This is the whole point of keeping localStorage: a player whose network drops
  // mid-session resumes their farm instead of starting over.
  await init(SESSION);
  getState().gold = 4242;
  await saveNow();

  const offline = fakeServer({ read: { ok: false, reason: 'network_request_failed' } });
  reset();
  const result = await init(SESSION, buildInitialState, offline);

  assert.equal(result.fromServer, false);
  assert.equal(getState().gold, 4242, 'the local copy carried them through');
});

test('a missing table is a fallback, not a lost farm', async () => {
  await init(SESSION);
  getState().gold = 777;
  await saveNow();

  // 404 is what the migration not having been run looks like. It must never read
  // as "no farm", or the fresh farm would overwrite the real one on the next save.
  const missing = fakeServer({ read: { ok: false, reason: 'server_error', status: 404 } });
  reset();
  const result = await init(SESSION, buildInitialState, missing);

  assert.equal(getState().gold, 777);
  assert.equal(result.loaded, true);
});

test('a failed server write never breaks the local save', async () => {
  const server = fakeServer({ writeFails: true });

  await assert.doesNotReject(async () => {
    await init(SESSION, buildInitialState, server);
  });

  assert.ok(localStorage.getItem(KEY), 'the local copy was written regardless');
  assert.equal(server.calls.writes, 1, 'and the attempt was still made');
});

test('with no server injected, behaviour is exactly as before', async () => {
  const result = await init(SESSION);

  assert.equal(result.fromServer, false);
  assert.equal(result.loaded, false);
  assert.ok(localStorage.getItem(KEY));
});

test('a guest gets no server save and the farm stays local', async () => {
  const guest = { status: 'guest', userId: 'guest', email: '', farmerName: 'Guest Farmer' };

  // main.js refuses to build a server save for a guest: no token means auth.uid()
  // is null, the RLS policy matches no row, and every request would 401.
  await init(guest, undefined, null);

  assert.ok(localStorage.getItem(`${AUTH_KEYS.savePrefix}guest`), 'saved locally under the guest key');
});

test('clearSave removes both copies', async () => {
  const server = fakeServer({});
  let deleted = false;
  server.delete = async () => { deleted = true; return { ok: true }; };

  await init(SESSION, buildInitialState, server);
  await clearSave();

  assert.equal(localStorage.getItem(KEY), null);
  assert.equal(deleted, true, 'the server row goes too, or signing back in would resurrect it');
});

/* --- import ---------------------------------------------------------------- */

test('adoptState replaces the farm and writes it straight to disk', async () => {
  await init(SESSION);
  const replacement = { ...getState(), gold: 4242 };

  const result = store.adoptState(replacement);

  assert.equal(result.ok, true);
  assert.equal(getState().gold, 4242);
  // Written immediately rather than debounced: the old save must not outlive the
  // moment the player chose to replace it.
  assert.equal(JSON.parse(localStorage.getItem(KEY)).state.gold, 4242);
});

test('adoptState keeps the live session, not one carried in the file', async () => {
  await init(SESSION);

  store.adoptState({
    ...getState(),
    session: { status: 'authed', userId: 'someone-else', email: 'x@y.z', farmerName: 'Imposter' },
  });

  assert.equal(getState().session.userId, SESSION.userId, 'a file cannot reassign who is playing');
  assert.equal(getState().session.farmerName, SESSION.farmerName);
});

test('adoptState refuses rubbish without disturbing the current farm', async () => {
  await init(SESSION);
  const gold = getState().gold;

  for (const bad of [null, undefined, 'text', 42, {}, { plots: 'not an array' }]) {
    assert.equal(store.adoptState(bad).ok, false, `accepted ${JSON.stringify(bad)}`);
  }

  assert.equal(getState().gold, gold, 'the farm in memory is untouched');
});

test('adoptState before init is refused', async () => {
  reset();
  assert.equal(store.adoptState({ plots: [] }).reason, 'store not initialised');
});

test('an imported farm notifies subscribers', async () => {
  await init(SESSION);
  const seen = [];
  const stop = subscribe((s) => seen.push(s?.gold));

  store.adoptState({ ...getState(), gold: 777 });
  stop();

  assert.ok(seen.includes(777), 'a panel would never redraw otherwise');
});

/* --- export ---------------------------------------------------------------- */

test('exportPayload produces a file that reads back as the same farm', async () => {
  await init(SESSION);
  store.apply((s) => ({ ok: true, state: { ...s, gold: 3131 } }));

  const payload = store.exportPayload(Date.now());
  assert.equal(payload.ok, true);
  assert.match(payload.filename, /^forecast-farm-\d{4}-\d{2}-\d{2}\.farm$/);

  const read = store.readImport(payload.text, Date.now());
  assert.equal(read.ok, true);
  assert.equal(read.state.gold, 3131);
});

test('exportPayload and readImport before init refuse rather than throw', async () => {
  reset();

  assert.equal(store.exportPayload(Date.now()).reason, 'store not initialised');
  assert.doesNotThrow(() => store.readImport('{}', Date.now()));
  assert.equal(store.readImport('{}', Date.now()).ok, false);
});