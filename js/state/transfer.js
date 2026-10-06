/**
 * The export file: turning a save into a portable string, and back.
 *
 * Pure. No storage, no DOM, no `Date.now()` — every input, including the current
 * time, is passed in. That is what makes the round trip testable under
 * `node --test`, which is the only place the format's edge cases can be pinned
 * down cheaply.
 *
 * ## What the file is
 *
 * ```js
 * {
 *   format: 'forecast-farm-save',   // lets us refuse a file that is not ours
 *   version: 1,                     // the envelope's own version, not STATE_VERSION
 *   exportedAt: 1750000000000,
 *   owner: { userId, email, farmerName },
 *   checksum: 'a1b2c3d4',           // FNV-1a over the canonical payload
 *   state: { … }                    // exactly what readSave() would return
 * }
 * ```
 *
 * ## What it is not
 *
 * **Unsigned.** The checksum detects a damaged or truncated file; it does not stop
 * anyone editing the numbers in a text editor and recomputing it. A signature
 * would need a secret the browser cannot read, which means a server, which does
 * not exist yet (ISS-032). `verifySignature()` below is the seam: it passes
 * everything today and becomes the real check when the backend lands, without a
 * format change. See DEC-021.
 *
 * ## Why `owner` is a claim and not a key
 *
 * `owner.userId` and `owner.email` identify whose farm this was. They are never
 * used as key material. An email is public or guessable, so a "signature" keyed on
 * one could be forged by anyone who knows the address — which is the trap this
 * design is built to avoid.
 *
 * ## Timestamps
 *
 * Growth is computed from `plantedAt` and keeps running while the tab is closed
 * (`AGENTS.md` §2.9), so importing a three-week-old file would arrive with every
 * crop finished or dead. `rebaseState()` shifts the clocks forward by the age of
 * the file instead, so a farm resumes at the stage it was exported. See ISS-014.
 */

import { STATE_VERSION } from '../config/game.js';
import { checksum, checksumsMatch } from '../utils/checksum.js';
import { normaliseSession } from './initialState.js';

/** Identifies our files. A random JSON file is refused rather than half-loaded. */
export const SAVE_FORMAT = 'forecast-farm-save';

/** The envelope version. Bump when the *shape* changes, not when the state does. */
export const SAVE_FILE_VERSION = 1;

/** Shown in the filename, so a player can tell their own exports apart. */
const FILE_STEM = 'forecast-farm';

/**
 * The file extension: `.farm`
 *
 * **Double-clicking one does nothing, and that is intended.** The OS has no
 * handler registered for `.farm` and this project ships no desktop app, so
 * double-clicking opens whatever the OS guesses — usually a text editor, sometimes
 * nothing. A player imports by clicking Import in the game, which opens the file
 * picker, and drags the file in from there. Registering an OS association would
 * mean an installed application, which is far outside what this is.
 *
 * Note that `.farm` is a common extension for unrelated farming games and mod
 * files, so the importer cannot rely on the extension at all — hence the magic
 * header below. A genuine other game's `.farm` is refused on the header, with a
 * clear message rather than a half-loaded farm.
 */
export const SAVE_EXTENSION = 'farm';

/**
 * First line of every save: `FFARM/1`.
 *
 * Named after the product, not the extension — the two would drift apart the first
 * time one of them changed, and the header is the part that has to be exact.
 *
 * **A custom extension and a magic header are labels, not locks.** The OS does not
 * enforce extensions: any file can be renamed, and any file can be opened in a text
 * editor whatever it is called. The header's real jobs are to make the file
 * self-identifying when it turns up somewhere unexpected, and to stop an unrelated
 * `.farm` file being fed to the importer and half-loaded.
 *
 * What it deliberately does *not* do is hide anything. The payload stays readable,
 * because a format the team cannot inspect is a format nobody can debug — and
 * because pretending otherwise would be the lie this feature must not tell. See the
 * tamper analysis at the bottom of this file.
 */
