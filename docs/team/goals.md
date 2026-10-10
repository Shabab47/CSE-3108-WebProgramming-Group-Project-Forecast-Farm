# Team Goals — 5 Week Plan

**Week 1 is done. Four weeks of building remain, eight goals, two per week.** Weeks are numbered,
not dated — the order matters more than the calendar.

Marking progress: change `- [ ]` to `- [x]` in this file. Nothing else. The checkbox is the
single source of truth for "is this done", so it must be updated in the same commit as the work.
A goal is only `[x]` when every box under **Done when** is ticked.

Goals are shared. Anyone can pick one up, and who is doing what is tracked in `tasks.md` rather
than here — this file stays about the work, not the people.

Weeks run in sequence: G-02 before G-03, and G-05 before G-07. If a week slips, slip the goal —
do not reorder them.

---

## Summary

| ID | Week | Goal | Status |
| :--- | :--- | :--- | :--- |
| — | 1 | Planning, design and documentation | `- [x]` |
| G-01 | 2 | Foundation: tooling, config, state, services | `- [ ]` |
| G-02 | 2 | Field on screen: layout shell + isometric field | `- [ ]` |
| G-03 | 3 | Land economy: buy plots, gold, prices | `- [ ]` |
| G-04 | 3 | Plant to harvest: shop, inventory, growth, save | `- [ ]` |
| G-05 | 4 | Pump, water and market: the full money loop | `- [ ]` |
| G-06 | 4 | Live weather: search, forecast, metrics, fallback | `- [ ]` |
| G-07 | 5 | Weather effects and crop alerts | `- [ ]` |
| G-08 | 5 | Ship v0.1: more crops, polish, handover | `- [ ]` |

---

## Week 1 — Planning and documentation `- [x]`

No game code was written this week. The plan, the artwork, the service connections and the
documentation were finished so that the build does not have to stop and ask questions later.

- [x] Project plan written and agreed — `docs/game-design/implementation-plan.md`
- [x] Crop and season design — `docs/crops.md`, `docs/crop-choice-guide.md`
- [x] Weather systems designed — `docs/weather-events.md`, `docs/notifications.md`
- [x] Team workflow, goals and ownership set — `docs/team/`
- [x] Artwork for rice (5 stages) and the farm ground — `assets/images/`
- [x] Base services connected: weather, time, place lookup
- [x] Project structure and data flow designed — `docs/architecture.md`
- [x] 25 problems logged with owners — `docs/team/issues.md`
- [x] Reverse geocoding for the player's own location — **not done**, carried to week 2

**Done when:** every system is documented well enough to build from, and every known problem has
an owner.

---

## Week 2

### G-01 Foundation `- [ ]`

Everything that has to exist before any of it can be built on. No gameplay, no visible result.

**Tasks:** T-02, T-03, T-04

- [x] `docs/` tree complete: architecture, crops, weather-events, notifications,
      crop-choice-guide, game-design plan, team docs
- [ ] `package.json` with `dev`, `test`, `check` scripts
- [ ] `scripts/check-imports.mjs` passing, including the `utils/dom.js` whitelist
- [ ] `utils/log.js` scoped logger, `tests/` with one passing test
- [ ] All `js/config/*` files complete
- [ ] `state/types.js`, `initialState.js`, `store.js` — `initialState()` returns 16 plots
      with correct zones
- [x] `weatherApi`, `timeApi` and place lookup return parsed data
- [ ] Reverse geocoding added, so the player's own location resolves to a place name
- [ ] Real response saved to `data/sample-forecast.json`
- [x] `js/services/map.js` deleted, decision logged
- [ ] `npm run check` and `npm test` both pass

**Done when:** a fresh clone passes `npm run check` and `npm test`, and `node -e` can import
every config file and build a fresh state.

### G-02 Field on screen `- [ ]`

The first thing anyone can actually look at.

**Tasks:** T-05, T-06

- [ ] `index.html` with the three grid areas, matching the wireframe at 1280 px
- [ ] Single column below 900 px, in order: topBar, forecast, farm, right column, sidebar
- [ ] `utils/iso.js` with `plotToScreen` and `diamondClipPath`, plus `iso.test.js`
- [ ] `css/field.css`, `farmView`, `plotTile`, `pumpView`
- [ ] Slab, 16 unwatered plots, pump, diamond hit areas
- [ ] Debug sliders live-recalculate `tileScale`, `gap`, `crossGap`, `originX`, `originY`,
      `pumpScale`
- [ ] Geometry calibrated against `docs/reference/field-reference.jpeg` and the final numbers
      written into `config/field.js`
- [ ] Pump click target tight to its art (ISS-007)

**Done when:** the field matches the reference render, hovering one plot highlights only that
diamond, and there is no flicker when the pointer moves across overlapping plot boxes.

---

## Week 3

The economy. Nothing here reads the weather API.

### G-03 Land economy `- [ ]`

