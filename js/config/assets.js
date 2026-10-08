/**
 * Where every image in the game lives.
 *
 * Path building in one place, so a folder rename is a single edit here instead of
 * a hunt through the UI. Three conventions on disk do not match the one in
 * `docs/crops.md`, and all three are wrapped below rather than spread across callers:
 *
 *  1. The shop art is `assets/images/Shop/shop.png` — capital S, which is how it
 *     was delivered. Renaming the folder is a git `mv`, not a string change.
 *  2. The settings art is `assets/images/settings/settings.png` — lowercase s, as
 *     delivered. It is spelled here exactly as it sits on disk because Windows
 *     resolves the two casings to one folder and hides a mismatch, while a Linux
 *     host serves them as two and 404s. Do not "tidy" this one to match `Shop`.
 *  3. Seed packets are `<cropId> seed.png`, with a space, while growth stages are
 *     `<cropId>_<stage>.png`. The space is written as `%20` so the URL has no
 *     literal space in it.
 */

/** The shop sign, used as the button that opens the shop. 1254×1254. */
export const SHOP_IMG = 'assets/images/Shop/shop.png';

/** The settings gear, used as the button that opens settings. 1254×1254. */
export const SETTINGS_IMG = 'assets/images/settings/settings.png';

/** The seed packet the shop lists for a crop. 1312×1199 for every crop. */
export function cropSeedImg(cropId) {
  return `assets/images/crops/${cropId}/${cropId}%20seed.png`;
}

/** One growth stage, 1 to 5. */
export function cropStageImg(cropId, stage) {
  return `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
}