# Hisham — Hisham Walid (ID 31)

Game developer and debugger. **73 non-merge commits**, and the largest single footprint in `docs/`:
48 edits to `architecture.md`, 57 to `issues.md`.

**Owns:** the state and save layer, the farm's water and damage rules, the pump, the field geometry
and field UI, and most of `docs/`.
**Goals:** G-01 lead, G-02 support, G-03, G-04, G-05 lead.

## What he shipped

**Week 1 — the shape of the codebase.**
Designed the folder and module layout, the data flow from services to store to domain to UI, and the
layering rules that `scripts/check-imports.mjs` enforces and `npm run check` runs. Wrote the art
direction and naming rules every sprite follows, and the first sixteen files in `docs/`.

**Week 2 — saving.**
Built the save layer: the server-side `farm_saves` save behind Row Level Security, the `.farm`
export/import file with its checksum (`js/state/transfer.js`, `js/utils/checksum.js`), the sync
indicator, and the offline retry loop in `js/connection.js` that stops re-firing a save certain to
fail. Built `js/config/assets.js` — the registry every image and sound path goes through, with byte
sizes that `tests/assets.test.js` checks against disk.

**Week 3 — the weather reaches the farm.**
This is the work the game exists for. Rain adds water, sun and heat evaporate it, a plot outside its
target band takes damage, and damage latches permanently (`domain/{water,plotWater,damage,environment}.js`).
The pump became a real machine: five levels watering 2, 4, 8, 12 and 16 plots, per-plot targets,
hand-over between plots (`pumpSwap.js`), and a bill for delivered water only. Wrote the environment
card that reports what the weather is doing to the farm rather than what it is doing outside.

**Weeks 4–5 — the field, and the record.**
Wrote the field geometry against measured alpha bounding boxes — `tileScale: 0.2320`, the diamond
clip, `shift()` — and the plot inspector, the plot-click rules and the loading screen. Kept
`architecture.md`'s annotated tree in step with every module added, and logged each defect before
fixing it. Fixed the field being rebuilt every second (ISS-088), the pump click target eating plot
clicks (ISS-007), and the dead-crop brick (ISS-006, `farm.clearPlot`).

## Open at ship

- **ISS-097** — nothing tells the player to skip the pump when rain is coming.
- **ISS-098** — `domain/simulator.js` is 0 bytes; `domain/inventory.js` was never written.
- **ISS-100** — DEC-039, DEC-040 and DEC-041 each name two different decisions.
- **ISS-027** — `localAuth.js` is a second writer to `localStorage`.

## Where to look

`js/state/`, `js/remoteSave.js`, `js/connection.js`, `js/domain/{farm,water,plotWater,damage,pump,pumpSwap,environment}.js`,
`js/config/{field,game,assets}.js`, `js/ui/{farmView,plotInspector,pumpPanel,plotLayers,syncIndicator,loadingTips}.js`,
`docs/architecture.md`, `docs/setup.md`, `docs/weather-events.md`, `scripts/check-imports.mjs`.
