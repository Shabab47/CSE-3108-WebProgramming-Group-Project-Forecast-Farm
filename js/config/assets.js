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
  // The original single pump, byte-identical to `pump/pump_1.png`. Nothing loads this
  // path any more — `farmView.js` asks `pumpFrame(level)` — but the file is real art and
  // the registry documents what is on disk, so it stays listed.
  { path: 'assets/images/pump.png', name: 'Pump (original, unused copy of pump_1)', size: 73567, dimensions: '1000x1000', status: 'duplicate', category: 'environment', page: 'field' },
  // Five drawings, one per level: level N wears `pump_N.png` (see `pumpFrame()` below).
  // All five share a 1000×1000 canvas and the same anchor, so swapping between them
  // never moves the machine.
  { path: 'assets/images/pump/pump_1.png', name: 'Pump — level 1 (the starter pump, waters 2 plots)', size: 73567, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pump/pump_2.png', name: 'Pump — level 2 (waters 4 plots)', size: 98399, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pump/pump_3.png', name: 'Pump — level 3 (waters 8 plots)', size: 125968, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pump/pump_4.png', name: 'Pump — level 4 (waters 12 plots)', size: 163596, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pump/pump_5.png', name: 'Pump — level 5 (the final pump, waters 16 plots)', size: 186471, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/ground/ground_unwatered.png', name: 'Ground (unwatered)', size: 313529, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/ground/ground_watered.png', name: 'Ground (watered)', size: 318028, dimensions: '1000x1000', status: 'done', category: 'environment', page: 'field' },
  // The lock pins on unowned plots: green on the one plot that can be bought next,
  // red on the rest (DEC-047). 141x229, a portrait pin, so `scene.css` sizes them by
  // height off the plot's own width.
  { path: 'assets/images/pins/lock_pin_green.png', name: 'Lock pin - next plot (green)', size: 11357, dimensions: '141x229', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/pins/lock_pin_red.png', name: 'Lock pin - locked (red)', size: 11187, dimensions: '141x229', status: 'done', category: 'environment', page: 'field' },
  { path: 'assets/images/crops/rice/rice_1.png', name: 'Rice — stage 1', size: 624896, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_2.png', name: 'Rice — stage 2', size: 712164, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_3.png', name: 'Rice — stage 3', size: 557278, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_4.png', name: 'Rice — stage 4', size: 646392, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_5.png', name: 'Rice - stage 5', size: 589773, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  // Tomato stages. All five are 1024x1024 — `tomato_5.png` was re-exported square, so
  // the old ISS-093 "stage 5 is not square" note is gone. Sizes are the files' own, read
  // from disk rather than assumed, because that is the only way the registry can be
  // trusted. See ISS-121.
  { path: 'assets/images/crops/tomato/tomato_1.png', name: 'Tomato - stage 1', size: 557156, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_2.png', name: 'Tomato - stage 2', size: 780860, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_3.png', name: 'Tomato - stage 3', size: 1132776, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_4.png', name: 'Tomato - stage 4', size: 1112876, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_5.png', name: 'Tomato - stage 5', size: 1127648, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },

  // Potato stages, all five now delivered art. Stages 1-2 arrived first; stages 3-5
  // replaced the rice placeholders in place (same filenames) in `a02a62e`, so the
  // registry still had the old rice sizes until ISS-105. All five are 1024x1024.
  { path: 'assets/images/crops/potato/potato_1.png', name: 'Potato - stage 1', size: 393079, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_2.png', name: 'Potato - stage 2', size: 509140, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_3.png', name: 'Potato - stage 3', size: 793150, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_4.png', name: 'Potato - stage 4', size: 795681, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_5.png', name: 'Potato - stage 5', size: 880078, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },

  // Wheat and corn stages, delivered together in `db4177b`. Both are 1024x1024, and both
  // use the shared growth rule in `stageMath.js` — four growing sprites spread evenly
  // over `growHours`, the ripe fifth only at harvest — exactly as rice and tomato do. So
  // the only thing these needed was `available: true` in their own crop files; no new
  // arithmetic. Wheat grows for 6 h, so it swaps every 1.5 h; corn grows for 4 h, so it
  // swaps on the hour.
  { path: 'assets/images/crops/wheat/wheat_1.png', name: 'Wheat - stage 1', size: 447002, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_2.png', name: 'Wheat - stage 2', size: 618695, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_3.png', name: 'Wheat - stage 3', size: 727369, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_4.png', name: 'Wheat - stage 4', size: 878448, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_5.png', name: 'Wheat - stage 5', size: 886923, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_1.png', name: 'Corn - stage 1', size: 501417, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_2.png', name: 'Corn - stage 2', size: 707528, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_3.png', name: 'Corn - stage 3', size: 971478, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_4.png', name: 'Corn - stage 4', size: 1485510, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_5.png', name: 'Corn - stage 5', size: 1552501, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },

  // Damage sprites, built by `cropFailureImg(cropId, failure)` with failure one of
  // `dry`, `waterlogged`, `dead`. All five crops use custom filenames for
  // dry/waterlogged; see `cropFailureImg()`. `dead` art has not landed for any crop;
  // the entry is omitted until the file exists. `plotLayers.js` draws the
  // `damageWord()` text beside it, which is the DEC-014 rule: the text carries the
  // meaning, the image is a hole for now.
  { path: 'assets/images/crops/rice/rice_drought_killed.png', name: 'Rice - dry damage (drought killed)', size: 794692, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/rice/rice_rain_damaged.png', name: 'Rice - waterlogged damage (rain damaged)', size: 689884, dimensions: '1000x1000', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_drought_killed.png', name: 'Potato - dry damage (drought killed)', size: 943834, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/potato/potato_rain_damaged.png', name: 'Potato - waterlogged damage (rain damaged)', size: 909060, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_drought_killed.png', name: 'Tomato - dry damage (drought killed)', size: 759539, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/tomato/tomato_rain_damaged.png', name: 'Tomato - waterlogged damage (rain damaged)', size: 1157647, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_drought_killed.png', name: 'Wheat - dry damage (drought killed)', size: 828311, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/wheat/wheat_rain_damaged.png', name: 'Wheat - waterlogged damage (rain damaged)', size: 962861, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_drought_killed.png', name: 'Corn - dry damage (drought killed)', size: 1545068, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },
  { path: 'assets/images/crops/corn/corn_rain_damaged.png', name: 'Corn - waterlogged damage (rain damaged)', size: 1566344, dimensions: '1024x1024', status: 'done', category: 'crop-sprite', page: 'field' },

  // The five flat `assets/images/crops/rice_N.png` copies that used to be listed here as
  // `duplicate` were deleted by `db4177b` ("wheat and corn sprites added"), so their
  // entries went with them. That is the cleanup the earlier note in this file asked for:
  // the registry documents what is on disk, and both directions are enforced by
  // `tests/assets.test.js`.

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

  // --- Book / almanac ---
  //
  // The book button sits in the farm sidebar, directly under the shop button
  // (`ui/almanacLauncher.js`). It replaced a rice seed packet that had stood in
  // for it. The art is square, 1254×1254 like the shop and settings buttons, and it is
  // the button itself — no tile or border behind it (`css/sidebar.css`).
  { path: 'assets/images/book/book.png', name: 'Book (button to open the almanac)', size: 1704265, dimensions: '1254x1254', status: 'done', category: 'button-art', page: 'field' },
  // One illustration per crop, for the almanac's entries. `almanac.html` is still
  // an empty placeholder (ISS-019), so nothing loads these yet — they are registered
  // because this file is the record of what is on disk, and `tests/assets.test.js`
  // fails in both directions.
  { path: 'assets/images/book/rice.png', name: 'Rice — almanac entry', size: 1494221, dimensions: '1254x1254', status: 'done', category: 'book-art', page: 'almanac' },
  { path: 'assets/images/book/wheat.png', name: 'Wheat — almanac entry', size: 1409327, dimensions: '1254x1254', status: 'done', category: 'book-art', page: 'almanac' },
  { path: 'assets/images/book/potato.png', name: 'Potato — almanac entry', size: 1511880, dimensions: '1254x1254', status: 'done', category: 'book-art', page: 'almanac' },
  { path: 'assets/images/book/tomato.png', name: 'Tomato — almanac entry', size: 1387882, dimensions: '1254x1254', status: 'done', category: 'book-art', page: 'almanac' },
  { path: 'assets/images/book/corn.png', name: 'Corn — almanac entry', size: 1345346, dimensions: '1254x1254', status: 'done', category: 'book-art', page: 'almanac' },
  { path: 'assets/images/book/Golden Rice Harvest Bundle.png', name: 'Golden Rice Harvest Bundle', size: 1215721, dimensions: '1312x1199', status: 'done', category: 'book-art', page: 'almanac' },

  // --- Inventory ---
  //
  // A crate of harvested crops. It is the button on the farm sidebar, under the
  // almanac button (`ui/inventoryLauncher.js`), which opens the seed-bag page
  // (`inventory.html`).
  { path: 'assets/images/inventory/inventory.png', name: 'Inventory crate (button to open the seed bag)', size: 2004167, dimensions: '1254x1254', status: 'done', category: 'button-art', page: 'field' },

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
  { path: 'assets/icons/favicon.svg', name: 'Favicon', size: 369, dimensions: '', status: 'done', category: 'icon', page: 'global' },

  // --- Farm dialogs (plot inspector + seed picker) ---
  // The timber frame's close tile, leaf ornament and peg, exported from the Figma
  // dialog frames (182:81, 182:109, 182:129). The close tile is 44x44 and carries its
  // own pale-green background; the leaf and peg are transparent.
  { path: 'assets/icons/ui/close.svg', name: 'Dialog close tile', size: 385, dimensions: '44x44', status: 'done', category: 'icon', page: 'field' },
  { path: 'assets/icons/ui/leaf-ornament.svg', name: 'Dialog leaf ornament', size: 652, dimensions: '36x32', status: 'done', category: 'icon', page: 'field' },
  { path: 'assets/icons/ui/timber-peg.svg', name: 'Dialog timber peg', size: 367, dimensions: '5x5', status: 'done', category: 'icon', page: 'field' },
  { path: 'assets/icons/ui/info.svg', name: 'Dialog info icon', size: 600, dimensions: '16x16', status: 'done', category: 'icon', page: 'field' },

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
  // --- SFX (in scope) ---
  { path: 'assets/sounds/sfx/buy.mp3', name: 'Buy SFX', size: 21459, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/click.MP3', name: 'Click SFX', size: 6830, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/click_p.mp3', name: 'Plot click SFX', size: 7248, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/crop_ready.mp3', name: 'Crop ready SFX', size: 23966, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/dead_crop_clear.mp3', name: 'Dead crop clear SFX', size: 18533, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/harvest.mp3', name: 'Harvest SFX', size: 27311, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/insufficient.mp3', name: 'Insufficient gold SFX', size: 6830, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/login.mp3', name: 'Login SFX', size: 11844, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/plant.mp3', name: 'Plant SFX', size: 31908, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/pop.MP3', name: 'Pop SFX', size: 8920, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/pump_running1.mp3', name: 'Pump running start SFX', size: 137234, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  // Added with the other SFX but never wired up: `startPumpLoop()` plays the one-shot
  // `pump_running1.mp3`. The file is real audio, so the registry documents it; it is
  // not deleted in case the loop is wanted later.
  { path: 'assets/sounds/sfx/pump_running_loop.mp3', name: 'Pump running loop SFX (unused)', size: 130129, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/pump_up.mp3', name: 'Pump upgrade SFX', size: 49043, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/sell.mp3', name: 'Sell SFX', size: 12263, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/unlock.mp3', name: 'Unlock SFX', size: 13100, dimensions: '', status: 'done', category: 'sound', page: 'global' },
  { path: 'assets/sounds/sfx/watering.MP3', name: 'Watering SFX', size: 23131, dimensions: '', status: 'done', category: 'sound', page: 'global' },

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

/** The book, used as the button under the shop button that opens the almanac. 1254×1254. */
export const BOOK_IMG = 'assets/images/book/book.png';

/** The crate, used as the button under the almanac button that opens the seed bag. 1254×1254. */
export const INVENTORY_IMG = 'assets/images/inventory/inventory.png';

/** The 44×44 close tile on the plot inspector's timber frame. */
export const DIALOG_CLOSE_IMG = 'assets/icons/ui/close.svg';

/** The 36×32 leaf ornament on the seed picker's timber frame. */
export const DIALOG_LEAF_IMG = 'assets/icons/ui/leaf-ornament.svg';

/** The 5×5 peg at the top corners of a timber dialog. */
export const DIALOG_PEG_IMG = 'assets/icons/ui/timber-peg.svg';

/** The 16×16 info icon on a seed card: opens the seed's details dialog. */
export const DIALOG_INFO_IMG = 'assets/icons/ui/info.svg';

/** The ground tile for a plot, watered or dry. */
export function groundTile(watered) {
  return watered
    ? 'assets/images/ground/ground_watered.png'
    : 'assets/images/ground/ground_unwatered.png';
}

/**
 * The pin on an unowned plot: green on the one plot that can be bought next, red on
 * the rest. 141x229, drawn as an overlay — see `plotLayers.js` and DEC-047.
 */
export function lockPin(isNext) {
  return isNext
    ? 'assets/images/pins/lock_pin_green.png'
    : 'assets/images/pins/lock_pin_red.png';
}

/** The seed packet the shop lists for a crop. 1312×1199 for every crop. */
export function cropSeedImg(cropId) {
  return `assets/images/crops/${cropId}/${cropId}%20seed.png`;
}

/**
 * One crop's illustration in the almanac. 1254×1254.
 *
 * Lives in `assets/images/book/` rather than the crop's own folder, because the
 * almanac's art is a drawn entry portrait, not a growth stage — `bookCropImg()` is
 * what keeps the two apart.
 */
export function bookCropImg(cropId) {
  return `assets/images/book/${cropId}.png`;
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
 * Every crop ships its dry/waterlogged art under custom names rather than the generic
 * `<cropId>_<failure>.png`, and the game has to ask for what is actually on disk — rice
 * first, then potato (ISS-106), then tomato, then wheat and corn. Everything without an
 * entry here uses the generic pattern; a crop still waiting on damage art gets a hole
 * and the `damageWord()` text, which is DEC-014's rule.
 */
const CUSTOM_FAILURE_NAMES = {
  rice: {
    dry: 'rice_drought_killed.png',
    waterlogged: 'rice_rain_damaged.png',
  },
  potato: {
    dry: 'potato_drought_killed.png',
    waterlogged: 'potato_rain_damaged.png',
  },
  tomato: {
    dry: 'tomato_drought_killed.png',
    waterlogged: 'tomato_rain_damaged.png',
  },
  wheat: {
    dry: 'wheat_drought_killed.png',
    waterlogged: 'wheat_rain_damaged.png',
  },
  corn: {
    dry: 'corn_drought_killed.png',
    waterlogged: 'corn_rain_damaged.png',
  },
};

/** @see CUSTOM_FAILURE_NAMES */
export function cropFailureImg(cropId, failure) {
  const custom = CUSTOM_FAILURE_NAMES[cropId]?.[failure];
  return custom
    ? `assets/images/crops/${cropId}/${custom}`
    : `assets/images/crops/${cropId}/${cropId}_${failure}.png`;
}

/** The weather icon for an event id. */
export function weatherIcon(eventId) {
  return `assets/icons/weather/${eventId}.svg`;
}

/** The crop icon, used where a crop is named rather than drawn. */
export function cropIcon(cropId) {
  return `assets/icons/crops/${cropId}.svg`;
}

/**
 * Which drawing in `assets/images/pump/` each pump level wears.
 *
 * One drawing per level, in order, so level N wears `pump_N.png` and nothing is
 * retired. The numbers also happen to be the level numbers; the table stays a table
 * because it is the only place that decides, so retiring or adding a drawing is a
 * one-line change rather than a rename of every file.
 *
 *   level 1 (starter, waters 2)    pump_1.png
 *   level 2 (waters 4)             pump_2.png
 *   level 3 (waters 8)             pump_3.png
 *   level 4 (waters 12)            pump_4.png
 *   level 5 (final, waters 16)     pump_5.png
 */
const PUMP_DRAWING = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

/**
 * A pump's art for its level, 1 to 5.
 *
 * All the files share a 1000×1000 canvas and a centred drawing, so changing the level
 * changes what the field shows without changing where the machine sits. The shop card
 * asks for the *next* level; the field asks for the current one. An unknown level falls
 * back to the starter pump's drawing rather than building a URL that 404s.
 */
export function pumpFrame(level) {
  const drawing = PUMP_DRAWING[level] ?? PUMP_DRAWING[1];
  return `assets/images/pump/pump_${drawing}.png`;
}

/** A sound effect in `assets/sounds/sfx/`. Pass the file name, e.g. `sfx('plant.mp3')`. */
export function sfx(name) {
  return `assets/sounds/sfx/${name}`;
}

/** Every asset that appears on one page — 'field', 'shop', 'settings', 'weather', 'global'. */
export function assetsForPage(page) {
  return ASSETS.filter((a) => a.page === page);
}

/** The total byte size of every registered asset. */
export function totalSize() {
  return ASSETS.reduce((sum, a) => sum + a.size, 0);
}