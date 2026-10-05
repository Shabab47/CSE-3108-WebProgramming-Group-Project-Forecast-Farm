# Issues

Every bug and problem found, logged **before** it is fixed. A bug fixed without a record leaves
the next person to rediscover it.

Status: `open` → `fixing` → `fixed`, or `wontfix` with a reason.

All entries below were found during the pre-build audit, by reading the plan
against the actual assets and the live Open-Meteo responses. Nobody had written any code yet,
so these are all cheap to fix now and expensive to find later.

---

## Triage

| ID | Title | Severity | Owner | Status | Fix in |
| :--- | :--- | :--- | :--- | :--- | ---: |
| ISS-027 | `localAuth.js` is a second writer to localStorage | **High** | Hisham | open | T-04 |
| ISS-028 | `authApi.js` missing, so login runs on the local provider | **High** | Shabab | open | T-04 |
| ISS-026 | Client-side accounts are not real security | **High** | Hisham | open | — |
| ISS-006 | Dead crops permanently brick a plot | **High** | Hisham | open | T-08 |
| ISS-007 | Pump's transparent canvas eats plot clicks | **High** | Hisham | open | T-06 |
| ISS-008 | Pump is ~36× stronger than rain | **High** | Hisham | open | T-09 |
| ISS-009 | `hourly[0]` is midnight, not the current hour | **High** | Afif | open | T-04 |
| ISS-010 | `check-imports` fails on `utils/dom.js` | **High** | Hisham | open | T-02 |
| ISS-013 | No state field for notification dedupe | **High** | Afif | open | T-13 |
| ISS-015 | Drought's conditional rating has no home | Medium | Afif | open | T-12 |
| ISS-012 | Geocoding omits `results` when empty | Medium | Afif | open | T-04 |
| ISS-011 | Stale sample data breaks the current-hour lookup | Medium | Afif | open | T-04 |
| ISS-001 | All 14 SVG icons are 0 bytes | Medium | Kafi | open | T-15 |
| ISS-002 | `LICENSE` was 0 bytes | Low | Shabab | **fixed** | — |
| ISS-003 | `tileAspect` guess is 3% off | Medium | Hisham | open | T-06 |
| ISS-004 | Diamond clip-path over-hangs the bottom tip | Medium | Hisham | open | T-06 |
| ISS-005 | `tileScale` leaves an uneven rim | Low | Hisham | open | T-06 |
| ISS-014 | Offline catch-up rule is ambiguous | Medium | Hisham | open | T-03 |
| ISS-016 | `ui → services` layering rule contradicts itself | Medium | Hisham | open | T-02 |
| ISS-018 | 1 Hz re-render churn will flicker images | Medium | Hisham | open | T-06 |
| ISS-019 | `almanac.html` has no entry script | Medium | Kafi | open | T-15 |
| ISS-022 | Image preload sits in pure-data config | Low | Hisham | open | T-02 |
| ISS-017 | `config/ui.js` actions cannot be functions | Low | Kafi | open | T-05 |
| ISS-020 | No `.gitignore` | Low | Hisham | open | T-02 |
| ISS-021 | Local `main` was behind `origin/main` | Low | Shabab | **fixed** | — |
| ISS-024 | Active weather event lags by up to ~1 h 15 m | Low | Afif | open | T-12 |
| ISS-023 | Three sound files are 0 bytes | Low | Kafi | open | — |
| ISS-025 | Ownership split is unconfirmed | Low | Shabab | open | T-01 |

---

