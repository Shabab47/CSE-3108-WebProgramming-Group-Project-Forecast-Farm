/**
 * Central asset registry.
 *
 * Every file the game uses is listed here with its path, name, byte size,
 * dimensions, status and the page/panel it appears on. When you add or
 * replace an asset, add or update its entry here — tests/assets.test.js
 * will fail if you forget.
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

  // --- Shop (seed shop / crop picker) ---
  { path: 'assets/icons/crops/rice.svg', name: 'Rice icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/wheat.svg', name: 'Wheat icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/potato.svg', name: 'Potato icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/corn.svg', name: 'Corn icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },
  { path: 'assets/icons/crops/tomato.svg', name: 'Tomato icon', size: 0, dimensions: '', status: 'empty', category: 'icon', page: 'shop' },

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

  // --- Favicon ---
  { path: 'assets/icons/favicon.svg', name: 'Favicon', size: 376, dimensions: '', status: 'done', category: 'icon', page: 'global' },

  // --- Sounds (out of scope) ---
  { path: 'assets/sounds/notification.mp3', name: 'Notification sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },
  { path: 'assets/sounds/rain.mp3', name: 'Rain sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },
  { path: 'assets/sounds/storm.mp3', name: 'Storm sound', size: 0, dimensions: '', status: 'empty', category: 'sound', page: 'global' },

  // --- Placeholders ---
  { path: 'assets/images/crops/corn/.gitkeep', name: 'Corn folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/potato/.gitkeep', name: 'Potato folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/tomato/.gitkeep', name: 'Tomato folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
  { path: 'assets/images/crops/wheat/.gitkeep', name: 'Wheat folder placeholder', size: 0, dimensions: '', status: 'placeholder', category: 'meta', page: 'field' },
];

/** Returns the ground tile path for the given watered state. */
export function groundTile(watered) {
  return watered
    ? 'assets/images/ground/ground_watered.png'
    : 'assets/images/ground/ground_unwatered.png';
}

/** Returns the crop sprite path for a given crop and growth stage (1-5). */
export function cropSprite(cropId, stage) {
  return `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
}

/** Returns the crop failure sprite path for a given crop and failure type. */
export function cropFailure(cropId, failure) {
  return `assets/images/crops/${cropId}/${cropId}_${failure}.png`;
}

/** Returns the weather icon path for a given event id. */
export function weatherIcon(eventId) {
  return `assets/icons/weather/${eventId}.svg`;
}

/** Returns the crop icon path for a given crop id. */
export function cropIcon(cropId) {
  return `assets/icons/crops/${cropId}.svg`;
}

/** Returns the pump animation frame path. */
export function pumpFrame(frame) {
  return `assets/images/pump/pump_${frame}.png`;
}

/** Returns the total byte size of all registered assets. */
export function totalSize() {
  return ASSETS.reduce((sum, a) => sum + a.size, 0);
}

/** Returns all assets used on a given page (e.g. 'shop', 'field', 'weather'). */
export function assetsForPage(page) {
  return ASSETS.filter((a) => a.page === page);
}
