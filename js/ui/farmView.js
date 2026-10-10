import { el, clear } from '../utils/dom.js';
import { FIELD } from '../config/field.js';
import { cropOf } from '../config/crops.js';
import { cropStageImg, groundTile } from '../config/assets.js';
import { WATER } from '../config/game.js';

const PUMP_IMG = 'assets/images/pump.png';
const BASE_IMG = 'assets/images/base.png';

export function mountFarmView(root, state) {
  clear(root);

  const card = el('div', { class: 'card farm-view' }, [
    el('div', { class: 'card__head' }, [
      el('span', { class: 'card__title', text: 'Your Farm' }),
      el('span', { class: 'farm-view__hint', text: 'Click a plot to plant' }),
    ]),
    el('div', { class: 'field-stage', id: 'field-stage' }, [
      el('img', { class: 'field-stage__base', src: BASE_IMG, alt: '', 'aria-hidden': 'true' }),
      el('div', { class: 'field-stage__plots', id: 'field-plots' }),
      el('img', { class: 'field-stage__pump', src: PUMP_IMG, alt: 'Water pump', 'aria-hidden': 'true' }),
    ]),
  ]);

  root.append(card);

  const plotsEl = card.querySelector('#field-plots');

  function render(plots, selection) {
    clear(plotsEl);

    for (const plot of plots) {
      const tile = renderPlot(plot, selection);
      plotsEl.append(tile);
    }
  }

  function renderPlot(plot, selection) {
    const { col, row } = plot;

    const xPct = 50 + (col - row) * FIELD.tileScale * 50;
    const yPct = 50 + (col + row) * FIELD.tileScale * 25;

    const isSelected = selection?.plotId === plot.id;
    const isOwned = plot.owned;
    const hasCrop = plot.cropId != null;
    const isWatered = plot.waterLevel >= WATER.wateredThreshold;

    const classes = [
      'plot',
      isOwned ? 'plot--owned' : 'plot--unowned',
      isSelected ? 'plot--selected' : '',
      hasCrop ? 'plot--planted' : '',
      plot.dead ? 'plot--dead' : '',
    ].filter(Boolean).join(' ');

    const tile = el('div', {
      class: classes,
      dataset: { plotId: String(plot.id) },
      style: `left:${xPct}%;top:${yPct}%;width:${FIELD.tileScale * 100}%;padding-top:${FIELD.tileScale * FIELD.tileAspect * 100}%;`,
    });

    const groundSrc = groundTile(isWatered);
    tile.append(
      el('img', {
        class: 'plot__ground',
        src: groundSrc,
        alt: '',
        'aria-hidden': 'true',
      }),
    );

    if (hasCrop && !plot.dead) {
      const crop = cropOf(plot.cropId);
      if (crop) {
        const stage = growthStage(plot);
        tile.append(
          el('img', {
            class: 'plot__crop',
            src: cropStageImg(plot.cropId, stage),
            alt: `${crop.name} — stage ${stage}`,
            'aria-hidden': 'true',
          }),
        );
      }
    }

    if (plot.dead) {
      tile.append(
        el('span', { class: 'plot__dead', text: '🥀', 'aria-label': 'Dead crop' }),
      );
    }

    if (isOwned && hasCrop && !plot.dead) {
      const waterPct = Math.round(plot.waterLevel);
      tile.append(
        el('div', { class: 'plot__water', title: `Water: ${waterPct}%` }, [
          el('div', { class: 'plot__water-fill', style: `height:${waterPct}%` }),
        ]),
      );
    }

    if (!isOwned) {
      tile.append(
        el('div', { class: 'plot__lock' }, [
          el('span', { class: 'plot__lock-icon', text: '🔒', 'aria-hidden': 'true' }),
          el('span', { class: 'plot__lock-text', text: 'Buy' }),
        ]),
      );
    }

    tile.addEventListener('click', () => {
      if (state.onPlotClick) state.onPlotClick(plot.id);
    });

    return tile;
  }

  function growthStage(plot) {
    if (!plot.plantedAt || !plot.cropId) return 1;
    const crop = cropOf(plot.cropId);
    if (!crop) return 1;

    const elapsed = (Date.now() - plot.plantedAt) / (1000 * 60 * 60);
    const progress = Math.min(elapsed / crop.growHours, 1);
    return Math.max(1, Math.ceil(progress * 5));
  }

  render(state?.plots, state?.selection);

  return {
    unmount() {
      clear(root);
    },
  };
}
