# Hisham — Hisham Walid (ID 31)

Game developer and debugger.

**Owns:** `js/state/`, `js/domain/{farm,plots,pump,wallet,inventory,simulator}.js`,
`js/utils/iso.js`, `js/ui/{farmView,plotTile,pumpView,cropPicker}.js`, `js/debug/`,
`js/config/{field,game,assets}.js`, `scripts/`
**Goals:** G-01 lead, G-02 support, G-03, G-04, G-05 lead

**Week 1 contribution:** designed the full project structure, how the parts will talk to each
other, and the art direction every sprite follows.

**Week 2 contribution:** the Supabase connection environment and the `farm_saves` migration,
exporting and importing a farm as a `.farm` file, and the asset registry that puts every image
and sound path in one place.

---

## Week 1

- [x] Full project structure designed — folders, modules, and what lives where
- [x] Data flow designed — how services, state, rules and screens talk to each other
- [x] Layering rules written, and the checker that enforces them — `scripts/check-imports.mjs`
- [x] **Art direction** — style, perspective, palette and naming rules for all sprite and icon
      work, so Kafi's art stays consistent as more crops land
- [x] Set the asset naming and folder convention — `docs/asset-checklist.md`
- [x] Documentation written and committed — 16 files under `docs/`
- [x] Reference renders added — `docs/reference/`
- [x] `git pull` — local `main` was 1 behind `origin/main` (ISS-021)
- [x] Measured the PNG geometry so the field numbers are not guesses
- [ ] T-02: `package.json`, `scripts/check-imports.mjs`, `utils/log.js`, first passing test
- [ ] Whitelist `js/utils/dom.js` in the check script or it can never pass (ISS-010)
- [ ] Add a minimal `.gitignore` (ISS-020)
- [ ] T-03: all `js/config/*`, `state/types.js`, `initialState.js`, `store.js`
- [ ] `state.notified` goes in the shape now, before notifications need it (ISS-013)

## Week 2

- [ ] T-05: `index.html` and `css/*` shell with Kafi
- [ ] T-06: `utils/iso.js`, `farmView`, `plotTile`, `pumpView`, `css/field.css`, debug sliders
- [ ] Calibrate the field geometry against `docs/reference/field-reference.jpeg`
- [ ] Pump click target clipped to its art (ISS-007)

## Measured geometry — do not re-derive this

Alpha bounding boxes, measured during the pre-build audit. Every PNG is 1000×1000 with the art inside it.

**Corrected 2026-10-16 (T-54):** the `base.png` row and the `tileScale` bullet below were both wrong.
`base.png` is an extruded slab, so it needs two rows, and the rim solve they described measured the
wrong box. Details in ISS-069 and ISS-071.

| Asset | Content | h/w | Centre |
| :--- | :--- | ---: | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` top face | 992 × 520 | **0.524** | (0.503, 0.462) |
| `base.png` bounding box | 992 × 596 | 0.601 | (0.503, 0.500) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

- `tileAspect: 0.538`, not 0.553. The plan's figure described the diamond inside a 1000×1000
  canvas, not the file. A 3% error compounds over three row steps (ISS-003).
- Diamond runs y 22.4%–75.6%, so `clip-path` is `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`
  (ISS-004).
- `base.png`'s row widths plateau over y `462..533` — a 72px vertical skirt — so the plots stand on
  its **top face**, centred at y `0.462`, and not on the bounding box centre at `0.4995`. A flat
  diamond's widest row is one row tall; a 72-row plateau is the tell (ISS-069).
- `tileScale: 0.2296` is a **chosen fit, not a solved value**, because an even rim does not exist. The
  4×4 cluster is 4.21 × tileScale wide and 2.265 × tileScale tall; against the top face
  `4.21t + 2r = 0.992` and `2.265t + 2r = 0.520` give `r = -0.015` — the cluster is 2.7% too tall for
  the slab, since 0.538-aspect tiles cannot tile a 0.524 surface. `0.2296` fills the face
  front-to-back and leaves ~1.3% at the sides (ISS-005, ISS-071, DEC-034). The old `0.204` solved
  against the bounding box, skirt included, which is why it never looked right.
- The plot box is **square**: `tileScale` on `width` and on `padding-top`. `ground_*.png` is a square
  canvas, so a box of `tileScale * tileAspect` tall makes `object-fit: contain` fit the canvas to the
  box's height and draws every plot at half size (ISS-070).
- Crop sprites are taller than the ground tile (0.589 vs 0.538) on purpose. Plants stand proud of
  the soil. Do not scale crop layers to match the ground.
- The pump's art is 27.9% of its canvas, so its button box is ~7× the visible pump. Clip the
  click target to the art or it eats the tips of plots `(1,2)` and `(2,1)` (ISS-007).

## Debug panel

`?debug=1`. Sliders bound live to `tileScale`, `gap`, `crossGap`, `originX`, `originY`,
`pumpScale`, plus a "copy config" button. Cheats: `+100 gold`, `+1 h`, `+6 h` (via
`clock.timeOffsetMs`), reset save, unlock all plots, fill water, force weather event, show plot
ids. Calibration against `docs/reference/field-reference.jpeg` is how the numbers above get
finalised — write the results into `config/field.js`, not just into the sliders.

## Week 3

- [ ] T-07: `wallet.js`, `plots.js`, `plots.test.js` — price by purchase count, cannot buy twice,
      cannot afford. Prices double each purchase; see `docs/crops.md`
- [ ] T-08: `inventory.js`, `farm.js` with `clearPlot()` (ISS-006), `farm.test.js`
- [ ] Plot DOM created once, attributes diffed on update — otherwise the 1 Hz tick flickers 35
      images a second (ISS-018)

## Week 4

- [ ] T-09: pump, water, `meters`. **Needs the balance decision first** (ISS-008)
- [ ] T-10: market tab
- [ ] Settle the offline catch-up rule explicitly: `dt > 60_000` → growth only, skip water and
      health (ISS-014)

## Notes

- The domain layer is where the tests live. If a rule is hard to test, it is probably in the
  wrong module.
- Pump balance is a design decision, not a numbers tweak. Bring it to Shabab rather than picking
  a value alone — see the note in `docs/weather-events.md`.
