/**
 * The shop's two small drawings, as inline SVG.
 *
 * The reference mockup marks a price with a gold coin and the footer hint with a
 * sprout. Neither exists in `assets/` — the icons there are all 0 bytes on
 * purpose (DEC-014) — and adding them as files would mean registering them in
 * `js/config/assets.js` and satisfying `tests/assets.test.js`. An inline string
 * is cheaper and keeps the asset registry honest: these are two glyphs, not
 * artwork.
 *
 * They are filled shapes rather than the stroke paths in `js/ui/icons.js`,
 * because a stroked disc does not read as a coin.
 */

import { el } from '../utils/dom.js';

/** A gold coin: disc, rim and a wheat stalk, the shop's price marker. */
const COIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="11" fill="#f6c445" stroke="#b57d12" stroke-width="1.6" />
  <circle cx="12" cy="12" r="7.6" fill="none" stroke="#d9a421" stroke-width="1.2" />
  <path d="M12 6.4v11.2" stroke="#a96f14" stroke-width="1.6" stroke-linecap="round" />
  <path d="M14.6 9.4c-.6-.7-1.5-1.1-2.6-1.1-1.5 0-2.7.8-2.7 2 0 2.8 5.4 1.5 5.4 4.1 0 1.2-1.2 2-2.7 2-1.1 0-2-.4-2.6-1.1"
        fill="none" stroke="#a96f14" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

/** Two leaves on a stem, for the footer hint. */
const SPROUT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 21v-8" fill="none" stroke="#2f7d4f" stroke-width="1.8" stroke-linecap="round" />
  <path d="M12 13c0-3.6-2.9-6.2-6.8-6.2C5.2 10.4 8.1 13 12 13z" fill="#4caf5f" />
  <path d="M12 11c0-3.6 2.9-6.2 6.8-6.2C18.8 8.4 15.9 11 12 11z" fill="#66bb6a" />
</svg>`;

/**
 * A decorative SVG in a span. `aria-hidden` because the label beside it carries
 * the meaning — the coin is next to a number, the sprout next to a sentence.
 * @param {string} svg
 * @param {string} [className]
 */
function artEl(svg, className = 'shop-art') {
  return el('span', { class: className, html: svg, 'aria-hidden': 'true' });
}

/** The gold coin, `1.15em` square by default. */
export function coinEl(className = 'shop-coin') {
  return artEl(COIN_SVG, className);
}

/** The sprout, `1.3em` square by default. */
export function sproutEl(className = 'shop-hint__sprout') {
  return artEl(SPROUT_SVG, className);
}
