# Team Goals — 5 Week Plan

**The five weeks are over. v0.1 is built and deployed, and this file records what the plan asked
for against what actually shipped.** Three goals were met in full (the planning week, G-07, and the
"somebody else can pick it up" half of G-08), the other five are substantially built and carry a
named open item each. Every one of those items is in `issues.md` with an owner.

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

| ID | Planned | Goal | Final status | Where it landed |
| :--- | :---: | :--- | :--- | :--- |
| — | 1 | Planning, design and documentation | `- [x]` | as planned |
| G-01 | 2 | Foundation: tooling, config, state, services | `- [~]` built — T-04 open (2 known import violations), no `state/types.js`, no sample forecast | weeks 2–3 |
| G-02 | 2 | Field on screen: layout shell + isometric field | `- [~]` built — the field and the phone layout are done; the `?debug=1` panel was never written | weeks 2–4 |
| G-03 | 3 | Land economy: buy plots, gold, prices | `- [~]` built — doubling ladder and price tags ship; no confirm step (ISS-080) | weeks 3–4 |
| G-04 | 3 | Plant to harvest: shop, inventory, growth, save | `- [~]` built — all five crops plant, grow, harvest and save; the `+6 h` debug button it was accepted against does not exist | weeks 2–3 |
| G-05 | 4 | Pump, water and market: the full money loop | `- [~]` **water and pump done, market never built** (ISS-099) | week 3 |
| G-06 | 4 | Live weather: search, forecast, metrics, fallback | `- [~]` built — live path complete; the offline sample fallback is not (`data/sample-forecast.json` is 0 bytes) | weeks 2–3 |
| G-07 | **5** | Weather effects and crop alerts | `- [x]` | **week 3, two weeks early** |
| G-08 | 5 | Ship v0.1: more crops, polish, handover | `- [~]` **shipped with open items** — all five crops playable, docs current; no `v0.1` tag, empty/error states and image weight still open | weeks 4–5 |

`- [~]` is not a GitHub checkbox and does not render as one. It means **substantially built and
not finished**, and the note says what is outstanding. Only `- [x]` means done.

---

## Where we actually are — final, 1 November 2026

**The game ships, and the weather reaches it.** The premise — that the farm is driven by the
player's own forecast rather than a random number generator — is live end to end. It reaches crops
through five channels: the water level, a verdict shown when you sow, health while the crop stands,
a permanent damage latch, and the payout.

**What a player can do that they could not do in week 2:** click any plot to see its own water gauge
and water it; read an environment card that says what the weather is doing to the farm rather than
what it is doing outside; choose easy or normal; upgrade the pump through five levels; plant any of
five crops; browse an almanac and an inventory; and report a bug from the navbar.

**What is not finished, in the order it matters.**

1. **The market.** Harvest pays gold at the moment of harvest, so the loop closes — but the
   separate "sell your harvest" step was specified, scheduled and never built. `issues.md` ISS-099.
2. **Five `_dead` sprites.** The latch and the wording ship; the picture of a dead crop does not,
   for any crop. That is [DEC-014](decisions.md)'s rule working as intended, not a bug — but it is
   the most visible thing missing.
3. **The icons.** Nine weather SVGs and five crop SVGs are still 0 bytes (ISS-001), so the forecast
   strip and the picker lean on text.
4. **Four live defects** — ISS-122 (Farmer 3 avatar, seven failing tests), ISS-080 (no confirm on
   buying land), ISS-097 (nothing says skip the pump when rain is coming), and ISS-015 (the drought
   rating ignores how wet the plot already is).
5. **The release mechanics** — no `v0.1` tag, empty/error states on some panels, and the image
   weight of a 1000 px sprite per layer never reviewed.

**Nothing on that list is architectural.** The layering holds, `npm run check` reports no new
violations, and 793 of 800 tests pass. The seven failures are one drawing, not seven bugs.

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
- [x] Reverse geocoding for the player's own location — landed in week 2 (T-59)

**Done when:** every system is documented well enough to build from, and every known problem has
an owner. **Met.**

---

## Week 2

### G-01 Foundation `- [~]`

Everything that has to exist before any of it can be built on. No gameplay, no visible result.

**Tasks:** T-02, T-03, T-04

- [x] `docs/` tree complete: architecture, crops, weather-events, notifications,
      crop-choice-guide, game-design plan, team docs
- [x] `package.json` with `dev`, `test`, `check` scripts
- [x] `scripts/check-imports.mjs` passing, including the `utils/dom.js` whitelist (ISS-010)
- [x] `utils/log.js` scoped logger, `tests/` with one passing test
- [x] All `js/config/*` files complete
- [~] `state/types.js`, `initialState.js`, `store.js` — `initialState()` returns 16 plots with
      correct zones, and the store persists; **`state/types.js` was never written**
