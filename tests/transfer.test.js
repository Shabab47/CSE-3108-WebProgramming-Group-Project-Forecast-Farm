/**
 * Tests for the export file format.
 *
 * Pure, so `node --test` covers it with no browser â€” which matters here because
 * the interesting cases are all hostile ones: a truncated file, a file from a
 * future build, a file whose numbers were edited by hand. Those are exactly the
 * cases nobody tests by clicking.
 *
 * The time is always injected, so a round trip is deterministic instead of
 * depending on how long the test took to run.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SAVE_EXTENSION,
  SAVE_FILE_VERSION,
  SAVE_FORMAT,
  canonicalPayload,
  exportFilename,
  exportToText,
  importFromText,
  readExport,
  rebaseState,
  verifySignature,
} from '../js/state/transfer.js';
import { checksum, checksumsMatch } from '../js/utils/checksum.js';
import { buildInitialState } from '../js/state/initialState.js';
import { STATE_VERSION } from '../js/config/game.js';

const NOW = 1_800_000_000_000;
const AUTHED = { status: 'authed', userId: 'uuid-1', email: 'farmer@rice.bd', farmerName: 'Abdul Karim' };

function aFarm(overrides = {}) {
  return { ...buildInitialState(AUTHED), ...overrides };
}

/**
 * Parse an exported file back into its envelope.
 *
 * The file has a header line, so `JSON.parse` cannot be pointed at it directly â€”
 * which is the whole reason the header exists. Going through here means the tests
 * exercise the real container rather than a shortcut around it.
 */
function parseFile(text) {
  const newline = text.indexOf('\n');
  assert.equal(text.slice(0, newline).trim(), 'FFARM/1', 'the header is intact');
  return JSON.parse(text.slice(newline + 1));
}

/** The envelope of a fresh export. */
function envelopeOf(overrides = {}) {
  return { ...parseFile(exportToText(aFarm(), AUTHED, NOW)), ...overrides };
}

/* --- checksum -------------------------------------------------------------- */

test('the checksum is stable for the same text', () => {
  assert.equal(checksum('rice'), checksum('rice'));
  assert.equal(checksum('rice').length, 8, '8 hex characters');
});

test('the checksum changes when the text changes', () => {
  assert.notEqual(checksum('rice'), checksum('rice '));
  assert.notEqual(checksum('rice'), checksum('wice'));
});

test('the checksum comparison does not short-circuit on a prefix', () => {
  assert.equal(checksumsMatch('abcd', 'abcd'), true);
  assert.equal(checksumsMatch('abcd', 'abce'), false);
  assert.equal(checksumsMatch('abcd', 'abc'), false);
  assert.equal(checksumsMatch(undefined, 'abcd'), false);
});

/* --- export ---------------------------------------------------------------- */

test('an export carries the owner, the format and a checksum', () => {
  const envelope = envelopeOf();

  assert.equal(envelope.format, SAVE_FORMAT);
  assert.equal(envelope.version, SAVE_FILE_VERSION);
  assert.equal(envelope.exportedAt, NOW);
  assert.equal(envelope.owner.userId, 'uuid-1');
  assert.equal(envelope.owner.email, 'farmer@rice.bd');
  assert.equal(envelope.owner.farmerName, 'Abdul Karim');
  assert.equal(envelope.state.version, STATE_VERSION);
  assert.ok(envelope.checksum, 'a checksum is present');
});

test('a guest export claims no owner rather than claiming "guest"', () => {
  const guest = { status: 'guest', userId: 'guest', email: '', farmerName: 'Guest farmer' };
  const envelope = parseFile(exportToText(aFarm(), guest, NOW));

  // An empty owner is honest. "guest" would travel into another account's file.
  assert.deepEqual(envelope.owner, { userId: '', email: '', farmerName: '' });
});

test('the exported state is the live state, not a copy that drifts', () => {
  const farm = aFarm({ gold: 1234 });
  const envelope = parseFile(exportToText(farm, AUTHED, NOW));

  assert.equal(envelope.state.gold, 1234);
  assert.equal(envelope.state.plots.length, 16);
});

test('the same farm exports to the same bytes twice', () => {
  const farm = aFarm();
  assert.equal(exportToText(farm, AUTHED, NOW), exportToText(farm, AUTHED, NOW));
});

test('key order does not change the checksum, but content does', () => {
  // Canonical form is built from named fields, so a hand-edited file that merely
  // reorders keys still verifies. This is what stops "the checksum broke" from
  // becoming a reason to distrust it.
  const envelope = envelopeOf();
  assert.equal(checksum(canonicalPayload(envelope)), envelope.checksum);

  const reordered = { state: envelope.state, owner: envelope.owner, exportedAt: envelope.exportedAt, version: envelope.version, format: envelope.format };
  assert.equal(checksum(canonicalPayload(reordered)), envelope.checksum);
});

