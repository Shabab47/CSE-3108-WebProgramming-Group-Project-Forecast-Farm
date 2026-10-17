/**
 * Builds a brand new farm.
 *
 * Pure: takes the session, returns the state. No storage, no DOM. `store.init`
 * calls this when there is no save to resume.
 *
 * The sixteen plots themselves are described one per file in `js/land_squares/`, and
 * `buildPlots()` here is a thin re-export of that folder's builder — so the geometry,
 * the zones and the free starting plot all live with the segments they describe
 * rather than being restated here. `zoneOf` stays exported because it is the rule
 * behind `PLOT_N.zone` and the tests assert it directly.
 */

import { DEFAULT_LOCATION } from '../config/api.js';
import { FIELD, STARTER_PLOT_ID } from '../config/field.js';
import { START_GOLD, STATE_VERSION } from '../config/game.js';
import { buildPlots, PLOT_COUNT } from '../land_squares/index.js';

export { buildPlots };

/**
 * Zone letter for a grid position. `col` increases to the lower right and `row`
 * to the lower left, so the zones are: A top, B right, C left, D bottom.
 *
 * The rule itself; `js/land_squares/s*.js` already carry the answer per segment.
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

/** Seed and harvest bags, one entry per crop so the shop and UI stay simple. */
function buildInventory() {
  return {
    seeds: { rice: 0, wheat: 0, potato: 0, corn: 0, tomato: 0 },
    harvest: {},
  };
}

/**
 * A fresh farm: 200 gold, the sixteen plots with the back corner already owned, the
 * default location.
 *
 * The one plot the player starts with is `STARTER_PLOT_ID`, and it is owned here
 * rather than bought — so a new player can plant within a minute of starting, which is
 * the whole point of the game beginning on owned land.
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

/**
 * Grant the free starting plot to a save that has none.
 *
 * Farms created before the starter plot existed have all sixteen plots unowned, and
 * a player who has been playing since then owns land they paid for but cannot see
 * bought. Rather than bump `STATE_VERSION` — which would discard every existing farm
 * and hand everyone a new one — a save with no owned plot is given the back corner.
 *
 * **Only a save with zero owned plots is touched.** A player who bought plots and then
 * had them all cleared by something is not repaired, because the more likely reading
 * of that state is a hand-edited save, and inventing land on one is worse than
 * leaving it be.
 *
 * @param {object} state a loaded or fresh farm
 * @returns {object} the same farm, or a copy with the starter plot owned
 */
export function ensureStarterPlot(state) {
  if (!state || !Array.isArray(state.plots)) return state;
  if (state.plots.some((plot) => plot.owned)) return state;
  if (state.plots.length !== PLOT_COUNT) return state;

  return {
    ...state,
    plots: state.plots.map((plot) =>
      plot.id === STARTER_PLOT_ID ? { ...plot, owned: true } : plot,
    ),
  };
}
