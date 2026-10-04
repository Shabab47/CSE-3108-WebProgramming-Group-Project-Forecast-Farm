# 🌾 Weather Farmer

A 2D web farming game driven by **real weather, at the player's own location**. The game asks where you are and runs your farm on that place's live forecast.

---

## 📍 Where We Are Now

Weather Farmer is a browser farming game driven by real weather at the player's own location. Week one was a planning week, and it is complete. **Shabab** set up the project and wrote the plan, the crop and season design, and the team workflow. **Kafi** produced the artwork for rice and the farm ground, **Afif** connected the base weather, time and place-lookup services, and **Hisham** designed the project structure, the data flow between its parts, and the art direction every sprite follows. Twenty-five known problems have been logged with owners, and three that would have broken the game were caught in that review before a line of game code was written. Four weeks of building remain: the farm screen, then the economy, then live weather, then the finished release.

---

## 🛠️ Weekly Progress

| Week | Focus | Status | Done | By |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Planning, design and documentation | ✅ Complete | Project plan · crop and season design · team workflow · rice and ground artwork · base weather, time and place-lookup services · project structure and data flow · 16 documentation files · 25 logged problems | Shabab · Kafi · Afif · Hisham |
| 2 | Project foundation and working farm screen | 🔄 Next | — | — |
| 3 | Land economy, then planting and growth | ⬜ Planned | — | — |
| 4 | Pump, water and market, then live weather | ⬜ Planned | — | — |
| 5 | Weather effects, crop alerts, then ship v0.1 | ⬜ Planned | — | — |

Week one was spent on planning rather than code, so the build runs four weeks from now. Each week ends with something demonstrable. Full goal breakdown in [`docs/team/goals.md`](docs/team/goals.md).

---

## 🎮 The Game in a Minute

- A browser farming game where the weather is real and comes from the player's **own location** — the farm is not somewhere fictional. → [crop-choice-guide.md](docs/crop-choice-guide.md)
- Play is one loop: **plant → water → wait → harvest**. Crops grow in real time, so a six-hour crop takes six hours whether or not the game is open. → [crops.md](docs/crops.md)
- The weather acts on the field. Rain waters the soil, sun and heat dry it out, and wind, hail and frost can damage or destroy a crop. → [weather-events.md](docs/weather-events.md)
- A water pump saves a drying crop but **costs gold every second it runs**, so watering well is a real decision. → [weather-events.md](docs/weather-events.md)
- The forecast warns you in advance — *"Rain incoming — skip irrigation"* — so checking tomorrow's weather is worth doing. → [notifications.md](docs/notifications.md)
- **The goal is to unlock all sixteen plots.** Each costs exactly twice the last, so the farm is never finished. → [crops.md](docs/crops.md)

---

## 👥 Team

| Member | ID | Role | Responsibility |
| :--- | :---: | :--- | :--- |
| **Tawfik Rahman Shabab** | 25 | Team lead | Project setup, game plan, crop and season design, team workflow |
| **Mutasim Afif** | 13 | Services and testing | Weather, time and place-lookup services; testing against live data |
| **Abdullah Hil Kafi** | 19 | Design and interface | Artwork for crops and farm tiles, screen layout, panels and controls |
| **Hisham Walid** | 31 | Game systems | Project structure, data flow, art direction, land, planting, growth, saving |

Per-person weekly notes are in [`docs/team/members/`](docs/team/members/).

---

## 📚 Documentation

The README is deliberately short. Everything below is the detail.

| Doc | What it covers |
| :--- | :--- |
| [`crops.md`](docs/crops.md) | Crop numbers, growth stages, **land prices**, harvest and quality |
| [`asset-checklist.md`](docs/asset-checklist.md) | **Every asset the game needs and what is still missing** |
| [`weather-events.md`](docs/weather-events.md) | The nine weather events, how real weather maps to them, what each does to crops |
| [`notifications.md`](docs/notifications.md) | The crop warning messages and when they fire |
| [`crop-choice-guide.md`](docs/crop-choice-guide.md) | Which crop to plant in each season, and using the forecast |
| [`architecture.md`](docs/architecture.md) | Project structure, layering rules, data flow, and **the full annotated file tree** |
| [`game-design/implementation-plan.md`](docs/game-design/implementation-plan.md) | The complete build plan |
| [`team/`](docs/team/README.md) | Goals, tasks, ownership, logged issues, decisions, weekly notes |
| [`team/goals.md`](docs/team/goals.md) | The five-week plan with done marks |
| [`team/issues.md`](docs/team/issues.md) | Every known problem, with owner and status |

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

Vanilla ES modules, plain CSS, no framework and no runtime dependencies.

```
index.html      the game page
css/            styling — layout, colours, components, field
js/             the game code, split by responsibility
assets/         artwork and icons
docs/           all project documentation
```

The full annotated tree, showing what is built and what is still empty, is in
[`docs/architecture.md`](docs/architecture.md#project-structure).

## 📄 License

[MIT](LICENSE) — © 2026 Tawfik Rahman Shabab.