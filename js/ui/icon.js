/**
 * Icon helper — inline Lucide SVGs.
 *
 * The same idea as ui/weatherGlyph.js: a small map of SVG strings injected with
 * innerHTML. Lucide's path data is inlined rather than installed, because the
 * project has no runtime dependencies and no build step (AGENTS.md). Icons use
 * stroke="currentColor", so each one inherits the colour of its container.
 *
 * Only the icons the shell actually uses live here. Add more the same way —
 * copy the inner markup (paths/circles only) from lucide.dev, drop the `<svg>`
 * wrapper; this helper supplies that.
 *
 * Lucide is ISC-licensed. https://lucide.dev
 */

import { el } from '../utils/dom.js';

const ICONS = {
  'volume-2':
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  settings:
    '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
  user:
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  droplet:
    '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  wind:
    '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  umbrella:
    '<path d="M22 12a10 10 0 0 0-20 0z"/><path d="M12 12v6a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-8"/>',
  'map-pin':
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
};

/**
 * Build an icon: a span wrapping an inline SVG.
 * @param {string} name key into ICONS
 * @param {string} [extraClass]
 * @returns {HTMLSpanElement}
 */
export function icon(name, extraClass = '') {
  const wrapper = el('span', {
    class: `icon ${extraClass}`.trim(),
    'aria-hidden': 'true',
  });
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`;
  return wrapper;
}
