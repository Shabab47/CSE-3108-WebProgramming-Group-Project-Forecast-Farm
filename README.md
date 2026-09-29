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

## 🛠️ Local Environment Deployment

The engine relies entirely on native ES modules and requires a lightweight static server execution environment:

```bash
# Option 1: Native Python HTTP Engine
python3 -m http.server 8000

# Option 2: Node Package Runner
npx serve .
```
