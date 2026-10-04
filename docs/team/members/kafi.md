# Kafi (Jim) — Abdullah Hil Kafi (ID 19)

UI/UX and frontend developer.

**Owns:** `css/`, `js/ui/topBar.js`, `sidebar.js`, `seasonCard.js`, `shopPanel.js`,
`inventoryPanel.js`, `hud.js`, `buttonBar.js`, `meters.js`, `assets/`
**Goals:** G-02 lead, G-06 support, G-08 support

**Week 1 contribution:** produced all the crop artwork for rice and the farm ground.

**Track your remaining work in [`docs/asset-checklist.md`](../../asset-checklist.md).**

---

## Week 1

- [x] Rice artwork, all five growth stages — `assets/images/crops/rice/rice_1..5.png`
- [x] Farm ground artwork, watered and unwatered — `assets/images/ground/`
- [x] One folder per crop so future art drops straight in without touching code (DEC-016)
- [ ] **Rice is not finished** — it still needs its two failure states:
      `rice_rain_damaged.png` and `rice_drought_killed.png`
- [ ] 9 weather icons in `assets/icons/weather/` — **all currently 0 bytes** (ISS-001)
- [ ] 5 crop icons in `assets/icons/crops/` — **all currently 0 bytes** (ISS-001)
- [ ] 4 more crops × 7 sprites each = 28 sprites
- [ ] 2 pump animation frames
- [ ] `LICENSE` is 0 bytes too (ISS-002, Shabab owns the decision)
- [ ] 3 sounds in `assets/sounds/` are 0 bytes — out of scope, leave them alone (ISS-023)

Team decision on icons: paths are coded as specified and broken images are accepted for now
(DEC-014). Text labels carry the meaning. Do not build a fallback layer.

## Week 2

- [ ] `index.html` with the three grid areas per `docs/reference/layout-wireframe.jpeg`
- [ ] `css/reset.css`, `variables.css`, `layout.css`, `themes.css`, `components.css`
- [ ] Panel placeholders in every grid area, then `js/main.js` boot
- [ ] Single column below 900 px, order: topBar, forecast, farm, right column, sidebar as a
      bottom bar
- [ ] Style tokens from `docs/reference/style-mockup.jpeg`: white glass cards, radius 16–20 px,
      soft shadow, thin border, one accent, system font stack. All of it in `variables.css`.

## Week 3

- [ ] Locked plot price tags and the buy confirm popover styling
- [ ] Shop panel: Seeds / Land / Market tabs
- [ ] `inventoryPanel`, `hud` gold readout, `buttonBar`, `meters` water bar

## Week 5

- [ ] `almanac.html` content and a `js/almanac-main.js` entry — it currently has none (ISS-019)
- [ ] Empty, loading and error states on every panel
- [ ] Visible keyboard focus ring on plots — they are real buttons, so this is styling only
- [ ] Image weight: 40 layers of 1000 px PNGs may be slow. If so, add 512 px copies and change
      only `js/config/assets.js`.

## Notes

- Moving a panel is one line in `css/layout.css`. If a layout change needs more than that, the
  grid is wrong — say so rather than working around it.
- Panel structure and panel content should be two commits. Structure so others can start, then
  content once the state exists.