/* --- the container --------------------------------------------------------- */

test('the file is not JSON and identifies itself on the first line', () => {
  const text = exportToText(aFarm(), AUTHED, NOW);

  assert.ok(text.startsWith('FFARM/1\n'), 'a header line makes it self-identifying');
  // The point of the extension: a JSON parser given the whole file fails on it.
  assert.throws(() => JSON.parse(text), 'the file as a whole is not valid JSON');
  assert.equal(parseFile(text).format, SAVE_FORMAT);
});

test('a header that survived a Windows line ending still reads', () => {
  const text = exportToText(aFarm(), AUTHED, NOW).replace('FFARM/1\n', 'FFARM/1\r\n');

  assert.equal(readExport(text).ok, true, 'a file touched by a Windows editor still imports');
});

test('the wrong header is refused before anything is parsed', () => {
  const text = exportToText(aFarm(), AUTHED, NOW);

  for (const bad of ['NOTAFARM/1\n{}', '', 'FFARM/1\n{}', 'FFARM/2\n{}']) {
    const result = readExport(bad);
    assert.equal(result.ok, false, `accepted header: ${JSON.stringify(bad)}`);
  }

  assert.equal(readExport(text.replace('FFARM/1', 'FFARM/9')).reason, 'file_not_a_save');
});

/* --- filenames ------------------------------------------------------------- */

test('a filename carries the date and the custom extension, and no name', () => {
  const name = exportFilename(Date.UTC(2026, 0, 2));

  assert.equal(name, `forecast-farm-2026-01-02.${SAVE_EXTENSION}`);
});

test('the farmer name never reaches the filename', () => {
  // Filenames leak into cloud-sync listings, backup catalogues, directory indexes
  // and screenshots. The name is inside the file, where it belongs.
  const name = exportFilename(Date.UTC(2026, 0, 2));

  assert.ok(!name.includes('abdul'), name);
  assert.ok(!name.includes('karim'), name);
  assert.ok(!name.includes('rice.bd'), name);
});

test('the filename cannot be used for a path traversal', () => {
  // It is built from a date now, so there is no user input left in it at all.
  const name = exportFilename(Date.UTC(2026, 0, 2));

  assert.ok(!name.includes('/'), name);
  assert.ok(!name.includes('\\'), name);
  assert.ok(!name.includes('..'), name);
});

/* --- round trip ------------------------------------------------------------ */

test('a farm survives a round trip unchanged when exported and read at once', () => {
  const farm = aFarm({ gold: 777 });
  const result = importFromText(exportToText(farm, AUTHED, NOW), NOW);

  assert.equal(result.ok, true);
  assert.equal(result.state.gold, 777);
  assert.deepEqual(result.state.plots, farm.plots);
});

test('the rebase is a no-op for a file imported immediately', () => {
  const farm = aFarm();
  const result = importFromText(exportToText(farm, AUTHED, NOW), NOW);

  assert.equal(result.state.lastTickAt, farm.lastTickAt);
  assert.deepEqual(result.state.plots, farm.plots);
});

/* --- hostile input --------------------------------------------------------- */

test('an empty file is refused', () => {
  for (const bad of ['', '   ', null, undefined]) {
    assert.equal(readExport(bad).reason, 'file_empty');
  }
});

test('a truncated file is refused rather than half-loaded', () => {
  const text = exportToText(aFarm(), AUTHED, NOW);
  const result = readExport(text.slice(0, Math.floor(text.length / 2)));

  assert.equal(result.ok, false);
  assert.ok(['file_not_readable', 'file_damaged'].includes(result.reason), result.reason);
});

test('a JSON file that is not a save is refused', () => {
  assert.equal(readExport(JSON.stringify({ hello: 'world' })).reason, 'file_not_a_save');
});

/** Rewrite a file's body, keeping the header â€” i.e. tamper with it. */
function withBody(mutate) {
  const envelope = parseFile(exportToText(aFarm(), AUTHED, NOW));
  mutate(envelope);
  return `FFARM/1\n${JSON.stringify(envelope, null, 2)}\n`;
}

test('a save from a future build is refused, not half-loaded', () => {
  const text = withBody((envelope) => {
    envelope.version = SAVE_FILE_VERSION + 1;
    delete envelope.checksum;
  });

  // "Newer than us" is a different message from "damaged" on purpose: the file is
  // not broken, we are just older than it.
  assert.equal(readExport(text).reason, 'file_version_newer');
});

test('a file with no farm inside is refused', () => {
  const text = withBody((envelope) => {
    envelope.state = null;
    delete envelope.checksum;
  });

  assert.equal(readExport(text).reason, 'file_no_state');
});

