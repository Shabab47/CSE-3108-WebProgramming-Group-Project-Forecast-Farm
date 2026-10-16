# Task Board

Seeded from `docs/game-design/implementation-plan.md` section 13. Status is one of
`todo`, `doing`, `blocked`, `done`.

Move a task to `doing` when you pick it up and to `done` when its **Done when** is met. Update
the `Updated` column on every status change so the board never lies about freshness.

Weeks are in `goals.md`. Week 1 was planning; T-02 onward belong to weeks 2–5.

---

## Week 1 — Planning (complete)

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-01 | Docs skeleton: `docs/team/*`, `architecture.md`, `reference/`, plan copy, 4 game-design docs | Shabab | done | prep | — |
| T-17 | Project structure and data flow design | Hisham | done | prep | — |
| T-18 | Documentation written and committed — 16 files | Hisham | done | prep | — |
| T-19 | Rice artwork, 5 growth stages | Kafi | done | prep | — |
| T-20 | Farm ground artwork, watered and unwatered | Kafi | done | prep | — |
| T-21 | One folder per crop under `assets/images/crops/` | Kafi | done | prep | — |
| T-22 | Base APIs: weather, time, place lookup | Afif | done | prep | — |
| T-23 | Implementation plan, crop and season design, team workflow | Shabab | done | prep | — |
| T-24 | Art direction: style, perspective, palette, naming rules for all sprites and icons | Hisham | done | prep | — |
| T-25 | Asset checklist created — every asset needed, with status | Kafi | done | prep | — |

## Phase 0 — Foundation · week 2

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-02 | Tooling: `package.json`, `scripts/check-imports.mjs`, `utils/log.js`, first passing test | Hisham | done | 0 | — |
| T-03 | Config + state: all `config/*`, `state/types.js`, `initialState.js`, `store.js` | Hisham | doing | 0 | — |
| T-04 | Services cleanup: rewrite `weatherApi`, `timeApi`; add `geocodeApi`; **add reverse geocoding**; save sample. ~~delete `map.js`~~ done | Afif | todo | 0 | — |
| T-27 | **Login, out of plan order (DEC-017):** `loginPanel`, `loginFields`, `authErrors`, `authRules`, boot step 0, `state.session`, guest play | Hisham | done | 0 | week 2 |
| T-28 | **`services/authApi.js` — Supabase over REST, the real provider.** Written and tested; needs the project URL and anon key | Shabab | done | 0 | week 2 |
| T-29 | **Create the Supabase project** and set the redirect URL, then flip `USE_LOCAL_PROVIDER`. Done: project created, credentials committed, Redirect URLs and Site URL set, flag flipped | Shabab | done | 0 | week 2 |
| T-30 | **Export and import a farm:** `state/transfer.js` (format, checksum, rebase), `utils/checksum.js`, `ui/savePanel.js`, `store.adoptState` | Hisham | done | 0 | week 2 |
| T-31 | **Seed shop as its own page:** `shop.html`, `js/shop-main.js`, `ui/shopLauncher.js`, `ui/shopView.js`, `css/shop.css`, `domain/shop.js`. DEC-024's predecessor — ISS-036, the plan wanted a modal | Shabab | done | 1 | week 2 |
| T-32 | **Settings page:** `settings.html`, `js/settings-main.js`, `ui/settingsLauncher.js`, `ui/settingsView.js`, `ui/dangerAction.js`, `ui/accountCard.js`, `css/settings.css`. Erase-progress and delete-account | Shabab | done | 1 | week 2 |
| T-33 | **Username sign-in:** `public.usernames` (002), `email_for_username()`, `normaliseUsername`, `usernameLooksValid`, the `usernames` field on sign-up | Shabab | done | 0 | week 2 |
| T-34 | **Account deletion:** `delete_my_account(password)` (005), `services/accountApi.js`, the password gate in `dangerAction.js`. DEC-024 | Shabab | done | 0 | week 2 |

