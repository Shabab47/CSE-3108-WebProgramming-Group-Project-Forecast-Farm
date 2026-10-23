/**
 * Choosing which seed to sow.
 *
 * Mounted by `main.js` when the player clicks one of their own empty plots. Lists the
 * seeds they actually have — a picker offering a seed they do not own is a dead end,
 * and the shop link is here because "you have none" is exactly when a player wants
 * to go and buy some.
 *
 * **No store import.** Every action arrives as a callback, so this mounts in a fake
 * DOM in `tests/cropPicker.test.js` with no browser and no network. That is the whole
 * reason the layer rules in `AGENTS.md` exist.
 *
 * The card is the timber-and-parchment dialog from `css/farm-dialog.css`; this module
 * only owns its contents. It still appends a plain `<div>` to whatever host it is
 * given, so nothing here assumes a native `<dialog>`.
 *
 * ## Two frames from Figma, one component
 *
 * The picker frame (`182:129`) shows small seed rows: sprite, quantity, grow time,
 * name and an info icon. Clicking a row plants that seed. The info icon opens the
 * seed-details frame (`188:23`), which replaces the picker in the same host and shows
 * the full sprite, name, quantity, grow time, sell value, growing advice and the
 * weather outlook, with a "Back to seed choices" button to return.
 *
 * The component keeps an internal `detailsFor` flag; `clear(root)` + rebuild is what
 * swaps the frames, so no second mount point or store import is needed.
 */

/**
 * @typedef {object} PickerState
 * @property {{[cropId:string]:number}} seeds   the player's bag, `{rice: 2, ...}`
 * @property {number} plotId                    which plot it will be sown on
 * @property {(cropId:string)=>void} onPlant    fires with the chosen crop id
 * @property {()=>void} [onClose]
 * @property {()=>void} [onShop]                offered when the bag is empty
 * @property {(cropId:string)=>boolean} [isUnlocked] land gate — defaults open when
 *   the caller has nothing to say (tests, old callers)
 * @property {(cropId:string)=>{ok:boolean, verdict?:object}|null} [verdictFor]
 *   the weather verdict for a crop, so the picker can show what the next few hours
 *   will do before the seed is spent
 */

import { el, clear } from '../utils/dom.js';
import { cropOf, SHOP_ORDER, harvestValue } from '../config/crops.js';
import { RATING_WORDS } from '../config/cropWeatherMatrix.js';
import { cropSeedImg, DIALOG_INFO_IMG, DIALOG_LEAF_IMG, DIALOG_PEG_IMG } from '../config/assets.js';

/**
 * Mount the seed picker.
 *
 * @param {HTMLElement} root
 * @param {PickerState} state
 * @returns {{unmount:()=>void}}
 */