### ISS-027 `localAuth.js` is a second writer to localStorage
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/services/localAuth.js`
- Problem: The layering rule is that only `js/state/store.js` writes storage, so there is one
  place to look when a save goes wrong. `localAuth.js` is a second writer: it keeps its own
  `forecastFarm.accounts.v1` and `forecastFarm.session.v1` keys outside the store. Two modules
  now own persistence, and nothing enforces which one wins.
- Cause: Login was built before `js/services/authApi.js` existed, and the panel needed a
  provider to run against. See DEC-017 for why a mock was rejected and a contract-compatible
  local provider was used instead.
- Risk: a stale session key that the store does not know about can send a player back to login
  while their farm is still on disk — or worse, silently give two accounts the same save.
- Fix: _pending._ Delete `localAuth.js` and change one import in `js/auth-main.js` when
  `authApi.js` lands (ISS-028). Until then it is a dev-only provider: do not ship it, and do not
  add features that depend on its keys.

### ISS-028 `authApi.js` missing, so login runs on the local provider
- Reported by Hisham · Owner: Shabab · Status: open
- Where: `js/services/authApi.js`
- Problem: The agreed provider is Supabase over plain `fetch()` (DEC-018), but the file does not
  exist. Login currently authenticates against `localAuth.js`, which keeps accounts in
  localStorage with no email confirmation and no real rate limiting. The panel, the boot gate
  and the states are all built against the correct contract, so this is the only missing piece.
- Fix: _pending._ `js/services/authApi.js` implementing `signIn`, `signUp`, `signOut`,
  `currentSession`, returning `{ok:true, session}` or `{ok:false, reason}`. Provider error codes
  go through `js/ui/authErrors.js`, not into render code. Needs the Supabase project URL and anon
  key — the anon key only, no signing secret.

### ISS-026 Client-side accounts are not real security
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/state/accounts.js`, `js/config/auth.js`
- Problem: Accounts and sessions live in `localStorage`. Passwords are PBKDF2-SHA256 hashes
  with a per-account salt, so the raw password is never written — but the hash, the salt and
  the account table are readable by anyone with devtools on that browser profile, and they can
  be edited. A fake session can be written by hand, and a farm can be restored by rewriting
  the save. There is also no recovery: clearing site data destroys the account and the farm
  permanently, and there is nowhere to send a password-reset email.
- Cause: Accounts were pulled ahead of the field (DEC-017) on a project with no backend and
  no runtime dependencies. There was no server to put them on.
- Impact: Fine for a course demo, where each person plays their own farm on their own machine.
  Not fine for a public release, and it must not be described as secure anywhere in the UI or
  the docs.
- Fix: _pending, needs a decision._ Moving to a real backend means hashing and storage leave
  `state/accounts.js` and move behind a service; the UI and `store.init(session)` do not change,
  because neither ever touches storage. Ask the team whether v0.1 ships with accounts at all, or
  with accounts marked explicitly as a local demo mode.

### ISS-006 Dead crops permanently brick a plot
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/domain/farm.js`, `js/ui/plotTile.js`
- Problem: `farm.plant` requires `!plot.dead`. `farm.isReady` also requires `!plot.dead`. So a
  crop that dies can be neither replanted nor harvested, and there is no clear or plough action
  and no fifth click case. The plot is dead for the rest of the save.
- Cause: The plan's click flow covers exactly four plot states — locked, owned+empty, growing,
  ready — and omits `dead`.
- Fix: _pending._ Add `farm.clearPlot(state, plotId)`, free and always allowed on an owned
  dead plot, plus a fifth click case that clears on confirm.

### ISS-007 Pump's transparent canvas eats plot clicks
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/ui/pumpView.js`, `js/config/field.js`
- Problem: `pump.png` is 1000×1000 with art occupying only the middle 279 px. At `pumpScale:
  0.25` the button box is roughly 7× wider than the visible pump, so its transparent area sits
  on top of plots `(1,2)` and `(2,1)`. Computed overlap is about 0.02 stage-widths past each
  plot's horizontal tip. At `z-index: 100` the pump swallows those clicks.
- Cause: The plan solved this for plots (`pointer-events: none` on the `<img>` layers) but not
  for the pump.
- Fix: _pending._ Set `pointer-events: none` on the pump `<img>` and clip the button to its
  content box, or size the button to the 27.9% content bbox.