const MAGIC = 'FFARM/1';

/* --- canonical form --------------------------------------------------------- */

/**
 * The exact text the checksum is computed over.
 *
 * `JSON.stringify` with a fixed key order, so the same state always produces the
 * same string. If this were derived from the parsed object instead, a file that
 * merely *reordered* its keys would fail verification for no reason, which is the
 * kind of bug that makes people stop trusting a checksum at all.
 */
export function canonicalPayload(envelope) {
  return JSON.stringify({
    format: envelope.format,
    version: envelope.version,
    exportedAt: envelope.exportedAt,
    owner: envelope.owner,
    state: envelope.state,
  });
}

/* --- export ----------------------------------------------------------------- */

/**
 * Build the file text for a save.
 *
 * @param {object} state the live state
 * @param {object} session `{userId, email, farmerName}` — who is exporting
 * @param {number} now epoch ms, injected so tests are deterministic
 * @returns {string} pretty-printed JSON, for a file a person might open
 */
export function exportToText(state, session, now) {
  if (!state || typeof state !== 'object') {
    throw new Error('exportToText: no state to export');
  }

  const live = normaliseSession(session);
  const envelope = {
    format: SAVE_FORMAT,
    version: SAVE_FILE_VERSION,
    exportedAt: now,
    // A guest has no identity to claim, so the fields go empty rather than
    // carrying the placeholder "guest" into someone else's file.
    owner: live && live.status === 'authed'
      ? { userId: live.userId, email: live.email, farmerName: live.farmerName }
      : { userId: '', email: '', farmerName: '' },
    state,
  };

  envelope.checksum = checksum(canonicalPayload(envelope));

  // The header is what makes the file identify itself. The body stays plain JSON
  // so the format remains inspectable and debuggable — see the note on MAGIC.
  return `${MAGIC}\n${JSON.stringify(envelope, null, 2)}\n`;
}

/**
 * Pull the JSON body out of a file's text.
 *
 * @returns {string|null} the body, or null when the header is absent or wrong
 */
function stripHeader(text) {
  if (typeof text !== 'string') return null;

  const newline = text.indexOf('\n');
  if (newline === -1) return null;

  const header = text.slice(0, newline).trim();
  // Tolerating a \r\n line ending, because a file that has been through a Windows
  // editor or a cloud sync client may have gained one.
  return header === MAGIC ? text.slice(newline + 1) : null;
}

/**
 * A filename for the export: `forecast-farm-2026-10-06.farm`
 *
 * **No farmer name.** Filenames are the most widely leaked thing a file has — they
 * show up in file browsers, cloud-sync listings, backup catalogues, directory
 * indexes and screenshots. Putting a person's chosen display name in one exposes
 * it in every one of those places, for no benefit: the name is already *inside*
 * the file, in `owner.farmerName`.
 *
 * The date alone is enough to tell several exports apart.
 */
export function exportFilename(now) {
  const stamp = new Date(now).toISOString().slice(0, 10);
  return `${FILE_STEM}-${stamp}.${SAVE_EXTENSION}`;
}

/* --- signature seam --------------------------------------------------------- */

/**
 * Verify the export's authenticity.
 *
 * **Always passes today**, deliberately, and says so. Claiming otherwise in the
 * UI would be a false promise: there is no secret held anywhere the player cannot
 * read it from. When the backend exists this compares an HMAC over
 * `canonicalPayload()`, signed server-side with a per-user secret, and rejects a
 * mismatch — one function's worth of change, no format change.
 *
 * @returns {{ok: true, signed: false}}
 */
export function verifySignature(envelope) {
  void envelope;
  return { ok: true, signed: false };
}

/* --- import ----------------------------------------------------------------- */

/**
 * Parse and check a file, without touching the clock.
 *
 * Every failure is a `reason` the UI can turn into a sentence. Nothing here
 * mutates anything, so a rejected file leaves the current farm untouched.
 *
 * @param {string} text
 * @returns {{ok:true, envelope:object, state:object}|{ok:false, reason:string}}
 */
