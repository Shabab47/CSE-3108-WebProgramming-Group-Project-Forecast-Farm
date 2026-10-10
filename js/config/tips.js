/**
 * Facts shown while a page is loading, and the timings that govern them.
 *
 * The game has no loading screen. Every entry point awaits the session and the
 * remote save before it mounts a single panel, so a player on a slow connection
 * was looking at a blank white page — for up to 15 seconds on the farm page,
 * where `js/services/gotrue.js` has no request deadline of its own and the only
 * backstop is the `Promise.race` in `js/services/authApi.js`.
 *
 * A tip is the cheapest possible way to make that wait legible. It is not a
 * placeholder: it is real content, and it is the only thing on screen while the
 * game decides whether it has a session.
 *
 * ## Why these numbers
 *
 * A loader that appears instantly is worse than no loader, because a page that
 * loads in 150 ms should never flash a veil. So the timings are staged:
 *
 *   SHOW_AFTER_MS      the veil waits this long before appearing at all. A load
 *                       faster than this shows nothing, ever.
 *   FIRST_TIP_AFTER_MS the veil is up but silent until here. A 2-second load
 *                       shows a spinner and no trivia.
 *   TIP_ROTATE_MS      how long each fact is held.
 *
 * Together they mean a fact is only ever shown when the player has already been
 * looking at a spinner for over a second and a half, which is exactly when one
 * starts to wonder what is going on.
 *
 * ## Writing tips
 *
 * Two kinds. `weather` is about the real world — it is why the player is waiting
 * on a network call in the first place. `game` is about how this farm works.
 *
 * Do not state a number here that `js/config/game.js` or `js/config/crops.js`
 * owns. Those are placeholders until balance is tuned (see ISS-008), and a tip
 * that quotes one will be quietly wrong the moment it moves. The `game` tips
 * below describe the shape of the rules, which is what AGENTS.md fixes.
 */

export const TIPS = [
  // --- weather ----------------------------------------------------------
  {
    id: 'cumulonimbus',
    kind: 'weather',
    text: 'A cumulonimbus can weigh half a million tonnes — the weight of a hundred loaded airliners.',
  },
  {
    id: 'lightning-counts',
    kind: 'weather',
    text: 'Earth is struck by lightning about 100 times every second. Most of it happens over water.',
  },
  {
    id: 'wettest-place',
    kind: 'weather',
    text: 'Mawsynram, India receives around 11,800 mm of rain a year. The wettest inhabited place on earth.',
  },
  {
    id: 'driest-place',
    kind: 'weather',
    text: 'The Atacama Desert had no measurable rainfall for decades at a time — and still supports life.',
  },
  {
    id: 'lightning-temperature',
    kind: 'weather',
    text: 'A lightning channel heats to about 30,000 °C, five times the surface of the Sun.',
  },
  {
    id: 'frost-seasonal',
    kind: 'weather',
    text: 'Frost is not a separate kind of cold. It is moisture freezing onto a surface that has already dropped below zero.',
  },
  {
    id: 'wind-from',
    kind: 'weather',
    text: '"Wind from the west" means it is blowing towards the east. The phrase names where it comes from.',
  },
  {
    id: 'heat-humidity',
    kind: 'weather',
    text: 'Sweat only cools you down when it can evaporate. Humid air makes a hot day feel far hotter than the number suggests.',
  },
  {
    id: 'virga',
    kind: 'weather',
    text: 'Rain that evaporates before it lands is called virga. It is common over dry ground — a storm that never quite arrives.',
  },
  {
    id: 'thunder-distance',
    kind: 'weather',
    text: 'You can estimate a storm\'s distance by counting seconds between the flash and the thunder, then dividing by three.',
  },
  {
    id: 'snowflake',
    kind: 'weather',
    text: 'Every snowflake that falls is unique. No two have taken the same route through the air to reach the ground.',
  },
  {
    id: 'desert-drops',
    kind: 'weather',
    text: 'Water vapour cools as air rises and condenses into cloud. Without that step there is no rain at all.',
  },

  // --- game -------------------------------------------------------------
  {
    id: 'weather-is-real',
    kind: 'game',
    text: 'The weather on this farm is not a dice roll. It is the live forecast for the place you chose.',
  },
  {
    id: 'rain-is-free',
    kind: 'game',
    text: 'Rain waters your crops at no charge. The pump bills you gold every second it runs.',
  },
  {
    id: 'you-control-nothing',
    kind: 'game',
    text: 'You cannot command the weather. Your only levers are what you plant, what you buy, and whether the pump runs.',
  },
  {
    id: 'growth-offline',
    kind: 'game',
    text: 'Crops keep growing while the tab is closed. The time you are away is not wasted — unless it was dry.',
  },
  {
    id: 'frost-kills',
    kind: 'game',
    text: 'A hard frost kills a planted crop outright. There is no undo, so watch the overnight low before you sow.',
  },
  {
    id: 'sixteen-plots',
    kind: 'game',
    text: 'Your farm is sixteen plots in four zones. Land is bought plot by plot as the farm grows.',
  },
  {
    id: 'rice-first',
    kind: 'game',
    text: 'Rice is the only crop ready to plant so far. The others are listed in the shop, and greyed out.',
  },
  {
    id: 'read-the-forecast',
    kind: 'game',
    text: 'The 24-hour strip is the only planning tool you get. What is planted cannot be un-planted.',
  },
  {
    id: 'autosave',
    kind: 'game',
    text: 'Your farm saves on its own every few seconds, and again when you close the tab. You never have to think about it.',
  },
  {
    id: 'starting-gold',
    kind: 'game',
    text: 'Every farm starts with the same gold. What you do with the first wet hour decides the rest of the season.',
  },
];

/**
 * Milliseconds before the veil appears at all.
 *
 * A load faster than this shows nothing — no flash, no spinner. That is the
 * common case on a warm cache, and it is the one the timings exist to protect.
 */
export const SHOW_AFTER_MS = 250;

/**
 * Milliseconds after mount before the first fact appears.
 *
 * The veil is already up by now, so the player has the spinner; a fact on top
 * of it would be noise rather than company.
 */
export const FIRST_TIP_AFTER_MS = 1500;

/** How long each fact is held before the next one replaces it. */
export const TIP_ROTATE_MS = 5000;