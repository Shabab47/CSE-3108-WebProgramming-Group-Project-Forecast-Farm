/**
 * Builds a brand new farm.
 *
 * Pure: takes the session, returns the state. No storage, no DOM. `store.init`
 * calls this when there is no save to resume.
 */

import { FIELD, ZONES } from '../config/field.js';
import { START_GOLD, STATE_VERSION, WATER } from '../config/game.js';
import { DEFAULT_LOCATION } from '../config/api.js';

/**
 * Zone letter for a grid position. `col` increases to the lower right and `row`
 * to the lower left, so the zones are: A top, B right, C left, D bottom.
 */
export function zoneOf(col, row) {
  const half = FIELD.size / 2;
  const right = col >= half;
  const bottom = row >= half;

  if (!right && !bottom) return 'A';
  if (right && !bottom) return 'B';
  if (!right && bottom) return 'C';
  return 'D';
}

/** One plot per cell. id = row * size + col, so (0,0) is 0. */
export function buildPlots() {
  const plots = [];

  for (let row = 0; row < FIELD.size; row += 1) {
    for (let col = 0; col < FIELD.size; col += 1) {
      const zone = zoneOf(col, row);
      plots.push({
        id: row * FIELD.size + col,
        col,
        row,
        zone,
        zoneLabel: ZONES[zone],
        owned: false,
        cropId: null,
        plantedAt: null,
        waterLevel: WATER.startLevel,
        health: 100,
        dead: false,
      });
    }
  }

  return plots;
}

/** Seed and harvest bags, one entry per crop so the shop and UI stay simple. */
function buildInventory() {
  return {
    seeds: { rice: 0, wheat: 0, potato: 0, corn: 0, tomato: 0 },
    harvest: {},
  };
}

/**
 * A fresh farm: 200 gold, sixteen unowned plots, the default location.
 *
 * @param {object} session `{status, userId, email, farmerName, username}` or null
 */
export function buildInitialState(session) {
  const now = Date.now();

  return {
    version: STATE_VERSION,
    session: normaliseSession(session),
    createdAt: now,
    lastSeenAt: now,

    gold: START_GOLD,
    plots: buildPlots(),
    inventory: buildInventory(),

    pump: { on: false },
    location: { ...DEFAULT_LOCATION },

    selection: { plotId: null, cropId: null },
    weather: null,
    clock: { timeOffsetMs: 0 },
    notified: {},
    lastTickAt: now,
  };
}

/**
 * Coerce anything into a valid session.
 *
 * Two jobs. It drops a session restored from a save that predates the auth field,
 * and it stops a hand-edited save from putting junk in `session` — the field is
 * read by the boot gate, so a malformed one must not be trusted there.
 *
 * Returns null for anonymous, which is what the loader upgrades to a full
 * anonymous session shape rather than leaving undefined.
 */
export function normaliseSession(session) {
  if (!session || typeof session !== 'object') return null;
  if (session.status !== 'authed' && session.status !== 'guest') return null;

  return {
    status: session.status,
    userId: String(session.userId ?? ''),
    email: String(session.email ?? ''),
    farmerName: String(session.farmerName ?? ''),
    username: String(session.username ?? ''),
  };
}