| T-35 | **Server-side farm storage:** `001_farm_saves.sql` (RLS "own row only"), `services/saveApi.js`, `remoteSave.js`, the injected adapter in `store.init` | Hisham | done | 0 | week 2 |
| T-36 | **Asset registry:** `js/config/assets.js` — one entry per file plus path builders, enforced against the filesystem by `tests/assets.test.js` | Hisham | done | 0 | week 2 |
| T-39 | **Connection handling and honest autosave.** `gotrue` request deadline; refresh token preserved unless the server rejects it; `resolveSession`/`restoreSession` answer a reason; `js/connection.js`, `ui/blockedScreen.js`, `ui/connectionBanner.js`; `sync` state and a queued retry; paused-weather marker. DEC-030, closes ISS-048/049/050 | Hisham | done | 0 | week 3 |

| T-35 | **Opening menu + auth redesign:** `menuPanel`, `signBoard`, `authViews`, `css/fonts.css`, the `login.html` scene and top bar, one view per form instead of a tab pair. No auth behaviour change | Kafi | done | 0 | week 2 |
| T-36 | **Login CSS split by component:** `css/auth.css` into `auth` / `menu` / `sign`, `--art-*` retired, literal values throughout. DEC-029. Value-neutral, verified by rule diff | Jim | done | 0 | 2026-10-11 |
| T-37 | **Game page CSS split by component:** `.topbar*` (now `.navbar*`) out of `layout.css` into `navbar.css`, `css/farm.css` into `scene.css` with the duplicated `.field-stage` merged. Value-neutral, verified by rule diff | Jim | done | 1 | 2026-10-11 |
| T-38 | **Spacing and radii hardcoded per file:** 52 references converted across 7 files, seven `--space-*` and three `--radius-*` retired. `components.css` deliberately left on a marked stopgap — 41 refs remain | Jim | doing | 1 | 2026-10-11 |
| T-39 | **`topbar` → `navbar`:** 6 class names, `topBar.js` → `navbar.js`, `mountTopBar` → `mountNavbar`. `#top-bar` and `.app__top` deliberately unchanged. Convention: every `js/ui/` module is named for the class root it renders | Jim | done | 1 | 2026-10-11 |
| T-40 | **Navbar owns its height, search slot removed:** `height: 60px` + `padding: 0 8px` so the bar no longer depends on `.card`'s padding; the dead `disabled` search input deleted, since the real one lives in the weather panel. Three grid columns became two — `justify-self: end` keeps the account right-aligned. Required moving `navbar.css` after `components.css` in `index.html`: at equal specificity `.card` was winning, so `height:` did nothing | Jim | done | 1 | 2026-10-11 |
| T-41 | **Save data card reachable:** import/export wired into `settingsView.js` but rendering `[object Object]` — `mountSavePanel` returns `{unmount}`, not a node, and the return value was passed to `el()` as a child. Host built, mounted into, then embedded; dead `canExport` truthiness gate removed. ISS-051 | Jim | done | 1 | 2026-10-12 |
| T-42 | **`--font-ui` works on the settings page:** `settings.html` never loaded `css/fonts.css`, so the three rules asking for it fell through to `--font-sans` with no error. One `<link>` added, after `components.css` to match `login.html`. `shop.html` still has the gap | Jim | done | 1 | 2026-10-12 |
| T-43 | **Guest no longer sees "null"; settings page gets the game font:** `appendAll()` added to `utils/dom.js` after native `append` stringified a `null` account card; `fakeDom.append` now mirrors the browser instead of skipping. `.settings-page` carries `--font-ui`, headings get `--font-display`. ISS-052 | Jim | done | 1 | 2026-10-12 |
| T-44 | **Navbar restyled to the design:** flat white bar, green uppercase wordmark, circular icon tiles for sound / settings / profile. Account badge removed — the profile tile links to the new page instead | Jim | done | 1 | 2026-10-13 |
| T-45 | **Save panel and account card leave the game page:** save import/export moved from `#right-rail` to a card on `settings.html` (wired through `settings-main.js`, Shabab's file — wiring only); the account card moved to a new `profile.html`, which also took over sign-out. `accountCard.js` renamed off `settings-accounts*` to `account-list*` | Jim | done | 1 | 2026-10-13 |
| T-46 | **Scene fits one screen:** `.app` is `height: 100dvh; overflow: hidden` and `.field-stage` is sized off **height** (`height: 100%; width: auto`) rather than width, which is the constraint that actually binds on 16:9. Below 900px it reverts to stacked and scrollable | Jim | done | 1 | 2026-10-13 |
| T-47 | **ISS-046 closed:** `.location-bar` had no rules at all, so the input was a full-width block and both buttons wrapped below it — ~130px for a control that fits in 38px. Now one flex row. Superseded by T-48, which moves it onto the board | Jim | done | 1 | 2026-10-13 |
| T-48 | **Forecast panel is a wooden board:** `css/weather.css` rewritten — frame, posts, paper, pin and folded corner all in CSS, no artwork. One large note for now, three meter pills, six small notes for the hours. `flex: 0 0 33.333%` of `.app__centre` with `min-height: 306px`, field takes the rest. `locationBar.js` rebuilt: the current-location button became the pin inside the search pill. `icon.js` gained droplet / wind / umbrella / map-pin / search | Jim | done | 1 | 2026-10-13 |
| T-49 | **ISS-009 relogged as stale, ISS-011 revised:** `hourly.time[0]` is the *current* hour, not midnight, because `weatherApi.js` sends `forecast_hours=24` rather than the `forecast_days=2` the issue was reported against. Verified across four timezones. The planned fix would have made it worse — `current.time` carries minutes past the hour and never matches an hourly entry, so seeking "first hour at or after" skips the hour in progress. ISS-011's failure mode died with the lookup; rewritten against what is actually still wrong | Jim | done | 0 | 2026-10-13 |
| T-50 | **The board's proportions tuned by eye, and the meter bars removed:** the sizes are plain px literals with one short-window block — `@media (max-height: 960px) and (min-width: 901px)`, retuned from 820px and scoped so the stacked phone layout keeps full sizes. `.board` width `50%` → `clamp(420px, 38%, 520px)`. **ISS-056** the note was landing in an implicit grid row, so the board was a row too tall and the meters too short — both children now pinned to `grid-row: 1`. **ISS-057** the hour notes clipped their own temperature — the strip was 52px, now 72px. **ISS-058** the freshness line was absolutely positioned over the hour notes — now in the flow, hidden when empty. **ISS-055** closed `wontfix`: no meter has a fill bar, so the track and fill rules are deleted and `meter()` no longer builds them. Two rejected approaches recorded in DEC-031 — a 39-property knob block and inline `min(Npx, N*vh)` caps | Jim | doing | 1 | 2026-10-15 |
| T-51 | **The board's freshness label moved into the note, and three layout bugs with it, all from one screenshot:** `.board-updated` printed `Updated 6:45 PM` from `weather.current.time` while the note's foot row printed `FRI 6:45 PM` from the **same field** — the board stated one instant twice. The label is now a right-aligned `.note-status` span inside the big note and renders only while the forecast is paused, so `#forecast-card` takes two children again; `renderUpdated()` became `statusLine()` and the now-dead `formatClock()` went with it. The wood amber `#ffd45e` was not carried in — 1.2:1 on cream paper — replaced by `#7a4f0a` at 5.8:1 / 5.4:1 (DEC-032). **ISS-061** the wind label rendered as "W…": the label track was `minmax(0, 1fr)`, whose explicit `0` minimum allows shrinking past `min-content`, and the board sat at its 420px floor with ~111px of meters column. Fixed by a bare `1fr` label track, the compass moving from the value into the pill's `title`, and the floor rising 420px → 450px. **ISS-060** the last pill's `box-shadow` was clipped flat by `.board-body`'s `overflow: hidden` — `.board-meters` gained `padding-bottom: 3px`, and `#forecast-card`'s gap went 6px → 10px. **ISS-059** the short-window block redrew `::after` as a flat 4px bar while `::before` stayed a post, so the right peg looked missing — both overrides deleted | Jim | doing | 1 | 2026-10-16 |
| T-52 | **The place name moved into the note's empty right-hand side:** the note's widest row is the temperature, and it stopped ~84px short of the paper's edge at the 450px board floor (~127px at the 520px ceiling) — dead space at every window size, while the place name ran along the top on one ellipsised line. `.note-current` is now a grid: the condition spans both columns, the temperature takes `minmax(0, auto)`, the place takes `minmax(0, 1fr)` and wraps instead of ellipsising. The condition kept a full-width row because "Freezing drizzle" is ~168px at 15px with 0.1em letter-spacing, wider than a single column at the floor. Days and times keep their own row and the pin stays centred (DEC-033). **ISS-062** the layout above. **ISS-063** `locationLine()` answered `''` for a location with neither name nor country, which rendered as an invisible empty span — the fallback the old panel had; it now answers `'Unknown location'` and no longer throws on a null location. `.note-status` moved from `align-self: flex-end` to `justify-self: end`, and `.note-idle`'s dead `flex: 1` became an explicit span of every cell. `tests/weatherPanel.test.js` added — the panel had no test at all. **ISS-064 found and logged, not fixed:** the big temperature prints its unit twice ("24°°C") | Jim | doing | 1 | 2026-10-16 |
| T-53 | **The field was never centred on the base, and the pump was in a corner:** `renderPlot` computed `xPct = 50 + (col - row) * tileScale * 50` and `yPct = 50 + (col + row) * tileScale * 25`. The x axis was centred by luck — `col - row` averages 0 over a square grid — while `col + row` averages `n - 1`, so the cluster sat `3 × 0.204 × 25` = **15.3% of the stage** low and the back row floated on bare wood. `field.js` had `gap`, `crossGap`, `originX`, `originY` and `pumpScale` declared and read by nothing, and `utils/iso.js` — the module `architecture.md` names as their home — did not exist. It does now: private `shift()`, exported `plotToScreen()` and `pumpBox()`, importing only `config/field.js`. The pump is placed by `pumpBox()` on the same formula at `u = v = 0` instead of `bottom: 4%; left: 4%`, so it needs no separate offset. `originX/Y` set to `base.png`'s measured diamond centre (0.503, 0.499) — its row-width profile peaks at mid-height, so the art is flat and its centre **is** the geometric centre. **ISS-065** the off-centre cluster, **ISS-066** the corner pump, **ISS-067** the five dead constants. **ISS-068**: `architecture.md`'s own `img top = centerY - tileScale/2` understated the tile's half-height and made the documented cluster 2.727 tile-widths tall, not the 2.265 the same section solves `tileScale` from. **ISS-005 closed** — no `tileScale` gives an even rim on an uncentred cluster; the rim is now 0.066 on all four sides. **ISS-003 relogged stale** — re-measured 991 × 535 against the documented 991 × 533, which is alpha-threshold spread, so `tileAspect` is deliberately unmoved. `tests/iso.test.js` added, 12 cases, including the mean-of-both-axes assertion that would have caught ISS-065. **Corrected by T-54:** the `originY: 0.499` and flat-diamond reading of `base.png` above are both wrong — the art is an extruded slab and its top face centres at `0.462` — so the "even 0.066 rim" this row claims was measured against the slab's bounding box, skirt included. An even rim turns out not to exist at all (ISS-069, ISS-071) | Jim | done | 1 | 2026-10-16 |
| T-54 | **The base is an extruded slab, the rim it was solved for does not exist, and every plot was drawing at half the size it was placed for:** three defects, all found by measuring the art instead of trusting the derived constants, and only the first was ever reported. (1) `base.png` is not a flat diamond — its row widths plateau over y `462..533`, which is a 72px vertical skirt, and the **top face** the plots stand on is 992 × 520 centred at y `0.462`. `originY` was `0.499`, the bounding-box centre, so the field sat 3.7% of the frame low with the front row hanging on the bevel. The trap: for an extruded slab the plateau centre lands at the bounding-box centre too, so "widest rows at mid-height, therefore flat" was a wrong inference from a correct observation, and the tell was a 72-row plateau where a flat diamond gives 1. (2) The same 0.595 was in the documented rim solve, folding the skirt into the second equation; against the real face `4.21t + 2r = 0.992` and `2.265t + 2r = 0.520` give `r = -0.015` — an even rim is **impossible**, the cluster being 2.7% too tall for the slab because `ground_*.png` is h/w 0.538 and the top face is 0.524. (3, and the big one) `.plot`'s box was `tileScale × tileScale*tileAspect` tall while `ground_*.png` is a **square** canvas, so `object-fit: contain` fitted the image to the box's *height* and drew each diamond at 0.109 of the frame against a geometry built for 0.203. Sixteen plots spaced for tiles twice their size — that is the "it doesn't fit properly" the field was reported for, and T-53 corrected where the plots *were*, not how big they were. Fixes: `.plot` is a square box (`padding-top: tileScale`); the stage is `aspect-ratio: 1000/596` and the base `object-fit: cover`, which crops the canvas padding without editing a file and lets the same height buy a **68% wider base** (base diamond ≈505px → ≈848px at 1440×900, plot diamonds ≈55px →
≈195px); new `.field-stage__mount` holds the base's shape so a width-clamped stage cannot desync plots from base; `iso.js` gains `frameY()` because `top` resolves against the frame's *height* while `width` and `padding-top` are percentages of its *width* — skipping the conversion shears the field 68% vertically. `tileScale: 0.2296`, a chosen fit and recorded as one (DEC-034). Locks lose the `rgba(0,0,0,0.25)` scrim so the ground shows through as in the reference, and the padlock sizes itself off the plot with `cqi`. **ISS-069**, **ISS-070**, **ISS-071**; **ISS-005 closed** properly this time and its T-53 closure note corrected; **ISS-072 opened** — `.plot__crop` is still calibrated against the old box and is deliberately not fixed blind. `tests/iso.test.js` 12 → 15 cases, adding the CSS/JS aspect-ratio agreement and the negative-rim arithmetic. `originX` left at the documented 0.503. **Not verified on screen:** this environment has no browser, so everything here is arithmetic and tests, and the row stays `doing` until someone has looked at the field | Jim | **done** — verified on screen 2026-10-16; the field sits on the slab as designed |
| T-55 | **Two thirds of every tile answered as a different plot, and the "Buy" caption was clipped by the tile in front:** one defect nobody had written an issue for, plus the fix, plus a consequence worth an issue of its own. The plot was a `<div>` whose hit box was the square PNG canvas. The box is 46% empty above and below the art, and a neighbour's box overlaps it by half a box vertically, so hit testing it made 66.2% of each tile's visible surface answer as one of the plots in front — which win on `z-index`. Measured before it was fixed rather than described: 60×60 samples per diamond against all sixteen plot boxes, 66.2% before the clip and **0.0%** after, which is exact rather than approximate because `gap` leaves the diamonds genuinely disjoint. Fixes: each plot is a `<button>` now, which DEC-010 had always said and the code had never done; the button's box is `pointer-events: none` and the property inherits, so the square box and every layer inside it are inert; a new empty `.plot__hit` layer turns it back on for the diamond only, clipped by `DIAMOND_CLIP` in `css/scene.css`. That is also why the focus ring and the selection ring survive — `clip-path` clips an element's `outline` as well, and both rings sit outside the diamond by construction, so the clip could not go on the button (ISS-074). The "Buy" caption under each padlock is deleted: it sat in the half of the diamond the plot in front paints over, so it read "BU.." or "..UY" depending on the row, and the padlock alone says the same thing. `.plot__lock-icon` gains `line-height: 1` — at the default ~1.3em the emoji's line box is taller than the glyph, so the padlock rode high in the tile. **ISS-004 closed**, with one deviation from the plan: the clip landed in the stylesheet as `.plot__hit` rather than as `iso.js`'s `diamondClipPath()`, because it is the same for all sixteen plots and never moves. `tests/iso.test.js` 15 → 16 cases — the `DIAMOND_CLIP` ↔ stylesheet agreement, and the diamond's measured centre at **49%**, not 50% (`ground_unwatered.png`'s bounding box centres at (0.503, 0.490)); `tests/farmView.test.js` added, 6 cases, for the structure the geometry tests cannot see. **DEC-035**: the shop and a future inventory page keep their own headers, and the navbar stays the game page's. **Not verified on screen:** hover still needs eyes, so the row stays `doing` | Jim | doing | 1 | 2026-10-16 |
## Phase 1 — Page and field · week 2

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-05 | Layout shell: `index.html`, `css/*`, panel placeholders, `main.js` boot. Shipped as part of T-31/T-32 — the shop and settings pages were built on the shell | Kafi | done | 1 | week 2 — see T-37, T-38 |
| T-37 | **Sign-in menu UI** — the login screen: sign-in, registration, guest play, password reset | Kafi | done | 1 | week 2 — reported by the team, **not pushed**; see `members/kafi.md` |
| T-38 | **Gameplay scene UI** — the farm screen: the grid, the plots, the panels around it | Kafi | done | 1 | week 2 — reported by the team, **not pushed**; see `members/kafi.md` |
| T-06 | Static field: `utils/iso.js`, `farmView`, `plotTile`, `pumpView`, `css/field.css`, debug sliders, calibrate geometry | Hisham | todo | 1 | T-53 landed `utils/iso.js` (`plotToScreen`, `pumpBox`) and the pump placement. Still open: `plotTile.js`, `pumpView`, `css/field.css`, the `?debug=1` sliders and their write-back into `field.js` |

