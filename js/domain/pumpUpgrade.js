/**
 * Buying the next pump level.
 *
 * The shop owns no rules, so the gate and the price live here: `PUMP.levels` holds the
 * numbers, `ownedPlots()` answers the land question the same way seed unlocks do, and
 * `upgradePump()` is the only function allowed to spend gold on a machine.
 *
 * **The refusals are ordered by what the player can act on.** A maxed pump is a fact;
 * not enough land is a purchase they can make; not enough gold is a wait. Reporting the
 * gold first when the land gate also fails would tell the player to earn money they
 * cannot spend yet.
 *
 * This file imports `pump.js` only for the level and target readers, which are the
 * machine's own shape. It is one-directional — `pump.js` knows nothing about shops —
 * so there is no cycle.
 */

import { PUMP } from '../config/game.js';
import { formatGold } from '../utils/formatGold.js';
import { ownedPlots } from '../utils/seedUnlocks.js';
import { pumpLevelOf, pumpTargetIds } from './pump.js';

/** The next level's entry, or null when the pump is already at the top. */
export function nextPumpUpgrade(state) {
  const current = pumpLevelOf(state);
  const next = PUMP.levels.find((entry) => entry.level === current + 1);
  if (!next) return null;
  return { ...next, currentLevel: current, owned: ownedPlots(state) };
}

/** Whether the shop button should be enabled. The rule is still `upgradePump()`. */
export function canUpgradePump(state) {
  const next = nextPumpUpgrade(state);
  if (!next) return false;
  return ownedPlots(state) >= next.requiredPlots && (state?.gold ?? 0) >= next.price;
}

/**
 * Buy the next level, if the land and the purse both allow it.
 *
 * On success the level rises and the existing targets are kept — the capacity only
 * grows, so nothing the player was already watering falls off the machine. Gold is
 * subtracted exactly, since the price is an integer and the purse may be fractional.
 *
 * @param {object} state
 * @returns {{ok: true, state: object, level: number}|{ok: false, reason: string}}
 */
export function upgradePump(state) {
  const next = nextPumpUpgrade(state);
  if (!next) {
    return { ok: false, reason: 'Your pump is already fully upgraded.' };
  }

  const owned = ownedPlots(state);
  if (owned < next.requiredPlots) {
    return {
      ok: false,
      reason: `Pump level ${next.level} needs ${next.requiredPlots} owned plots — you own ${owned}. Buy more land first.`,
    };
  }

  const gold = state?.gold ?? 0;
  if (gold < next.price) {
    return {
      ok: false,
      reason: `Pump level ${next.level} costs ${formatGold(next.price)} gold and you have ${formatGold(gold)}.`,
    };
  }

  return {
    ok: true,
    level: next.level,
    state: {
      ...state,
      gold: gold - next.price,
      pump: {
        on: Boolean(state.pump?.on),
        level: next.level,
        targets: pumpTargetIds(state),
      },
    },
  };
}