### ISS-008 Pump is ~36× stronger than rain
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/config/game.js`
- Problem: `WATER.pumpPerSecond` is 0.5, so the pump fills a plot from 0 to 100 in 200 seconds,
  costing about 10 gold across the whole field. Heavy rain adds 50/h and so needs 2 hours to do
  the same job, for free. With water pinned at 100, `wateredThreshold: 40` is always met and
  the drought conditional at `waterLevel < 30` never fires while the pump runs. Most of the
  decisions described in `docs/weather-events.md` stop mattering.
- Cause: Placeholder balance (README assumption 4), but Phase 2 step 9 builds the water meter on
  top of it.
- Fix: _pending._ Decide before T-09. Recommended: `pumpPerSecond: 0.05`, which makes the pump a
  top-up tool and lets forecast-driven watering matter. Needs the team's call, not mine.

### ISS-009 `hourly[0]` is midnight, not the current hour
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/domain/weather.js`
- Problem: A live response fetched at 12:15 returns `current.time = "12:15"` and
  `hourly.time[0] = "00:00"`, with 48 entries for `forecast_days=2`. The plan states
  `classify()` returns "24 entries starting at the current hour" but never says how to find it,
  and `simulator.tick` reads `hourly[0]`. Implemented naively, the simulator treats midnight as
  now: wrong evaporation, wrong rain, wrong health drain for up to 24 hours.
- Cause: The raw API shape was assumed rather than checked.
- Fix: _pending._ `classify()` computes `startIndex` by matching `current.time` against
  `hourly.time`, then slices 24 entries from there. Add a test.

### ISS-010 `check-imports` fails on `utils/dom.js`
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `scripts/check-imports.mjs`, `js/utils/dom.js`
- Problem: The rule "fail if `document.` appears outside `ui/`, `debug/`, `main.js`" will fail
  `js/utils/dom.js`, which is the DOM helper and contains `document.` on nearly every line. The
  check cannot pass as specified.
- Cause: The rule was written without exempting the file that exists to wrap the DOM.
- Fix: _pending._ Whitelist `js/utils/dom.js` explicitly in the script.

### ISS-013 No state field for notification dedupe
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/state/types.js`, `js/state/initialState.js`, `js/domain/notifications.js`
- Problem: The plan says notifications fire "at most once per event window", but the State shape
  in section 7 has no field to remember which windows have fired. Either alerts repeat every
  hour of a six-hour rain, or dedupe lives in module memory and is lost on reload, re-firing
  everything.
- Cause: A cross-cutting requirement with no home in the state contract.
- Fix: _pending._ Add `notified: { [cropId + ':' + eventId]: isoWindowStart }` to the state
  shape, `initialState()`, and the save payload.

### ISS-015 Drought's conditional rating has no home
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/config/cropWeatherMatrix.js`, `js/domain/`
- Problem: The drought row applies only when `waterLevel < 30`, otherwise `ok`. A matrix cell
  holds one rating string and has no access to the plot, so the rule cannot live in the config
  file the plan assigns it to.
- Cause: A per-plot condition was expressed as a static table lookup.
- Fix: _pending._ Export `ratingFor(plot, eventId)` from `domain/`, called by `simulator.tick`
  and by the tests.

### ISS-012 Geocoding omits `results` when empty
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/services/geocodeApi.js`
- Problem: A search for a nonexistent place returns `{"generationtime_ms":0.44}` — the
  `results` key is absent entirely, so `data.results` is `undefined`, not `[]`. Code written as
  `if (!data.results.length)` throws a `TypeError` instead of showing "Place not found".
- Cause: Assumed an empty array rather than an absent key.
- Fix: _pending._ Guard with `if (!Array.isArray(data.results) || data.results.length === 0)`.

### ISS-011 Stale sample data breaks the current-hour lookup
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/services/weatherApi.js`, `data/sample-forecast.json`
- Problem: `data/sample-forecast.json` is a saved response with fixed timestamps. Once its date
  is in the past, the `startIndex` lookup from ISS-009 cannot match "now", so the offline
  fallback either throws or silently shows weather from the day it was captured.
- Cause: Fallback path was not traced through the same parser as the live path.
- Fix: _pending._ If the sample's date is not today in its timezone, use index 0, set
  `weather.source = 'sample'`, and show the offline badge.