## Phase 2 — Economy core · weeks 3 and 4

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-07 | Wallet, plots, buying: locked plot price tags, confirm popover, `hud` gold | Hisham | todo | 2 | — |
| T-08 | Inventory, shop, planting, growth: Seeds tab, `inventoryPanel`, `cropPicker`, stage from `plantedAt`, autosave | Hisham | todo | 2 | — |
| T-09 | Pump and water: toggle, water rise, ground sprite swap, gold drain, auto-off at 0, `meters` | Hisham | todo | 2 | — |
| T-10 | Market: sell tab, quality-based gold | Hisham | todo | 2 | — |

## Phase 3 — Weather · weeks 4 and 5

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |

| T-11 | Weather panel: `navbar` search, `weatherPanel`, `envMetrics`, `seasonCard`, heat meter, sample fallback badge | Afif | doing | 3 | week 2 — landed: `weatherApi`, `geocodeApi`, `config/api.js`, `domain/weather.js`, `weatherPanel`, `weatherGlyph`, `locationBar`, `seasonCard`. Still open: `envMetrics`, heat meter, sample fallback badge. **Note:** `weatherPanel` and `locationBar` were redesigned into the wooden board by Jim (T-48). The mount contract is unchanged — only the markup and the styles |

| T-12 | Classification + effects: `domain/weather.js`, matrix, simulator effects, forced-weather debug dropdown | Afif | todo | 3 | — |
| T-13 | Notifications: `notifications.js`, `toastStack`, forecast projection per planted crop | Afif | todo | 3 | — |

