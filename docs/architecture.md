# Architecture

How Forecast Farm is put together, and where to change things.

Stack: vanilla JS ES modules, plain CSS, DOM `<img>` layers. No framework, no bundler,
no runtime dependencies. `package.json` exists only for scripts.

---

## Layers

| Folder | May import from | Never contains |
| :--- | :--- | :--- |
| `js/config/` | nothing | logic, DOM, fetch |
| `js/utils/` | `config` | DOM (except `utils/dom.js`), fetch |
| `js/state/` | `config`, `utils` | DOM, fetch, game rules |
| `js/domain/` | `config`, `utils`, `state/types` | DOM, fetch, `store.js` internals |
| `js/services/` | `config`, `utils` | DOM |
| `js/ui/` | `config`, `utils`, `domain`, `state` | `fetch`, game rules, service calls |
| `js/debug/` | anything | — |
| `js/main.js` | anything | — |

Three rules the layering depends on:

1. **Only `js/services/` calls `fetch`.** Includes reading `data/sample-forecast.json`.
2. **Only `js/ui/`, `js/debug/` and `js/main.js` touch the DOM.** `utils/dom.js` is the one
   exception, and `scripts/check-imports.mjs` whitelists it explicitly.
3. **`js/main.js` is the only module that imports `js/services/`.** UI modules never import
   a service. `main.js` passes callbacks in through `mountX(root, actions)`.

## Data flow

```
services (fetch)  →  main.js  →  store.apply  →  domain (pure rules)  →  store  →  ui (render)
```

- Services return plain parsed data. They never classify, never store.
- `main.js` owns wiring: it decides when to fetch, and passes results into the store.
- Domain functions are pure: `(state, ...args) => { ok: true, state } | { ok: false, reason }`.
  They never mutate the state they receive.
- `store.apply(fn, ...args)` is the only thing that writes state. On `ok: false` it emits a
  `toast` event carrying `reason`.
- UI subscribes to the store and re-renders its own subtree only.

## Boot order

`js/main.js`, in this order:

1. `load()` the save, or build `initialState()`.
2. Preload images (rice stages + both ground tiles + base + pump).
3. Mount UI: topBar, sidebar, seasonCard, weatherPanel, farmView, hud, buttonBar,
   meters, envMetrics, toastStack.
4. Fetch weather for `state.location`, or the sample fallback. Repeat every `REFRESH_MS`.
5. Start the simulator interval (`TICK_MS`) and the autosave interval (`AUTOSAVE_MS`).
6. If `?debug=1`, mount the debug panel.

---

## Where do I find...?

| I want to change... | Open |
| :--- | :--- |
| plot prices, grid size, spacing | `js/config/field.js` |
| crop times, prices, water need | `js/config/crops.js` |
| an image path | `js/config/assets.js` |
| how weather maps to game events | `js/config/weatherEvents.js`, `js/domain/weather.js` |
| what weather does to crops | `js/config/cropWeatherMatrix.js`, `js/domain/simulator.js` |
| pump cost / water speed | `js/config/game.js` |
| plant / harvest / clear rules | `js/domain/farm.js` |
| buying land | `js/domain/plots.js` |
| seeds, harvest, selling | `js/domain/inventory.js` |
| gold maths | `js/domain/wallet.js` |
| forecast → alert strings | `js/domain/notifications.js` |
| field drawing / click bugs | `js/ui/farmView.js`, `js/ui/plotTile.js`, `js/utils/iso.js`, `css/field.css` |
| page layout | `css/layout.css`, `index.html` |
| colours, radii, spacing | `css/variables.css` |
| card and button styling | `css/components.css` |
| top bar buttons | `js/config/ui.js` |
| API calls | `js/services/*` |
| save / load | `js/state/store.js` |
| the state shape | `js/state/types.js`, `js/state/initialState.js` |
| debug sliders and cheat buttons | `js/debug/debug.js` |


---

## Project structure