### ISS-001 All 14 SVG icons are 0 bytes
- Reported by Hisham · Owner: Kafi · Status: open
- Where: `assets/icons/weather/*.svg` (9), `assets/icons/crops/*.svg` (5)
- Problem: Every file is empty and committed that way, so `weatherIcon()` and `cropIcon()`
  resolve to files that cannot render. The forecast strip and crop picker show broken images.
- Cause: Placeholder files committed before the art existed.
- Fix: _open by decision._ The team chose to code the paths as specified and accept
  broken images until art lands — text labels carry the meaning meanwhile. Do not add a
  fallback layer. Revisit at T-15.

### ISS-003 `tileAspect` guess is 3% off
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/config/field.js`
- Problem: The plan sets `tileAspect: 0.553` "measured from ground png (1000 x 553)". Measured
  from the alpha bounding box, `ground_unwatered.png` content is 991×533 → **0.538**. The 3%
  error compounds across three row steps and pulls the bottom row out of alignment with the top.
- Cause: Every PNG is 1000×1000, not 1000×553; the figure described the diamond inside the
  canvas, not the file.
- Fix: _pending._ Set `tileAspect: 0.538`. Calibration with the debug sliders may refine it.

### ISS-004 Diamond clip-path over-hangs the bottom tip
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/utils/iso.js`
- Problem: `diamondClipPath()` in the plan is `polygon(50% 22%, 100% 50%, 50% 78%, 0 50%)`.
  The real diamond runs y 22.4%–75.6%, so the click target extends 2.4% past the visible bottom
  tip.
- Cause: Rounded numbers in the plan.
- Fix: _pending._ Use `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`.

### ISS-005 `tileScale` leaves an uneven rim
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/config/field.js`
- Problem: `tileScale: 0.22` puts the 4×4 cluster at 0.926 × 0.499 of the stage inside a
  `base.png` slab of 0.991 × 0.595, leaving a 0.033 rim at the sides and 0.048 top and bottom.
  The slab looks visibly thicker at the front and back than at the left and right.
- Cause: `base.png`'s diamond is h/w 0.600 while a 4×4 cluster of 0.538-aspect tiles is 0.538,
  so the two cannot nest perfectly.
- Fix: _pending._ Start calibration at `tileScale: 0.204`, which solves
  `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` for an even `r ≈ 0.067` all round.

### ISS-014 Offline catch-up rule is ambiguous
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/domain/simulator.js`
- Problem: The plan says "`dt = now - lastTickAt` (cap at 1 h per tick; offline catch-up applies
  growth only, not weather damage)". As written, every page reload still applies one hour of
  weather damage, because the cap is 1 h rather than 0. Reloading a tab repeatedly would slowly
  kill crops that were never actually exposed.
- Cause: Two rules stated in one clause without a threshold to choose between them.
- Fix: _pending._ Make it explicit: `dt > 60_000` → apply growth only, skip water and health,
  set `lastTickAt = now`. Add a threshold constant.

### ISS-016 `ui → services` layering rule contradicts itself
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `docs/architecture.md`, `scripts/check-imports.mjs`
- Problem: The layering table lists `services` as an allowed import for `ui`, then immediately
  restricts it to "only via `main.js` wiring or store actions". As written, both reading it
  directly and not reading it directly appear compliant.
- Cause: Two intentions compressed into one table cell.
- Fix: _pending._ State it as: `main.js` is the only module that imports `services/*`; UI
  receives callbacks through `mountX(root, actions)`. Enforce in the check script.