## Phase 4 — Finish · week 5

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-14 | Other crops: flip `available: true` as art arrives, no code changes expected | Shabab | todo | 4 | — |
| T-26 | Missing art per `docs/asset-checklist.md` — 2 rice failure sprites, 28 for the other 4 crops, 14 icons, 2 pump frames | Kafi | todo | 4 | — |
| T-15 | Polish: almanac content, empty/loading/error states, keyboard focus, image size review | Kafi | todo | 4 | Page-level loading states done (ISS-043); per-panel empty/error states still open |
| T-16 | Handover: `architecture.md`, `tasks.md`, final `progress-log` entry, tag `v0.1` | Shabab | todo | 4 | — |

---

## Blockers carried into Phase 0

These are logged in `issues.md` and must be fixed in the phase shown. They are listed here so
nobody discovers them mid-build.

| Issue | Blocks | Fix in |
| :--- | :--- | ---: |
| ISS-032 no server for signed export; the save round trip is unverified | T-30 | 0 |
| ISS-027 `localAuth.js` is a second storage writer, now guest-only | T-29 | 0 |
| ISS-010 `check-imports` fails on `utils/dom.js` | T-02 | 0 |
| ISS-009 current-hour index not specified | T-04, T-12 | 0 |
| ISS-011 stale sample timestamps | T-04, T-11 | 0 |
| ISS-012 geocode `results` key absent when empty | T-04, T-11 | 0 |
| ISS-006 dead crops brick a plot | T-08 | 2 |
| ISS-007 pump transparent canvas eats clicks | T-06 | 1 |
| ISS-008 pump 36× stronger than rain | T-09 | 2 |
| ISS-013 no state field for alert dedupe | T-13 | 3 |
| ISS-015 drought conditional has no home | T-12 | 3 |
