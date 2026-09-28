# Weather Farmer 

A 2D web farming game driven by **real-world weather, time, and location**. Players farm a plot of land, react to live weather and forecasts, and grow their assets over time — while facing real-life challenges like drought, storms, and frost.

---

## 🌍 Base Version APIs

| API | Purpose |
|---|---|
| **Weather API** | Real-time weather + forecast based on the player's chosen location |
| **Time API** | Provides time info for that location if the Weather API doesn't |
| **Map API** | Lets the player pick a location from anywhere in the world |

---

## 🎮 Base Game Theme

- **2D view** — top-down or slightly tilted (Clash of Clans style).
- The farmer owns a **rectangular plot of land** to plough and grow crops.
- **Plant → water → wait → reap.** Reaping unlocks after `n` real-world hours based on the location's Time API.
- **Check the forecast before acting.** The player can look at the upcoming weather at any time to decide whether to water, plant, protect, or wait.
- Sell harvest at the **market** for profit:
  - Took good care → higher quality & yield → more gold.
  - Neglected crops → lower quality & yield → less gold.
- **Spend gold at the shop:**
  - **Seeds** — to plant new crops.
  - **Water pump** — survives droughts.
  - **More land** — expand farming area.

**Forecast Method**

The player opens the forecast panel (a strip of upcoming weather events) to see what's coming next — typically the next 6–24 hours. Forecast data is pulled from the **Weather API** for the chosen location. If the Weather API doesn't return local time, the **Time API** fills the gap. The forecast directly drives the crop-tied notifications and is the main tool for smart decisions:

- See **rain coming** → skip running the pump and save gold.
- See **drought ahead** → start the pump early.
- See **frost or a cold snap** → protect sensitive crops.
- See **heavy rain / storm** → harvest early or prepare for damage.
- See **high humidity** → watch for fungus and rot.

---

## 💧 Water Pump

- The pump is the player's answer to **drought and dry spells**.
- **Running the pump costs money over time** — it draws gold continuously while active.
- Players must decide *when* to run it: watering unnecessarily wastes gold, but skipping it during a drought can kill the crop.
- The forecast (see above) is the key tool for making this decision well.
- The pump has **3 animation frames**: idle, pumping frame 1, pumping frame 2.

---

## 📡 Weather Forecast

A core part of the base game — players can **check the weather forecast** before making decisions.

**Why it matters:**

- See **rain coming** → skip running the pump and save gold.
- See **drought ahead** → start the pump early.
- See **frost or a cold snap** → protect sensitive crops.
- See **heavy rain / storm** → harvest early or prepare for damage.
- See **high humidity** → watch for fungus and rot.

**How it works:**

- Forecast data comes from the **Weather API** for the player's chosen location.
- If the Weather API doesn't return local time, the **Time API** fills the gap.
- Forecast is shown as a **strip of upcoming weather events** (e.g. next 6–24 hours).
- Forecast drives the **crop-tied notifications** (see below).

**Crop-Tied Forecast Notifications**

- **Rice:** "Rain incoming — skip irrigation." / "Drought in 3h — start water pump?"
- **Wheat:** "Heatwave coming — wheat yield may drop." / "Heavy rain warning — rot risk."
- **Potato:** "Frost tonight — cover potatoes?" / "Waterlogging risk — drain field?"
- **Corn:** "Strong wind warning — stake corn?" / "Drought — irrigate now?"
- **Tomato:** "Heavy rain — protect tomatoes from splitting?" / "Frost — cover or lose crop."

---

## 🌾 The 5 Crops

| Crop | Likes | Hates | Water Need | Best Season |
|---|---|---|---|---|
| **Rice** | Rain, heat, flood | Drought, frost | Very High | Rainy |
| **Wheat** | Cool, mild, light rain | Heat, drought, heavy rain | Medium | Cool / Dry |
| **Potato** | Cool, moist | Frost, heat, waterlogging | Medium | Cool / Moist |
| **Corn** | Warm, sun, moderate rain | Drought, strong wind | High | Warm / Sunny |
| **Tomato** | Warm, sun, steady water | Frost, extreme heat, heavy rain | Medium | Warm / Mild |

---

## 🌦️ Weather Events vs the 5 Crops

| Weather Event | Rice | Wheat | Potato | Corn | Tomato |
|---|---|---|---|---|---|
| **Sunny / Clear** | Needs irrigation | Good if mild | OK if cool | Thrives | Thrives |
| **Cloudy** | Slow but fine | Good | Good | OK | OK |
| **Light Rain** | Excellent, free water | Good | Good | Good | Good, watch disease |
| **Heavy Rain / Storm** | Tolerates flood | Rot / damage | Rot / waterlogged | Lodging / damage | Splitting / rot |
| **Drought / Heatwave** | Dies without pump | Yield loss | Small tubers | Wilts | Drops flowers |
| **Frost / Cold Snap** | Killed | Survives | Damaged | Killed | Killed |
| **Hail** | Some damage | Yield loss | Foliage damage | Shredded | Ruined fruit |
| **Strong Wind** | OK | Lodging | OK | Lodging | Needs stakes |
| **High Humidity** | OK | Fungus | Blight | Fungus | Blight / rot |

---

## 🧭 Quick Crop Choice Guide

- **Rainy season →** Rice
- **Cool + dry →** Wheat
- **Cool + moist →** Potato
- **Warm + sunny →** Corn
- **Warm + steady water →** Tomato

---

## ⚖️ Game Difficulty

Not insanely difficult. The focus is on:

- Making more money
- Money management
- Expanding assets
- Handling real-life challenges

**Threats you face:**

- ☀️ **Drought** — kills crops without running the pump
- 🌧️ **Rain** — damages crops if excessive
- ❄️ **Frost** — kills warm-season crops
- 💨 **Wind & hail** — lodging and physical damage
- 💸 **Pump upkeep** — running water costs gold over time

The goal is to make real-life decisions and adapt.

---

## 🎨 Game Visuals & Animation

**Environment**
- Grassy background
- Muddy rectangular farmland in the middle

**Farmer**
- Simple sprite, backside view
- 2–3 animation frames (spreading seeds)
- Visible **only** while spreading seeds

**Crop Growth Stages (5 levels over `n` hours)**
1. Nothing on mud
2. Small green saplings
3. Mid size
4. Full size, still green
5. Full size, golden (ready to reap)

**Special Crop States (separate sprites)**
- Rain-damaged crop
- Drought-killed crop

**Water Pump**
- 3 frames: idle, pumping frame 1, pumping frame 2
- Consumes **gold over time** while running

**UI Elements**
- Shop menu with **Sell** and **Buy** options
- **Heat meter** and **Water meter** for crop health (must be balanced)
- Excess water over a long period damages crops — just like rain
- **Gold coin** is the currency
- **Forecast strip** showing upcoming weather

---

## 🚀 Future Scope

- Better visuals and animation
- More items in the shop
- More types of plants to grow
- More types of enemies (e.g. crows)
- More needs and diseases for plants
- Hiring workers system
- Different models of pumps
- Advanced reaping methods (machines & equipment) for more profit
- Repair system for machines and equipment
- Demand & Supply system affecting prices based on:
  - Weather
  - Season demand
  - Location
  - Tradition
  - Calamities
  - …and more

---

## ⏱️ Time API

Use **only** if the Weather API does not provide local time for season timers and forecasts.

---

## 🛠️ Running Locally

ES modules require a static server (no `file://`):

```bash
python3 -m http.server 8000
# or
npx serve .
