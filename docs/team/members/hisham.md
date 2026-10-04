# Hisham — Hisham Walid (ID 31)

Game developer and debugger.

**Owns:** `js/state/`, `js/domain/{farm,plots,pump,wallet,inventory,simulator}.js`,
`js/utils/iso.js`, `js/ui/{farmView,plotTile,pumpView,cropPicker}.js`, `js/debug/`,
`js/config/{field,game,assets}.js`, `scripts/`
**Goals:** G-01 lead, G-02 support, G-03, G-04, G-05 lead

---

## Week of 5 Oct 2026

- [ ] `git pull` — local `main` is 1 behind `origin/main` (ISS-021)
- [ ] T-02: `package.json`, `scripts/check-imports.mjs`, `utils/log.js`, first passing test
- [ ] Whitelist `js/utils/dom.js` in the check script or it can never pass (ISS-010)
- [ ] Add a minimal `.gitignore` (ISS-020)
- [ ] T-03: all `js/config/*`, `state/types.js`, `initialState.js`, `store.js`
- [ ] `state.notified` goes in the shape now, before notifications need it (ISS-013)

## Measured geometry — do not re-derive this

Alpha bounding boxes, measured 2026-10-04. Every PNG is 1000×1000 with the art inside it.

| Asset | Content | h/w | Centre |
| :--- | :--- | ---: | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` | 991 × 595 | 0.600 | (0.503, 0.499) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

- `tileAspect: 0.538`, not 0.553. The plan's figure described the diamond inside a 1000×1000
  canvas, not the file. A 3% error compounds over three row steps (ISS-003).
- Diamond runs y 22.4%–75.6%, so `clip-path` is `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`
  (ISS-004).
- `tileScale: 0.204` gives an even rim. The 4×4 cluster is 4.21 × tileScale wide and
  2.266 × tileScale tall; solving `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` gives
  `t ≈ 0.204`, `r ≈ 0.067`. At the plan's 0.22 the rim is 0.033 at the sides and 0.048 front to
  back, which reads as a bug (ISS-005).
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

## Week of 12 Oct 2026

- [ ] T-07: `wallet.js`, `plots.js`, `plots.test.js` — price by purchase count, cannot buy twice,
      cannot afford
- [ ] T-08: `inventory.js`, `farm.js` with `clearPlot()` (ISS-006), `farm.test.js`
- [ ] Plot DOM created once, attributes diffed on update — otherwise the 1 Hz tick flickers 35
      images a second (ISS-018)
- [ ] T-09: pump, water, `meters`. **Needs the balance decision first** (ISS-008)
- [ ] T-10: market tab
- [ ] Settle the offline catch-up rule explicitly: `dt > 60_000` → growth only, skip water and
      health (ISS-014)

## Notes

- The domain layer is where the tests live. If a rule is hard to test, it is probably in the
  wrong module.
- Pump balance is a design decision, not a numbers tweak. Bring it to Shabab rather than picking
  a value alone — see the note in `docs/weather-events.md`.
