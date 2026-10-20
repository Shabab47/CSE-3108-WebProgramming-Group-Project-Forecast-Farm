# Team Goals — 5 Week Plan

**Weeks 1 and 2 are done, and week 3 closed on 18 October.** We are two weeks from v0.1 with one
goal complete, five substantially built, and two still open. **What is left is the land economy
and the market — and that belongs to all four of us**, because every plot, every price and every
sale touches work three people have already done.

The plan below is the plan as written in week 1. **Where the build went differently, the table
records what shipped rather than what was forecast** — G-07 was scheduled for week 5 and landed in
week 3, because the weather was being fetched and displayed while doing nothing to the farm, and
that was not shippable. Weeks are numbered, not dated; the order mattered more than the calendar.

Marking progress: change `- [ ]` to `- [x]` in this file. Nothing else. The checkbox is the
single source of truth for "is this done", so it must be updated in the same commit as the work.
A goal is only `[x]` when every box under **Done when** is ticked.

Goals are shared. Anyone can pick one up, and who is doing what is tracked in `tasks.md` rather
than here — this file stays about the work, not the people.

**The dependency order still holds and is still load-bearing:** G-05 before G-07. If a week slips,
slip the goal — do not reorder them.

---

## Summary

| ID | Planned | Goal | Status | Where it actually landed |
| :--- | :---: | :--- | :--- | :--- |
| — | 1 | Planning, design and documentation | `- [x]` | as planned |
| G-01 | 2 | Foundation: tooling, config, state, services | `- [~]` built, T-04 open | week 2 |
| G-02 | 2 | Field on screen: layout shell + isometric field | `- [~]` built, T-06 open | weeks 2–3 |
| G-03 | 3 | Land economy: buy plots, gold, prices | `- [~]` partly built | week 3 |
| G-04 | 3 | Plant to harvest: shop, inventory, growth, save | `- [~]` built, T-08 open | weeks 2–3 |
| G-05 | 4 | Pump, water and market: the full money loop | `- [~]` **water and pump done, market open** | week 3 |
| G-06 | 4 | Live weather: search, forecast, metrics, fallback | `- [~]` built, T-11 open | weeks 2–3 |
| G-07 | **5** | Weather effects and crop alerts | `- [x]` | **week 3, two weeks early** |
| G-08 | 5 | Ship v0.1: more crops, polish, handover | `- [ ]` | — |

`- [~]` is not a GitHub checkbox and does not render as one. It means **substantially built and
not finished**, and the task id says what is outstanding. Only `- [x]` means done.

**Where the remaining two weeks go.** Finish G-03 and the market half of G-05 — the whole team —
then G-08. Nothing else is on the critical path.

---

## Where we actually are — 18 October 2026

**The game runs, and the weather does something to it.** That was not true a fortnight ago: the
forecast was fetched, classified and displayed while doing nothing whatsoever to the farm, which
is the premise the whole project is built on. It now reaches crops through five channels — the
water level, a verdict shown when you sow, health while the crop stands, a permanent damage latch,
and the payout.

**Three things a player can do today** that they could not a week ago: click any plot to see its
own water gauge and water it; read an environment card that says what the weather is doing to the
farm rather than what it is doing outside; and choose easy or normal.

**What is not finished, in the order it matters.**

1. **The land economy and the market.** Free first plot, price tags on locked plots and a growth
   timer landed. Buying with a confirm step, the wallet's refusal when you cannot afford, and the
   market's own tests have not. **This is everyone's** — it touches plots, gold, seeds, harvest
   and the shop, which between them are four people's work. ISS-080 (no confirm step on buying
   land) is the sharpest one.
2. **Damage sprites.** The latch and the wording ship; the pictures do not exist. Three for rice,
   fifteen across all crops, and until they land a damaged crop shows a hole with a word beside it.
   That is [DEC-014](decisions.md)'s rule working as intended, not a bug — but it is the most
   visible thing missing.
3. **ISS-015**, the drought rating that ignores how wet the plot already is. Small, and the last
   thing G-07 left open.
4. **The three open weather gaps** — ISS-096 and ISS-097 in `issues.md`, both about rain and the
   bill, plus the frozen `services/` cleanup in T-04 that `npm run check` reports as two known
   violations.

**Nothing on that list is architectural.** The layering holds, the suite is green, and the two
weeks are enough — which is worth saying plainly, because week 3 was supposed to be the economy
and the economy is the thing that slipped.

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
- [ ] Single column below 900 px, in order: navbar, forecast, farm, right column, sidebar
- [x] `utils/iso.js` with `plotToScreen`, `pumpBox` and `frameY`, plus `iso.test.js` — landed in
      T-53/T-54