This is the repo **as it stands**, not the finished shape. It moves, so treat it as a snapshot.

```
.
├── index.html                  empty — app shell, 3 grid columns
├── almanac.html                empty — placeholder page
├── LICENSE                     MIT
├── README.md
│
├── css/
│   ├── reset.css               empty
│   ├── layout.css              empty — the 3-area CSS grid
│   ├── variables.css           empty — all colours, radii, spacing
│   ├── themes.css              empty
│   ├── components.css          empty
│   └── field.css               planned — isometric stage and plot layers
│
├── data/
│   └── sample-forecast.json    empty — one real Open-Meteo response, for offline dev
│
├── js/
│   ├── main.js                 empty — boot order only
│   ├── config/                 pure data, imports nothing
│   │   ├── crops.js            empty
│   │   ├── cropWeatherMatrix.js empty
│   │   ├── seasons.js          empty
│   │   └── weatherEvents.js    empty
│   ├── domain/                 game rules — no DOM, no fetch
│   │   ├── farm.js             empty
│   │   ├── notifications.js    empty
│   │   ├── simulator.js        empty
│   │   └── weather.js          empty
│   ├── services/               the only place that calls fetch
│   │   ├── map.js              DELETE — Nominatim + Leaflet, references an
│   │   │                       undefined `map` global and calls alert()
│   │   ├── timeApi.js          rewrites — writes straight into the DOM
│   │   └── weatherApi.js       rewrites — OpenWeatherMap placeholder key
│   ├── ui/                     render only, reads the store
│   │   ├── almanac.js          empty
│   │   ├── cropPicker.js       empty
│   │   ├── farmView.js         empty
│   │   ├── toastStack.js       empty
│   │   └── weatherPanel.js     empty
│   ├── utils/
│   │   ├── date.js             empty
│   │   ├── dom.js              empty
│   │   └── season.js           empty
│   ├── state/                  planned — store, types, initial state
│   └── debug/                  planned — the ?debug=1 panel
│
├── assets/
│   ├── icons/
│   │   ├── crops/              5 SVGs — all 0 bytes, art pending
│   │   └── weather/            9 SVGs — all 0 bytes, art pending
│   ├── images/
│   │   ├── base.png            the slab under the field
│   │   ├── pump.png            moves to pump/pump.png
│   │   ├── crops/
│   │   │   ├── rice/           rice_1.png … rice_5.png — the only playable crop
│   │   │   ├── wheat/          empty — awaiting art
│   │   │   ├── potato/         empty — awaiting art
│   │   │   ├── corn/           empty — awaiting art
│   │   │   └── tomato/         empty — awaiting art
│   │   └── ground/
│   │       ├── ground_watered.png
│   │       └── ground_unwatered.png
│   └── sounds/                 3 MP3s, all 0 bytes — out of scope
│
└── docs/
    ├── architecture.md         layers, data flow, boot order, where things live
    ├── crops.md                crop numbers, stages, harvest maths
    ├── weather-events.md       the 9 events, classification, effects
    ├── notifications.md        crop alerts and dedupe
    ├── crop-choice-guide.md    season → crop, using the forecast
    ├── game-design/
    │   └── implementation-plan.md
    ├── reference/              field render, layout wireframe, style mockup
    └── team/                   goals, tasks, ownership, issues, decisions, members
```

Also planned but not created yet: `package.json`, `tests/`, `scripts/check-imports.mjs`.

---

## Conventions

- Max ~200 lines per file. Past that, split by responsibility.
- Every module logs through `utils/log.js` with its own scope name.
  Error messages start with `[scope]`.
- Existing source files use CRLF. Do not mass-convert. New files may use LF.
- Event handlers are attached in JS. No inline handlers in HTML.
- Plot elements carry `data-plot-id`.
- Only `store.js` touches `localStorage`, always inside try/catch.
- Save key: `forecastFarm.save.v1`.

## Module contracts

