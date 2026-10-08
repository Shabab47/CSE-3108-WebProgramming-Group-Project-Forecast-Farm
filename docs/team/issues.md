# Issues

Every bug and problem found, logged **before** it is fixed. A bug fixed without a record leaves
the next person to rediscover it.

Status: `open` → `fixing` → `fixed`, or `wontfix` with a reason.

All entries below were found during the pre-build audit, by reading the plan
against the actual assets and the live Open-Meteo responses. Nobody had written any code yet,
so these are all cheap to fix now and expensive to find later.

**An entry is a record of what was true when it was written.** A `fixed` entry keeps the
numbers it was written with — "56 tests" was accurate then and is not a claim about today.
Check the entry's own date, and `git log` for that file, before acting on one. For the
current state of the code use `npm test` and [`docs/setup.md`](../setup.md).

---

## Triage

| ID | Title | Severity | Owner | Status | Fix in |
| :--- | :--- | :--- | :--- | :--- | ---: |
| ISS-029 | `npm test` cannot run — `node --test tests/` is invalid on Node 24 | **High** | Hisham | **fixed** | T-02 |
| ISS-033 | Only the login page honoured the provider switch | **High** | Shabab | **fixed** | T-29 |
| ISS-034 | `isSupabaseConfigured()` answered about other values than were sent | Medium | Shabab | **fixed** | T-29 |
| ISS-035 | Invalid-email text from GoTrue fell through to an unmapped reason | Medium | Hisham | **fixed** | T-04 |
| ISS-027 | `localAuth.js` is a second writer to localStorage | **High** | Hisham | open | T-04 |
| ISS-028 | `authApi.js` needs credentials to reach Supabase | **High** | Shabab | **fixed** | T-29 |
| ISS-031 | Password reset needs a redirect URL configured in Supabase | Medium | Shabab | **fixed** | T-29 |
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
| ISS-030 | `decisions.md` is not valid UTF-8 | Medium | Hisham | **fixed** | — |
| ISS-019 | `almanac.html` has no entry script | Medium | Kafi | open | T-15 |
| ISS-022 | Image preload sits in pure-data config | Low | Hisham | open | T-02 |
| ISS-017 | `config/ui.js` actions cannot be functions | Low | Kafi | open | T-05 |
| ISS-020 | No `.gitignore` | Low | Hisham | open | T-02 |
| ISS-021 | Local `main` was behind `origin/main` | Low | Shabab | **fixed** | — |
| ISS-024 | Active weather event lags by up to ~1 h 15 m | Low | Afif | open | T-12 |
| ISS-023 | Three sound files are 0 bytes | Low | Kafi | open | — |
| ISS-025 | Ownership split is unconfirmed | Low | Shabab | open | T-01 |
| ISS-032 | No Supabase project yet, so no real accounts or server-side signing | **High** | Shabab | partly fixed | T-29 |

---

### ISS-029 `npm test` cannot run — `node --test tests/` is invalid on Node 24
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `package.json`, `scripts/`
- Problem: `npm test` runs `node --test tests/`, which exits non-zero on Node 24 with
  `Error: Cannot find module '<repo>/tests'`. It tries to resolve the directory as a module
  entrypoint instead of collecting test files from it. This is the whole test suite: 56 tests
  across 5 files, all of which pass, are unreachable by the documented command.
- Cause: Node tightened how `--test` treats bare positional paths. A directory argument is no
  longer walked as a test root; it is treated as a module specifier.
- Risk: **this breaks the rule that gates every commit.** AGENTS.md §3 requires `npm run check`
  and `npm test` to pass before committing, so either commits are being made against a red gate
  or people have stopped running it. A test suite nobody can invoke is not a safety net.
- Fix: **done.** Changed the script to `node --test "tests/**/*.test.js"`. Quoting matters — the
  quotes stop the shell expanding the glob before Node sees it. Verified: `npm test` now collects
  and passes all 56 tests, and `npm run check` is unchanged.

