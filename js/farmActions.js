/**
 * What clicking a plot does.
 *
 * The join between the field and the rules, and the reason it is its own file at the
 * top of `js/` rather than inside `main.js`: `main.js` is a boot sequence and was
 * already over the ~200-line budget in `AGENTS.md` before this existed. Entry-level
 * modules may import anything, which is exactly what this needs — it reaches the store,
 * the domain rules, the picker and the toast bus, and no other module is allowed to
 * hold all four.
 *
 * It is also the one place that maps an *intent* onto an *action*:
 *
 * ```
 *   ui/plotClick.js   plotAction()  ->  'harvest' | 'plant' | 'clear' | 'buy' | ...
 *   this file         the switch    ->  apply(harvest) / openPicker() / ...
 * ```
 *
 * The split is deliberate and is the reason a field cannot show one thing and pay out
 * for another. `plotAction()` is pure and tested on its own; this switch is the only
 * place the two halves are joined, and `tests/farmLoop.test.js` reproduces this
 * exact switch to assert the pair still agree.
 */

import { clear, qsOrNull } from './utils/dom.js';
import { createLog } from './utils/log.js';
import { apply, emit, getState } from './state/store.js';
import { clearPlot, harvest, plant } from './domain/farm.js';
import { buyPlot } from './domain/land.js';
import { isSeedUnlocked } from './utils/seedUnlocks.js';
import { nextUnlockable } from './land_squares/index.js';
import { plotAction } from './ui/plotClick.js';
import { mountCropPicker } from './ui/cropPicker.js';

const log = createLog('farmActions');

const SHOP_URL = 'shop.html';

/**
 * The seed picker's host element, or null before the page has one.
 *
 * A dedicated `#farm-picker` in `index.html`: a **body-level child beside the toast
 * stack**, not anything inside `.app`. It was originally appended into `#farm-view`, and
 * `mountFarmView()` clears that element wholesale on every render — so the 1 Hz growth
 * tick destroyed the picker about once a second and a player could click a plot but had
 * under a second to choose a seed. It then moved to a child of `.app__centre`, which
 * survived the clear but centred the card on the middle column rather than the screen.
 *
 * Both placements were wrong for a different reason, and the two requirements pull against
 * each other: it must be **outside** anything a field render clears, and it must be
 * anchored to the **viewport** to centre properly. A body-level `position: fixed` overlay
 * is the only thing that satisfies both — `.app` is `overflow: hidden` and `height: 100dvh`,
 * so anything inside it is boxed into the game shell.
 *
 * There is deliberately **no `pickerHost` variable and no `isOpen` flag.** The DOM is
 * the state: the host has children while the picker is up and none when it is not. A
 * second source of truth here is what let the two get out of step in the first place.
 */
function pickerHost() {
  return qsOrNull('#farm-picker');
}

/**
 * Handle a click on a plot.
 *
 * **One place decides this**, and it asks `plotAction()` rather than re-deriving the
 * cases. Five rules spread across two files is four more places for them to disagree.
 *
 * @param {number} plotId
 */
export function onPlotClick(plotId) {
  const state = getState();
  if (!state) return;

  switch (plotAction(state, plotId)) {
    case 'harvest': {
      const result = apply(harvest, plotId);
      // `apply` toasts a refusal itself, so there is nothing to say about a failure.
      // A success is worth announcing: the gold moves somewhere else on the page, and
      // a harvest that silently pays reads as a bug rather than as a payout.
      if (result.ok) {
        const earned = getState().gold - state.gold;
        emit('toast', { message: `Harvested — ${earned} gold.`, tone: 'success' });
      }
      break;
    }

    case 'plant':
      openPicker(plotId);
      break;

    case 'clear':
      apply(clearPlot, plotId);
      break;

    case 'buy':
      buyNextPlot(plotId);
      break;

    default:
      log.trace('plot clicked, nothing to do', plotId);
  }
}

/**
 * Buy the plot that was clicked.
 *
 * No confirm popover yet. DEC-036 lists one and it is a real question: a misclick
 * spends gold that took an hour to earn, and the plot next in the order is always the
 * one under the player's hand. It is open in `docs/team/issues.md`.
 *
 * The *refusal* path is not deferred, though — clicking a plot that is not on offer
 * says so rather than doing nothing, because a click that does nothing and a click
 * that is not available look identical from the player's side of the screen.
 */
function buyNextPlot(plotId) {
  const state = getState();
  const offer = nextUnlockable(state);
  if (!offer) return;

  // Unreachable through the UI — a locked plot's button is `disabled` and `plotAction`
  // returns `buy` only for the plot on offer — but `apply()` is also callable from a
  // stale click or a hand-edited save, so the message is worth having.
  if (plotId !== offer.plotId) {
    emit('toast', {
      message: `That is not the next plot. Buy plot ${offer.plotId + 1} first.`,
      tone: 'error',
    });
    return;
  }

  const result = apply(buyPlot, plotId);
  if (result.ok) {
    emit('toast', { message: `Bought plot ${plotId + 1} for ${offer.price} gold.`, tone: 'success' });
  }
}

/** Open the seed picker over the farm, for one plot. */
function openPicker(plotId) {
  const host = pickerHost();
  if (!host) return;

  clear(host);

  mountCropPicker(host, {
    seeds: getState()?.inventory?.seeds ?? {},
    plotId,
    // The picker hides locked seeds, and the domain refuses them — belt and
    // braces, because a seed bought just before its gate moved is still in
    // the bag. Both read the same helper so they cannot disagree.
    isUnlocked: (cropId) => isSeedUnlocked(getState(), cropId),
    onPlant: (cropId) => {
      // Close *before* applying, so the list of seeds the player just spent is never on
      // screen for even one frame.
      closePicker();
      apply(plant, plotId, cropId);
    },
    onShop: () => {
      closePicker();
      location.href = SHOP_URL;
    },
    onClose: closePicker,
  });
}

/**
 * Take the picker down. Safe to call when there is not one.
 *
 * Called from the picker's own actions — plant, shop, never mind — and **only** from
 * those. It used to be called on every state change, which meant the picker could not
 * survive a re-render; but a re-render is not a reason to dismiss it, because the only
 * thing that can change the seed bag underneath it is planting, and planting dismisses
 * it. A save completing, the clock ticking, or the weather refreshing are all reasons
 * to redraw the page and none of them are reasons to take a choice away from a player
 * who is mid-choice.
 */
export function closePicker() {
  const host = pickerHost();
  if (host) clear(host);
}
