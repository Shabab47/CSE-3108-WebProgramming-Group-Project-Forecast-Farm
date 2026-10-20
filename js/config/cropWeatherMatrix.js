/**
 * How weather treats each crop.
 *
 * `likes` and `hates` on a crop file are **descriptive strings** for the seed
 * picker's tooltip. This file is the mechanical half: a rating per weather event, per
 * crop, which is what actually moves `plot.health`.
 *
 * They are kept apart on purpose. A tooltip that says rice "hates frost" while the
 * matrix has no frost row is the kind of half-answered question that gets discovered
 * by a player rather than by us, so the two are written side by side here and the
 * tests assert every crop has a row for every event.
 *
 * ## Ratings
 *
 *   +2  thriving  — growth is not what changes; the crop just gets *health*, and
 *                   health is what a harvest is paid on.
 *   +1  content
 *    0  neutral   — no effect at all, not a smaller effect
 *  -1  unhappy
 *  -2  harmed    — the event's `healthDrainPerHour` applies
 *
 * Health is what a payout is multiplied by (`docs/crops.md`), so a -2 event is
 * expensive and a -1 is a slow bleed. Below 50% health a harvest stops paying for
 * the seed that produced it, which is where the risk model bites.
 *
 * ## Not wired to the simulator yet
 *
 * `js/domain/simulator.js` is still empty, so nothing ticks health down on a live
 * farm. This table is the data for that work and the shape of it, not a live system —
 * a crop will not actually be harmed by a drought until the simulator lands. That is
 * recorded in `docs/team/issues.md`, and it is why `HEALTH.dryDrainPerHour` is the
 * only drain constant defined so far.
 */

/** Every weather event a crop can have an opinion about. */
export const WEATHER_EVENTS = ['sunny', 'cloudy', 'lightRain', 'heavyRain', 'drought', 'frost', 'hail', 'strongWind'];

/** Ratings, worst to best. Readable in the table below. */
export const RATINGS = { harmed: -2, unhappy: -1, neutral: 0, content: 1, thriving: 2 };

/**
 * The rating words, exported so the seed picker and the almanac cannot disagree.
 *
 * `0` is deliberately **"fine"** and not "neutral": neutral reads like nothing is
 * happening, and fine reads like the weather did its job. Keys are strings because
 * object keys are strings — `RATING_WORDS[rating]` with a numeric `rating` coerces
 * the same way, and a bare `-1` would otherwise be indistinguishable from `1`.
 */
export const RATING_WORDS = {
  2: 'thrives',
  1: 'happy',
  0: 'fine',
  '-1': 'struggles',
  '-2': 'harmed',
};

/**
 * `CROP_WEATHER[cropId][event] -> rating`.
 *
 * Complete on purpose: a missing row reads as "no opinion" in a lookup and as a
 * missing feature to a player, so every crop answers for every event.
 */
export const CROP_WEATHER = {
  rice: {
    sunny: RATINGS.thriving,
    cloudy: RATINGS.neutral,
    lightRain: RATINGS.thriving,
    heavyRain: RATINGS.content, // flooding helps a rice paddy; see likes
    drought: RATINGS.harmed,
    frost: RATINGS.harmed,
    hail: RATINGS.unhappy,
    strongWind: RATINGS.unhappy,
  },
  potato: {
    sunny: RATINGS.neutral,
    cloudy: RATINGS.content,
    lightRain: RATINGS.content,
    heavyRain: RATINGS.harmed, // waterlogging
    drought: RATINGS.unhappy,
    frost: RATINGS.harmed,
    hail: RATINGS.unhappy,
    strongWind: RATINGS.neutral,
  },
  tomato: {
    sunny: RATINGS.content,
    cloudy: RATINGS.neutral,
    lightRain: RATINGS.content,
    heavyRain: RATINGS.unhappy,
    drought: RATINGS.unhappy,
    frost: RATINGS.harmed,
    hail: RATINGS.unhappy,
    strongWind: RATINGS.unhappy,
  },
  wheat: {
    sunny: RATINGS.content,
    cloudy: RATINGS.content,
    lightRain: RATINGS.content,
    heavyRain: RATINGS.harmed,
    drought: RATINGS.harmed,
    frost: RATINGS.unhappy,
    hail: RATINGS.unhappy,
    strongWind: RATINGS.unhappy,
  },
  corn: {
    sunny: RATINGS.thriving,
    cloudy: RATINGS.content,
    lightRain: RATINGS.content,
    heavyRain: RATINGS.unhappy,
    drought: RATINGS.harmed,
    frost: RATINGS.harmed,
    hail: RATINGS.unhappy,
    strongWind: RATINGS.harmed,
  },
};

/**
 * How an event treats one crop. `neutral` for anything unknown, so a crop added
 * before its row is filled in is merely unaffected rather than quietly destroyed.
 */
export function weatherRating(cropId, event) {
  return CROP_WEATHER[cropId]?.[event] ?? RATINGS.neutral;
}

/**
 * Health lost per hour to this weather, given a crop and a base drain.
 *
 * Only `-1` and `-2` events drain at all; positive ratings are already at full health
 * and there is nothing above `HEALTH.max` to give them. This is why a `-1` costs half
 * what a `-2` does rather than a little less.
 *
 * @param {string} cropId
 * @param {string} event
 * @param {number} baseDrainPerHour `HEALTH.dryDrainPerHour`, or whatever the caller drains at
 * @returns {number} health points lost per hour; 0 when the weather is not harmful
 */
export function healthDrainFor(cropId, event, baseDrainPerHour) {
  const rating = weatherRating(cropId, event);
  if (rating >= 0) return 0;
  return Math.abs(rating) * baseDrainPerHour;
}
