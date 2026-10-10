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

## Phase 1 — Page and field · week 2

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-05 | Layout shell: `index.html`, `css/*`, panel placeholders, `main.js` boot. Shipped as part of T-31/T-32 — the shop and settings pages were built on the shell | Kafi | done | 1 | week 2 |
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
| T-11 | Weather panel: `topBar` search, `weatherPanel`, `envMetrics`, `seasonCard`, heat meter, sample fallback badge | Afif | todo | 3 | — |
| T-12 | Classification + effects: `domain/weather.js`, matrix, simulator effects, forced-weather debug dropdown | Afif | todo | 3 | — |
| T-13 | Notifications: `notifications.js`, `toastStack`, forecast projection per planted crop | Afif | todo | 3 | — |

## Phase 4 — Finish · week 5

| ID | Task | Owner | Status | Phase | Updated |
| :--- | :--- | :--- | :--- | ---: | :--- |
| T-14 | Other crops: flip `available: true` as art arrives, no code changes expected | Shabab | todo | 4 | — |
| T-26 | Missing art per `docs/asset-checklist.md` — 2 rice failure sprites, 28 for the other 4 crops, 14 icons, 2 pump frames | Kafi | todo | 4 | — |
| T-15 | Polish: almanac content, empty/loading/error states, keyboard focus, image size review | Kafi | todo | 4 | Page-level loading states done in `feature/loading-tips` (see ISS-043); per-panel empty/error states still open |
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
