/**
 * The wooden sign the auth forms sit on.
 *
 * Markup only — no events, no actions, nothing here knows what a form is. All
 * three auth views (sign in, create account, reset password) want the same
 * board, and building it in one place is what keeps them from drifting apart.
 *
 * The shape itself is CSS, not this file's problem: `css/auth.css` draws the
 * silhouette as one `clip-path` polygon, applied to both the border layer and
 * the wood layer.
 *
 *   signBoard({ title, children }) → HTMLElement
 *   backButton(onBack)              → HTMLElement
 *
 * @param {object} options
 * @param {string|HTMLElement} options.title the plank heading, e.g. 'Sign in'.
 *   A node is accepted so a view whose heading changes while it is on screen can
 *   hold the element and write to it, rather than rebuilding the board per step.
 * @param {Array<Node>} options.children the view's own content
 */
import { el } from '../utils/dom.js';

export function signBoard({ title, children = [] }) {
  // The two dots are the nails holding the plank on. Decorative, so they are
  // hidden from a screen reader rather than read out as list items.
  const nail = () => el('span', { class: 'sign__nail', 'aria-hidden': 'true' });

  const plank = el('div', { class: 'sign__plank' }, [
    nail(),
    typeof title === 'string' ? el('h1', { class: 'sign__title', text: title }) : title,
    nail(),
  ]);

  const inner = el('div', { class: 'sign__inner' }, [plank, ...children]);

  return el('div', { class: 'sign' }, [inner]);
}

/**
 * The red Back button every auth form carries.
 *
 * Built here rather than written out four times, because the sign-row that holds
 * it is part of the board's furniture: one place to change it, and no chance of
 * one form's Back reading differently from another's.
 */
export function backButton(onBack) {
  return el('button', {
    class: 'btn btn--back',
    type: 'button',
    text: '← Back',
    on: { click: onBack },
  });
}