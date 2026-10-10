/**
 * The crop table — source of truth for crop numbers.
 *
 * `docs/crops.md` explains what each column means and why it has the value it has.
 * This file is the data that document describes; nothing else should hard-code a
 * crop name, a price or a grow time.
 *
 * **Two numbers define the economy, and they are one decision:**
 *
 *   seedPrice   100 / 200 / 300 / 400 / 500 gold, in `SHOP_ORDER` below.
 *   sellPrice   chosen so that `yield * sellPrice` is exactly **twice** `seedPrice`.
 *
 * A full-health harvest therefore doubles the packet's cost on every crop, and a
 * poor harvest — health below 100, which is what weather does to a plot — is what
 * erodes that margin. That is the whole risk model of the game: a farm kept
 * watered and planted in the right weather compounds, and one that ignores the
 * forecast does not. A crop that sold for less than its seed would make the
 * sixteen-plot goal unreachable, so the two columns are never tuned apart.
 *
 * `available` is about art, not about economy: a crop is playable when its five
 * growth stages exist in `assets/images/crops/<id>/`. The shop still lists every
 * crop, with the price, and refuses to sell the ones that cannot be planted yet —
 * hiding them would leave a player wondering where the missing fourth seed went.
 */

export const CROPS = {
  rice: {
    id: 'rice',
    name: 'Rice',
    seedPrice: 100,
    sellPrice: 20, // 10 × 20 = 200, twice the seed
    growHours: 6,
    waterNeed: 0.9,
    yield: 10,
    growNote: 'Cheapest seed, and the thirstiest crop — keep it watered.',
    available: true,
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    seedPrice: 200,
    sellPrice: 40, // 10 × 40 = 400, twice the seed
    growHours: 4,
    waterNeed: 0.5,
    yield: 10,
    growNote: 'The quickest to mature, and happy in cool, moist soil.',
    available: false,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    seedPrice: 300,
    sellPrice: 60, // 10 × 60 = 600, twice the seed
    growHours: 6,
    waterNeed: 0.5,
    yield: 10,
    growNote: 'Wants steady water and a warm spell to finish.',
    available: false,
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    seedPrice: 400,
    sellPrice: 80, // 10 × 80 = 800, twice the seed
    growHours: 5,
    waterNeed: 0.5,
    yield: 10,
    growNote: 'Hardy in cool, dry weather and quick to bring in.',
    available: false,
  },
  corn: {
    id: 'corn',
    name: 'Corn',
    seedPrice: 500,
    sellPrice: 100, // 10 × 100 = 1,000, twice the seed
    growHours: 8,
    waterNeed: 0.7,
    yield: 10,
    growNote: 'The slowest crop and the thirstiest — a season-long bet.',
    available: false,
  },
};

/**
 * Shop listing order, cheapest first.
 *
 * A list sorted by id would put corn in the middle for no reason a player would
 * understand. Ascending price is the order the wallet can afford, and it is the
 * order the prices were chosen in.
 */
export const SHOP_ORDER = ['rice', 'potato', 'tomato', 'wheat', 'corn'];

/** The crop, or undefined. Anything not in the table is not sold. */
export function cropOf(cropId) {
  return Object.prototype.hasOwnProperty.call(CROPS, cropId) ? CROPS[cropId] : undefined;
}

/** Every crop, in shop order. Drops an id listed here but missing from `CROPS`. */
export function shopCrops() {
  return SHOP_ORDER.map(cropOf).filter(Boolean);
}

/**
 * What one packet is worth at full health, before any quality multiplier.
 *
 * Kept here so the rule and the table cannot drift: the harvest maths in
 * `docs/crops.md` is `yield * sellPrice * quality`, and this is the first half of
 * it.
 */
export function harvestValue(cropId) {
  const crop = cropOf(cropId);
  return crop ? crop.yield * crop.sellPrice : 0;
}