test('a farm from a different state version is refused', () => {
  const text = withBody((envelope) => {
    envelope.state.version = STATE_VERSION + 1;
    delete envelope.checksum;
  });

  assert.equal(readExport(text).reason, 'file_state_version_mismatch');
});

/* --- the honest limit ------------------------------------------------------ */

test('a hand-edited file is caught by the checksum', () => {
  // The classic cheat: more gold, checksum left alone.
  const result = readExport(withBody((envelope) => { envelope.state.gold = 9_999_999; }));

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'file_damaged');
});

test('recomputing the checksum defeats it, and that is known', () => {
  // This test is the honest documentation of what the format does NOT do, and the
  // executable version of the tamper analysis at the bottom of transfer.js. It is
  // here so nobody later believes the file is tamper-proof.
  //
  // The attacker has: the file, the source of `js/utils/checksum.js` (it ships in
  // the page, readable via devtools), and a text editor. A real signature needs a
  // server-held secret â€” see DEC-021 and ISS-032.
  const text = withBody((envelope) => {
    envelope.state.gold = 9_999_999;
    envelope.checksum = checksum(canonicalPayload(envelope));
  });

  const result = readExport(text);

  assert.equal(result.ok, true, 'a determined edit still gets through, by design for now');
  assert.equal(result.state.gold, 9_999_999);
});

test('renaming the file to .json does not change what it is', () => {
  // The extension is a label. This test exists so nobody later treats the rename
  // as a security boundary.
  const text = exportToText(aFarm(), AUTHED, NOW);

  assert.equal(readExport(text).ok, true, 'the header is what identifies it, not the name');
});

test('the file is explicitly not signed, and says so', () => {
  const envelope = envelopeOf();

  assert.deepEqual(verifySignature(envelope), { ok: true, signed: false });

  // No signature field is written, so nothing in the UI can imply one exists.
  assert.equal('signature' in envelope, false);
});

/* --- rebasing -------------------------------------------------------------- */

test('an old file resumes with its crops still growing', () => {
  const THREE_WEEKS = 21 * 24 * 60 * 60 * 1000;
  const planted = NOW - THREE_WEEKS;
  const farm = aFarm({ lastTickAt: planted, createdAt: planted });
  farm.plots[0].plantedAt = planted;

  const result = importFromText(exportToText(farm, AUTHED, planted), NOW);

  assert.equal(result.ageMs, THREE_WEEKS);
  assert.equal(result.state.lastTickAt, NOW, 'the simulator resumes from now, not from three weeks ago');
  assert.equal(result.state.plots[0].plantedAt, NOW, 'the crop keeps the stage it was exported at');
  assert.equal(result.state.createdAt, NOW);
});

test('the rebase never moves a save backwards', () => {
  // A file claiming to be from the future would otherwise produce a negative
  // shift and un-grow a crop.
  const future = NOW + 60_000;
  const farm = aFarm({ lastTickAt: future });
  farm.plots[0].plantedAt = future;

  const result = importFromText(exportToText(farm, AUTHED, future), NOW);

  assert.equal(result.state.lastTickAt, future, 'unchanged, not rewound');
  assert.equal(result.state.plots[0].plantedAt, future);
});

test('the rebase leaves a null plantedAt alone', () => {
  const planted = NOW - 100_000;
  const farm = aFarm();
  farm.plots.forEach((plot) => { plot.plantedAt = null; });
  void planted;

  const result = importFromText(exportToText(farm, AUTHED, NOW - 50_000), NOW);

  // An empty plot has no crop to keep growing; null must stay null.
  assert.deepEqual(result.state.plots.map((p) => p.plantedAt), farm.plots.map(() => null));
});

test('the rebase moves the weather timestamp so it is not marked fresh', () => {
  const farm = aFarm({ weather: { current: 'sunny', hourly: [], fetchedAt: NOW - 90_000, source: 'live' } });
  const result = importFromText(exportToText(farm, AUTHED, NOW - 90_000), NOW);

  assert.equal(result.state.weather.fetchedAt, NOW);
});

test('the rebase does not resurrect expired alert dedupe windows', () => {
  const farm = aFarm({ notified: { 'rice:frost': '2026-01-01T00:00:00.000Z' } });
  const result = importFromText(exportToText(farm, AUTHED, NOW - 500_000), NOW);

  // Left as-is on purpose: every window has expired, so the alerts re-fire once.
  // That is correct. Rebasing them would silently swallow a real frost warning.
  assert.deepEqual(result.state.notified, farm.notified);
});

test('rebaseState never mutates the state it is given', () => {
  const farm = aFarm({ lastTickAt: NOW - 1000 });
  const before = JSON.stringify(farm);

  rebaseState(farm, NOW - 1000, NOW);

  assert.equal(JSON.stringify(farm), before);
});
