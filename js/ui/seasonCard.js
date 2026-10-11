import { el, clear } from '../utils/dom.js';
import { getSeason } from '../domain/seasons.js';

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

export function mountSeasonCard(root) {
  clear(root);

  const card = el('div', { class: 'season-card', 'aria-live': 'polite' });

  root.append(card);
  render();

  function render() {
    clear(card);

    const now = new Date();
    const season = getSeason(now);

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
    unmount() {
      clear(root);
    },
  };
}
