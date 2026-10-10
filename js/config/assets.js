/**
 * Every image and sound in the game, in one place.
 *
 * Two things live here:
 *
 *  1. `ASSETS` — the registry. One entry per file on disk with its byte size,
 *     pixel dimensions, status, and the page it appears on. `tests/assets.test.js`
 *     scans `assets/` and fails if this list drifts from the filesystem.
 *  2. Path builders. One function per family of images, so a folder rename is a
 *     single edit here instead of a hunt through the UI.
 *
 * Three conventions on disk do not match each other, and all three are wrapped
 * below rather than spread across callers:
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
 *
 * Owner: Hisham. See docs/team/ownership.md.
 */

export const ASSETS = [
  // --- Field (farm view) ---
  { path: 'assets/images/base.png', name: 'Base slab', size: 63740, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pump.png', name: 'Pump', size: 73567, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/ground/ground_unwatered.png', name: 'Ground (unwatered)', size: 313529, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/ground/ground_watered.png', name: 'Ground (watered)', size: 318028, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/crops/rice/rice_1.png', name: 'Rice — stage 1', size: 624896, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_2.png', name: 'Rice — stage 2', size: 712164, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_3.png', name: 'Rice — stage 3', size: 557278, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_4.png', name: 'Rice — stage 4', size: 646392, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_5.png', name: 'Rice — stage 5', size: 589773, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },

  // --- Shop ---
  { path: 'assets/images/Shop/shop.png', name: 'Shop sign (button to open the shop)', size: 1523803, dimensions: '1254x1254', status: 'done', category: 'button-art', page: 'shop' },
  { path: 'assets/images/crops/rice/rice seed.png', name: 'Rice seed packet', size: 1505980, dimensions: '1312x1199', status: 'done', category: 'shop-art', page: 'shop' },
  { path: 'assets/images/crops/wheat/wheat seed.png', name: 'Wheat seed packet', size: 1592301, dimensions: '1312x1199', status: 'done', category: 'shop-art', page: 'shop' },
  { path: 'assets/images/crops/potato/potato seed.png', name: 'Potato seed packet', size: 1486087, dimensions: '1312x1199', status: 'done', category: 'shop-art', page: 'shop' },
  { path: 'assets/images/crops/corn/corn seed.png', name: 'Corn seed packet', size: 1563013, dimensions: '1312x1199', status: 'done', category: 'shop-art', page: 'shop' },
  { path: 'assets/images/crops/tomato/tomato seed.png', name: 'Tomato seed packet', size: 1573220, dimensions: '1312x1199', status: 'done', category: 'shop-art', page: 'shop' },
  { path: 'assets/icons/crops/rice.svg', name: 'Rice icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/wheat.svg', name: 'Wheat icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/potato.svg', name: 'Potato icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/corn.svg', name: 'Corn icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/tomato.svg', name: 'Tomato icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },

  // --- Settings ---
  { path: 'assets/images/settings/settings.png', name: 'Settings gear (button to open settings)', size: 1578477, dimensions: '1254x1254', status: 'done', category: 'button-art', page: 'settings' },

  // --- Weather (forecast strip / weather panel) ---
  { path: 'assets/icons/weather/sunny.svg', name: 'Sunny icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/cloudy.svg', name: 'Cloudy icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/light-rain.svg', name: 'Light rain icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/heavy-rain.svg', name: 'Heavy rain icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/drought.svg', name: 'Drought icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/frost.svg', name: 'Frost icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/hail.svg', name: 'Hail icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/strong-wind.svg', name: 'Strong wind icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },
  { path: 'assets/icons/weather/high-humidity.svg', name: 'High humidity icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'weather' },

  // --- Global ---
  { path: 'assets/icons/favicon.svg', name: 'Favicon', size: 376, dimensions: '', status: 'done', category: 'icon', page: 'global' },

  // --- Sounds (out of scope for v1) ---
  { path: 'assets/sounds/notification.mp3', name: 'Notification sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },
  { path: 'assets/sounds/rain.mp3', name: 'Rain sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },
  { path: 'assets/sounds/storm.mp3', name: 'Storm sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },

  // --- Folder placeholders ---
  { path: 'assets/images/crops/corn/.gitkeep', name: 'Corn folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/potato/.gitkeep', name: 'Potato folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/tomato/.gitkeep', name: 'Tomato folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/wheat/.gitkeep', name: 'Wheat folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
];

/** The shop sign, used as the button that opens the shop. 1254×1254. */
export const SHOP_IMG = 'assets/images/Shop/shop.png';

/** The settings gear, used as the button that opens settings. 1254×1254. */
export const SETTINGS_IMG = 'assets/images/settings/settings.png';

/** The ground tile for a plot, watered or dry. */
export function groundTile(watered) {
  return watered
    ? 'assets/images/ground/ground_watered.png'
    : 'assets/images/ground/ground_unwatered.png';
}

/** The seed packet the shop lists for a crop. 1312×1199 for every crop. */
export function cropSeedImg(cropId) {
  return `assets/images/crops/${cropId}/${cropId}%20seed.png`;
}

/** One growth stage, 1 to 5. */
export function cropStageImg(cropId, stage) {
  return `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
}

/** A crop failure overlay: `rain_damaged` or `drought_killed`. */
export function cropFailureImg(cropId, failure) {
  return `assets/images/crops/${cropId}/${cropId}_${failure}.png`;
}

/** The weather icon for an event id. */
export function weatherIcon(eventId) {
  return `assets/icons/weather/${eventId}.svg`;
}

/** The crop icon, used where a crop is named rather than drawn. */
export function cropIcon(cropId) {
  return `assets/icons/crops/${cropId}.svg`;
}

/** A pump animation frame, 1 to 3. */
export function pumpFrame(frame) {
  return `assets/images/pump/pump_${frame}.png`;
}

/** Every asset that appears on one page — 'field', 'shop', 'settings', 'weather', 'global'. */
export function assetsForPage(page) {
  return ASSETS.filter((a) => a.page === page);
}

/** The total byte size of every registered asset. */
export function totalSize() {
  return ASSETS.reduce((sum, a) => sum + a.size, 0);
}