export function mountCropPicker(root, state) {
  const seeds = state?.seeds ?? {};
  const gate = typeof state?.isUnlocked === 'function' ? state.isUnlocked : () => true;
  // Land-unlocked and in the bag. `available` (art) is deliberately NOT read:
  // a seed the farm earned must be sowable, and the field draws the fallback
  // sprite until the real one lands.
  const inBag = SHOP_ORDER.map(cropOf).filter(
    (crop) => crop && (seeds[crop.id] ?? 0) > 0 && gate(crop.id),
  );

  // One verdict per crop, and the same answer for all of them when there is no
  // forecast. Computed here rather than in `farm.js` so the picker can show the
  // judgement *before* the player commits to it, which is the whole point of it.
  const verdictFor_ = typeof state?.verdictFor === 'function' ? state.verdictFor : () => null;
  // A caller that passes no `verdictFor` has no forecast concept at all — the older
  // entry points and the tests — so it is treated as "nothing to refuse" rather than
  // as "no forecast". Otherwise a picker that was never asked about weather would
  // come up refusing.
  const knowsWeather = typeof state?.verdictFor === 'function';
  const canPlant = !knowsWeather || inBag.some((crop) => verdictFor_(crop.id)?.ok);

  // Which crop's details frame is showing, or null when the picker frame shows.
  let detailsFor = null;

  /** Rebuild whatever frame is current, in place. */
  const render = () => {
    clear(root);
    root.append(detailsFor ? buildDetails(detailsFor) : buildPicker());
  };

  const peg = (side) => el('img', {
    class: `farm-dialog__peg farm-dialog__peg--${side}`,
    src: DIALOG_PEG_IMG,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
  });

  const leaf = el('img', {
    class: 'crop-picker__leaf farm-dialog__ornament',
    src: DIALOG_LEAF_IMG,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
    width: '36',
    height: '32',
  });

  /** One small, clearly separable seed row: sprite, count, grow time, name, info. */
  function seedCard(crop) {
    const count = seeds[crop.id] ?? 0;
    const hours = crop.growHours;
    const verdict = verdictFor_(crop.id);

    const seedButton = el('button', {
      type: 'button',
      class: 'crop-picker__seed',
      dataset: { cropId: crop.id },
      title: `${crop.likes}. Hates ${crop.hates.toLowerCase()}.`,
      'aria-label': `Plant ${crop.name}, ${count} in your bag, ready in ${hours} hours`,
      disabled: knowsWeather && !verdict?.ok ? 'true' : undefined,
      on: { click: () => { if (state?.onPlant) state.onPlant(crop.id); } },
    }, [
      el('span', { class: 'crop-picker__overview' }, [
        el('span', { class: 'crop-picker__art-box' }, [
          el('img', {
            class: 'crop-picker__art',
            src: cropSeedImg(crop.id),
            alt: '',
            draggable: 'false',
            'aria-hidden': 'true',
          }),
        ]),
        el('span', { class: 'crop-picker__meta' }, [
          el('span', { class: 'crop-picker__name', text: crop.name }),
          el('span', {
            class: 'crop-picker__facts',
            text: `×${count} · ${hours}h`,
          }),
        ]),
      ]),
    ]);

    const infoButton = el('button', {
      type: 'button',
      class: 'crop-picker__info',
      'aria-label': `Review ${crop.name} details`,
      on: {
        click: (event) => {
          event.stopPropagation();
          detailsFor = crop.id;
          render();
        },
      },
    }, [
      el('img', {
        src: DIALOG_INFO_IMG,
        alt: '',
        'aria-hidden': 'true',
        draggable: 'false',
        width: '16',
        height: '16',
      }),
    ]);

    return el('li', { class: 'crop-picker__item' }, [seedButton, infoButton]);
  }

  /** The picker frame: intro, small seed rows, plant / never mind footer. */
  function buildPicker() {
    const head = el('div', { class: 'farm-dialog__head' }, [
      el('h2', {
        class: 'crop-picker__title farm-dialog__title',
        text: 'PLANT A SEED',
      }),
      leaf,
    ]);
    const rule = el('div', { class: 'farm-dialog__rule' });

    const intro = el('div', { class: 'crop-picker__intro' }, [
      el('p', { class: 'crop-picker__intro-title', text: 'Choose a seed to plant' }),
      el('p', {
        class: 'crop-picker__intro-note',
        text: 'Tap a seed card to plant it. Use the info icon to review details first.',
      }),
    ]);

    const listOrEmpty = inBag.length
      ? el('ul', { class: 'crop-picker__list' }, inBag.map((crop) => seedCard(crop)))
      : el('p', { class: 'crop-picker__empty' }, [
        'You have no seeds. Buy some from the shop to plant here.',
      ]);

    const body = el('div', { class: 'crop-picker__body farm-dialog__body' }, [
      intro,
      listOrEmpty,
    ]);

    const actions = el('div', { class: 'crop-picker__actions farm-dialog__actions' }, [
      inBag.length ? plantButton() : shopButton(state),
      closeButton(state),
    ].filter(Boolean));

    const panel = el('div', { class: 'farm-dialog__panel' }, [head, rule, body, actions]);
    return el('div', {
      class: 'crop-picker farm-dialog',
      role: 'dialog',
      'aria-label': 'Plant a seed',
    }, [peg('left'), peg('right'), panel]);
  }

  /** The details frame: full sprite, facts, advice, outlook, back button. */
  function buildDetails(cropId) {
    const crop = cropOf(cropId);
    if (!crop) return buildPicker();
    const count = seeds[cropId] ?? 0;
    const hours = crop.growHours;
    const price = harvestValue(cropId);
    const verdict = verdictFor_(cropId);

    const head = el('div', { class: 'farm-dialog__head' }, [
      el('h2', {
        class: 'crop-picker__title farm-dialog__title',
        text: 'SEED DETAILS',
      }),
      leaf,
    ]);
    const rule = el('div', { class: 'farm-dialog__rule' });

    const artBox = el('span', { class: 'crop-picker__details-art-box' }, [
      el('img', {
        class: 'crop-picker__details-art',
        src: cropSeedImg(crop.id),
        alt: '',
        draggable: 'false',
        'aria-hidden': 'true',
      }),
    ]);

    const facts = el('span', { class: 'crop-picker__details-meta' }, [
      el('span', { class: 'crop-picker__details-name', text: crop.name }),
      el('span', {
        class: 'crop-picker__details-facts',
        text: `×${count} · ${hours}h`,
      }),
      el('span', {
        class: 'crop-picker__details-sell',
        text: `sells for ${price}g`,
      }),
    ]);

    const overview = el('div', { class: 'crop-picker__details-overview' }, [artBox, facts]);

    const advice = el('p', {
      class: 'crop-picker__details-advice',
      text: crop.growNote,
    });

    const outlook = el('div', { class: 'crop-picker__weather-outlook' }, [
      el('span', {
        class: 'crop-picker__weather',
        dataset: { rating: verdict ? String(verdict.verdict.rating) : '' },
        text: verdictLine(crop, verdict),
      }),
    ]);

    const body = el('div', { class: 'crop-picker__body farm-dialog__body' }, [
      overview,
      advice,
      outlook,
    ]);

    const back = el('button', {
      type: 'button',
      class: 'crop-picker__back farm-dialog__button farm-dialog__button--primary',
      text: 'Back to seed choices',
      on: { click: () => { detailsFor = null; render(); } },
    });

    const actions = el('div', { class: 'crop-picker__actions farm-dialog__actions' }, [back]);
    const panel = el('div', { class: 'farm-dialog__panel' }, [head, rule, body, actions]);
    return el('div', {
      class: 'crop-picker farm-dialog',
      role: 'dialog',
      'aria-label': `Seed details — ${crop.name}`,
    }, [peg('left'), peg('right'), panel]);
  }

  function plantButton() {
    const first = inBag[0];
    return el('button', {
      type: 'button',
      class: 'crop-picker__plant farm-dialog__button farm-dialog__button--primary',
      text: `Plant ${first?.name ?? 'a seed'}`,
      on: { click: () => { if (state?.onPlant && first) state.onPlant(first.id); } },
    });
  }

  /** The shop button, which only earns its place when the bag is empty. */
  function shopButton(state) {
    if (typeof state?.onShop !== 'function') return null;

    return el('button', {
      type: 'button',
      class: 'crop-picker__shop farm-dialog__button farm-dialog__button--primary',
      text: 'Open the shop',
      on: { click: () => { if (state?.onShop) state.onShop(); } },
    });
  }

  /** Always offered, and always last, so "never mind" is where the eye expects it. */
  function closeButton(state) {
    if (typeof state?.onClose !== 'function') return null;

    return el('button', {
      type: 'button',
      class: 'crop-picker__close farm-dialog__button farm-dialog__button--secondary',
      text: 'Never mind',
      on: { click: () => { if (state?.onClose) state.onClose(); } },
    });
  }

  /**
   * What the next six hours will do to this crop, in one line.
   *
   * `null` when there is no forecast at all.
   */
  function verdictLine(crop, verdict) {
    if (!verdict?.ok) return null;

    const { event, rating, season, seasonPenalty, health } = verdict.verdict;
    const parts = [`Next ${verdict.verdict.windowHours}h: ${event.replace(/([A-Z])/g, ' $1').toLowerCase()}`];

    parts.push(RATING_WORDS[rating] ?? 'neutral');
    if (seasonPenalty < 0) parts.push(`out of season (${season})`);
    parts.push(`${health}%`);

    return parts.join(' · ');
  }

  render();

  return {
    unmount() {
      clear(root);
    },
  };
}
