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
import { verdictFor } from './domain/weather.js';
import { aimPump, setPump } from './domain/pump.js';
import { mountPlotInspector } from './ui/plotInspector.js';
import { isSeedUnlocked } from './utils/seedUnlocks.js';
import { formatGold } from './utils/formatGold.js';
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
 * The open inspector, if there is one.
 *
 * **A reference, and not a second source of truth.** The comment above says there is no
 * `isOpen` flag because the DOM is the state; this does not contradict that. It holds the
 * handle the panel itself handed back, purely so `refreshInspector` can patch it in place
 * instead of tearing the card down. It is set on open and cleared on close, and
 * `refreshInspector` still asks the host whether it has children — so if they ever
 * disagree, the host wins and the panel is rebuilt rather than patched into nothing.
 *
 * This exists because `mountPlotInspector` now returns `{update}`, and a re-mount throws
 * the old node away, which is the thing that stopped the gauge animating.
 */
let inspectorView = null;

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

  // **A click opens the plot's own inspector**, whatever state the plot is in. It used to
  // be: a running pump claimed the click and aimed itself, bare land opened the seed
  // picker, and a growing crop did nothing at all — so "how wet is this square, and can I
  // water it" was only answerable from the right rail, which describes whichever plot the
  // pump happens to be pointed at and no other.
  //
  // The plot is the unit the player is thinking in, so the plot is what gets opened. Every
  // action the old switch handled is a button in there, so nothing that was one click away
  // is now two — it is one click and then one button, on a surface that also tells you what
  // you are about to do.
  if (plotAction(state, plotId) === 'locked') {
    log.trace('plot clicked, and it is not available yet', plotId);
    return;
  }

  closePicker();
  openPlot = plotId;
  inspectorView = mountPlotInspector(pickerHost(), getState(), plotId, inspectorActions());
}

/** The old switch, now one action of the inspector rather than the click itself. */
function runPlotAction(plotId) {
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
        emit('toast', { message: `Harvested — ${formatGold(earned)} gold.`, tone: 'success' });
      }
      closePicker();
      break;
    }

    case 'plant':
      // The seed picker takes the host over. `closePicker` first, because the DOM is the
      // state here and two overlays in one host is neither of them.
      closePicker();
      openPicker(plotId);
      break;

    case 'clear':
      apply(clearPlot, plotId);
      closePicker();
      break;

    case 'buy':
      buyNextPlot(plotId);
      closePicker();
      break;

    default:
      log.trace('plot action requested, nothing to do', plotId);
  }
}

/**
 * Re-render the inspector against current state.
 *
 * Needed because the pump runs on its own clock: leaving the panel open while it fills
 * means the gauge, the countdown and the gold estimate have to move under the player's
 * hand, or the panel is a screenshot of a moment that has already passed.
 *
 * **This patches the open panel rather than rebuilding it.** Re-mounting was correct and
 * looked correct — the numbers moved — but it destroyed and recreated the fill element
 * every second, and a CSS `transition` only runs when the *same* element changes value.
 * So the gauge jumped instead of sweeping. `update()` writes `style.height` on the node
 * that is already on screen and the transition does its job.
 */
function refreshInspector() {
  const state = getState();
  if (!state || openPlot == null) return;
  const host = pickerHost();
  if (!host || !host.children.length) return;

  if (inspectorView?.update) {
    inspectorView = inspectorView.update(state) ?? inspectorView;
    return;
  }

  // No handle — someone mounted it another way. Fall back to a full build rather than
  // leaving a panel that silently stops following the pump.
  inspectorView = mountPlotInspector(host, state, openPlot, inspectorActions());
}

/**
 * Re-render the open inspector, for whoever is driving the clock.
 *
 * `main.js` calls this from `renderPanels` so an open panel follows the pump instead of
 * sitting there showing the water level from the moment it was opened.
 */
export function refreshInspectorOnTick() {
  refreshInspector();
}

/**
 * The inspector's callbacks.
 *
 * Held in one function so the buttons in the panel and the re-render after a click are
 * the same code. Two copies of "what does the pump button do" is how the panel and the
 * rail would end up disagreeing about whether the pump is on.
 */
function inspectorActions() {
  return {
    onClose: closePicker,

    // The pump button. Aiming and switching on in one step, because "water this plot" is
    // one intent, and asking for it in two was only ever a consequence of the pump living
    // on the rail instead of on the plot it waters.
    onPump: (id, on) => {
      const current = getState();
      if (!current) return;

      if (on) {
        const aimed = aimPump(current, id);
        if (!aimed.ok) {
          emit('toast', { message: 'That plot cannot take water.', tone: 'error' });
          return;
        }
        apply(() => ({ ok: true, state: aimed.state }));
        emit('toast', { message: `Pump on — watering plot ${id + 1}.`, tone: 'info' });
      } else {
        apply((s) => ({ ok: true, state: setPump(s, false) }));
        emit('toast', { message: 'Pump off.', tone: 'success' });
      }
      refreshInspector();
    },

    onAction: (id) => runPlotAction(id),
  };
}

/** Which plot the inspector is showing, or null. The DOM says whether one is open. */
let openPlot = null;

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
    // The same verdict `domain/farm.js` `plant()` will compute, so the line the
    // player reads and the health the crop actually gets cannot disagree. Computed
    // here against live state, which is why the picker needs no store import.
    verdictFor: (cropId) => {
      const state = getState();
      return verdictFor({
        cropId,
        weather: state?.weather,
        location: state?.location,
        now: Date.now() + (state?.clock?.timeOffsetMs ?? 0),
      });
    },
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
  // Forget which plot the inspector was showing. Without this, a closed inspector would
  // leave `openPlot` set and the next `renderPanels()` would mount it again into an empty
  // host — a panel nobody clicked on, reappearing on every state change.
  openPlot = null;
  // The handle goes with it. Left set, it would let a later `refreshInspector` patch a
  // panel whose DOM `clear` has already removed.
  inspectorView = null;

  const host = pickerHost();
  if (host) clear(host);
}
