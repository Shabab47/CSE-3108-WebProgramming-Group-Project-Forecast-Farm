# Decisions

Short records of choices that were made, so nobody re-litigates them or accidentally reverses
them. Newest first.

Format: date, who decided, the choice, why, and what was rejected.

---

### DEC-016 One folder per crop under `assets/images/crops/`
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** Crop art lives at `assets/images/crops/<cropId>/<cropId>_<stage>.png`. Rice is
`assets/images/crops/rice/rice_1.png` through `rice_5.png`. Empty folders for wheat, potato, corn
and tomato are committed with a `.gitkeep` so the target is obvious and git tracks them.

```js
export const cropImg = (cropId, stage) =>
  `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
```

**Why:** Five crops times five stages is 25 files, and only rice exists today. Flat, that folder
is already hard to scan and gets worse with every crop added. Per-crop folders make a missing
crop an empty folder instead of a scattering of loose files, and the folder name always matches
the file prefix so a misfiled sprite is obvious.

**Rejected:** keeping it flat. It works right up until it doesn't, and the cost of moving later
is 25 `git mv` calls plus a path change in every doc that mentions a sprite.

**Also applies to:** `assets/icons/crops/`, which still holds 5 loose files. Not moved yet — see
ISS-001, since those files are all empty and will be replaced anyway.

---

### DEC-015 Measured geometry overrides guessed constants
**Date:** 2026-10-04 · **Decided by:** Hisham

**Choice:** `tileAspect: 0.538`, clip-path `22.4% / 75.6%`, `tileScale` starting at `0.204` —
all measured from the PNG alpha bounding boxes rather than taken from the plan's estimates.

**Why:** The plan's `tileAspect: 0.553` was described as measured from a 1000×553 ground PNG, but
every PNG is 1000×1000 and the diamond sits inside it. The real ratio is 0.538. A 3% error
compounds across three row steps and visibly misaligns the field. `tileScale: 0.22` also leaves
a rim 1.5× thicker at the front and back than at the sides, because `base.png`'s diamond is
h/w 0.600 and cannot nest perfectly around a 0.538 tile cluster.

**Rejected:** keeping the plan's numbers because they were close enough. They are close enough
to look plausible during a first build and not close enough to look right, which is the worst
combination — the bug survives review.

---

### DEC-014 Code icon paths as specified, accept broken images
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** `config/assets.js` builds icon paths with no existence check and no fallback layer.
All 14 SVGs are 0 bytes and will render broken until art arrives.

**Why:** Keeps config pure and the UI simple. Text labels already carry the meaning in the
forecast strip and crop picker, so the panels stay usable without icons.

**Rejected:** an `existsSync` check with an emoji fallback. It adds a filesystem dependency to
config and a second code path through every icon consumer, for a problem that disappears the
moment the art lands.

**Revisit:** T-15.

---

### DEC-013 Weather is real-data only
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** Weather always comes from the live API. The player's only levers are their own
actions — pump on/off, what to plant, what to buy. There is no player-facing weather control.

**Why:** It is the premise of the game. A player who can set the weather is not reading a
forecast.

**Consequence:** the force-weather dropdown stays behind `?debug=1` as a test tool, never a
feature. It also means the `hourly[0]` staleness in ISS-024 cannot be corrected by the player,
so it is documented as a deliberate MVP simplification.

---

### DEC-012 Remove `map.js` (Leaflet + Nominatim)
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** Delete `js/services/map.js`. Location picking is a text search via Open-Meteo
geocoding, with no map popup.

**Why:** The old file called `L.marker`, `L.marker().setView` and `bindPopup` against a global
`map` that was never defined in the repo, and used `alert()` for the not-found case. It would
not run. It also violated every layering rule at once: DOM, `alert`, and a global Leaflet
dependency.

**Rejected:** porting it to a working Leaflet map. Out of scope, and it would add a dependency
to a project that currently has none.

---

### DEC-011 Stage is computed, never stored
**Date:** 2026-10-04 · **Decided by:** Hisham

**Choice:** `Plot` holds `plantedAt`, never `stage`. `stageOf(plot, now)` derives the stage on
every render.

**Why:** Growth then continues while the tab is closed with no catch-up logic, and changing
`growHours` or the stage formula needs no save migration.

**Rejected:** storing `stage` and advancing it on a timer. It drifts from real time whenever the
tab sleeps and needs reconciling on load.

---

### DEC-010 DOM `<img>` layers, not canvas
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** The field is absolutely positioned `<img>` elements inside a square stage, sized in
percentages. No `<canvas>`.

**Why:** Plots are `<button>` elements, so they get focus, keyboard activation and accessible
names for free. Hit testing is a `clip-path`, not a hand-written polygon routine. Debugging is
inspect-element rather than a replotted frame.

**Rejected:** canvas, which would have been faster to draw but loses all of the above and makes
the 1 Hz water animation a repaint-everything problem.

---

### DEC-009 Plot price by purchase count, not plot id
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** The price of the next plot is `PLOT_PRICES[ownedCount]`. The first plot is free
whichever plot you click, and the 100-gold plot is whichever one you click second.

**Why:** It guarantees the opening is always affordable and keeps the UI simple — there is one
"next price" rather than sixteen different ones scattered across the field.

**Rejected:** price per plot id, which needs a per-plot price table and can put the cheap plots
in awkward corners.

---

### DEC-008 Pump is pre-owned in the MVP
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** The pump exists from the start, toggled with a click. Buying it is later.

**Why:** It is the answer to drought, and drought is the game's main threat. Making it a
purchase first would gate the core mechanic behind 250 gold that a new player cannot earn
without already surviving a drought.

**Rejected:** selling the pump in the shop from the start.

---

### DEC-007 Empty plot is the ground tile
**Date:** 2026-10-04 · **Decided by:** Hisham

**Choice:** An empty plot renders `ground_watered.png` or `ground_unwatered.png` and nothing
else. `rice_1` through `rice_5` are the five growth stages of a planted crop.

**Why:** The art only provides one empty state, so this is the only reading that works. It is
also the most common misreading of the assets, which is why it is stated in `docs/crops.md`,
`docs/architecture.md` and `js/config/crops.js`.

---

### DEC-006 4×4 field, four 2×2 zones, dirt cross at the centre
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** 16 plots in a 4×4 grid, grouped as four 2×2 zones, with the pump at the crossing.
The cross paths are `base.png` showing through `crossGap` — there is no path art.

**Why:** Matches `docs/reference/field-reference.jpeg` closely enough, keeps 16 plots to a
number a player can hold in their head, and the zones make the "check the forecast, pick a
zone" decision legible.

**Rejected:** the larger grid in the style mockup, and drawing cross paths as separate assets.

---

### DEC-005 Open-Meteo geocoding replaces Nominatim + Leaflet
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** `js/services/geocodeApi.js` calls the Open-Meteo geocoding API and returns up to 5
places. No map library, no tile server, no runtime dependency.

**Why:** One API for both weather and geocoding, no key, and no dependency. The old Nominatim
code also called `alert()`, which the project bans.

**Note:** an empty result omits the `results` key entirely rather than returning `[]` — see
ISS-012.

---

### DEC-004 Open-Meteo replaces the OpenWeatherMap placeholder
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** `js/services/weatherApi.js` calls `api.open-meteo.com/v1/forecast`. No API key.

**Why:** The placeholder needed a key the team does not have, and Open-Meteo returns
`precipitation_probability` and `uv_index` in the same response the game already needs, so the
forecast strip costs no extra request.

**Note:** response `hourly.time[0]` is local midnight, not the current hour — see ISS-009.

---

### DEC-003 Keep `timeApi.js` as a fallback only
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** The Open-Meteo response carries `timezone` and `utc_offset_seconds`, so the local
clock comes from there. `timeApi.js` is used only if those are missing.

**Why:** One fewer network call in the normal path. The endpoint is still live, so the fallback
is real rather than theoretical.

---

### DEC-002 Vanilla ES modules, no framework or bundler
**Date:** 2026-10-04 · **Decided by:** team

**Choice:** Plain ES modules and plain CSS, served as-is. `package.json` holds scripts only.

**Why:** Nothing in the design needs a framework, and the layering rules the project depends on
are much easier to enforce on raw imports. It also means the game runs from any static host
with no build step.

**Consequence:** ES modules do not work from `file://`. The project must be served over HTTP,
which is what `npm run dev` is for.

---

### DEC-001 Layering is enforced by a script, not by convention
**Date:** 2026-10-04 · **Decided by:** Hisham

**Choice:** `scripts/check-imports.mjs` fails the build on a forbidden import, on `fetch(` outside
`js/services/`, and on `document.` outside `js/ui/`, `js/debug/` and `js/main.js`. It runs in
`npm run check` before every commit.

**Why:** Four people on one repo will drift from a convention within a week. A check that fails
in under a second is the only form of architecture rule that survives contact with a deadline.