**Tasks:** T-07

- [ ] `domain/wallet.js` and `domain/plots.js`
- [ ] Locked plots dimmed with a price tag
- [ ] Click a locked plot → confirm popover → buy
- [ ] `hud` shows gold
- [ ] `plots.test.js`: price by purchase count, cannot buy twice, cannot afford

**Done when:** the first plot is free, then 100, 200, 400, 800, buying is refused without gold,
and a reload keeps every purchase.

### G-04 Plant to harvest `- [ ]`

**Tasks:** T-08

- [ ] `domain/inventory.js`, `domain/farm.js`
- [ ] Shop panel, Seeds tab
- [ ] `inventoryPanel`, `cropPicker`
- [ ] Stage computed from `plantedAt`, never stored
- [ ] `farm.clearPlot()` for dead crops (ISS-006)
- [ ] Autosave every 10 s; reload restores gold, plots, seeds and harvest
- [ ] `farm.test.js`: stage boundaries, harvest only when ready

**Done when:** planting rice shows `rice_1`, the debug `+6 h` button advances it to `rice_5`,
harvesting yields 10 units, and a page reload loses nothing.

### G-05 Pump, water and market `- [ ]`

**Tasks:** T-09, T-10

- [ ] `domain/pump.js`, `domain/wallet.js` upkeep drain
- [ ] Pump toggles on click, CSS pulse while running
- [ ] Water rises, ground sprite swaps to `ground_watered.png`
- [ ] Gold drains at `upkeepPerSecond`; pump auto-offs at 0 gold with a toast
- [ ] `meters`: water meter is the mean water level of owned plots
- [ ] Market tab sells harvest at quality-weighted price
- [ ] **Balance settled:** `pumpPerSecond` reviewed against rain rates (ISS-008)

**Done when:** the watered/unwatered swap is visible, gold visibly decreases while the pump
runs, and harvest → gold → seeds → plant loops end to end.

---

## Week 4

Real weather in, consequences out.

### G-06 Live weather `- [ ]`

**Tasks:** T-11

- [ ] `topBar` search calling `geocodeApi`, first result or a short list
- [ ] Empty result → "Place not found" toast, never `alert()`
- [ ] `weatherPanel`: place, local time, temp, condition, rain %, UV
- [ ] Hourly strip, 6 visible, scrolls to 24 h
- [ ] `envMetrics`: humidity with Normal/High/Low badge, wind with compass direction
- [ ] `seasonCard`, heat meter (0–45 °C mapped onto the bar)
- [ ] Sample fallback with an "offline sample data" badge
- [ ] `weather.test.js`: classification priority and WMO mapping

**Done when:** searching "Rajshahi" updates every panel, and pulling the network falls back to
sample data without breaking the page.

### G-07 Weather effects and alerts `- [ ]`

**Tasks:** T-12, T-13

- [ ] `domain/weather.js` `classify()` with the current-hour `startIndex` rule (ISS-009)
- [ ] `ratingFor(plot, eventId)` with the drought water-level conditional (ISS-015)
- [ ] `simulator.js` applies matrix, dry drain, death, rain water and evaporation
- [ ] `state.notified` added for alert dedupe (ISS-013)
- [ ] `notifications.forProjection()` and `toastStack`
- [ ] Debug dropdown to force the current event
- [ ] `simulator.test.js`: drought on a dry plot loses health, on a wet plot does not

**Done when:** forcing `heavy-rain` waters the plots and rice survives while wheat takes damage,
and forcing a rain forecast with rice planted raises *"Rain incoming — skip irrigation."*

---

## Week 5

### G-08 Ship v0.1 `- [ ]`

**Tasks:** T-14, T-15, T-16

- [ ] Every crop with five stage images flipped to `available: true`, no code changes
- [ ] `almanac.html` populated, linked from the UI
- [ ] Empty, loading and error states on every panel — *page-level loading state done
      (`feature/loading-tips`, ISS-043); per-panel empty/error states still to do*
- [ ] Keyboard focus ring on plots; plots are real buttons
- [ ] Image weight reviewed — if 40 layers of 1000 px PNGs are slow, add 512 px copies and
      change only `config/assets.js`
- [ ] `architecture.md` current; open issues either fixed or explicitly deferred
- [ ] `README.md` run instructions and folder map
- [ ] `v0.1` tag pushed

**Done when:** someone who did not write the code can clone, `npm run dev`, search a city, buy
land, plant, watch the forecast change the crop's health, and sell the harvest.

---

## If a week slips

Slip the goal, do not compress it. The order is load-bearing: G-02 before G-03, G-05 before
G-07. A week that goes wrong is better absorbed by G-08 (polish) than by shipping a field
whose plots cannot be clicked.

Re-baseline the dates in this file and note it in `progress-log.md`. Do not quietly delete a
goal — an unmet goal is information, and the retro depends on it being visible.