- [x] The diamond clip is real and asserted — though not where this line said it would be. It is the
      `.plot__hit` rule in `css/scene.css`, not `iso.js`'s `diamondClipPath()`: same number in two
      homes, so `tests/iso.test.js` asserts they agree. ISS-004.
- [ ] `css/field.css`, `farmView`, `plotTile`, `pumpView` — `farmView` landed; `plotTile` and `pumpView`
      are still T-06
- [x] Slab, 16 unwatered plots, pump, diamond hit areas — landed in T-55. "Against the reference render"
      below still means a person looking at it
- [ ] Debug sliders live-recalculate `tileScale`, `gap`, `crossGap`, `originX`, `originY`,
      `pumpScale`
- [ ] Geometry calibrated against `docs/reference/field-reference.jpeg` and the final numbers
      written into `config/field.js` — the numbers are in as of T-54 and are the measured ones,
      but "against the reference render" still means a person looking at it
- [ ] Pump click target tight to its art (ISS-007)

**Done when:** the field matches the reference render, hovering one plot highlights only that
diamond, and there is no flicker when the pointer moves across overlapping plot boxes.

---

## Week 3

The economy. Nothing here reads the weather API.

> **Closed 18 October, partly as written.** G-03 and G-04 are substantially built. G-05's pump and
> water half **and G-07 in full** landed here too, two weeks early. The economy itself is what
> carried over.

### G-03 Land economy `- [ ]`

**Tasks:** T-07

- [ ] `domain/wallet.js` and `domain/plots.js`
- [x] Locked plots dimmed with a price tag
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

> **Effectively done, ahead of schedule.** G-06 is built and G-07 shipped in week 3. What actually
> occupies this week is the economy and market carried over from week 3 — **G-03 and G-05's second
> half, both everyone's.**

### G-06 Live weather `- [ ]`

**Tasks:** T-11

- [ ] `navbar` search calling `geocodeApi`, first result or a short list
- [ ] Empty result → "Place not found" toast, never `alert()`
- [ ] `weatherPanel`: place, local time, temp, condition, rain %, UV
- [ ] Hourly strip, 6 visible, scrolls to 24 h
- [ ] `envMetrics`: humidity with Normal/High/Low badge, wind with compass direction
- [ ] `seasonCard`, heat meter (0–45 °C mapped onto the bar)
- [ ] Sample fallback with an "offline sample data" badge
- [ ] `weather.test.js`: classification priority and WMO mapping

**Done when:** searching "Rajshahi" updates every panel, and pulling the network falls back to
sample data without breaking the page.

### G-07 Weather effects and alerts `- [x]`

**Tasks:** T-12, T-13 · **landed week 3, two weeks early** · ISS-089, ISS-090, ISS-091, ISS-092

- [x] `domain/weather.js` `classify()` with the current-hour `startIndex` rule (ISS-009)
- [~] `ratingFor(plot, eventId)` with the drought water-level conditional — **ISS-015 still open**;
      the crop is judged by weather alone and ignores how wet the plot already is
- [x] the tick applies the matrix, dry drain, death, rain water and evaporation
- [x] `state.notified` added for alert dedupe (ISS-013)
- [x] `notifications.forProjection()` and `toastStack`
- [x] Debug dropdown to force the current event
- [x] Tests: drought on a dry plot loses health, on a wet plot does not

**Done when:** forcing `heavy-rain` waters the plots and rice survives while wheat takes damage,
and a rain forecast with rice planted raises a warning **about that crop**.

**Both met.** Measured on one rice plot at 85 water left for six hours: clear 32 °C → 20.2 water,
health 88, dry damage; overcast 22 °C → 50.4; heavy rain → 120, waterlogged; drought 41 °C → 0
water, health 78.

**This goal's done-when was rewritten on 18 October.** It previously ended:

> and forcing a rain forecast with rice planted raises *"Rain incoming — skip irrigation."*

**That string does not and never did exist in the game.** It was an aspiration written in week 1,
and it escaped into the README as though it were a shipped message, where a reviewer would
reasonably have read it as a claim about the product. What ships is seven crop-specific lines —
*"Heavy rain coming - rice thrives on it."*, *"Heavy rain coming - wheat rots in standing water."* —
which warn about the crop without ever mentioning the pump.

**Telling a player not to pay for rain is now ISS-097**, deliberately not ticked here: it was
never part of this goal, and ticking a box because a related thing shipped is how a plan stops
describing reality. The honest record is that the goal is met and the aspiration was quietly
dropped, which is worth more than a tick that hides it.

---

## Week 5

### G-08 Ship v0.1 `- [ ]`

**Tasks:** T-14, T-15, T-16

- [ ] Every crop with five stage images flipped to `available: true`, no code changes
- [x] `almanac.html` populated, linked from the UI
- [ ] Empty, loading and error states on every panel — *page-level loading state done
      (ISS-043); per-panel empty/error states still to do*
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
