import { el, clear } from '../utils/dom.js';
import { seasonFor } from '../domain/seasons.js';

/**
 * The season illustration, 114×114.
 *
 * Built here rather than in js/config/assets.js because that file is Hisham's
 * and this change was scoped to Kafi's files. AGENTS.md §9 prefers every image
 * path live in assets.js — fold this into a `seasonImg()` helper there when that
 * file is next touched. encodeURIComponent handles the space in "Late Autumn".
 */
function seasonImg(season) {
  return `assets/images/seasons/${encodeURIComponent(season)}.png`;
}

/**
 * @param {HTMLElement} root
 * @param {{location?: {lat?: number}}|object} [actions] the farm's location, which
 *   is what decides the season — see the note in `render`
 */
export function mountSeasonCard(root, actions = {}) {
  clear(root);

  const card = el('div', { class: 'season-card', 'aria-live': 'polite' });

  root.append(card);
  render();

  function render() {
    clear(card);

    const now = new Date();
    // **The location is the input now, not the date.** The old `getSeason(now)`
    // ignored where the player is, and its hemisphere flag was a no-op, so a farm in
    // Sydney was told it was in northern winter. `seasonFor` takes the coordinates
    // and reads the right calendar.
    const season = seasonFor(actions.location, now);

    const art = el('span', { class: 'season-card__art' }, [
      el('img', {
        class: 'season-card__img',
        src: seasonImg(season),
        alt: `${season} illustration`,
        width: 114,
        height: 114,
      }),
    ]);

    const text = el('span', { class: 'season-card__text' }, [
      el('span', { class: 'season-card__name', text: season }),
      el('span', {
        class: 'season-card__date',
        text: `${now.toLocaleDateString('en-US', { month: 'short' })}-${now.getDate()}`,
      }),
    ]);

    card.append(art, text);
  }

  return {
    /** Re-read the season, for when the player moved the farm. */
    refresh: render,

    unmount() {
      clear(root);
    },
  };
}
