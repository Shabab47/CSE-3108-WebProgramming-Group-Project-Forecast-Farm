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
import { isAvatarId } from '../config/avatars.js';
import { FIELD, STARTER_PLOT_ID } from '../config/field.js';
import { DAMAGE, DEFAULT_DIFFICULTY, isDifficulty, PUMP, START_GOLD, STATE_VERSION } from '../config/game.js';
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
 * @param {object} [options]
 * @param {string|null} [options.avatar] a preset chosen during sign-up, or null
 */
export function buildInitialState(session, options = {}) {
  const now = Date.now();
  const avatar = options?.avatar;
  const chosenAvatar = isAvatarId(avatar) ? avatar : null;

  return {
    version: STATE_VERSION,
    session: normaliseSession(session),
    profile: { avatar: chosenAvatar },
    createdAt: now,
    lastSeenAt: now,

    gold: START_GOLD,
    plots: buildPlots(),
    inventory: buildInventory(),

    // The pump is a machine with a level, not a single aim. `targets` is a list of
    // plot ids because level 2 and above can water several at once (DEC-058); level 1
    // is the free machine every new farm owns and reaches one plot.
    pump: { on: false, level: 1, targets: [] },
    location: { ...DEFAULT_LOCATION },

    selection: { plotId: null, cropId: null },
    weather: null,
    clock: { timeOffsetMs: 0 },
    notified: {},

    // Which way this farm treats a ripe crop. Normal unless the player says otherwise —
    // see `DIFFICULTY` in `js/config/game.js`, and `ensureDifficulty` below for how an
    // older save is read.
    difficulty: DEFAULT_DIFFICULTY,

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
 * Give a save written before difficulty existed a mode.
 *
 * Farms created before this setting have no `difficulty` key, so the question is what
 * "undefined" means, and the answer has to be `normal`: that is the behaviour every one
 * of those farms was created under and has been playing. Defaulting to easy would
 * silently switch a ripe crop from decaying to invulnerable under a player who never
 * asked for anything of the sort.
 *
 * **And it does not bump `STATE_VERSION`**, for the same reason `ensureStarterPlot` does
 * not: a version bump is how this codebase discards every farm, and one new key is not
 * worth that. An unrecognised value is repaired too — a hand-edited save, or an import
 * from a future version — because a farm whose difficulty is nonsense should not be one
 * where the setting silently does nothing.
 *
 * @param {object} state a loaded farm
 * @returns {object} the same farm, or a copy carrying a known difficulty
 */
export function ensureDifficulty(state) {
  if (!state || typeof state !== 'object') return state;
  if (isDifficulty(state.difficulty)) return state;

  return { ...state, difficulty: DEFAULT_DIFFICULTY };
}

/**
 * Give a save written before pump levels existed the shape the rest of the game reads.
 *
 * The old save has `{ on, target }`: one plot, no level. This rewrites it as
 * `{ on, level: 1, targets: [...] }` — the free starter pump keeps watering the one
 * plot the old save was aimed at (it now has room for a second), so the player's
 * machine keeps doing what it was doing. It also repairs a hand-edited save: an unknown level falls back to 1, a
 * duplicate or unowned target is dropped, and a target list longer than the level's
 * capacity is trimmed to the first plots in order.
 *
 * **It does not bump `STATE_VERSION`**, for the same reason `ensureDifficulty` does
 * not: discarding every farm to add one field would be a much larger change than the
 * field itself. A save that is already in the new shape is returned as the same object.
 *
 * @param {object} state a loaded or fresh farm
 * @returns {object} the same farm, or a copy carrying a canonical pump
 */
export function ensurePump(state) {
  if (!state || typeof state !== 'object') return state;
  if (!Array.isArray(state.plots)) return state;

  const pump = state.pump && typeof state.pump === 'object' && !Array.isArray(state.pump)
    ? state.pump
    : {};
  const info = PUMP.levels.find((entry) => entry.level === pump.level) ?? PUMP.levels[0];

  const waterable = new Set(
    state.plots
      .filter((plot) => plot?.owned && !plot.dead)
      .map((plot) => plot.id),
  );

  // `targets` is the current shape; `target` is the one-plot shape every older save
  // carries. Reading both here is what makes the migration a migration rather than a
  // version bump.
  const raw = Array.isArray(pump.targets)
    ? pump.targets
    : (pump.target == null ? [] : [pump.target]);

  const targets = [];
  for (const id of raw) {
    if (!Number.isInteger(id) || !waterable.has(id) || targets.includes(id)) continue;
    targets.push(id);
    if (targets.length >= info.capacity) break;
  }

  const on = Boolean(pump.on);
  const unchanged = pump.on === on
    && pump.level === info.level
    && Array.isArray(pump.targets)
    && pump.targets.length === targets.length
    && pump.targets.every((id, index) => id === targets[index]);
  if (unchanged) return state;

  return { ...state, pump: { on, level: info.level, targets } };
}

/**
 * Build the farm a player gets after "Erase progress", keeping their avatar.
 *
 * Erasing progress wipes gold, land, crops and the save's history, but the picture is
 * how the player is identified on the account page — it is a profile choice, not
 * something they earned. Deleting the account is different and uses `buildInitialState`
 * directly, so the avatar goes with the save.
 *
 * Only a known preset id is carried. A hand-edited or imported save that reaches this
 * path with something else is reset to the default, the same way `ensureProfile` treats
 * it on load.
 *
 * @param {object} session the live session
 * @param {object} previous the farm about to be erased
 * @returns {object} a fresh farm carrying the previous avatar when valid
 */
export function buildErasedState(session, previous) {
  const fresh = buildInitialState(session);
  const avatar = previous?.profile?.avatar;
  if (!isAvatarId(avatar)) return fresh;
  return { ...fresh, profile: { ...fresh.profile, avatar } };
}

/**
 * Give a save written before avatars existed the default profile.
 *
 * Like `ensureDifficulty`, this repairs a missing field rather than bumping
 * `STATE_VERSION`: a save's farm must survive the addition of one optional cosmetic.
 * An id that is not in `config/avatars.js` is treated as the default, because a
 * hand-edited or older id must not render as a broken circle. Other profile fields are
 * kept, so this can grow without another migration.
 *
 * @param {object} state a loaded farm
 * @returns {object} the same farm, or a copy carrying a valid profile
 */
export function ensureProfile(state) {
  if (!state || typeof state !== 'object') return state;

  const profile = state.profile
    && typeof state.profile === 'object'
    && !Array.isArray(state.profile)
    ? state.profile
    : null;
  const avatar = profile?.avatar;

  if (profile && (avatar === null || isAvatarId(avatar))) return state;
  return { ...state, profile: { ...(profile ?? {}), avatar: null } };
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

/**
 * How long a crop must have lived before `kind` can latch, in milliseconds.
 *
 * Kept here rather than imported from `domain/damage.js` because `state/` may import
 * only `config/`, `utils/` and `state/` — the layering rule, not a preference. The
 * numbers themselves come from `DAMAGE`, so the two rules cannot drift.
 */
function holdMs(kind) {
  if (kind === 'dry') return DAMAGE.hoursBelowFloorToLatch * 3_600_000;
  if (kind === 'waterlogged') return DAMAGE.hoursAboveTargetToLatch * 3_600_000;
  return null;
}

/**
 * Clear a damage latch the crop could not have earned.
 *
 * **This is the one-time repair for saves written before `damageAt` existed.** A
 * pre-ISS-114 save recorded that a plot was damaged, never when, so a badge inherited
 * from the previous crop is indistinguishable from one this crop earned. Clearing all
 * of them is the only repair that works however long the save sits before it is loaded;
 * a legitimate latch loses its badge once, and health already spent is not refunded —
 * DEC-054.
 *
 * A latch is kept only when all of these are true:
 *
 *  - there is a crop on the plot;
 *  - `damage` is one of the two latchable states;
 *  - `plantedAt` and `damageAt` are finite numbers; and
 *  - the crop had lived the hold (`damageAt - plantedAt >= hold`).
 *
 * Anything else is cleared to `null`. This is idempotent: a repaired farm is returned
 * as the same object on the next load. A missing `damageAt` on a **healthy** plot is
 * left alone — it is not a latch, and `applyDamage()` will add the field when needed.
 *
 * @param {object} state a loaded or imported farm
 * @returns {object} the same farm, or a copy with impossible latches cleared
 */
export function ensurePlausibleDamage(state) {
  if (!state || !Array.isArray(state.plots)) return state;

  let changed = false;

  const plots = state.plots.map((plot) => {
    if (!plot || typeof plot !== 'object') return plot;

    const damage = plot.damage ?? null;
    if (damage === null && plot.damageAt == null) return plot;

    const hold = holdMs(damage);
    const plausible = Boolean(plot.cropId)
      && hold != null
      && Number.isFinite(plot.plantedAt)
      && Number.isFinite(plot.damageAt)
      && plot.damageAt - plot.plantedAt >= hold;

    if (plausible) return plot;

    changed = true;
    return { ...plot, damage: null, damageAt: null };
  });

  return changed ? { ...state, plots } : state;
}
