/**
 * The two preset profile pictures, as inline SVG.
 *
 * Inline rather than PNG for the same reason `icons.js` is inline: these are small,
 * flat, decorative drawings with no photographic detail, and keeping them in code means
 * no new files in the asset registry, no 0-byte placeholders, and no extra decode on a
 * page that is mostly text. They are deliberately simple at 108px — a hat, a face and
 * a shirt are enough to tell the two apart.
 *
 * Both drawings are clipped by the avatar's circular CSS, so the shoulders can run to
 * the bottom edge without a `<clipPath>` whose id would be duplicated every time the
 * artwork is repeated in the picker.
 */

const FARMER_ONE = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <circle cx="32" cy="32" r="32" fill="#dcebc8"/>
  <path d="M7 64c0-13 10-21 25-21s25 8 25 21z" fill="#4f8a3c"/>
  <path d="M25 44h14v10H25z" fill="#f2c14e"/>
  <path d="M24 46l4-8M40 46l-4-8" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/>
  <rect x="28" y="35" width="8" height="10" rx="4" fill="#c98a5e"/>
  <ellipse cx="32" cy="28" rx="12" ry="13" fill="#e0a273"/>
  <circle cx="20" cy="29" r="2.5" fill="#d49263"/>
  <circle cx="44" cy="29" r="2.5" fill="#d49263"/>
  <path d="M20 27c0-8 5-12 12-12s12 4 12 12c-2-4-6-6-12-6s-10 2-12 6z" fill="#4a2e1d"/>
  <ellipse cx="32" cy="17" rx="22" ry="5.5" fill="#d9a441"/>
  <path d="M19 17c0-8 5-12 13-12s13 4 13 12z" fill="#e9bb58"/>
  <path d="M19 16h26" stroke="#8d5a24" stroke-width="2"/>
  <circle cx="27" cy="28" r="1.6" fill="#3b2a20"/>
  <circle cx="37" cy="28" r="1.6" fill="#3b2a20"/>
  <circle cx="23" cy="33" r="2" fill="#e89a86" opacity=".6"/>
  <circle cx="41" cy="33" r="2" fill="#e89a86" opacity=".6"/>
  <path d="M28 33c2 2 6 2 8 0" stroke="#8c4b36" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;

const FARMER_TWO = `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <circle cx="32" cy="32" r="32" fill="#f4e2c8"/>
  <path d="M17 30c0-10 6-16 15-16s15 6 15 16v15c-2 2-5 3-8 3V31c-2 2-5 3-7 3s-5-1-7-3v17c-3 0-6-1-8-3z" fill="#2f2119"/>
  <path d="M6 64c0-13 10-21 26-21s26 8 26 21z" fill="#c96b3f"/>
  <path d="M24 45h16v9H24z" fill="#f4c85a"/>
  <rect x="28" y="35" width="8" height="10" rx="4" fill="#9b623f"/>
  <ellipse cx="32" cy="29" rx="11.5" ry="12.5" fill="#b97950"/>
  <circle cx="20.5" cy="30" r="2.5" fill="#a86642"/>
  <circle cx="43.5" cy="30" r="2.5" fill="#a86642"/>
  <path d="M20 23c0-7 5-11 12-11s12 4 12 11c-3-3-7-4-12-4s-9 1-12 4z" fill="#2f2119"/>
  <path d="M19 21c2-6 7-9 13-9s11 3 13 9c-4-2-8-3-13-3s-9 1-13 3z" fill="#3f7d45"/>
  <circle cx="42" cy="15" r="4" fill="#f4c85a"/>
  <circle cx="42" cy="15" r="1.5" fill="#c96b3f"/>
  <path d="M44 33c4 4 5 9 4 14" stroke="#2f2119" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="27" cy="29" r="1.6" fill="#3b2a20"/>
  <circle cx="37" cy="29" r="1.6" fill="#3b2a20"/>
  <circle cx="23" cy="34" r="2" fill="#d98b78" opacity=".65"/>
  <circle cx="41" cy="34" r="2" fill="#d98b78" opacity=".65"/>
  <path d="M28 34c2 2 6 2 8 0" stroke="#7e3b2d" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;

const ART = {
  farmer1: FARMER_ONE,
  farmer2: FARMER_TWO,
};

/**
 * SVG markup for a preset id, or null when the id has no art.
 * Callers fall back to the gray person, so an unknown id is not a broken image.
 *
 * @param {string} id
 * @returns {string|null}
 */
export function avatarArt(id) {
  return ART[id] ?? null;
}
