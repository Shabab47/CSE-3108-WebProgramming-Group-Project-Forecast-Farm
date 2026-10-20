/**
 * The Difficulty card: Normal or Easy, chosen by the player.
 *
 * ## Why this is arm-then-confirm, like the danger actions
 *
 * `dangerAction.js` exists so a player works out "the first click only arms it" once per
 * page rather than once per control. That reasoning does not stop at the controls that
 * delete something — it applies to *any* setting that changes how the farm behaves, and
 * this one changes it silently and permanently. Picking "Easy" must not happen because a
 * radio sat under the cursor, so a choice arms and then confirms, in the same shape as
 * the two destructive actions above it on the page.
 *
 * ## Why the explanations are always visible
 *
 * The copy for Easy is the load-bearing part of this card, not decoration. "Cannot be
 * harmed" reads as a promise about the whole crop, and it is not one: **a crop that has
 * not ripened yet is still fully vulnerable in Easy** and can still dry, take damage and
 * die. So the Easy panel states that in its own sentence rather than leaving it to be
 * discovered, and the setting is worth nothing if a player chooses it on a false reading.
 *
 * Rendered and calls back. It does not import the store and does not know what a save
 * looks like — the write arrives as `actions.setDifficulty`.
 */

import { el, setClass } from '../utils/dom.js';
import { DIFFICULTY } from '../config/game.js';
import { iconEl } from './icons.js';
import { statusLine } from './statusLine.js';

/**
 * What each mode does, in the words a player needs before choosing.
 *
 * `detail` is the honest scope of the mode, not a summary — the Easy one leads with what
 * is protected and then immediately says what is not, because that second half is the
 * part that stops a player choosing it for the wrong reason.
 */
export const DIFFICULTY_COPY = {
  [DIFFICULTY.normal]: {
    label: 'Normal',
    detail:
      'Ripe crops keep drying out. Leave one too long and it takes damage, loses value '
      + 'and can die. The pump costs gold, as it always has.',
  },
  [DIFFICULTY.easy]: {
    label: 'Easy',
    detail:
      'A ripe crop cannot be harmed — not by dryness, not by the weather, and not by '
      + 'anything else. The pump is free. Crops that have not ripened yet are still '
      + 'vulnerable, so keep watering them.',
  },
};

/** Said after a confirmed change, in the card's own live region. */
export function difficultyConfirmation(value) {
  return value === DIFFICULTY.easy
    ? 'Difficulty set to Easy. Your ripe crops are now safe and the pump is free.'
    : 'Difficulty set to Normal. Ripe crops can now dry out and lose value again.';
}

/**
 * @param {object} actions
 * @param {'easy'|'normal'} actions.difficulty the mode in force right now
 * @param {(value: string) => {ok: boolean, reason?: string}} actions.setDifficulty
 * @param {(msg: string, tone?: string) => void} [actions.toast]
 * @returns {{node: HTMLElement, update: (difficulty: string) => void}}
 */
export function difficultyCard(actions) {
  let current = isKnown(actions.difficulty) ? actions.difficulty : DIFFICULTY.normal;
  /** The mode picked but not yet confirmed. `null` while nothing is armed. */
  let pending = null;

  const status = statusLine();
  const group = el('div', { class: 'settings-radio', role: 'radiogroup' });

  const options = [];
  const radios = [];

  for (const value of [DIFFICULTY.normal, DIFFICULTY.easy]) {
    const copy = DIFFICULTY_COPY[value];

    const input = el('input', {
      type: 'radio',
      class: 'settings-radio__input',
      name: 'difficulty',
      value,
    });

    const mark = el('span', { class: 'settings-radio__mark', 'aria-hidden': 'true' }, [iconEl('check')]);
    const tag = el('span', { class: 'settings-radio__selected', text: 'SELECTED' });

    const panel = el('label', { class: 'settings-radio__option' }, [
      input,
      el('span', { class: 'settings-radio__body' }, [
        el('span', { class: 'settings-radio__row' }, [
          el('span', { class: 'settings-radio__label', text: copy.label }),
          tag,
        ]),
        el('span', { class: 'settings-radio__detail', text: copy.detail }),
        mark,
      ]),
    ]);

    options.push({ value, input, mark, tag });
    radios.push(input);
    group.append(panel);

    // The click sets `pending` and arms; it does **not** write. `input.checked` is
    // restored by `paint()` on cancel, so an abandoned choice leaves no trace — neither
    // in the save nor on screen.
    input.addEventListener('change', () => {
      if (!input.checked) return;

      // Picking the mode already in force changes nothing, so it asks nothing.
      if (value === current) {
        disarm();
        return;
      }

      pending = value;
      paint();
      // Said fresh each time: `current` moves after a confirmed change, and a label fixed
      // at creation would offer to "keep normal" on a farm that is now easy.
      cancelButton.textContent = 'Keep ' + DIFFICULTY_COPY[current].label.toLowerCase();
      confirmBlock.hidden = false;
      cancelButton.focus();
      status.announce(null);
    });

  }

  const confirmButton = el('button', {
    class: 'btn btn--block',
    type: 'button',
    text: 'Confirm',
  });

  const cancelButton = el('button', {
    class: 'btn btn--ghost btn--block',
    type: 'button',
    text: 'Keep ' + DIFFICULTY_COPY[current].label.toLowerCase(),
  });

  // Visibility belongs to this block alone. The buttons inside it must not carry their own
  // `hidden`: `el()` would set it, nothing would ever clear it, and the block would open
  // onto an empty box — the player could pick Easy and never find the Confirm button.
  const confirmBlock = el('div', { class: 'settings-action' }, [
    el('p', {
      class: 'field__hint',
      text: 'Changing this asks you to confirm, because it changes how your whole farm behaves.',
    }),
    confirmButton,
    cancelButton,
  ]);
  confirmBlock.hidden = true;

  /** Reflect `current` and `pending` in the radios, without either being written. */
  function paint() {
    const shown = pending ?? current;
    for (const { value, input, mark, tag } of options) {
      input.checked = value === shown;
      setClass(mark, 'settings-radio__mark--show', value === shown);
      setClass(tag, 'settings-radio__selected--show', value === current && pending === null);
    }
  }

  function disarm() {
    pending = null;
    confirmBlock.hidden = true;
    paint();
  }

  cancelButton.addEventListener('click', () => {
    disarm();
    options.find((o) => o.value === current)?.input.focus();
  });

  confirmButton.addEventListener('click', () => {
    const wanted = pending;
    if (!wanted) return;

    const result = actions.setDifficulty(wanted);
    if (!result?.ok) {
      // `store.apply` toasts the refusal itself; say it here too so the card does not
      // look like it swallowed the click.
      status.announce(result?.reason ?? 'That change could not be saved.', 'error');
      return;
    }

    current = wanted;
    disarm();
    const said = difficultyConfirmation(current);
    status.announce(said, 'success');
    actions.toast?.(said, 'success');
  });

  paint();

  return {
    node: el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        iconEl('settings', 'card__icon'),
        el('span', { class: 'card__title', text: 'Difficulty' }),
      ]),
      el('div', { class: 'card__body' }, [
        group,
        confirmBlock,
        status.node,
      ]),
    ]),

    /** Follow the store, so the card is right if the mode is changed elsewhere. */
    update(difficulty) {
      if (!isKnown(difficulty)) return;
      if (pending) return; // an armed choice outranks a background change
      current = difficulty;
      paint();
    },
  };
}

function isKnown(value) {
  return value === DIFFICULTY.easy || value === DIFFICULTY.normal;
}