### ISS-018 1 Hz re-render churn will flicker images
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/ui/farmView.js`, `js/ui/plotTile.js`
- Problem: The simulator ticks every second and `store.apply` notifies subscribers, so each
  panel re-renders once per second. If `farmView` rebuilds its subtree, that is roughly 35
  `<img>` elements created and discarded every second — image flicker and needless layout
  work, on the exact criterion Phase 1 is graded against.
- Cause: "Re-renders only its own part" was read as rebuild-per-notification.
- Fix: _pending._ Create plot DOM once per plot, then update only changed attributes (`src`,
  `class`, `title`, inline width/height). Swap `src` only when the value actually changes.

### ISS-019 `almanac.html` has no entry script
- Reported by Hisham · Owner: Kafi · Status: open
- Where: `almanac.html`, `js/ui/almanac.js`, `js/main.js`
- Problem: `almanac.html` needs its own entry point. `main.js` boots the entire game, so loading
  it on the almanac page would start the simulator and the weather fetch for a page that only
  wants reference text.
- Cause: The file tree lists `ui/almanac.js` but no entry script.
- Fix: _pending._ Add `js/almanac-main.js`, and have `main.js` no-op when its root element is
  absent.

### ISS-022 Image preload sits in pure-data config
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `js/config/assets.js`, `js/main.js`
- Problem: Boot step 2 preloads images, and the plan puts that responsibility in
  `config/assets.js`, which is specified as pure data importing nothing. `new Image()` is a
  side effect in a config file.
- Cause: Ownership of boot wiring was not assigned.
- Fix: _pending._ `config/assets.js` exports paths only; the preload loop lives in `main.js`.

### ISS-017 `config/ui.js` actions cannot be functions
- Reported by Hisham · Owner: Kafi · Status: open
- Where: `js/config/ui.js`
- Problem: `TOP_BUTTONS` and `SPARE_BUTTONS` are described as rows of `{id, label, icon, action}`
  where `action` reads like a handler. Config is specified as pure data, so a function here
  breaks the rule and makes the file untestable.
- Cause: A data shape and a wiring shape were described together.
- Fix: _pending._ Use a string action id and resolve it to a handler in the UI layer.

### ISS-020 No `.gitignore`
- Reported by Hisham · Owner: Hisham · Status: open
- Where: repo root
- Problem: The repo has no `.gitignore`, so editor cruft, `node_modules/` from any future local
  install, and OS junk can be committed by accident.
- Fix: _pending._ Add a minimal `.gitignore` in T-02.

### ISS-021 Local `main` was behind `origin/main`
- Reported by Hisham · Owner: Shabab · Status: **fixed**
- Where: git
- Problem: Local `main` was 1 commit behind `origin/main`, and `origin/jim` was 3 behind `main`.
  Branching from a stale `main` produces a confusing merge later.
- Cause: Local checkout had not been pulled after a push.
- Fix: `git pull --ff-only origin main`, fast-forwarded `7e65a24..0cec268`.

### ISS-024 Active weather event lags by up to ~1 h 15 m
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/domain/simulator.js`
- Problem: `simulator.tick` reads `weather.hourly[0]`, but weather is refetched every 15 minutes
  while `hourly[0]` is the hour the response was built for. The active event can lag real
  conditions by about 1 h 15 m, and because weather is real-data only the player cannot correct
  it.
- Cause: Accepted simplification, not an oversight.
- Fix: _wontfix for MVP._ Documented in `docs/architecture.md` under Known simplifications and
  in DEC-013. Revisit only if it feels wrong in play.

### ISS-002 `LICENSE` was 0 bytes
- Reported by Hisham · Owner: Shabab · Status: **fixed**
- Where: `LICENSE`
- Problem: The file was empty and committed that way. An empty licence file is worse than no
  file, since it looks deliberate.
- Cause: Placeholder committed before the licence was chosen.
- Fix: Merged upstream in `0cec268` "Add LICENSE file" — MIT License, © 2026 Tawfik Rahman
  Shabab. Pulled and referenced from `README.md`.

### ISS-023 Three sound files are 0 bytes
- Reported by Hisham · Owner: Kafi · Status: open
- Where: `assets/sounds/notification.mp3`, `rain.mp3`, `storm.mp3`
- Problem: All three are 0 bytes. Sounds are explicitly out of scope, so nothing references
  them yet.
- Fix: _open._ Leave them alone until sounds are scheduled. Do not reference them from code.

### ISS-025 Ownership split is unconfirmed
- Reported by Hisham · Owner: Shabab · Status: open
- Where: `docs/team/ownership.md`
- Problem: The folder-to-owner split is the plan author's suggestion and nobody has agreed it.
  Two people editing the same file is the main cause of merge conflicts, so it is worth an
  explicit yes.
- Fix: _pending._ Confirm or amend at the first team meeting, then delete this entry.