| Module | Exports | Notes |
| :--- | :--- | :--- |
| `state/store.js` | `getState`, `apply`, `subscribe`, `bus.emit`, `bus.on`, `save`, `load` | `subscribe` returns an unsubscribe fn |
| `utils/log.js` | `createLog(scope)` | returns `{ info, warn, error }` |
| `utils/iso.js` | `plotToScreen`, `diamondClipPath` | all sizes are fractions of the stage |
| `ui/*` | `mountX(rootEl, actions)` | returns `unmount()` |
| `domain/*` | pure `(state, ...args)` functions | return `{ ok, state }` or `{ ok: false, reason }` |

`farm.stageOf` and `farm.isReady` are pure selectors, so UI calls them directly.
Everything that mutates goes through `store.apply`.

---

## Field geometry

The stage is `.field-stage { position: relative; aspect-ratio: 1; width: min(100%, 720px) }`.
Every layer inside it is absolutely positioned and sized in `%` of the stage, so the whole
field scales with the container and needs no resize handling.

```
n = FIELD.size
shift(i)  = (i - (n-1)/2) * (1 + gap) + (i >= n/2 ? crossGap/2 : -crossGap/2)
u = shift(col);  v = shift(row)

centerX = originX + (u - v) * tileScale / 2
centerY = originY + (u + v) * tileScale * tileAspect / 2

img left = centerX - tileScale/2      (fractions of stage)
img top  = centerY - tileScale/2
img width = tileScale
z-index  = col + row
```

`col` increases toward the lower right, `row` toward the lower left, so plot `(0,0)` is the
top vertex. `base.png` fills the stage at `z-index: 0`. The pump uses the same centre formula
at `u = v = 0`.

### Measured constants

Every plot PNG is 1000×1000 with transparent corners, so the visible diamond sits inside the
box. These were measured from the alpha bounding boxes, not guessed:

| Asset | Content box | h/w | Centre |
| :--- | :--- | :--- | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` | 991 × 595 | 0.600 | (0.503, 0.499) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

Consequences, all already applied to `js/config/field.js`:

- `tileAspect: 0.538`, not a rounded guess. A 3% error compounds across three row steps and
  visibly pulls the bottom row out of alignment with the top.
- `diamondClipPath()` uses `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`. The real diamond
  runs 22.4%–75.6% vertically; rounding the bottom tip out to 78% inflates the click target
  past the visible art.
- `tileScale: 0.204` is the value that gives an even rim between the 4×4 cluster and
  `base.png`. The cluster's outer diamond is 4.21 × tileScale wide and 2.266 × tileScale tall
  at the default `gap`/`crossGap`; solving `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595`
  gives `t ≈ 0.204`, `r ≈ 0.067`.
- `pump.png` art occupies 27.9% of its 1000×1000 canvas, so `pumpScale: 0.25` renders a pump
  about 32% of a plot's width. See `ui/pumpView.js` for the click-target consequence.

Reference renders: `docs/reference/field-reference.jpeg`.

## Click targets

Plot rectangles overlap, because the PNGs are square with transparent corners. So each plot is
a `<button class="plot">` carrying the diamond `clip-path`, and the `<img>` layers inside it are
`pointer-events: none; draggable: false`. Only the button receives clicks.

Plots are real buttons, so they get keyboard focus and keyboard activation for free. Do not
replace them with divs.

## Known simplifications

- `simulator.tick` reads `state.weather.hourly[0]` as the current event, but weather is only
  re-fetched every 15 minutes while `hourly[0]` is the hour the response was built for. The
  active event can therefore lag real conditions by up to about 1 h 15 m. Weather is real-data
  only, so the player cannot correct this. It is a deliberate MVP simplification, not a bug —
  see `DEC-013`.
- `field-reference.jpeg` shows a farmhouse, pipework and more than 16 plots. Those are mockup
  extras, out of scope. The cross paths in that render are simply `base.png` showing through
  the `crossGap` between the four 2×2 zones, which is why no path art is needed.