export function readExport(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, reason: 'file_empty' };
  }

  // The header is checked first, so a JSON file that happens to be handed over
  // gets "not a save file" rather than a parse error — a clearer answer.
  const body = stripHeader(text);
  if (body === null) return { ok: false, reason: 'file_not_a_save' };

  let envelope;
  try {
    envelope = JSON.parse(body);
  } catch {
    // Could be truncated, or not JSON at all. Either way, refuse it whole.
    return { ok: false, reason: 'file_not_readable' };
  }

  if (envelope?.format !== SAVE_FORMAT) {
    return { ok: false, reason: 'file_not_a_save' };
  }

  if (envelope.version !== SAVE_FILE_VERSION) {
    // A file from a future version is not "corrupt" — it is newer than us, and
    // half-loading it could quietly lose a farm. Say so instead.
    return { ok: false, reason: 'file_version_newer' };
  }

  if (!envelope.state || typeof envelope.state !== 'object') {
    return { ok: false, reason: 'file_no_state' };
  }

  if (envelope.state.version !== STATE_VERSION) {
    // The envelope is fine but the game state inside is from another build.
    // A migration hook belongs here; there is only one version so far.
    return { ok: false, reason: 'file_state_version_mismatch' };
  }

  if (!checksumsMatch(envelope.checksum, checksum(canonicalPayload(envelope)))) {
    return { ok: false, reason: 'file_damaged' };
  }

  const signature = verifySignature(envelope);
  if (!signature.ok) return { ok: false, reason: 'file_not_yours' };

  return { ok: true, envelope, state: envelope.state };
}

/* --- rebasing --------------------------------------------------------------- */

/**
 * Shift a save's clocks forward so an old file resumes where it left off.
 *
 * Four timestamps move together, and missing the last two is how an import
 * produces a farm that is subtly wrong rather than obviously broken:
 *
 *  - `lastTickAt`  — the simulator's "now". Left behind, the first tick after an
 *                    import would credit or bill for every hour the file was
 *                    dormant.
 *  - `plantedAt`    — per plot, or every crop finishes or dies on arrival.
 *  - `createdAt`    — keeps the farm's age honest.
 *  - `weather.fetchedAt` — a stale marker on a response that is no longer current.
 *
 * `notified` is deliberately **not** rebased: its ISO windows have all expired by
 * the time a file is this old, so every alert would re-fire once on arrival
 * (ISS-013). Expiring them is the correct outcome, not a bug.
 *
 * `clock.timeOffsetMs` is untouched — that is a debug time-skip, not a clock.
 *
 * @param {object} state
 * @param {number} now epoch ms
 * @param {number} exportedAt epoch ms the file was written — passed in, because
 *   it lives on the *envelope*, not on the state it wraps
 * @returns {object} a new state; the input is never mutated
 */
export function rebaseState(state, exportedAt, now) {
  const at = Number(exportedAt);
  if (!Number.isFinite(at)) return state;

  // Never move a save backwards: a clock skew or a hand-edited file could
  // otherwise produce a negative shift and un-grow a crop.
  const shift = Math.max(0, now - at);
  if (shift === 0) return state;

  return {
    ...state,
    createdAt: shiftTime(state.createdAt, shift),
    lastTickAt: shiftTime(state.lastTickAt, shift),
    plots: Array.isArray(state.plots)
      // Spread, then replace the one field. Returning the shifted number instead
      // of the plot would turn every plot into a bare number and silently destroy
      // the farm — which is exactly what an earlier draft of this line did.
      ? state.plots.map((plot) => ({ ...plot, plantedAt: shiftTime(plot.plantedAt, shift) }))
      : state.plots,
    weather: state.weather?.fetchedAt
      ? { ...state.weather, fetchedAt: state.weather.fetchedAt + shift }
      : state.weather,
  };
}

