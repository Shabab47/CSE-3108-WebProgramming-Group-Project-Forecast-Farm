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

/**
 * The only statuses an entry may carry. Exported so `tests/assets.test.js` can
 * assert against the list rather than a second copy of it written in the test.
 *
 * This exists because of ISS-095: `tomato_5.png` was registered as `'do'` — a
 * truncated `done` — and the whole suite stayed green, because nothing checked
 * the vocabulary. A status the game never reads is indistinguishable from a typo
 * until someone counts the assets by hand and gets the wrong answer.
 *
 * - `done`         the file is on disk, non-empty, and is the one the game loads
 * - `empty`        registered, but 0 bytes. The game requests it and shows a hole
 * - `placeholder`  a stand-in, not final art
 * - `duplicate`    on disk, byte-identical to another entry, and loaded by nothing
 */
export const ASSET_STATUSES = ['done', 'empty', 'placeholder', 'duplicate'];

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
  { path: 'assets/images/crops/rice/rice_5.png', name: 'Rice - stage 5', size: 589773, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  // Tomato stages, added in d131de4. The first four are square at 1024x1024; **stage 5 is
  // 1024x807**, which is not — see ISS-093. Registered with the dimensions the files
  // actually have rather than the ones the rice pattern would suggest, because the whole
  // point of the registry is to be the thing you can trust.
  { path: 'assets/images/crops/tomato/tomato_1.png', name: 'Tomato - stage 1', size: 557156, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_2.png', name: 'Tomato - stage 2', size: 780860, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_3.png', name: 'Tomato - stage 3', size: 1132288, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_4.png', name: 'Tomato - stage 4', size: 1112306, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_5.png', name: 'Tomato - stage 5 (ISS-093: not square)', size: 1125057, dimensions: '1024x807', status: 'done', category: 'crop-sprite', page: 'field' },

  // Damage sprites, built by `cropFailureImg(cropId, failure)` with failure one of
  // `dry`, `waterlogged`, `dead`. **All three are 0 bytes** — the latch and the wording
  // ship in ISS-092, the art has not (T-26, Zim). Registered as `empty` so the count in
  // `asset-checklist.md` is honest and so a damaged crop requests a known path rather
  // than an unregistered 404. `plotLayers.js` draws the `damageWord()` text beside it,
  // which is the DEC-014 rule: the text carries the meaning, the image is a hole for now.
  { path: 'assets/images/crops/rice/rice_dry.png', name: 'Rice - dry damage (ISS-096: art missing)', size: 0, dimensions: '', status: 'empty', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_waterlogged.png', name: 'Rice - waterlogged damage (art missing)', size: 0, dimensions: '', status: 'empty', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_dead.png', name: 'Rice - dead (art missing)', size: 0, dimensions: '', status: 'empty', category: 'crop-sprite', page: 'field' },

  // Flat copies of the five rice sprites, delivered at this path before the per-crop
  // folder convention existed. Byte-identical to `crops/rice/rice_N.png` and kept,
  // because they were delivered art and this registry documents what is on disk rather
  // than deciding what should be. **Nothing loads these** — `cropStageImg()` builds the
  // folder path, so the game never requests them. If they are ever cleaned up, delete
  // these five entries in the same commit; `tests/assets.test.js` fails in both
  // directions, which is the point of it.
  { path: 'assets/images/crops/rice_1.png', name: 'Rice — stage 1 (flat copy, unused)', size: 624896, dimensions: '1000x1000', status: 'duplicate', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice_2.png', name: 'Rice — stage 2 (flat copy, unused)', size: 712164, dimensions: '1000x1000', status: 'duplicate', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice_3.png', name: 'Rice — stage 3 (flat copy, unused)', size: 557278, dimensions: '1000x1000', status: 'duplicate', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice_4.png', name: 'Rice — stage 4 (flat copy, unused)', size: 646392, dimensions: '1000x1000', status: 'duplicate', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice_5.png', name: 'Rice — stage 5 (flat copy, unused)', size: 589773, dimensions: '1000x1000', status: 'duplicate', category: 'crop-sprite', page: 'field' },

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

  // --- Seasons (the season card's illustration) ---
  //
  // `ui/seasonCard.js` builds this path as
  // `assets/images/seasons/${encodeURIComponent(season)}.png`, so the file name has to
  // be the season name in `domain/seasons.js` exactly — which is why "Late Autumn"
  // carries a space. The six names there are Winter, Spring, Summer, Monsoon, Autumn,
  // Late Autumn, and all six are here; a missing one 404s the season card for a third
  // of the year.
  { path: 'assets/images/seasons/Winter.png', name: 'Season card — Winter', size: 15874, dimensions: '', status: 'done', category: 'season-art', page: 'field' },
  { path: 'assets/images/seasons/Spring.png', name: 'Season card — Spring', size: 15207, dimensions: '', status: 'done', category: 'season-art', page: 'field' },
  { path: 'assets/images/seasons/Summer.png', name: 'Season card — Summer', size: 14909, dimensions: '', status: 'done', category: 'season-art', page: 'field' },
  { path: 'assets/images/seasons/Monsoon.png', name: 'Season card — Monsoon', size: 10690, dimensions: '', status: 'done', category: 'season-art', page: 'field' },
  { path: 'assets/images/seasons/Autumn.png', name: 'Season card — Autumn', size: 16073, dimensions: '', status: 'done', category: 'season-art', page: 'field' },
  { path: 'assets/images/seasons/Late Autumn.png', name: 'Season card — Late Autumn', size: 16993, dimensions: '', status: 'done', category: 'season-art', page: 'field' },

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

  // --- Login page (the opening menu and the auth signs) ---
  // The background is 1.6MB as a PNG on the page every visitor lands on. WebP
  // would cut it roughly tenfold; nobody has done it yet, and the dev server
  // sends no caching headers, so it costs every first visit.
  { path: 'assets/images/menu_bg.png', name: 'Menu background', size: 1706006, dimensions: '1440x1024', status: 'done', category: 'background', page: 'login' },
  { path: 'assets/images/title.png', name: 'Game logo', size: 161990, dimensions: '1188x373', status: 'done', category: 'logo', page: 'login' },
  { path: 'assets/fonts/LuckiestGuy-Regular.ttf', name: 'Luckiest Guy — logo, buttons, plank', size: 58324, dimensions: '', status: 'done', category: 'font', page: 'login' },
  { path: 'assets/fonts/IrishGrover-Regular.ttf', name: 'Irish Grover — labels, body, links', size: 51544, dimensions: '', status: 'done', category: 'font', page: 'login' },
  { path: 'assets/fonts/Nunito-Regular.ttf', name: 'Nunito Regular — shop body text', size: 125528, dimensions: '', status: 'done', category: 'font', page: 'shop' },
  { path: 'assets/fonts/Nunito-SemiBold.ttf', name: 'Nunito SemiBold — shop descriptions', size: 125536, dimensions: '', status: 'done', category: 'font', page: 'shop' },
  { path: 'assets/fonts/Nunito-ExtraBold.ttf', name: 'Nunito ExtraBold — shop footer hint', size: 125416, dimensions: '', status: 'done', category: 'font', page: 'shop' },
  { path: 'assets/fonts/Nunito-Black.ttf', name: 'Nunito Black — shop item names', size: 125376, dimensions: '', status: 'done', category: 'font', page: 'shop' },

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

/**
 * The opening menu's painted background. 1440×1024.
 *
 * Set from JS rather than from `css/auth.css`, because every image path in this
 * project lives here — see the note at the top of the file. The stylesheet gives
 * the scene a sky colour so the gap between first paint and image decode is sky
 * rather than white.
 */
export const MENU_BG = 'assets/images/menu_bg.png';

/** The game logo on the opening menu, cloud and straw hat included. 1188×373. */
export const TITLE_IMG = 'assets/images/title.png';

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

/**
 * A crop damage overlay: `dry`, `waterlogged` or `dead`.
 *
 * **These are Zim's sprites and the names must match his.** `domain/damage.js` resolves
 * the state and passes it here, so the two files are one contract: if the art arrives
 * under different filenames, change this and the `damageSprite()` cases together, rather
 * than leaving a sprite that never resolves.
 *
 * All three are 0 bytes until the art lands. `plotLayers.js` draws the word beside them
 * precisely so a 0-byte file costs a missing picture rather than a missing fact.
 */
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