/**
 * The layers inside one plot, back to front.
 *
 * Split out of `farmView.js` so the field's geometry — where each diamond goes and
 * how big it is — is not sharing a file with what is painted on it. `AGENTS.md` asks
 * for panels to be split by responsibility before they grow, and this one had reached
 * the point where adding the price tag meant reading ninety lines to find the button.
 *
 * **Order is the z-order.** `farmView.js` appends what comes back in sequence, and
 * these elements are absolutely positioned siblings, so this list *is* the paint
 * order. Two of the entries depend on it and neither announces why:
 *
 *  - `.plot__hit` comes first so it sits under the artwork and cannot be seen; it
 *    answers the pointer, and everything after it is `pointer-events: none` anyway.
 *  - `.plot__ready` comes **before** `.plot__ground`, because it is a gold diamond
 *    sized slightly larger than the ground and the ground covers its middle. Move it
 *    down and it hides the crop it is announcing.
 *
 * Everything is decorative (`aria-hidden`): the plot is a `<button>` and its whole
 * accessible name is `plotName()` in `plotLabel.js`. Nothing here is ever read out, so
 * none of it needs an `alt` that carries information.
 */

import { el } from '../utils/dom.js';
import { cropOf } from '../config/crops.js';
import { WATER } from '../config/game.js';
import { cropFailureImg, cropStageImg, groundTile } from '../config/assets.js';
import { bandFor, waterState } from '../domain/plotWater.js';
import { damageSprite, damageWord } from '../domain/damage.js';
import { growthMeter } from './growthMeter.js';

/**
 * Which field sprite to draw for a crop stage.
 *
 * Only rice has its five sprites. A land-unlocked crop without art yet falls
 * back to the rice sprite at the same stage — the numbers (price, yield, grow
 * time) are its own, only the picture is borrowed. `plotLayers` marks the
 * image with `plot__crop--fallback` so the CSS tints it; when the real
 * sprites land, flip `available` and delete this branch — nothing else moves.
 */
export function fieldSpriteFor(cropId, stage) {
  const crop = cropOf(cropId);
  if (!crop) return { src: cropStageImg('rice', stage), fallback: true };
  if (crop.available === true) return { src: cropStageImg(cropId, stage), fallback: false };
  return { src: cropStageImg('rice', stage), fallback: true };
}

/**
 * @param {object} plot
 * @param {object} facts
 * @param {boolean} facts.isOwned
 * @param {boolean} facts.isNext   the plot on offer
 * @param {boolean} facts.isReady  ready to harvest
 * @param {object}  facts.grown    the `harvestsIn()` result, or null when unowned
 * @param {boolean} facts.isWatered
 * @param {number}  facts.price    price of the plot on offer
 * @returns {object[]} elements, in paint order
 */
