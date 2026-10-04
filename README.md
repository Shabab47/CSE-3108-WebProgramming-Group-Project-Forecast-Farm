# 🌾 Weather Farmer

A 2D web farming game driven by **real-world weather, time, and location**. Players farm a plot of land, react to live weather and forecasts, and grow their assets over time — while facing real-life challenges like drought, storms, and frost.

---

## 👥 Team Members

| Name | ID | Role |
| :--- | :--- | :--- |
| **Tawfik Rahman Shabab** | 25 | Team leader and project manager 👨‍💼 |
| **Mutasim Afif** | 13 | Game developer and game tester 🧪 |
| **Abdullah Hil Kafi** | 19 | UI/UX and frontend developer ✨ |
| **Hisham Walid** | 31 | Game developer and debugger ☢️ |

[⬇️ Go to check weekly updates](#bottom)

---

## 🌍 Base Version APIs

| API | Purpose |
| :--- | :--- |
| **Weather API** | Real-time weather + forecast based on the player's chosen location |
| **Time API** | Provides time info for that location if the Weather API doesn't |
| **Map API** | Lets the player pick a location from anywhere in the world |

---

## 🎮 Base Game Theme

- **2D View:** Top-down or slightly tilted (Clash of Clans style).
- **Farmland Plot:** The farmer owns a **rectangular plot of land** to plough and grow crops.
- **Core Loop:** **Plant → water → wait → reap.** Reaping unlocks after `n` real-world hours based on the location's Time API.
- **Strategic Foresight:** **Check the forecast before acting.** The player can look at the upcoming weather at any time to decide whether to water, plant, protect, or wait.
- **Market Dynamics:** Sell harvest at the market for profit:
  - *Good Care:* Higher quality & yield → more gold.
  - *Neglected Crops:* Lower quality & yield → less gold.
- **Gold Shop Expenditures:**
  - **Seeds:** To plant new crops.
  - **Water Pump:** To survive droughts.
  - **More Land:** Expand farming area.

### ⏱️ Forecast Method
The player opens the forecast panel (a strip of upcoming weather events) to see what's coming next — typically the next 6–24 hours. Forecast data is pulled from the **Weather API** for the chosen location. If the Weather API doesn't return local time, the **Time API** fills the gap. 

The forecast directly drives the crop-tied notifications and is the main tool for smart decisions:
- **Rain coming:** Skip running the pump and save gold.
- **Drought ahead:** Start the pump early.
- **Frost or a cold snap:** Protect sensitive crops.
- **Heavy rain / storm:** Harvest early or prepare for damage.
- **High humidity:** Watch for fungus and rot.

---

## 💧 Water Pump Mechanics

- The pump is the player's answer to **drought and dry spells**.
- **Upkeep Cost:** Running the pump costs money over time — it draws gold continuously while active.
- **Decision Engine:** Players must decide *when* to run it: watering unnecessarily wastes gold, but skipping it during a drought can kill the crop.
- **Visuals:** The pump features **3 animation frames** (idle, pumping frame 1, pumping frame 2).

---

## 📡 Weather Forecast & Crop Notifications

Forecast data is displayed via a visual strip showing upcoming events over the next 6–24 hours, actively generating custom crop-tied alert strings:

* **🌾 Rice:** *"Rain incoming — skip irrigation."* / *"Drought in 3h — start water pump?"*
* **🥖 Wheat:** *"Heatwave coming — wheat yield may drop."* / *"Heavy rain warning — rot risk."*
* **🥔 Potato:** *"Frost tonight — cover potatoes?"* / *"Waterlogging risk — drain field?"*
* **🌽 Corn:** *"Strong wind warning — stake corn?"* / *"Drought — irrigate now?"*
* **🍅 Tomato:** *"Heavy rain — protect tomatoes from splitting?"* / *"Frost — cover or lose crop."*

---

## 🌾 Crop Guidelines

| Crop | Likes | Hates | Water Need | Best Season |
| :--- | :--- | :--- | :--- | :--- |
| **Rice** | Rain, heat, flood | Drought, frost | Very High | Rainy |
| **Wheat** | Cool, mild, light rain | Heat, drought, heavy rain | Medium | Cool / Dry |
| **Potato** | Cool, moist | Frost, heat, waterlogging | Medium | Cool / Moist |
| **Corn** | Warm, sun, moderate rain | Drought, strong wind | High | Warm / Sunny |
| **Tomato** | Warm, sun, steady water | Frost, extreme heat, heavy rain | Medium | Warm / Mild |

---

## 🌦️ Weather Event Matrix

| Weather Event | Rice | Wheat | Potato | Corn | Tomato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sunny / Clear** | Needs irrigation | Good if mild | OK if cool | Thrives | Thrives |
| **Cloudy** | Slow but fine | Good | Good | OK | OK |
| **Light Rain** | Excellent, free water | Good | Good | Good | Good, watch disease |
| **Heavy Rain / Storm** | Tolerates flood | Rot / damage | Rot / waterlogged | Lodging / damage | Splitting / rot |
| **Drought / Heatwave** | Dies without pump | Yield loss | Small tubers | Wilts | Drops flowers |
| **Frost / Cold Snap** | Killed | Survives | Damaged | Killed | Killed |
| **Hail** | Some damage | Yield loss | Foliage damage | Shredded | Ruined fruit |
| **Strong Wind** | OK | Lodging | OK | Lodging | Needs stakes |
| **High Humidity** | OK | Fungus | Blight | Fungus | Blight / rot |

### 🧭 Quick Season Choice Guide
- **Rainy Season:** Rice
- **Cool + Dry:** Wheat
- **Cool + Moist:** Potato
- **Warm + Sunny:** Corn
- **Warm + Steady Water:** Tomato

---

## ⚖️ Game Difficulty & System Threats

The gameplay provides balanced progression focusing on strategic financial choices, expansion, and weather remediation rather than punishing survival mechanics.

* ☀️ **Drought:** Kills crops without active pump operation.
* 🌧️ **Rain:** Excessive rain causes severe saturation damage.
* ❄️ **Frost:** Kills warm-season crops instantly if left unprotected.
* 💨 **Wind & Hail:** Causes plant lodging and irreversible structural/foliage damage.
* 💸 **Pump Upkeep:** Depletes gold reserves continuously while left toggled on.

---

## 🎨 Asset & Animation Requirements

### 🗺️ Environment
- Seamless grassy floor background.
- Centered rectangular muddy patch representing active farm plots.

### 🧑‍🌾 Farmer Sprite
- Simple player character viewed from the back.
- 2–3 seed-sowing animation frames. Visible **only** during active seed spreading tasks.

### 🌱 Crop Growth Stages (5 Levels across `n` Real-World Hours)
1. Plain mud layout (empty plot).
2. Sprouted green saplings.
3. Mid-sized vegetation foliage.
4. Mature sizing (pre-harvest green).
5. Golden, fully-ripened crop state (ready for harvest).

### 🥀 Special Failure States
- **Rain-damaged** crop overlay sprites.
- **Drought-killed** dried crop texture sprites.

### 🖥️ Main User Interface Elements
- **Shop Overlays:** Toggle menus for both seed buying and harvest sales.
- **Status Gauges:** **Heat Meter** and **Water Meter** indicators for live soil properties (must be closely balanced; excess water mimics severe storm rot).
- **Wallet Indicator:** Live display of collected gold coins.
- **Forecast Ticker:** Scrollable strip showing scheduled upcoming climate intervals.

---

## ▶️ Run Locally

ES modules do not work from `file://` — the page must be served over HTTP.

```bash
npm run dev      # serve this folder, open the URL it prints
npm test         # node --test tests/
npm run check    # layering rules: imports, fetch, DOM access
```

Append `?debug=1` to the URL for the debug panel: geometry sliders, gold and time cheats,
forced weather, plot ids.

---

## 🗂️ Project Structure

Vanilla ES modules, plain CSS, DOM `<img>` layers. No framework, no bundler, no runtime
dependencies. See [`docs/architecture.md`](docs/architecture.md) for the layering rules and a
"where do I find X?" table.

This is the repo **as it stands today**, not the finished shape.

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

**Status legend**

| Marker | Meaning |
| :--- | :--- |
| *empty* | File exists but has no content yet |
| *planned* | Folder or file the architecture calls for, not created |
| *rewrites* | Has content, but it is being replaced |

Build order, owners and the 4-week window are in
[`docs/team/goals.md`](docs/team/goals.md).

## 📚 Documentation

| Doc | What it covers |
| :--- | :--- |
| [`architecture.md`](docs/architecture.md) | Layers, data flow, boot order, where things live |
| [`crops.md`](docs/crops.md) | Crop numbers, growth stages, harvest maths |
| [`weather-events.md`](docs/weather-events.md) | The nine events, classification, effects on crops |
| [`notifications.md`](docs/notifications.md) | Crop alert strings and dedupe |
| [`crop-choice-guide.md`](docs/crop-choice-guide.md) | Season to crop, and using the forecast |
| [`game-design/implementation-plan.md`](docs/game-design/implementation-plan.md) | The full build plan |
| [`team/`](docs/team/README.md) | Goals, tasks, ownership, issues, decisions |

## 📄 License

[MIT](LICENSE) — © 2026 Tawfik Rahman Shabab.

---

## 🛠️ Weekly Progress

Detailed progress and plans are with [`docs/team/`](docs/team/README.md):

| Doc | What it holds |
| :--- | :--- |
| [`goals.md`](docs/team/goals.md) | The 4-week sprint, with done marks |
| [`tasks.md`](docs/team/tasks.md) | Task board |
| [`progress-log.md`](docs/team/progress-log.md) | One entry per work session |
| [`members/`](docs/team/members/) | Per-person weekly notes |

| Week 1 | Task |
|---|---|
| **Afif(id13):** | API integration |
| **Jim(id19):** | Images and visuals creation |
| **Shabab(id25):** | Project task distribution and game concept |
| **Hisham(id31):** | Game architecture and visuals direction |

<a name="bottom"></a>