### ISS-030 `decisions.md` is not valid UTF-8
- Reported by Hisham · Owner: Hisham · Status: open
- Where: `docs/team/decisions.md`
- Problem: The file fails a strict UTF-8 decode. Three em-dashes were written as the single byte
  `0x97`, which is the Windows-1252 em-dash, instead of the UTF-8 sequence `E2 80 94`. All three
  are in the new auth records: DEC-018 ("no secret in the client, ever _ the export signing
  secret"), DEC-019 ("whether an email has an account _ wrong password") and ("email not
  confirmed _ returns the same sentence"). The 40 other non-ASCII bytes in the file are correct,
  including every pre-existing em-dash and the `×` in ISS-008.
- Cause: a Windows editor saved the three characters in the local code page instead of UTF-8.
- Risk: GitHub renders the three characters as `�`. More seriously, the next person to open the
  file in an editor that decides the encoding is wrong may re-save the whole document and rewrite
  every other character. That is how `docs/team/README.md` and `members/shabab.md` were
  corrupted before — 82 lines where `t` became `h`, recorded in the week 1 progress-log entry.
- Fix: **done.** Replaced the three lone `0x97` bytes with `E2 80 94`, at the byte level so no
  other character in the file was rewritten. Verified by strict decode rather than by eye:
  `decisions.md` and every other `.md` / `.js` / `.mjs` / `.css` / `.html` / `.json` file in the
  repo now decode as valid UTF-8, no lone `0x97` remains, and the 7 `×` signs in the older
  entries were left untouched.

### ISS-035 Invalid-email text from GoTrue fell through to an unmapped reason
- Reported by Hisham · Owner: Hisham · Status: fixed
- Where: `js/services/gotrue.js`
- Problem: The GoTrue error table matched `/unable to validate email|invalid email/i` for an
  address GoTrue refuses. It does not say either of those. It says
  `Email address "someone@example.com" is invalid`, so the pattern missed, the code became
  `auth_unknown`, and a player who typed a bad address was told *"That did not work. Try again in a
  moment."* instead of *"That does not look like an email address."* The domain rules in
  `js/domain/authRules.js` catch most of these before the request is made, so it only bites on the
  addresses the client-side pattern accepts and Supabase does not.
- Cause: The table was written from Supabase's documentation rather than from a live response.
  All 20 provider tests stubbed `fetch`, so nothing compared it against what the server actually
  says.
- Found by: probing the live project with a reserved `example.com` address. GoTrue rejects
  `example.com` outright, which is what surfaced the real wording. The same probe confirmed the two
  things that actually mattered: wrong password and unknown account return **byte-identical** text,
  so the enumeration guard holds at the provider as well as in the message layer; and rate limiting
  is live, returning 429, which the table already mapped correctly.
- Fix: **done.** The pattern now matches `is invalid` as well, and a test asserts the exact string
  GoTrue returns. The lesson is recorded rather than just the fix: with credentials now in the repo,
  a live probe belongs in the review checklist for any change to the error table.

### ISS-032 No Supabase project yet, so no real accounts and no server-side signing
- Reported by Hisham · Owner: Shabab · Status: **partly fixed**
- Where: Supabase project, `js/config/supabase.js`
- Problem: DEC-018 commits the team to Supabase over REST, but no project had been created. Three
  things were blocked on it, and each is a feature that looks buildable until you try:
  1. **Real accounts.** Everything ran on `localAuth.js` (ISS-027, ISS-028).
  2. **Password reset.** There was nowhere to send a reset email from.
  3. **Signed save export.** DEC-018's whole point is that the export signing secret stays
     server-side. There is no server, so no secret can be held anywhere the client cannot read.
     A client-side "signature" would be extractable from the JS bundle and would be security
     theatre, so export/import must ship as integrity-checked but **unsigned** until this lands.
- Fixed 2026-10-06 (T-29): project `ygfrvwyydxrocvywzysk` created, URL and `anon` key committed to
  `js/config/supabase.js`, `USE_LOCAL_PROVIDER = false`. Real accounts and password reset now work,
  the latter subject to ISS-031.
- **Migration run 2026-10-06, verified against the live project.** `supabase/migrations/001_farm_saves.sql`
  executed in the SQL Editor. `GET /rest/v1/farm_saves` returns **200** where it previously returned
  **404 `PGRST205`** ("Could not find the table"), so the table exists. `pg_policies` shows the policy
  as `own row only` / `ALL`, matching the file. An unauthenticated read with the anon key returns
  `content-range: */0` — RLS is filtering per-row rather than blanket-denying, which is the correct
  behaviour: a missing policy would have denied the owner too.
- **Not yet verified: the round trip.** Creating the table is not the same as the game using it. These
  are outstanding and must not be recorded as passed until they are:
  1. A signed-in player's autosave lands a row (`farm_saves` returns one row with their `user_id`).
  2. The same farm appears in a second browser, which has no localStorage copy to fall back on.
  3. A cross-account read returns `[]`, **not** `403`. RLS filtering the row is correct; a blanket 403
     would also block the owner's legitimate access.
  "Changes survive a reload" additionally cannot be tested yet — nothing is implemented that can be
  changed, so a farm reappearing proves nothing while localStorage is the fallback.
- **Still open: signed export.** `js/state/transfer.js` has no server to call, so there is nowhere to
  hold a secret the client cannot read. Export/import therefore ships **integrity-checked but
  unsigned**, and `verifySignature()` is the seam where an Edge Function goes. Nothing in the UI or
  docs may call the export signed. See DEC-021.
- Cost: the free plan is $0 and needs no card, which is why it was chosen over Firebase
  (Cloud Functions require a billing account there, and signing is the requirement). Two free
  projects are included, and there is a 500,000 Edge Function invocation allowance per month.
  The one real gotcha: **free projects pause after a week of inactivity** and must be resumed,
  which matters for a demo.
- Fix: _done for items 1 and 2._ See "Fixed 2026-10-06" above. Item 3 needs a server and stays open.

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
- **Update 2026-10-06 (T-29): the original fix was wrong.** It said "delete `localAuth.js`", but
  guest play has no server-side account, so `signInAsGuest` exists only there. Deleting the file
  would break guest play.
- Fix: _pending._ Narrow the file to guest play rather than deleting it: drop `signIn`, `signUp`,
  `requestPasswordReset` and `updatePassword`, keeping only `signInAsGuest` and what it needs. That
  removes the account table, which is the bulk of the second-writer surface, and makes the
  remaining writes unreachable from signed-in play. Until then do not add features that depend on
  its account keys.

### ISS-033 Only the login page honoured the provider switch
- Reported by Shabab · Owner: Shabab · Status: **fixed**
- Where: `js/main.js`, `js/auth-main.js`
- Problem: `USE_LOCAL_PROVIDER` lived in `js/auth-main.js`, which only `login.html` loads. But
  `js/main.js` — the game page — imported `currentSession` and `signOut` **directly from
  `localAuth.js`**. So flipping the flag, as the handoff note described, would have: let the login
  page issue a real Supabase session, navigate to `index.html`, have the game page read
  `localStorage`, find nothing, and redirect back to login — leaving the player in a redirect loop.
  A related gap: `authApi.restoreSession()` had **zero callers**. The Supabase access token is
  memory-only, so after any page navigation every signed-in player looks signed out — the same loop
  by another route, and it also made the "already signed in" branch in `auth-main.js` unreachable.
- Cause: the provider contract was specified for the login panel, and the game page was wired to the
  stopgap before the real provider existed. Nothing forced the two entry points to agree, because
  nothing tested them together.
- Fix: **done 2026-10-06 (T-29).** `loadProvider()` is exported from `auth-main.js` and both entry
  points call it; `resolveSession()` is async and awaits `restoreSession()?.()`, as does the session
  check in `auth-main.js`. `tests/mainBoot.test.js` covers boot step 0 in six shapes. Keeping the
  flag in `auth-main.js` means `main.js` imports from the login page's entry script — legal under
  `check-imports` (both are wildcards) and safe because each script guards `start()` behind an
  element only its own page has, but it is an odd dependency worth knowing about.

### ISS-034 `isSupabaseConfigured()` answered about different values than were sent
- Reported by Shabab · Owner: Shabab · Status: **fixed**
- Where: `js/config/supabase.js`
- Problem: `isSupabaseConfigured()` read the module-level `let url` / `anonKey` declared *below* it
  (the test-override variables), not the exported `SUPABASE_URL` / `SUPABASE_ANON_KEY`. The two were
  initialised from each other so it happened to agree, but "is the provider configured" and "what
  gets sent" were answered from two sources — the shape of bug where a half-configured deploy passes
  the guard and then posts to an empty URL.
- Fix: **done 2026-10-06 (T-29).** It reads through `connection()`, the same accessor `gotrue.js`
  uses to build requests, so the guard and the request cannot disagree. `tests/mainBoot.test.js`
  asserts they agree.

### ISS-028 `authApi.js` needs credentials to reach Supabase
- Reported by Hisham · Owner: Shabab · Status: **fixed**
- Where: `js/services/authApi.js`, `js/config/supabase.js`
- Problem: The provider was written and tested, but with no Supabase project
  `js/config/supabase.js` had an empty `SUPABASE_URL` and `SUPABASE_ANON_KEY`, so `authApi.js`
  refused every call with `auth_not_configured` and login ran on `localAuth.js` (ISS-027). That
  refusal was deliberate: a half-configured provider fails loudly instead of posting credentials at
  a URL that does not exist.
- Progress: `authApi.js` implements `signIn`, `signUp`, `signOut`, `currentSession`,
  `requestPasswordReset`, `updatePassword` and `restoreSession` over plain `fetch()` per DEC-018.
  GoTrue error strings are translated to neutral reason codes in one table, and
  `tests/authApi.test.js` covers the mapping with `fetch` stubbed — no network.
- Fix: **done 2026-10-06 (T-29).** Project URL and the `anon` key are in `js/config/supabase.js`;
  `USE_LOCAL_PROVIDER = false`. The key's JWT payload carries `role: "anon"` and the matching
  project ref, and `tests/mainBoot.test.js` asserts both rather than trusting the commit.
  **The anon key only.** A `service_role` key or the export signing secret must never enter this
  repo — both bypass Row Level Security entirely. See ISS-026 and DEC-018.

### ISS-031 Password reset needs a redirect URL configured in Supabase
- Reported by Hisham · Owner: Shabab · Status: open
- Where: Supabase dashboard → Authentication → URL Configuration
- Problem: The reset flow emails a link that returns to `login.html#access_token=…`. Supabase only
  sends a recovery email if the requesting origin is in the project's allowed redirect URLs, and by
  default only the site URL is. Until that is set, a player asks for a reset and no email ever
  arrives, with nothing on our side to explain why.
- Fix: _half done._ The code half is now fixed: `auth-main.js` derives `redirect_to` from
  `location.href` and sends it with the recover request, so the link lands on `login.html` no
  matter what **Site URL** is set to. That removed the silent-failure mode entirely, and a test
  asserts the field is sent. **Done 2026-10-06:** Shabab added the dev and deployed
  origins to **Redirect URLs** and set **Site URL** in the dashboard. A live probe of
  `/auth/v1/recover` returned 200 for every origin including one that was deliberately not
  allowed, so the endpoint's response **cannot** be used to check this — it has to be verified by
  receiving an actual email. The README carries it as a setup step.
- **Confirm email** is deliberately left **off** while the game is iterated on: the free tier's SMTP
  allowance is a few emails an hour shared by everyone, so a reviewer who signs up second gets
  nothing and no explanation. Turn it on before a demo, which is what makes the `CONFIRM_EMAIL` state
  in `js/ui/authErrors.js` reachable. Both states are documented in the README.

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

### ISS-036 The shop is a page, not the modal the plan describes
- Reported by: Shabab | Owner: Shabab | Status: **fixed**
- Where: `shop.html`, `js/shop-main.js`, `js/ui/shopView.js`, `js/ui/shopLauncher.js`
- Problem: `docs/architecture.md` and `docs/team/ownership.md` describe a `shopPanel`
  modal inside `index.html`, with `js/ui/topBar.js` and friends owned by one person. The team
  asked for a separate page instead, to keep the files easy to read.
- Cause: A deliberate design change after the plan was written, not a mistake.
- Fix: Done in T-08. `shop.html` is its own page with its own entry script, so it repeats
  the session gate the farm page has; `resolveSession` and `shopHref` are imported from
  `js/main.js` rather than copied, and `shop-main.js` is now a wildcard entry in
  `scripts/check-imports.mjs`. `shopPanel.js` is now `shopView.js`. The cost is stated
  rather than hidden: two pages must answer the session question the same way, and a guest
  needs `?guest=1` carried across the navigation in both directions or they would be sent
  back to the login form they had already passed. The planned Land and Market tabs are not
  built yet and `index.html` still shows placeholders for them.

### ISS-040 The password gate on account deletion was client-side only
- Reported by: Shabab (review) | Owner: Shabab | Status: **fixed** in DEC-024
- Where: was `003_account_deletion.sql`, now `005_immediate_account_deletion.sql`
- Problem: `request_account_deletion()` authenticated with `auth.uid()` and nothing else,
  so `POST /rest/v1/rpc/request_account_deletion` with **any valid access token**
  scheduled a deletion with no credential at all. The password prompt protected the
  settings form, not the endpoint against anyone who read the source.
- Fix: the check moved into the database. `delete_my_account(password)` compares against
  the bcrypt hash in `auth.users.encrypted_password` using `pgcrypto`'s `crypt()`, and
  deletes nothing on a mismatch. `verifyPassword` is deleted from `js/services/authApi.js`
  and `tests/mainBoot.test.js` asserts it stays gone, so the check cannot quietly drift
  back into the browser where a caller could skip it.
- Why it could sit as a logged issue: the 7-day window absorbed it. A token holder who
  did not know the password could not sign back in, so signing in cancelled the deletion
  and the account returned. Deletion is immediate now, so nothing absorbs it.
- Reviewed and accepted; do not report it again as new.
### ISS-041 `clearSave()` could not report a failed server-side delete
- Reported by: Shabab (review) | Owner: Shabab | Status: **fixed**
- Where: `js/state/store.js`, `js/settings-main.js`
- Problem: `remote.delete?.()` resolves to `{ok:false, reason:'server_error'}` when
  PostgREST refuses — an expired access token, most likely — and `saveApi.js` never
  throws. `clearSave()` only had a `catch`, so it dropped the resolved value and returned
  nothing at all. The settings page said the farm was cleared while the row survived.
- Impact: signing back in restored the farm the player had been told was gone. The
  suite never caught it because `tests/store.test.js` stubbed `server.delete` to always
  return `{ok:true}`.
- Fix: `clearSave()` returns `{ok, reason?, localCleared}`. `deleteProgress` refuses to
  write a fresh farm over a row it could not delete, and the account-deletion path warns
  rather than claiming a clean sweep. Three tests cover a refused delete, a throwing
  delete, and the no-server case.

### ISS-042 Editing your own username metadata orphaned the `usernames` row
- Reported by: Shabab (review) | Owner: Shabab | Status: **fixed**, pending migration
- Where: `js/services/authApi.js`, `supabase/migrations/002_usernames.sql`
- Problem: two causes, one behind the other.
  1. `recordUsername` skipped the write entirely when `user_metadata.username` was empty,
     and metadata is user-writable via `PUT /auth/v1/user`. A player who changed their
     username left the old row claimed by an account that could no longer answer to it —
     permanently, since the name is the primary key.
  2. The fix needed to release the old row, and it could not: **DELETE and PATCH both
     silently matched zero rows.** Verified against the live project — `Prefer:
     return=representation` answered 200 with an empty array, while the same table's
     INSERT worked. The cause was in `002`: the leak fix had dropped *every* SELECT
     policy including the owner's, and an owner with no SELECT policy cannot update or
     delete their own row.
- Fix: `002` grants `usernames_readable_by_owner` (`using (auth.uid() = user_id)`) —
  the player's own username and email, to themselves, and nobody else's. That is a
  different policy from the anon one that was removed; `email_for_username()` remains
  the only route to anybody else, and only one name at a time. On a 409,
  `recordUsername` now releases the account's own row and retries, so a rename frees the
  old name.
- **Requires re-running `002_usernames.sql` on the live project before the rename path
  works.** The insert path — and therefore username sign-in — does not depend on it.
### ISS-038 Account deletion has no emailed confirmation
- Reported by: Shabab | Owner: Shabab | Status: **open** (deliberate, not blocked)
- Where: `js/settings-main.js`, `supabase/migrations/005_immediate_account_deletion.sql`
- Problem: deleting an account takes two clicks and the password, but nothing is sent to
  the player's inbox. There is no "was this really you?" link on a second device.
- Why it is not worse now: the password is verified in the database before anything is
  deleted (DEC-024, ISS-040), so the deletion cannot be performed with a stolen session
  token alone � which is what the old 7-day window used to be guarding. What remains is
  that someone who knows the password *and* holds a live session can delete without a
  second channel, which is the same position as being signed in.
- The fix, if wanted: a Supabase Edge Function holding the `service_role` key in Supabase's
  secret store, minting a single-use token with a 15-minute expiry and emailing it.
  Rejected on cost (DEC-022): a deploy step, an email provider and a token table, against a
  risk the password check already bounds. **Nothing secret enters this repo either way** �
  see DEC-018.
- Also worth knowing: Supabase's backup retention means deleted data stays recoverable from
  a restore point for some days afterwards. Irrelevant for a game's farm data; not
  something the game could fix if it mattered.

### ISS-039 The 7-day delay meant the email could not be re-registered during the window
- Reported by: Shabab | Owner: Shabab | Status: **fixed** by removing the delay
- Where: was `003_account_deletion.sql`, now dropped by `005`
- Problem: a player who scheduled a deletion could not register again with the same email
  until the purge ran, because GoTrue still held the account. The `email_taken` message
  ("sign in instead") was the right guidance, but the delay was surprising.
- Fixed: deletion is immediate (DEC-024), so the email is free the moment the account is
  gone, and the copy no longer promises a window.
  team set seed prices at 100 / 200 / 300 / 400 / 500, which against the old sell values
  made every rice planting a 60 gold loss: a player who planted lost money, so the
  sixteen-plot goal could never be reached.
- Cause: `js/config/crops.js` was empty, so the crop numbers existed only in `docs/crops.md`
  as prose nobody was reading against each other.
- Fix: Done in T-08. `sellPrice` is now derived so that `yield * sellPrice` is exactly twice
  `seedPrice` for every crop, giving the economy one rule instead of ten unrelated numbers,
  and `tests/shop.test.js` asserts the invariant. Quality (plot health) is what erodes the
  margin, so ignoring the forecast is what stops a farm compounding.
