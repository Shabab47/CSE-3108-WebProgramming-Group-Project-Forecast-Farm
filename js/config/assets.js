/**
 * Where every image in the game lives.
 *
 * Path building in one place, so a folder rename is a single edit here instead of
 * a hunt through the UI. Two conventions on disk do not match the one in
 * `docs/crops.md`, and both are wrapped below rather than spread across callers:
 *
 *  1. The shop art is `assets/images/Shop/shop.png` — capital S, which is how it
 *     was delivered. Renaming the folder is a git `mv`, not a string change.
 *  2. Seed packets are `<cropId> seed.png`, with a space, while growth stages are
 *     `<cropId>_<stage>.png`. The space is written as `%20` so the URL has no
 *     literal space in it.
 */

/** The shop sign, used as the button that opens the shop. 1254×1254. */
export const SHOP_IMG = 'assets/images/Shop/shop.png';

/** The seed packet the shop lists for a crop. 1312×1199 for every crop. */
export function cropSeedImg(cropId) {
  return `assets/images/crops/${cropId}/${cropId}%20seed.png`;
}

/** One growth stage, 1 to 5. */
export function cropStageImg(cropId, stage) {
  return `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
}