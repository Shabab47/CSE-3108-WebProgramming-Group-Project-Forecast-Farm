/**
 * Handing the pump from a finished plot to a new one.
 *
 * A pump has a fixed number of outlets (`PUMP.levels[].capacity`). Once a plot reaches
 * its optimal water level the pump has nothing more to give it, but the plot used to keep
 * its outlet, so the player had to stop watering it by hand before aiming at the next
 * plot. Now, when the machine is full and the player asks for another plot, the pump
 * lets go of a plot that has already reached optimal and takes the new one.
 *
 * **"Finished" means the plot is in its optimal band**, the same band the inspector's
 * gauge calls "optimal" (`waterState()`): at or above the band floor. It is *not* "exactly
 * at the target". The pump switches itself off when a plot fills, and from that moment
 * the plot starts to evaporate, so within seconds it sits a little under the target while
 * still reading Optimal. A strict equality test would stop recognising it as finished.
 *
 * **Only a finished plot is ever released.** If every outlet is still filling something
 * thirsty (a low or dry plot), the answer is still "pump full".
 *
 * **The most-watered finished plot goes first.** That is the plot holding the most
 * water, so letting go of it costs the least. Ties go to the plot that has been on the
 * pump longest.
 *
 * This lives beside `pump.js`, not inside it, because it needs `targetFor()` from
 * `plotWater.js`, and `plotWater.js` already imports `costOf` from `pump.js`. Putting it
 * here keeps the dependency one-directional.
 */

import { aimPump, pumpTargetIds, removePumpTarget } from './pump.js';
import { waterState } from './plotWater.js';

/** Optimal, or past it. Anything below the band floor is still thirsty. */
function atOptimal(plot) {
  if (!plot || plot.dead) return false;
  const band = waterState(plot);
  return band === 'optimal' || band === 'saturated';
}

/**
 * The plot id the pump would let go of to make room, or null if none has finished.
 *
 * @param {object} state
 * @returns {number|null}
 */
export function releasableTarget(state) {
  let best = null;
  let bestLevel = -Infinity;

  for (const id of pumpTargetIds(state)) {
    const plot = (state?.plots ?? []).find((p) => p.id === id);
    if (!atOptimal(plot)) continue;
    const level = plot.waterLevel ?? 0;
    // Strictly greater, so an earlier target wins a tie.
    if (level > bestLevel) {
      best = id;
      bestLevel = level;
    }
  }
  return best;
}

/**
 * Whether asking for `plotId` would succeed by releasing a finished plot. The inspector
 * uses it to decide between a disabled "Pump full" button and an enabled swap button.
 */
export function wouldSwap(state, plotId) {
  const first = aimPump(state, plotId);
  return !first.ok && first.reason === 'pump_full' && releasableTarget(state) !== null;
}

/**
 * `aimPump()`, except a full machine releases its most-watered finished plot instead of
 * refusing.
 *
 * @param {object} state
 * @param {number} plotId
 * @returns {{ok: true, state: object, added: boolean, released: number|null}
 *   |{ok: false, reason: string, level?: number, capacity?: number}}
 *   `released` is the plot id that was let go, or null when there was room.
 */
export function aimPumpOrRelease(state, plotId) {
  const direct = aimPump(state, plotId);
  if (direct.ok) return { ...direct, released: null };
  if (direct.reason !== 'pump_full') return direct;

  const releasing = releasableTarget(state);
  if (releasing === null) return direct;

  const freed = removePumpTarget(state, releasing);
  const aimed = aimPump(freed, plotId);
  if (!aimed.ok) return aimed;
  return { ...aimed, released: releasing };
}