- [x] `weatherApi`, `timeApi` and place lookup return parsed data
- [x] Reverse geocoding added, so the player's own location resolves to a place name
- [ ] Real response saved to `data/sample-forecast.json` — **still 0 bytes**
- [x] `js/services/map.js` deleted, decision logged
- [~] `npm run check` and `npm test` both pass — `check` passes with **2 known violations awaiting
      T-04**; `npm test` is 793/800 because of ISS-122

**Done when:** a fresh clone passes `npm run check` and `npm test`, and `node -e` can import
every config file and build a fresh state. **Not met:** the suite is red on a clone, for a reason
unrelated to this goal.

### G-02 Field on screen `- [~]`

The first thing anyone can actually look at.

**Tasks:** T-05, T-06

- [x] `index.html` with the three grid areas, matching the wireframe at 1280 px
- [x] Single column below 900 px, in order: navbar, forecast, farm, right column, sidebar
- [x] `utils/iso.js` with `plotToScreen`, `pumpBox` and `frameY`, plus `iso.test.js` — landed in
      T-53/T-54
- [x] The diamond clip is real and asserted — the `.plot__hit` rule in `css/scene.css`, not
      `iso.js`'s `diamondClipPath()`; `tests/iso.test.js` asserts the two agree (ISS-004)
- [x] `farmView`, `plotLayers`, `pumpPanel` — `plotTile`/`pumpView` were folded into these
- [x] Slab, 16 unwatered plots, pump, diamond hit areas — landed in T-55
- [ ] Debug sliders live-recalculate `tileScale`, `gap`, `crossGap`, `originX`, `originY`,
      `pumpScale` — **not built; `js/debug/` does not exist**
- [x] Geometry calibrated and the final numbers written into `config/field.js` — `tileScale:
      0.2320`, measured and retuned on screen (T-54, T-64, DEC-049)
- [x] Pump click target tight to its art (ISS-007)

**Done when:** the field matches the reference render, hovering one plot highlights only that
diamond, and there is no flicker when the pointer moves across overlapping plot boxes.
**Met on the field; the debug half of the task does not exist.**

---

## Week 3

The economy. Nothing here reads the weather API.

> **Closed 18 October, partly as written.** G-03 and G-04 are substantially built. G-05's pump and
> water half **and G-07 in full** landed here too, two weeks early. The economy itself is what
> carried over.

### G-03 Land economy `- [~]`

**Tasks:** T-07

- [~] `domain/wallet.js` and `domain/plots.js` — **neither file exists.** The rules live in
      `domain/land.js` (buying) and `domain/shop.js` (seeds and gold). The work shipped; the files
      the plan named did not.
- [x] Locked plots dimmed with a price tag
- [ ] Click a locked plot → confirm popover → buy — **no confirm step (ISS-080)**
- [x] `hud` shows gold — the purse rides in the navbar and the sidebar
- [~] `plots.test.js` — the land rules are covered in `tests/farm.test.js`, not a file of their own

**Done when:** the first plot is free, then 100, 200, 400, 800, buying is refused without gold,
and a reload keeps every purchase. **All met except the confirm step.**

### G-04 Plant to harvest `- [~]`

**Tasks:** T-08

- [~] `domain/inventory.js`, `domain/farm.js` — `farm.js` exists and owns plant/grow/harvest;
      **`domain/inventory.js` was never written** (ISS-098), because seeds and the bag are handled
      in `domain/shop.js` and `state.inventory`
- [x] Shop panel, Seeds section
- [x] `inventoryView`, `cropPicker` — the inventory is a page, not a panel
- [x] Stage computed from `plantedAt`, never stored
- [x] `farm.clearPlot()` for dead crops (ISS-006)
- [x] Autosave every 10 s; reload restores gold, plots, seeds and harvest
- [x] `farm.test.js`: stage boundaries, harvest only when ready

**Done when:** planting rice shows `rice_1`, the debug `+6 h` button advances it to `rice_5`,
harvesting yields 10 units, and a page reload loses nothing. **Met except the debug button, which
was never built** — growth itself is verified by tests and by waiting.

### G-05 Pump, water and market `- [~]`

**Tasks:** T-09, T-10

- [~] `domain/pump.js`, `domain/wallet.js` upkeep drain — the pump owns its own bill; **no
      `wallet.js`**
- [x] Pump toggles on click, CSS pulse while running
- [x] Water rises, ground sprite swaps to `ground_watered.png`
- [x] Gold drains per delivered water; the pump auto-offs when the purse cannot pay
- [x] `meters`: water meter is the mean water level of owned plots
- [ ] Market tab sells harvest at quality-weighted price — **never built (ISS-099).** Harvest pays
      its gold immediately instead, and the inventory page is a read-only record
