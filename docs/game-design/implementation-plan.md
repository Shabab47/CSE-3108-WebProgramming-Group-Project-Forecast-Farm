# Implementation Plan — Weather Farmer

Isometric field and clean structure.

This is the build plan, revised after auditing it against the repository, the
actual PNG assets, and live Open-Meteo responses. Corrections are folded in and listed under
[Revisions](#revisions) at the bottom.

Companion docs: `docs/architecture.md` (where things live), `docs/team/goals.md` (the 5-week
window), `docs/team/issues.md` (25 logged problems), `docs/team/decisions.md` (why).

---

## 0. How to work

- Work in phases (section 13). After each phase: run checks, commit, update `docs/team/*`, then
  **stop and give a short report** — done, files touched, problems, next.
- One commit per step. Format `type(scope): message`. Types: `feat fix refactor docs chore test`.
  Scopes are folder or feature names, e.g. `feat(field): render 16 tiles`.
- Do **not** delete or overwrite existing assets. Move with `git mv` only where stated.
- Existing source files use CRLF. Do not mass-convert. New files may use LF.
- No frameworks, no bundler, no new runtime dependencies. Vanilla ES modules. `package.json`
  exists only for scripts.
- Nothing calls `fetch` outside `js/services/`. Nothing touches the DOM outside `js/ui/`,
  `js/debug/` and `js/main.js`, with `js/utils/dom.js` whitelisted.
- Max about 200 lines per file. Past that, split by responsibility.
- Every module logs through `utils/log.js` with its scope name. Errors start with `[scope]`.
- If the plan and reality disagree, **stop and flag it** in `docs/team/issues.md` rather than
  improvising.
- Reference images are in `docs/reference/`: `field-reference.jpeg`,
  `layout-wireframe.jpeg`, `style-mockup.jpeg`.

## 1. Project context

2D web farming game driven by real weather, time and location. Core loop: plant, water, wait,
reap. The player picks a location, sees live weather and a 24 h forecast, spends gold on seeds
and land, runs a water pump (costs gold per second), and sells harvest. Crops: rice, wheat,
potato, corn, tomato. Game rules tables live in `README.md` and are mirrored in `docs/crops.md`,
`docs/weather-events.md`, `docs/notifications.md` and `docs/crop-choice-guide.md`.

Current art: rice only (5 stages), 2 ground tiles, base slab, pump.

Repo today: HTML/CSS/JS scaffold, most files empty. Only `js/services/{weatherApi,timeApi,map}.js`
and `README.md` have content. Keep the existing folder names.

## 2. Final decisions

Do not re-litigate these; they are recorded with rationale in `docs/team/decisions.md`.

| Topic | Decision |
| :--- | :--- |
| Stack | Vanilla JS ES modules, plain CSS, DOM `<img>` layers (not canvas) |
| Weather API | Open-Meteo, no key. Replaces the OpenWeatherMap placeholder |
| Geocoding | Open-Meteo geocoding. Replaces the Nominatim + Leaflet code |
| Time API | Keep `timeApi.js`, used only as fallback when weather data has no local time |
| Field | 4×4 = 16 plots, 4 zones of 2×2, dirt cross at the centre, pump at the crossing |
| Plot price | By **purchase count**, not plot id |
| Pump | Pre-owned in the MVP. On = waters all owned plots, costs gold per second |
| Empty plot | The ground tile itself. `rice_1..rice_5` are the five growth stages |
| `base.png` | The slab under the field |
| Persistence | `localStorage` key `weatherFarmer.save.v1` |
| Weather source | Real API only. The player's levers are actions, never the sky (DEC-013) |
| Icons | Paths coded as specified; broken images accepted until art lands (DEC-014) |

## 3. Page layout

CSS grid areas, from `docs/reference/layout-wireframe.jpeg`:

```
┌───────────────────────────────────────────────────────────┐
│ logo  │ [ location search ........ ] [go] │ [btn][btn][btn]│  topBar
├───────┬───────────────────────────────────┬───────────────┤
│season │  FORECAST CARD                    │ GOLD          │
│       │  now: temp, condition, rain, UV   │               │
│ shop  │  hourly strip (6 visible, scroll  │ [btn][btn][btn]│  buttonBar
│       │  up to 24 h)                      │ water ▓▓▓▓░   │  meters
│invent.├───────────────────────────────────┤ heat  ▓▓░░░   │
│       │  FARM SCREEN (iso field + pump)   │ humidity card │  envMetrics
│       │                                   │ wind card     │
└───────┴───────────────────────────────────┴───────────────┘
 sidebar            farmView                   right column
```

`css/layout.css`: `grid-template-areas: "top top top" "left center right"`. Moving a panel is
one line.

Style, from `docs/reference/style-mockup.jpeg`: light background, white glass cards (radius
16–20 px, soft shadow, thin border), one accent colour, system font stack. Colours, radii and
spacing live in `css/variables.css` only.

Mobile (< 900 px): single column, order topBar, forecast, farm, right column, sidebar as a
bottom bar. Basic only.

## 4. Target file tree

`NEW` = create. `FILL` = exists but empty. `FIX` = exists with content, rewrite.

```
index.html                       FILL  shell, 3 grid columns, <script type="module" src="js/main.js">
almanac.html                     FILL  placeholder page, link back
js/almanac-main.js               NEW   entry for almanac.html (see ISS-019)
package.json                     NEW   {"type":"module","scripts":{...}}
css/ reset layout variables themes components   FILL
css/field.css                    NEW   stage, plot layers, locked/selected states
assets/images/
  base.png                       keep
  ground/ ground_watered.png ground_unwatered.png   keep
  crops/<cropId>/<cropId>_<1-5>.png   keep (rice done; one folder per crop)
  pump/pump.png                  git mv from assets/images/pump.png
data/sample-forecast.json        FILL  real Open-Meteo response, saved once
js/
  main.js                        FILL  boot order only (8.1) + image preload
  almanac-main.js                NEW
  config/                        pure data, imports nothing
    field.js                     NEW   FIELD geometry, ZONES, PLOT_PRICES
    crops.js                     FILL  CROPS table
    assets.js                    NEW   the only place image paths are built
    api.js                       NEW   URLs, DEFAULT_LOCATION, REFRESH_MS, USE_SAMPLE_DATA
    game.js                      NEW   START_GOLD, PUMP, WATER, HEALTH constants
    weatherEvents.js             FILL  event ids, icons, thresholds, WMO groups
    cropWeatherMatrix.js         FILL  rating per crop per event (6.6)
    seasons.js                   FILL  season table
    ui.js                        NEW   TOP_BUTTONS, SPARE_BUTTONS as {id,label,icon,action}
  state/
    store.js                     NEW   getState, apply, subscribe, bus.emit/on, save/load
    types.js                     NEW   JSDoc @typedef for State, Plot, Location, Weather
    initialState.js              NEW   builds fresh state (16 plots, gold, location)
  domain/                        game rules: no DOM, no fetch, no ui imports
    plots.js                     NEW   priceOfNextPlot, buyPlot, ownedPlots
    inventory.js                 NEW   addSeed, useSeed, addHarvest, sellAll
    farm.js                      FILL  plant, harvest, clearPlot, stageOf, isReady, timeLeft
    pump.js                      NEW   togglePump, upkeep
    wallet.js                    NEW   canAfford, spend, earn
    weather.js                   FILL  classify(raw) → game Weather, ratingFor(plot, event)
    simulator.js                 FILL  tick(): water, health, growth, upkeep, weather effects
    notifications.js             FILL  forecast → crop alert strings
  services/                      fetch only, plain data, no DOM
    weatherApi.js                FIX   fetchForecast(lat, lon)
    geocodeApi.js                NEW   searchPlace(query)
    timeApi.js                   FIX   fetchLocalTime(tz)
  ui/                            render only; read store; mountX(root, actions) → unmount()
    topBar.js sidebar.js seasonCard.js shopPanel.js inventoryPanel.js   NEW
    weatherPanel.js envMetrics.js meters.js hud.js buttonBar.js         NEW/FILL
    farmView.js plotTile.js pumpView.js cropPicker.js toastStack.js     FILL/NEW
    almanac.js                   FILL
  utils/
    iso.js                       NEW   plotToScreen, diamondClipPath
    log.js                       NEW   scoped logger
    dom.js date.js season.js     FILL
  debug/debug.js                 NEW   ?debug=1 panel
tests/                           NEW   node:test files for pure code
scripts/check-imports.mjs        NEW   enforces layering (section 5)
docs/                            see section 12
```

`js/services/map.js` is deleted in step 4, not listed above.

## 5. Layering rules

Enforced by `scripts/check-imports.mjs`, which greps `import ... from` lines and fails with file
and line on a violation.

| Folder | May import from |
| :--- | :--- |
| `config` | nothing |
| `utils` | `config` |
| `state` | `config`, `utils` |
| `domain` | `config`, `utils`, `state/types` — never `ui`, `services`, or `store.js` internals |
| `services` | `config`, `utils` |
| `ui` | `config`, `utils`, `domain`, `state` |
| `debug` | anything |
| `main.js` | anything |

Three clarifications, because the original wording was ambiguous:

1. **`js/main.js` is the only module that imports `js/services/`.** UI modules never import a
   service. `main.js` passes callbacks in through `mountX(root, actions)`.
2. **UI never calls a mutating domain function directly.** It goes through `store.apply`.
   Pure selectors such as `farm.stageOf` and `farm.isReady` are called directly.
3. **`js/utils/dom.js` is whitelisted** for `document.`. It is the DOM helper; the check cannot
   pass without the exception (ISS-010).

The script also fails if `fetch(` appears outside `services/`, or `document.` outside `ui/`,
`debug/`, `main.js` and `utils/dom.js`.

Data flow: `services` fetch → `main.js` stores the result via `store.apply` → `domain` rules
compute new state → `ui` re-renders from state.

## 6. Config specs

### 6.1 `config/field.js`

```js
export const FIELD = {
  size: 4,           // 4x4
  zoneSize: 2,       // 2x2 plots per zone
  tileScale: 0.204,  // plot image width as fraction of stage -- MEASURED, see 6.2
  tileAspect: 0.538, // diamond height / width -- MEASURED from ground_unwatered.png
  gap: 0.03,         // gap between plots, in tile units
  crossGap: 0.12,    // extra gap at the centre cross, in tile units
  originX: 0.5,      // diamond centre, fraction of stage
  originY: 0.5,      // tune with the debug sliders against field-reference.jpeg
  pumpScale: 0.25,   // pump.png is 1000x1000 with the pump art 27.9% wide
};
export const ZONES = { A: 'top', B: 'right', C: 'left', D: 'bottom' };
// zone of (col,row): A col<2,row<2 | B col>=2,row<2 | C col<2,row>=2 | D col>=2,row>=2
// plot id = row*4 + col (0..15)
export const PLOT_PRICES = [0, 100, 200, 400, 800, 1600, 3200, 6400,
                            12800, 25600, 51200, 102400, 204800, 409600,
                            819200, 1638400];
// price of the Nth purchase = PLOT_PRICES[ownedCount]. First plot free.
// Every plot costs exactly TWICE the previous one. There is no cap: all 16
// plots cost 3,276,700 gold in total, which is a long-term goal, not a
// week-one target. See "Land prices" in docs/crops.md.
```

### 6.2 Stage and geometry (`utils/iso.js`)

All sizes are fractions of the stage, so the field scales responsively with no resize handling.

```
.field-stage { position: relative; aspect-ratio: 1; width: min(100%, 720px); }
```

Layers inside it are `position: absolute`, sized and placed with `%`.

```
n = FIELD.size
shift(i)  = (i - (n-1)/2) * (1 + gap) + (i >= n/2 ? crossGap/2 : -crossGap/2)
u = shift(col); v = shift(row)

centerX = originX + (u - v) * tileScale / 2
centerY = originY + (u + v) * tileScale * tileAspect / 2

img left  = centerX - tileScale/2      (fractions of stage)
img top   = centerY - tileScale/2
img width = tileScale
z-index   = col + row
```

`col` increases toward the lower right, `row` toward the lower left, so plot `(0,0)` is the top
vertex. `base.png` fills the whole stage at `z-index: 0`. The pump uses the same centre formula
at `u = v = 0`, width `pumpScale`, `z-index: 100`.

**Measured, not guessed.** Every PNG is 1000×1000 with the art inside it. Alpha bounding boxes:

| Asset | Content | h/w | Centre |
| :--- | :--- | ---: | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` | 991 × 595 | 0.600 | (0.503, 0.499) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

The original plan guessed `tileAspect: 0.553` from a "1000 × 553" ground PNG that does not exist.
The real value is 0.538, and a 3% error compounds across three row steps.

`tileScale: 0.204` is the value that gives an even rim. The 4×4 cluster's outer diamond is
4.21 × tileScale wide and 2.266 × tileScale tall at the default gaps; solving
`4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` gives `t ≈ 0.204` and `r ≈ 0.067`. At 0.22
the rim is 0.033 at the sides and 0.048 front to back, which reads as a bug. `base.png` cannot
nest perfectly because its diamond is h/w 0.600 while the tile cluster is 0.538.

Crop sprites are taller than the ground tile on purpose — plants stand proud of the soil. Do not
scale crop layers to match the ground.

**Click hit area.** Plot PNGs are 1000×1000 with transparent corners, so rectangles overlap.
Each plot is a wrapper `<button class="plot">` with the same box and this clip, and its `<img>`
layers are `pointer-events: none; draggable: false`. Only the button takes clicks.

```js
// diamondClipPath() -- measured diamond runs y 22.4% to 75.6%
'polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)'
```

The pump needs the same treatment: its art is 27.9% of its canvas, so a button box at
`pumpScale` covers the tips of plots `(1,2)` and `(2,1)` (ISS-007).

### 6.3 `config/assets.js`

```js
export const groundImg = (watered) =>
  `assets/images/ground/ground_${watered ? 'watered' : 'unwatered'}.png`;
export const cropImg = (cropId, stage) =>
  `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
// Failure sprites. Seven sprites per crop in total: 5 stages + 2 failure states.
export const CROP_FAILURES = ['rain_damaged', 'drought_killed'];
export const cropFailureImg = (cropId, failure) =>
  `assets/images/crops/${cropId}/${cropId}_${failure}.png`;
export const BASE_IMG = 'assets/images/base.png';
export const PUMP_IMG = 'assets/images/pump/pump.png';
export const weatherIcon = (eventId) => `assets/icons/weather/${eventId}.svg`;
export const cropIcon = (cropId) => `assets/icons/crops/${cropId}.svg`;
```

Nothing else builds an asset path. This module is **pure data** — the preload loop lives in
`main.js`, because `new Image()` is a side effect and config imports nothing (ISS-022).

All 14 SVGs are currently 0 bytes, so icons render broken until art lands. That is accepted
(DEC-014); labels carry the meaning.

### 6.4 `config/crops.js` — placeholder balance

| id | name | growHours | seedPrice | sellPrice/unit | yield units | available |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| rice | Rice | 6 | 10 | 4 | 10 | true |
| wheat | Wheat | 5 | 8 | 3 | 10 | false |
| potato | Potato | 4 | 6 | 3 | 10 | false |
| corn | Corn | 8 | 14 | 5 | 10 | false |
| tomato | Tomato | 6 | 12 | 5 | 10 | false |

`available: false` crops show greyed with "coming soon" in the picker. A crop flips to `true`
when its five images exist. Also carries `likes`, `hates` and `waterNeed` (0–1, scales water
decay) from the README crop table.

### 6.5 `config/game.js`

```js
export const START_GOLD = 200;
export const WATER = { max: 100, wateredThreshold: 40, baseDecayPerHour: 8,
                       pumpPerSecond: 0.5, startLevel: 0 };
export const PUMP  = { upkeepPerSecond: 0.05, price: 250 };   // price unused in MVP
export const HEALTH = { max: 100, dryDrainPerHour: 5 };
export const TICK_MS = 1000;
export const AUTOSAVE_MS = 10000;
```

Ground renders `watered` when `plot.waterLevel >= wateredThreshold`.

```
water lost per hour = baseDecayPerHour * crop.waterNeed (1 if empty) * event.evaporation
```

Pump on: every owned plot gains `pumpPerSecond` water per second and gold drains
`upkeepPerSecond`. At 0 gold the pump turns off and fires a toast.

> **Unresolved — ISS-008.** `pumpPerSecond: 0.5` fills a plot 0→100 in 200 s for ~10 gold across
> the field, while heavy rain needs 2 h and is free. The pump is ~36× stronger than the weather
> it exists to compensate for, which pins `waterLevel` at 100, makes `wateredThreshold` always
> true, and stops the drought conditional at `< 30` from ever firing while it runs. Decide
> before step 9. Recommended: `0.05`.

### 6.6 `config/weatherEvents.js` and `config/cropWeatherMatrix.js`

Event ids, matching the nine SVG names: `sunny cloudy light-rain heavy-rain drought frost hail
strong-wind high-humidity`.

Per event: `{ id, label, icon, evaporation, rainWaterPerHour }`

| event | evaporation | rainWaterPerHour |
| :--- | ---: | ---: |
| sunny | 1.5 | 0 |
| cloudy | 0.8 | 0 |
| light-rain | 0 | 20 |
| heavy-rain | 0 | 50 |
| drought | 3 | 0 |
| frost | 0.5 | 0 |
| hail | 0.8 | 5 |
| strong-wind | 1.5 | 0 |
| high-humidity | 0.5 | 0 |

**Classification** (`domain/weather.js classify`), first match wins. Thresholds live in config.

1. WMO code 96 or 99 → `hail`
2. temp ≤ 2 °C, or code in 66, 67, 71–77, 85, 86 → `frost`
3. temp ≥ 38 °C and rain probability < 20 → `drought`
4. wind ≥ 40 km/h → `strong-wind`
5. code 63, 65, 81, 82, 95 → `heavy-rain`
6. code 51, 53, 55, 56, 57, 61, 80 → `light-rain`
7. code 45, 48, or humidity ≥ 85 → `high-humidity`
8. code 0, 1 → `sunny`; code 2, 3 → `cloudy`

Unmatched codes fall through to `cloudy`.

> **The current hour is not `hourly[0]`.** A live response fetched at 12:15 returned
> `current.time = "12:15"` and `hourly.time[0] = "00:00"`, 48 entries for
> `forecast_days=2`. `classify()` must compute a `startIndex` by matching `current.time` against
> `hourly.time` and slice 24 entries from there. Everything downstream depends on it (ISS-009).

**Ratings** and per-hour health effect:

| rating | health/hour |
| :--- | ---: |
| thrives | +1 |
| good | 0 |
| ok | 0 |
| risk | −3 |
| damage | −8 |
| severe | −30 |

| event | rice | wheat | potato | corn | tomato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| sunny | ok | good | ok | thrives | thrives |
| cloudy | ok | good | good | ok | ok |
| light-rain | thrives | good | good | good | good |
| heavy-rain | ok | damage | damage | damage | damage |
| drought * | severe | risk | risk | damage | risk |
| frost | severe | ok | damage | severe | severe |
| hail | risk | risk | risk | severe | severe |
| strong-wind | ok | risk | ok | damage | risk |
| high-humidity | ok | risk | damage | risk | damage |

\* The drought rating applies **only if `waterLevel < 30`**; otherwise `ok`. This is how the pump
saves crops, and it is the reason the pump exists.

A matrix cell holds one rating and cannot see the plot, so the conditional lives in an exported
`ratingFor(plot, eventId)` helper in `domain/`, called by `simulator.tick` and the tests
(ISS-015).

Extra: at `waterLevel == 0` any crop loses `dryDrainPerHour` on top. Health 0 marks the crop
dead. Until a failure sprite exists, it renders with `filter: grayscale(1) brightness(.6)`; the
filter stays as a fallback once sprites land. There is no
frost-cover mechanic in the MVP, so `severe` frost is a heavy drain rather than an instant kill.

Dead crops are cleared with `farm.clearPlot()`. Without it a dead crop is neither harvestable nor
replantable and the plot is bricked permanently (ISS-006).

## 7. State shape

```js
State = {
  version: 1,
  gold: number,
  location: { name, country, lat, lon, tz },   // default Dhaka 23.8103, 90.4125, Asia/Dhaka
  plots: Plot[16],
  inventory: { seeds: { [cropId]: number },
               harvest: { [cropId]: { units, qualityAvg } } },
  pump: { on: boolean },
  selection: { plotId: number | null, cropId: string | null },
  weather: { current, hourly[24], fetchedAt, source: 'live'|'sample' } | null,
  clock: { timeOffsetMs: number },             // debug time skip
  notified: { [cropId + ':' + eventId]: isoWindowStart },   // alert dedupe, ISS-013
  lastTickAt: number,
}
Plot = { id, col, row, zone, owned, cropId: string|null, plantedAt: number|null,
         waterLevel: 0..100, health: 0..100, dead: boolean }
```

`stage` is never stored.

```
stageOf(plot, now):  progress = elapsedHours / crop.growHours
                     stage    = progress >= 1 ? 5 : 1 + floor(progress * 4)
```

Ready to harvest only when `progress >= 1` and not dead. `now = Date.now() + state.clock.timeOffsetMs`.

## 8. Module contracts

### 8.1 `main.js` boot order

1. `load()` the save, or build `initialState()`.
2. Preload images — rice stages, both ground tiles, base, pump.
3. Mount UI: topBar, sidebar, seasonCard, weatherPanel, farmView, hud, buttonBar, meters,
   envMetrics, toastStack.
4. Fetch weather for `state.location`, or the sample fallback. Repeat every `REFRESH_MS`.
5. Start the simulator interval (`TICK_MS`) and the autosave interval (`AUTOSAVE_MS`).
6. If `?debug=1`, mount the debug panel.

`main.js` no-ops when its root element is absent, so it is safe to reference from any page.

### 8.2 `state/store.js`

`getState()`, `subscribe(fn) → unsubscribe`, `apply(domainFn, ...args)`, `bus.emit(name, payload)`,
`bus.on(name, fn)`, `save()`, `load()`.

Domain functions are pure: `(state, ...args) => { ok:true, state } | { ok:false, reason }`. Only
`store.apply` writes state. On `ok:false` it emits `toast` with the reason. Only `store.js`
touches `localStorage`, always in try/catch.

### 8.3 Domain

- `plots.priceOfNextPlot(state)` = `PLOT_PRICES[ownedCount]`, or `null` when all 16 are owned.
  `buyPlot(state, plotId)` checks not owned and gold enough, spends, sets `owned`.
- `inventory`: seeds are bought in the shop. `farm.plant(state, plotId, cropId)` needs owned,
  empty, not dead, and one seed in inventory. Sets `plantedAt = now`, leaves `waterLevel`, sets
  `health = 100`.
- `farm.harvest(state, plotId)` needs ready. `units = crop.yield`, `quality = health/100`. Adds
  to `inventory.harvest` and clears the plot.
- `farm.clearPlot(state, plotId)` frees an owned dead plot. Free, always allowed.
- `inventory.sellAll(state, cropId?)`: `gold += units * sellPrice * qualityAvg`.
- `simulator.tick(state, now)`: pump water and upkeep → rain water → evaporation → health change
  (matrix + dry drain) → mark dead → update `lastTickAt`. Reads `state.weather.hourly[0]` as the
  current event.

  > **Offline catch-up — ISS-014.** Make it explicit rather than implied:
  > `dt > OFFLINE_THRESHOLD_MS` (60 000) → apply growth only, skip water and health, set
  > `lastTickAt = now`. The original wording ("cap at 1 h per tick") would apply one hour of
  > weather damage on every page reload.

- `notifications.forProjection(state)`: looks at the next 6–24 h of events against planted
  crops, returns alert strings per `docs/notifications.md`. Dedupe by `cropId + event` using
  `state.notified`, at most once per event window.

### 8.4 UI

Each file exports `mountX(rootEl, actions)` and returns `unmount`. It subscribes to the store
and re-renders only its own part. No game rules inside UI. Handlers are attached in JS, never
inline in HTML. Plot elements carry `data-plot-id`.

Plot click flow:

- **locked** → confirm popover "Buy for N gold" → `plots.buyPlot`
- **owned + empty** → select, open `cropPicker` (shows crops with seed count; plant if seed
  available, else link to shop)
- **growing** → tooltip: crop, stage, time left, water, health
- **ready** → harvest
- **dead** → confirm → `farm.clearPlot`

> **Do not rebuild plot DOM every tick.** The simulator ticks at 1 Hz, so a subtree rebuild
> recreates ~35 `<img>` elements per second and flickers. Create plot elements once, then update
> only changed attributes (`src`, `class`, `title`, inline size) and swap `src` only when the
> value actually changes (ISS-018).

Panels:

- `hud`: gold. `meters`: water meter is the mean `waterLevel` of owned plots; heat meter maps
  the current temp from 0–45 °C onto the bar, blue to red.
- `weatherPanel`: place, local time, temp, condition icon and label, rain %, UV, hourly strip
  (icon, temp, label; 6 visible then scroll to 24 h). `envMetrics`: humidity card with a
  Normal/High/Low badge, wind card with speed and compass direction.
- `topBar`: logo, search input and button calling `geocodeApi` via an injected callback, picking
  the first result or showing a short list. Button row from `config/ui.js`.
- `seasonCard`: uses `utils/season.js`.
- `shopPanel` (modal): tabs Seeds / Land / Market. Seeds buy per crop. Land shows the next plot
  price and a buy hint (plots are also buyable from the field). Market sells harvest. The pump
  row shows "Owned".
- `inventoryPanel`: seed and harvest counts.
- `pumpView`: pump at the field centre, click toggles. Three animation frames come later; for
  now a CSS pulse while on. Click target clipped to the art (ISS-007).

### 8.5 Seasons

Approximate and config-driven. Tropical (`|lat| < 23.5`): Hot (Mar–May), Rainy (Jun–Oct),
Cool/Dry (Nov–Feb). Otherwise four seasons by month, flipped for the southern hemisphere. Each
season has a `bestCrops` hint from `docs/crop-choice-guide.md`.

## 9. Weather integration

`config/api.js`:

```js
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const TIME_URL = 'https://utctime.app/api/now/';
export const DEFAULT_LOCATION = { name:'Dhaka', country:'Bangladesh',
                                  lat:23.8103, lon:90.4125, tz:'Asia/Dhaka' };
export const REFRESH_MS = 15 * 60 * 1000;
export const USE_SAMPLE_DATA = false;
```

`weatherApi.fetchForecast(lat, lon)`:

```
current = temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m
hourly  = temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,
          wind_speed_10m,wind_direction_10m,uv_index
forecast_days = 2, timezone = auto
```

Verified against the live API. Response top-level keys: `latitude`, `longitude`,
`generationtime_ms`, `utc_offset_seconds`, `timezone`, `timezone_abbreviation`, `elevation`,
`current_units`, `current`, `hourly_units`, `hourly`.

`current` carries `time`, `interval`, `temperature_2m`, `relative_humidity_2m`, `weather_code`,
`wind_speed_10m`, `wind_direction_10m` — **no rain probability and no UV**. Both come from the
hourly entry matching the current hour.

Response times are local to the place. Use `timezone` and `utc_offset_seconds` for the local
clock, and `timeApi` only if those are missing.

Save one real response to `data/sample-forecast.json`. On network failure or `USE_SAMPLE_DATA`,
load the sample, set `weather.source = 'sample'` and show a small "offline sample data" badge.

> **Stale samples.** A saved response's timestamps go out of date, so the `startIndex` lookup
> cannot match "now". If the sample's date is not today in its timezone, use index 0, set
> `source = 'sample'`, and show the badge (ISS-011).

`weatherApi` returns the raw parsed JSON. `domain/weather.js classify` converts it to:

```js
{ current: { temp, humidity, wind, windDir, rainProb, uv, event },
  hourly:  [ { time, temp, rainProb, event }, ... ] }   // 24 entries from the current hour
```

`geocodeApi.searchPlace(q)` → `[{ name, country, lat, lon, tz }]`, max 5. Include `admin1` in
the result list so duplicates are distinguishable. An empty result omits the `results` key
entirely, so guard with `Array.isArray` and toast "Place not found" (ISS-012).

Handle loading state, HTTP errors and empty results. Never `alert()`.

## 10. Game rules summary

**End goal: unlock all sixteen plots.** That is the objective the whole economy is built around.
Every other system feeds it — crops sell for gold, the pump costs gold, and each plot costs twice
the last so the farm is never finished. A player holding all sixteen plots has won; there is
nothing beyond that in version 1.

- Start: 200 gold, 0 plots owned. First plot free (pick any), then `PLOT_PRICES[n]`.
- **Land prices double with every purchase.** Full schedule in `docs/crops.md`.
- Seeds must be bought, one seed per plot planted.
- Pump on: owned plots gain water, gold drains per second, auto-off at 0 gold.
- Rain adds water. Sun and drought evaporate it.
- Crop health follows the matrix. Health 0 is dead. Harvest quality = health / 100.
- Reaping unlocks after `growHours` of real time. Growth continues while the tab is closed,
  computed from `plantedAt`.
- Sell price = units × sellPrice × quality.

## 11. Debug, logging, tests

- `utils/log.js`: `const log = createLog('plots')`, then `log.info / warn / error`. Prints
  `[plots] ...`. Enabled with `?debug=1` or `localStorage.debug = 1`. Errors always print.
- `debug/debug.js`, only with `?debug=1`: a floating panel with sliders bound to `FIELD.tileScale`,
  `gap`, `crossGap`, `originX`, `originY`, `pumpScale` that re-render the field live, and a
  "copy config" button that copies the `FIELD` object text. Buttons: `+100 gold`, `+1 h`, `+6 h`
  (time skip via `clock.timeOffsetMs`), reset save, unlock all plots, fill water. A dropdown
  forces the current weather event, and a toggle shows plot ids.
- Tests, `node --test tests/`, pure code only: `iso.test.js` (plot 0 is the top vertex,
  symmetry), `plots.test.js` (price by count, cannot buy twice, cannot afford), `farm.test.js`
  (stageOf boundaries, harvest only when ready), `weather.test.js` (classify priority, WMO
  mapping), `simulator.test.js` (drought on a dry plot loses health, on a wet plot does not).
- `npm run check` and `npm test` must pass before every phase commit.

## 12. `docs/`

```
docs/
  architecture.md          where is X? map, data flow, layering rules, boot order
  crops.md                 crop table, stages, harvest maths
  crop-choice-guide.md     season guide and forecast use
  weather-events.md        matrix, classification, effects, measured API shape
  notifications.md         alert strings and dedupe rules
  reference/               field-reference.jpeg, layout-wireframe.jpeg, style-mockup.jpeg
  game-design/implementation-plan.md   this file
  team/
    README.md              how to use these docs, and the rules
    goals.md               the 5-week plan, with done marks
    ownership.md           folder -> primary owner
    tasks.md               board
    issues.md              bug and problem log
    progress-log.md        newest on top
    decisions.md           short decision records
    members/ shabab.md afif.md kafi.md hisham.md
```

**`architecture.md`** carries the "Where do I find...?" table — plot prices and grid geometry in
`js/config/field.js`, crop times and prices in `js/config/crops.js`, image paths in
`js/config/assets.js`, weather-to-event mapping in `js/config/weatherEvents.js` and
`js/domain/weather.js`, weather-to-crop effects in `js/config/cropWeatherMatrix.js` and
`js/domain/simulator.js`, pump cost in `js/config/game.js`, plant and harvest rules in
`js/domain/farm.js`, buying land in `js/domain/plots.js`, field drawing and click bugs in
`js/ui/farmView.js`, `js/ui/plotTile.js`, `js/utils/iso.js` and `css/field.css`, page layout in
`css/layout.css` and `index.html`, API calls in `js/services/*`, save and load in
`js/state/store.js`.

**`ownership.md`** is a proposal until the team confirms it: Shabab on `docs/team`,
`config/crops.js`, `config/seasons.js`; Afif on `services/`, `domain/weather.js`,
`domain/notifications.js`, `ui/weatherPanel.js`, `ui/envMetrics.js`; Kafi on `css/`,
`ui/{topBar,sidebar,seasonCard,shopPanel,inventoryPanel,hud,buttonBar,meters}` and `assets/`;
Hisham on `state/`, `domain/{farm,plots,pump,wallet,inventory,simulator}.js`, `utils/iso.js`,
`ui/{farmView,plotTile,pumpView,cropPicker}`, `debug/` and `config/{field,game,assets}.js`.

**`tasks.md`** columns: `ID | Task | Owner | Status | Phase | Updated`. Seeded from section 13.

**`issues.md`** entry template:

```
### ISS-001 short title
- Reported by <name>   Owner: <name>   Status: open|fixing|fixed|wontfix
- Where: file/feature
- Problem: what happens, steps to reproduce
- Cause: (when known)
- Fix: (commit hash when done)
```

**`progress-log.md`** entry template, newest on top:

```
## <name> - what you did
- Did: ...
- Files: ...
- Problems: ... (link ISS-xxx)
- Next: ...
```

**`decisions.md`** entry: `### DEC-NNN title`, then Date, Decided by, Choice, Why, Alternatives.

**`team/README.md`** rules: update `tasks.md` when you start and finish; one line in
`progress-log.md` per session; every bug goes in `issues.md` before it is fixed; branch per
person `name/feature`, PR into `main`, one reviewer; only edit files in your owned folders
without telling the owner; commit prefixes as in section 0; mark goals in `goals.md` only when
every box under **Done when** is ticked.

Root `README.md`: keep the project scope, replace the "Weekly Progress" table with a link to
`docs/team/`, add "Run locally" (`npm run dev`, open the printed URL — ES modules do not work
from `file://`), and add a short folder map linking `docs/architecture.md`.

## 13. Phases and steps

Each step lists **done when**. Mapped to the 5-week plan in `docs/team/goals.md`.

### Phase 0 — foundation · Week 2

1. **Docs skeleton.** Create `docs/team/*`, `architecture.md`, `reference/`, copy this plan to
   `docs/game-design/implementation-plan.md`, fill the game-design docs from the README. Log the
   first `progress-log` entry. *Done when:* all files exist and `tasks.md` is seeded.
2. **Tooling.** `package.json`, `scripts/check-imports.mjs`, `utils/log.js`, an empty `tests/`
   with one passing test. *Done when:* `npm run check` and `npm test` pass.
3. **Config + state.** All `config/*`, `state/types.js`, `initialState.js`, `store.js`.
   *Done when:* `node -e` can import config and `initialState()` returns 16 plots with correct
   zones.
4. **Services cleanup.** Rewrite `weatherApi` and `timeApi` to return data. Add `geocodeApi`.
   Save a real response to `data/sample-forecast.json`. Delete `map.js` and the placeholder key.
   *Done when:* each service returns parsed data from a quick Node script, no DOM access.

### Phase 1 — page and field · Week 2

5. **Layout shell.** `index.html`, `css/*`, panel placeholders in all grid areas, `main.js`
   boot. *Done when:* the page matches the wireframe at 1280 px and stacks below 900 px.
6. **Static field.** `utils/iso.js` (+ tests), `farmView`, `plotTile`, `pumpView`,
   `css/field.css`. Slab + 16 unwatered plots + pump, diamond hit areas, debug sliders.
   Calibrate against `field-reference.jpeg` and write the numbers into `config/field.js`.
   *Done when:* the field matches the reference, hovering a plot highlights only that diamond,
   no overlap flicker.

### Phase 2 — economy core · Weeks 3 and 4

7. **Wallet, plots, buying.** Locked plots dimmed with a price tag, click to buy, `hud` shows
   gold. *Done when:* first plot free, then 100, 200, 400…; cannot buy without gold; tests pass.
8. **Inventory, shop, planting, growth.** Shop Seeds tab, `inventoryPanel`, `cropPicker`,
   `plant`, stage from `plantedAt`, `clearPlot` for dead crops, autosave. *Done when:* planting
   rice shows `rice_1`, debug `+6 h` advances to `rice_5`, harvest gives units, reload keeps all.
9. **Pump and water.** Toggle the pump, water rises, ground swaps to watered, gold drains,
   auto-off at 0, `meters` water bar. *Done when:* the watered/unwatered swap is visible and
   gold decreases at `upkeepPerSecond`. **Settle ISS-008 first.**
10. **Market.** Sell tab, quality-based gold. *Done when:* the harvest-to-gold loop works end to
    end.

### Phase 3 — weather · Weeks 4 and 5

11. **Weather panel.** `topBar` search, `weatherPanel` current + hourly strip, `envMetrics`,
    `seasonCard`, heat meter, sample fallback badge. *Done when:* searching "Rajshahi" updates
    everything; offline falls back to sample.
12. **Classification + effects.** `domain/weather.js`, matrix, simulator effects, forced-weather
    debug dropdown. *Done when:* priority and drought-with-pump tests pass; forcing heavy rain
    waters plots and rice survives while wheat takes damage.
13. **Notifications.** `notifications.js`, `toastStack`, forecast projection per planted crop.
    *Done when:* forcing a rain forecast with rice planted shows "Rain incoming, skip
    irrigation."

### Phase 4 — finish · Week 5

14. **Other crops.** As art arrives, add 5 PNGs each and flip `available: true`. No code changes
    expected. If code is needed, that is an architecture bug — log it.
15. **Polish.** Almanac content, empty/loading/error states, keyboard focus on plots, image size
    review. If 40 layers of 1000 px PNGs are slow, add 512 px copies and change only
    `config/assets.js`.
16. **Handover.** Update `architecture.md` and `tasks.md`, final `progress-log` entry, tag `v0.1`.

## 14. Out of scope now

Farmer sprite and seed-sowing animation, sounds, pump 3-frame animation, frost cover action, hail
and wind visuals, buying the pump, Leaflet map popup, farmhouse and roads from the mockup,
multiplayer, accounts.

**Rain-damaged and drought-killed crop sprites have moved OUT of this list and INTO scope.** They
were in the original art brief as "Special Failure States" but were deferred while the art
direction was being set. Seven sprites per crop are now expected: five growth stages plus
`<crop>_rain_damaged.png` and `<crop>_drought_killed.png`. Tracked in `docs/asset-checklist.md`.
The CSS filter fallback stays in the code either way.

## 15. Assumptions to confirm with the team

1. Land prices double with every purchase, 100 to 1,638,400 gold (see `docs/crops.md`). Settled.
2. The pump waters all owned plots; "selecting" a plot is for planting and harvesting.
3. Rice is the only playable crop until other art exists.
4. Balance numbers in 6.4 and 6.5 are placeholders.
5. The ownership list in section 12 is a suggestion (ISS-025).
6. Pump balance (ISS-008) is unresolved and needs a decision before step 9.

---

## Revisions

Changes made after auditing the plan against the repository and the live APIs.
Each links to the issue that tracks it.

| # | Change | Issue |
| ---: | :--- | :--- |
| 1 | `tileAspect` 0.553 → **0.538**, measured from the ground PNG alpha box | ISS-003 |
| 2 | `tileScale` 0.22 → **0.204** as the calibration starting point, for an even rim | ISS-005 |
| 3 | `diamondClipPath()` 22%/78% → **22.4%/75.6%**, the measured diamond | ISS-004 |
| 4 | Added the measured geometry table, including that crop art is taller than the ground on purpose | ISS-003 |
| 5 | Added the `startIndex` rule — `hourly[0]` is midnight, not the current hour | ISS-009 |
| 6 | Added the stale-sample branch for the offline fallback | ISS-011 |
| 7 | Added the `Array.isArray` guard for empty geocoding results | ISS-012 |
| 8 | Added `farm.clearPlot()` and a fifth dead-plot click case | ISS-006 |
| 9 | Added the pump click-target clip | ISS-007 |
| 10 | Added `ratingFor(plot, eventId)` as the home of the drought conditional | ISS-015 |
| 11 | Added `state.notified` for alert dedupe | ISS-013 |
| 12 | Made the offline catch-up rule explicit with a threshold | ISS-014 |
| 13 | Resolved the `ui → services` layering ambiguity into three numbered rules | ISS-016 |
| 14 | Added the "do not rebuild plot DOM per tick" note | ISS-018 |
| 15 | Added `js/almanac-main.js` to the file tree | ISS-019 |
| 16 | Moved image preload out of `config/assets.js` into `main.js` | ISS-022 |
| 17 | `config/ui.js` actions are string ids, not functions | ISS-017 |
| 18 | Whitelisted `js/utils/dom.js` in the layering rules | ISS-010 |
| 19 | Logged all 14 empty SVGs and accepted broken images per DEC-014 | ISS-001 |
| 20 | Recorded the pump balance problem instead of shipping 0.5 silently | ISS-008 |
| 21 | Documented the ~1 h 15 m weather lag as a deliberate MVP simplification | ISS-024 |
