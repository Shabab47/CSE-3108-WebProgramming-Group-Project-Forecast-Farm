/**
 * The preset profile pictures, as inline SVG.
 *
 * Inline rather than PNG for the same reason `icons.js` is inline: these are small,
 * flat, decorative drawings with no photographic detail, and keeping them in code means
 * no new files in the asset registry, no 0-byte placeholders, and no extra decode on a
 * page that is mostly text. They are deliberately simple at 108px — a hat, a face and
 * a shirt are enough to tell them apart.
 *
 * Every drawing is clipped by the avatar's circular CSS, so the shoulders can run to
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

const FARMER_THREE = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_3_11)">
<path d="M32 64C49.6731 64 64 49.6731 64 32C64 14.3269 49.6731 0 32 0C14.3269 0 0 14.3269 0 32C0 49.6731 14.3269 64 32 64Z" fill="#DCEBC8"/>
<rect x="12" y="15.5355" width="5" height="50.9648" transform="rotate(-45 12 15.5355)" fill="black"/>
<rect width="5" height="50.5846" transform="matrix(-0.707107 -0.707107 -0.707107 0.707107 51.5146 15.5355)" fill="black"/>
<rect width="5" height="20.5252" transform="matrix(0.707107 -0.707107 -0.707107 -0.707107 59.2441 29.7796)" fill="black"/>
<rect width="5" height="20.5252" transform="matrix(0.707107 -0.707107 -0.707107 -0.707107 15.5135 51.049)" fill="black"/>
<rect x="15.5355" y="19.049" width="5" height="20.5252" transform="rotate(-135 15.5355 19.049)" fill="black"/>
<rect x="36.5355" y="63.049" width="5" height="20.5252" transform="rotate(-135 36.5355 63.049)" fill="black"/>
<path d="M7 64C7 51 17 43 32 43C47 43 57 51 57 64H7Z" fill="#625E3D"/>
<path d="M25 44H39L32 54L25 44Z" fill="#EEEADD"/>
<path d="M24 46L28 38ZM40 46L36 38Z" fill="black"/>
<path d="M24 46L28 38M40 46L36 38" stroke-width="3" stroke-linecap="round" stroke="#777252"/>
<path d="M36 39C36 36.7909 34.2091 35 32 35C29.7909 35 28 36.7909 28 39V41C28 43.2091 29.7909 45 32 45C34.2091 45 36 43.2091 36 41V39Z" fill="#C98A5E"/>
<path d="M32 41C38.6274 41 44 35.1797 44 28C44 20.8203 38.6274 15 32 15C25.3726 15 20 20.8203 20 28C20 35.1797 25.3726 41 32 41Z" fill="#E0A273"/>
<path d="M20 31.5C21.3807 31.5 22.5 30.3807 22.5 29C22.5 27.6193 21.3807 26.5 20 26.5C18.6193 26.5 17.5 27.6193 17.5 29C17.5 30.3807 18.6193 31.5 20 31.5Z" fill="#D49263"/>
<path d="M44 31.5C45.3807 31.5 46.5 30.3807 46.5 29C46.5 27.6193 45.3807 26.5 44 26.5C42.6193 26.5 41.5 27.6193 41.5 29C41.5 30.3807 42.6193 31.5 44 31.5Z" fill="#D49263"/>
<path d="M24.5 18.5C23.5 19.5 20.6667 23 20 27C20 19 22.1667 17.5 24.5 17.5V18.5Z" fill="#040404"/>
<path d="M43.5 26C40 21 35 18.5 24.5 18.5V17.5C32 7 45 18 43.5 26Z" fill="#040404"/>
<path d="M27 29.6C27.8837 29.6 28.6 28.8837 28.6 28C28.6 27.1163 27.8837 26.4 27 26.4C26.1164 26.4 25.4 27.1163 25.4 28C25.4 28.8837 26.1164 29.6 27 29.6Z" fill="#3B2A20"/>
<path d="M37 29.6C37.8837 29.6 38.6 28.8837 38.6 28C38.6 27.1163 37.8837 26.4 37 26.4C36.1164 26.4 35.4 27.1163 35.4 28C35.4 28.8837 36.1164 29.6 37 29.6Z" fill="#3B2A20"/>
<path opacity="0.6" d="M23 35C24.1046 35 25 34.1046 25 33C25 31.8954 24.1046 31 23 31C21.8954 31 21 31.8954 21 33C21 34.1046 21.8954 35 23 35Z" fill="#E89A86"/>
<path opacity="0.6" d="M41 35C42.1046 35 43 34.1046 43 33C43 31.8954 42.1046 31 41 31C39.8954 31 39 31.8954 39 33C39 34.1046 39.8954 35 41 35Z" fill="#E89A86"/>
<path d="M29 35.5H35.5" stroke-width="1.6" stroke-linecap="round" stroke="#8C4B36"/>
<path d="M49 62H57" stroke-width="4" stroke="#650B20"/>
<path d="M31.5 33H33" stroke-width="1.6" stroke-linecap="round" stroke="#1E1E1E"/>
<path d="M31 44H33L33.7 46L32.8 47L34 52L32 54L30 52L31.2 47L30.3 46L31 44Z" fill="#3D4032" stroke="black"/>
<path d="M22 43H26L32 54L22 50L24 47L22 43Z" fill="#777252" stroke="black"/>
<path d="M38 43H42L40 47L42 50L32 57L38 43Z" fill="#898363" stroke="black"/>
<circle cx="26.675" cy="54.675" r="0.675" fill="#D9CF9B"/>
<circle cx="26.675" cy="58.675" r="0.675" fill="#D9CF9B"/>
<circle cx="26.675" cy="62.675" r="0.675" fill="#D9CF9B"/>
<circle cx="37.675" cy="54.675" r="0.675" fill="#D9CF9B"/>
<circle cx="37.675" cy="58.675" r="0.675" fill="#D9CF9B"/>
<circle cx="37.675" cy="62.675" r="0.675" fill="#D9CF9B"/>
</g>
<defs>
<clipPath id="clip0_3_11">
<rect width="64" height="64" fill="white"/>
</clipPath>
</defs>
</svg>

`;

const ART = {
  farmer1: FARMER_ONE,
  farmer2: FARMER_TWO,
  farmer3: FARMER_THREE,
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
