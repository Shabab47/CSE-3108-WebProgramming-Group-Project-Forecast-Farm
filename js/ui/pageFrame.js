/**
 * The painted frame the account pages sit in.
 *
 * Profile and settings wear a painted farm frame: grass, a beam, a leaf/vine
 * garland, a hanging wooden sign and a dark wall that runs to the bottom edge.
 * Unlike the shop's frame it has no full-height side posts and no stone base, so
 * a scrolling page never tucks under a fixed plinth. It is painted art and
 * deliberately does not read `data-theme` — a wooden beam is brown in a dark
 * theme too (DEC-027, DEC-050).
 *
 *   pageFrame({ title, backHref }) → { node, board }
 *
 * `node` goes straight into the page root. `board` is the empty scrolling
 * content area each page appends its cards into — it is the only thing below
 * the painted header.
 */

import { el } from '../utils/dom.js';
import { iconEl } from './icons.js';

/**
 * @param {{title:string, backHref:string}} options
 * @returns {{node: HTMLElement, board: HTMLElement}}
 */
export function pageFrame({ title, backHref }) {
  // The background frame: beam, vines, wall. The wall is the last layer and runs to
  // the bottom edge — no plinth for a scrolling board to disappear behind.
  // Decorative — nothing here answers clicks, so the clickable layers stay on top.
  const frame = el('div', { class: 'page-frame', 'aria-hidden': 'true' }, [
    el('div', { class: 'page-frame__beam' }),
    el('div', { class: 'page-frame__vines' }),
    el('div', { class: 'page-frame__wall' }),
  ]);

  // Back pill (left), hanging sign (centre). Nothing right: it would fight the board.
  const back = el('a', {
    class: 'page-back',
    href: backHref,
    'aria-label': 'Back to farm',
  }, [iconEl('arrow-left', 'page-back__arrow'), 'Back to farm']);

  const bolt = () => el('span', { class: 'page-sign__bolt', 'aria-hidden': 'true' });
  const sign = el('div', {
    class: 'page-sign',
    role: 'heading',
    'aria-level': '1',
  }, [bolt(), el('span', { class: 'page-sign__plank', text: title }), bolt()]);

  const board = el('div', { class: 'page-board' });

  return {
    node: el('div', { class: 'page-scene' }, [
      frame,
      el('header', { class: 'page-top' }, [back, sign]),
      board,
    ]),
    board,
  };
}