- [ ] **Balance settled:** `pumpPerSecond` reviewed against rain rates (ISS-008) — **still open; it
      is a design call, not a code change**

**Done when:** the watered/unwatered swap is visible, gold visibly decreases while the pump
runs, and harvest → gold → seeds → plant loops end to end. **Met: the harvest is paid at harvest
time, so the loop closes without a market screen.**

---

## Week 4

Real weather in, consequences out. In practice this week became land, phone layout, avatars and
pump artwork, because G-06 was already built and G-07 had shipped in week 3.

### G-06 Live weather `- [~]`

**Tasks:** T-11

- [x] Place search calling `geocodeApi`, a short list of suggestions as you type — in
      `locationBar`, not the navbar
- [x] Empty result → "Place not found" toast, never `alert()`
- [x] `weatherPanel`: place, local time, temp, condition, rain %, UV
- [x] Hourly strip, 6 visible, scrolls to 24 h
- [x] `envMetrics`: humidity with Normal/High/Low badge, wind with compass direction
- [x] `seasonCard`, heat meter (0–45 °C mapped onto the bar)
- [ ] Sample fallback with an "offline sample data" badge — **not built.**
      `data/sample-forecast.json` is 0 bytes and `weatherApi` returns `{ok:false,'network'}` on a
      dropped connection. The panel reports the failure honestly instead of showing invented data.
- [x] Weather tests: classification priority and WMO mapping

**Done when:** searching "Rajshahi" updates every panel, and pulling the network falls back to
sample data without breaking the page. **Half met:** the search works; the fallback does not exist.

### G-07 Weather effects and alerts `- [x]`

**Tasks:** T-12, T-13 · **landed week 3, two weeks early** · ISS-089, ISS-090, ISS-091, ISS-092

- [x] `domain/weather.js` `classify()` with the current-hour `startIndex` rule (ISS-009)
- [~] `ratingFor(plot, eventId)` with the drought water-level conditional — **ISS-015 still open**;
      the crop is judged by weather alone and ignores how wet the plot already is
- [x] the tick applies the matrix, dry drain, death, rain water and evaporation
- [x] `state.notified` added for alert dedupe (ISS-013)
- [x] `notifications.forProjection()` and `toastStack`
- [~] Debug dropdown to force the current event — **not built with the rest of the debug panel**
- [x] Tests: drought on a dry plot loses health, on a wet plot does not

**Done when:** forcing `heavy-rain` waters the plots and rice survives while wheat takes damage,
and a rain forecast with rice planted raises a warning **about that crop**.

**Both met, with the forced-weather step done in tests rather than a dropdown.** Measured on one
rice plot at 85 water left for six hours: clear 32 °C → 20.2 water, health 88, dry damage;
overcast 22 °C → 50.4; heavy rain → 120, waterlogged; drought 41 °C → 0 water, health 78.

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

### G-08 Ship v0.1 `- [~]`

**Tasks:** T-14, T-15, T-16

- [x] Every crop with five stage images flipped to `available: true`, no code changes — **all five
      are playable**: rice, potato, tomato, wheat, corn
- [x] `almanac.html` populated, linked from the UI
- [~] Empty, loading and error states on every panel — *page-level loading state done (ISS-043),
      the boot veil is real, and the sync indicator covers the save's states; per-panel empty/error
      states are still uneven*
- [~] Keyboard focus ring on plots; plots are real buttons — **they are real `<button>`s, so focus
      and keyboard activation work; the visible ring was not verified against `css/reset.css`**
- [ ] Image weight reviewed — if 40 layers of 1000 px PNGs are slow, add 512 px copies and change
      only `config/assets.js` — **never measured; the registered total is 59 MB**
- [x] `architecture.md` current; open issues either fixed or explicitly deferred
- [x] `README.md` run instructions and folder map
- [ ] `v0.1` tag pushed — **not cut**

**Done when:** someone who did not write the code can clone, `npm run dev`, search a city, buy
land, plant, watch the forecast change the crop's health, and sell the harvest.

**Met in substance** — harvest pays gold when it is picked, so the loop closes without a market
screen — **and not in mechanics:** the tag, the image-weight review and the missing dead-crop
sprites are all still outstanding.

---

## If a week slips

Slip the goal, do not compress it. The order is load-bearing: G-02 before G-03, G-05 before
G-07. A week that goes wrong is better absorbed by G-08 (polish) than by shipping a field
whose plots cannot be clicked.

Re-baseline the dates in this file and note it in `progress-log.md`. Do not quietly delete a
goal — an unmet goal is information, and the retro depends on it being visible.
