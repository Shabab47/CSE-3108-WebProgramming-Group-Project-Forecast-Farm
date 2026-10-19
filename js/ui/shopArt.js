/**
 * The shop's inline drawings, as inline SVG.
 *
 * None of these exist as files in `assets/` — the icons there are all 0 bytes
 * on purpose (DEC-014) — and adding them would mean registering them in
 * `js/config/assets.js` and satisfying `tests/assets.test.js`. Inline strings
 * are cheaper and keep the asset registry honest: these are glyphs, not art.
 *
 * The coin matches the Figma's price marker: a rim disc, a lighter inner face
 * and a "G" gold mark. The sprout marks the footer hint. The arrow-left marks
 * the back button. The plus marks the "BUY +" button.
 *
 * **The coin is not shop-only.** The field's plot price tag draws it too
 * (`js/ui/plotLayers.js`), next to the number, so it stays an exported glyph
 * rather than being inlined at its call site. Keep the two uses identical: a
 * third coin drawing is how three gold markers start looking like three
 * currencies.
 *
 * They are filled shapes rather than the stroke paths in `js/ui/icons.js`,
 * because a stroked disc does not read as a coin.
 */

import { el } from '../utils/dom.js';

/**
 * A gold coin: rim disc, lighter face, and a "G" mark — the gold price marker.
 *
 * The `G` names its face. Without the `font-family` it renders in the SVG default
 * (a serif), so the shop's coin lettered its G differently from the in-game purse
 * coin, which has always set `Luckiest Guy` on its text. ISS-107.
 */
const COIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <ellipse cx="12" cy="12" rx="12" ry="12" fill="#f6c445" />
  <ellipse cx="12" cy="12" rx="10" ry="10" fill="#eab32c" />
  <circle cx="12" cy="12" r="7.6" fill="none" stroke="#d9a421" stroke-width="1.2" />
  <text x="12" y="15" text-anchor="middle" fill="#a96b16" font-family="Luckiest Guy" font-size="11" font-weight="bold">G</text>
</svg>`;

/** Two leaves on a stem, for the footer hint. */
const SPROUT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 21v-8" fill="none" stroke="#2f7d4f" stroke-width="1.8" stroke-linecap="round" />
  <path d="M12 13c0-3.6-2.9-6.2-6.8-6.2C5.2 10.4 8.1 13 12 13z" fill="#4caf5f" />
  <path d="M12 11c0-3.6 2.9-6.2 6.8-6.2C18.8 8.4 15.9 11 12 11z" fill="#66bb6a" />
</svg>`;

/** A left-pointing arrow for the back button. */
const ARROW_LEFT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <path d="M11 6 7 9l4 3" fill="none" stroke="#2f7d4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

/** A small plus mark for the "BUY +" button. */
const PLUS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15">
  <rect x="6.5" y="1" width="2" height="13" fill="#14532a" rx="1" />
  <rect x="1" y="6.5" width="13" height="2" fill="#14532a" rx="1" />
</svg>`;

/**
 * An inline SVG in a span. `aria-hidden` because the label beside it carries
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

/** The left arrow for the back button, `1em` square by default. */
export function arrowLeftEl(className = 'shop-back__arrow') {
  return artEl(ARROW_LEFT_SVG, className);
}

/** The plus mark for the buy button, `1em` square by default. */
export function plusEl(className = 'shop-buy__plus') {
  return artEl(PLUS_SVG, className);
}
