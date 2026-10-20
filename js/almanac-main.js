/**
 * Entry point for almanac.html.
 *
 * The almanac is a static reference page, so this is the lightest entry in the
 * project: no session, no store, no network. It resolves nothing because it has
 * nothing to resolve — the crop table is already in `js/config/`.
 *
 * The one thing it has to get right is the "Back to farm" link. A guest session
 * lives in the URL, not in storage (see `resolveSession` in `js/main.js`), so the
 * flag is forwarded from this page's own query string rather than read off a
 * session — `almanacHref()` on the farm side put it there.
 *
 * Guarded on `#almanac-root`, the same way `js/main.js` guards on `#top-bar`: it
 * marks "this is the page, not an import", so importing this module from a test
 * mounts nothing.
 */

import { qsOrNull } from './utils/dom.js';
import { mountAlmanac } from './ui/almanac.js';

const root = qsOrNull('#almanac-root');

if (root) {
  const guest = new URLSearchParams(location.search).get('guest') === '1';
  mountAlmanac(root, { backHref: guest ? 'index.html?guest=1' : 'index.html' });
}