function shiftTime(value, shift) {
  return Number.isFinite(value) ? value + shift : value;
}

/* ==========================================================================
 * Tamper analysis — what this file stops, and what it does not
 * ==========================================================================
 *
 * Written here rather than only in a decision record, because the next person to
 * ask "can I trust this file?" should not have to go looking for an answer, and
 * because a security claim that lives only in a document is one nobody checks.
 *
 * ## What the file DOES stop
 *
 *  - Accidental corruption. A truncated download, a half-written file, a bad disk.
 *    The checksum catches these, and they are the overwhelmingly common case.
 *  - A player who edits the file in a text editor, changes a number, and imports
 *    it without thinking about the checksum. They get "file looks damaged".
 *  - The wrong file entirely. A JPEG, a spreadsheet, another farming game's `.farm`
 *    — the header rejects all of them before anything is parsed, which matters more
 *    here than usual because `.farm` is not a rare extension in the wild.
 *  - Files from an unknown or newer build, rather than half-loading them and
 *    quietly losing a farm.
 *  - Filename harvesting. The player's chosen display name is *inside* the file
 *    but not in the filename, so it is not exposed in cloud-sync listings, backup
 *    catalogues or directory indexes.
 *
 * ## What the file does NOT stop
 *
 * **Anyone determined can edit it, and the steps are trivial:**
 *
 *   1. Open the file — the extension does not prevent this, and neither does the
 *      header. Both are labels.
 *   2. Change `"gold": 200` to any number they like.
 *   3. Open browser devtools. `js/utils/checksum.js` ships in the page and is
 *      readable source, so the algorithm is theirs to copy.
 *   4. Recompute the checksum over their edited payload.
 *   5. Import. Accepted.
 *
 * `tests/transfer.test.js` performs exactly that and asserts it succeeds. That test
 * is named "recomputing the checksum defeats it, and that is known" on purpose: it
 * is the executable version of this section, and it fails loudly if anyone later
 * starts believing the file is tamper-proof.
 *
 * ## Why no client-side trick closes the gap
 *
 * Encryption does not fix it, because the key has to reach the browser to decrypt
 * the file. A key that a player can read is not a secret — they open devtools and
 * take it. Obfuscation, XOR, base64, a custom container: all of it raises the
 * effort from "ten seconds" to "five minutes" and changes nothing about whether the
 * goal is achievable. Shipping that while calling the file "encrypted" would be a
 * false claim in the one place a player might rely on it.
 *
 * ## What actually closes it
 *
 * A secret the browser never receives: an HMAC-SHA256 over `canonicalPayload()`,
 * keyed by a per-user secret held server-side, verified on import against the
 * authenticated account. Then step 3 is impossible, because the algorithm is not the
 * problem — the *key* is, and the key would not be in the bundle.
 *
 * That needs the Supabase project (ISS-032) and a server-side function. Until then
 * `verifySignature()` is a seam that passes everything and returns `signed: false`,
 * and the correct description of this feature is **integrity-checked, not
 * authenticated**. See DEC-021.
 * ========================================================================== */

/**
 * Parse a file and return a state ready to adopt, rebased to `now`.
 *
 * This is the whole import in one call, so the UI does not have to remember the
 * order of the steps.
 *
 * @param {string} text
 * @param {number} now epoch ms
 */
export function importFromText(text, now) {
  const read = readExport(text);
  if (!read.ok) return read;

  const exportedAt = Number(read.envelope.exportedAt);

  return {
    ok: true,
    envelope: read.envelope,
    state: rebaseState(read.state, exportedAt, now),
    /** Whose farm this was, for the confirmation prompt. */
    owner: read.envelope.owner ?? null,
    /** How stale it is, so the UI can say "3 weeks old". */
    ageMs: Math.max(0, now - (Number.isFinite(exportedAt) ? exportedAt : now)),
  };
}