export function plotLayers(plot, { isOwned, isNext, isReady, grown, isWatered, price = 0 }) {
  const hasCrop = plot.cropId != null;

  const layers = [
    // The one hit target, and the reason the button's box is not. `pointer-events`
    // inherits, so the button above is inert and every layer below is decorative;
    // this is what answers a pointer, and `css/scene.css` clips it to the diamond.
    // Without it the square box overlaps a neighbour's by half a box, and a third of
    // each tile's visible surface answers as the plot in front. ISS-004.
    el('span', { class: 'plot__hit' }),

    el('img', {
      class: 'plot__ground',
      src: groundTile(isWatered),
      alt: '',
      // Square PNG, transparent corners: never let it become a drag ghost.
      draggable: 'false',
      'aria-hidden': 'true',
    }),
  ];

  if (isReady) {
    // Before the crop, and it is gold rather than green: the gold rim is the one cue
    // that has to be unmissable, because it is the moment the player has been waiting
    // six hours for. A caption would not do — anything in the lower half of the
    // diamond is painted over by the plot in front, which is why the old "Buy" label
    // was removed rather than restyled.
    layers.push(el('span', { class: 'plot__ready', 'aria-hidden': 'true' }));
  }

  if (hasCrop && !plot.dead) {
    const crop = cropOf(plot.cropId);
    if (crop) {
      // The stage comes from `harvestsIn`, the same function the domain rules ask.
      // The local `growthStage()` this replaced computed it separately and disagreed
      // with the spec twice over: `ceil(progress * 5)` reached stage 5 at 80% instead
      // of at maturity, and it read `Date.now()` directly, so a debug time-skip moved
      // the weather and not the crop.
      //
      // The sprite may be borrowed: only rice has art, so a land-unlocked crop
      // without sprites draws rice tinted by `plot__crop--fallback` until its
      // own stages land. See `fieldSpriteFor` above.
      const stage = grown?.stage ?? 1;
      const sprite = fieldSpriteFor(plot.cropId, stage);
      layers.push(
        el('img', {
          class: sprite.fallback ? 'plot__crop plot__crop--fallback' : 'plot__crop',
          draggable: 'false',
          src: sprite.src,
          alt: '',
          'aria-hidden': 'true',
        }),
      );
    }
  }

  // **Damage, then death.** `damageSprite()` already resolves the priority — `dead` wins,
    // because a dead crop is dead whatever else was wrong with it — so this is one
    // branch and the ordering lives in one place.
    //
    // **The word comes out too, and it is not a fallback.** The sprites are 0 bytes
    // until Zim's art lands, and AGENTS.md fact 4 says text carries the meaning in the
    // meantime. The caption is also the part a screen reader gets, and the part that
    // survives a file that never arrives.
    const damage = damageSprite(plot);
    const word = damageWord(plot);
    if (damage) {
      layers.push(
        el('img', {
          class: 'plot__damage',
          src: cropFailureImg(plot.cropId, damage),
          alt: '',
          'aria-hidden': 'true',
        }),
        el('span', { class: 'plot__damage-word', text: word, 'aria-hidden': 'true' }),
      );
    }

    if (isOwned && hasCrop && !plot.dead) {
    // The meter, normalised against `WATER.max` rather than printed as a raw percentage.
    // `max` is 120, not 100, so that over-watering is a reachable state — which means a
    // bar drawn as `waterLevel%` would overflow its own track on a rainy day.
    const level = plot.waterLevel ?? 0;
    const fill = Math.max(0, Math.min(100, (level / WATER.max) * 100));
    const state = waterState(plot);
    const { floor, target } = bandFor(plot);

    layers.push(
      el('span', {
        class: 'plot__water',
        'data-state': state,
        title: `Water: ${Math.round(level)} of ${WATER.max} - ${state}`,
        'aria-hidden': 'true',
      }, [
        el('span', { class: 'plot__water-fill', style: `height:${fill.toFixed(1)}%` }),
        // A tick at the target, so the bar shows *where to aim* rather than only how far
        // along it is. And a shaded zone above it, because everything past the target is
        // water the player is paying for and getting nothing from.
        el('span', {
          class: 'plot__water-target',
          style: `bottom:${((target / WATER.max) * 100).toFixed(1)}%`,
        }),
        el('span', { class: 'plot__water-floor', style: `bottom:${((floor / WATER.max) * 100).toFixed(1)}%` }),
        el('span', { class: 'plot__water-word', text: word ?? state, 'aria-hidden': 'true' }),
      ]),
    );

    // The growth meter floats above the crop: a green bar plus `3h 20m left`.
    // Same gate as the water bar, plus `grown` itself decides — `growthMeter`
    // returns null for unplanted and ready crops, so the gold rim owns the
    // ready moment alone and nothing shows twice. See `growthMeter.js`.
    const meter = growthMeter(grown);
    if (meter) layers.push(meter);
  }

  if (!isOwned) {
    // The padlock, and centred. The "Buy" caption that used to sit under it is gone:
    // it landed in the half of the diamond the plot in front paints over, so it read
    // "BU.." or "..UY" depending on the row. The padlock says the same thing and
    // survives every row.
    //
    // `plot--next` keeps it bright and `plot--locked` dims it, so the two unowned
    // states are told apart at a glance without a second icon.
    layers.push(
      el('span', { class: 'plot__lock' }, [
        el('span', { class: 'plot__lock-icon', text: '🔒', 'aria-hidden': 'true' }),
      ]),
    );

    if (isNext) {
      layers.push(
        el('span', {
          class: 'plot__price',
          title: `${price} gold`,
          // `1,638,400` rather than `1638400`. The ladder doubles all the way to seven
          // figures, and an unseparated number that long is a smear at plot size — the
          // separators keep the leading digits legible even when the CSS ellipsis takes
          // the tail.
          text: price.toLocaleString('en-US'),
          'aria-hidden': 'true',
        }),
      );
    }
  }

  return layers;
}
