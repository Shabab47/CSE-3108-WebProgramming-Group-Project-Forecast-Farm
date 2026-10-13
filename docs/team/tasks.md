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


## Phase 1 — Page and field · week 2

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-05 | Layout shell: `index.html`, `css/*`, panel placeholders, `main.js` boot. Shipped as part of T-31/T-32 — the shop and settings pages were built on the shell | Kafi | done | 1 | week 2 — see T-37, T-38 |
| T-37 | **Sign-in menu UI** — the login screen: sign-in, registration, guest play, password reset | Kafi | done | 1 | week 2 — reported by the team, **not pushed**; see `members/kafi.md` |
| T-38 | **Gameplay scene UI** — the farm screen: the grid, the plots, the panels around it | Kafi | done | 1 | week 2 — reported by the team, **not pushed**; see `members/kafi.md` |
| T-06 | Static field: `utils/iso.js`, `farmView`, `plotTile`, `pumpView`, `css/field.css`, debug sliders, calibrate geometry | Hisham | todo | 1 | — |

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
