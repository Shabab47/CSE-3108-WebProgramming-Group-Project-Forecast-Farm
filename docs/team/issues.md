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
| ISS-009 | ~~`hourly[0]` is midnight~~ — premise void under `forecast_hours` | ~~High~~ | Afif | **stale** | — |
| ISS-010 | `check-imports` fails on `utils/dom.js` | **High** | Hisham | open | T-02 |
| ISS-013 | No state field for notification dedupe | **High** | Afif | open | T-13 |
| ISS-015 | Drought's conditional rating has no home | Medium | Afif | open | T-12 |
| ISS-012 | Geocoding omits `results` when empty | Medium | Afif | open | T-04 |
| ISS-011 | Stale sample data breaks the current-hour lookup | Medium | Afif | open | T-04 |
| ISS-001 | All 14 SVG icons are 0 bytes | Medium | Kafi | open | T-15 |
| ISS-002 | `LICENSE` was 0 bytes | Low | Shabab | **fixed** | — |
| ISS-003 | ~~`tileAspect` guess is 3% off~~ — re-measured, the gap is threshold noise | ~~Medium~~ | Hisham | **stale** | — |
| ISS-004 | Diamond clip-path over-hangs the bottom tip | Medium | Hisham | **fixed** | T-55 |
| ISS-005 | `tileScale` leaves an uneven rim | Low | Hisham | **fixed** — closed by T-53 | T-53 |
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
| ISS-045 | Docs point at `css/field.css`, which does not exist | Low | Jim | **fixed** | — |
| ISS-046 | `.btn--secondary` and four other rendered classes have no rule anywhere | Low | Hisham | **partly fixed** — the `.location-bar*` half closed by T-48 | — |
| ISS-032 | No Supabase project yet, so no real accounts or server-side signing | **High** | Shabab | partly fixed | T-29 |
| ISS-048 | A transient refresh failure permanently destroys the refresh token | **High** | Hisham | **fixed** | T-39 |
| ISS-049 | `gotrue.post()` has no request deadline | **High** | Hisham | **fixed** | T-39 |
| ISS-050 | A failed server save is invisible, so "autosave" is not what it claims | Medium | Hisham | **fixed** | T-39 |
| ISS-047 | Five duplicate rice sprites at the pre-refactor flat path | Low | Kafi | open | T-06 |
| ISS-053 | The board's meters were appended outside `.board-body`, so the grid had one child | Medium | Jim | **fixed** | T-48 |
| ISS-054 | `min-height: 306px` on the board silently overrode the 1/3 split | Medium | Jim | **fixed** | T-48 |
| ISS-055 | The humidity and rain fill bars are rendered but never visible | Medium | Jim | **wontfix** — bars removed instead | T-50 |
| ISS-056 | The note landed in an implicit grid row, making the board too tall | Medium | Jim | **fixed** | T-50 |
| ISS-057 | The hour notes clipped their own temperature | Medium | Jim | **fixed** | T-50 |
| ISS-058 | The freshness line was drawn on top of the hour notes | Medium | Jim | **fixed** — superseded by T-51 | T-50 |
| ISS-059 | The board's right peg drew as a flat bar on short windows | Medium | Jim | **fixed** | T-51 |
| ISS-060 | The last meter pill's bottom edge was clipped flat | Medium | Jim | **fixed** | T-51 |
| ISS-061 | The wind meter's own label rendered as "W…" | Medium | Jim | **fixed** | T-51 |
| ISS-062 | The note's right side was empty while the place name was ellipsised | Low | Jim | **fixed** | T-52 |
| ISS-063 | A farm with no location printed an empty place line | Low | Jim | **fixed** | T-52 |
| ISS-064 | The big temperature prints its unit twice - "24°°C" | Low | Jim | open | — |
| ISS-065 | The plot cluster was not centred on the base | Medium | Jim | **fixed** | T-53 |
| ISS-066 | The pump was pinned to the stage's corner instead of the base's centre | Medium | Jim | **fixed** | T-53 |
| ISS-067 | Five `FIELD` constants and `DIAMOND_CLIP` were declared and never read | Low | Jim | **fixed** | T-53 |
| ISS-068 | `architecture.md`'s `img top` line understated the tile's half-height | Low | Jim | **fixed** | T-53 |
| ISS-069 | `base.png` is an extruded slab, and the origin was taken from its bounding box | High | Jim | **fixed** | T-54 |
| ISS-070 | The ground tiles rendered at about half their intended size | High | Jim | **fixed** | T-54 |
| ISS-071 | An even rim between the cluster and `base.png` is geometrically impossible | Medium | Jim | **fixed** | T-54 |
| ISS-072 | The crop layer is still sized for the old, half-height plot box | Low | Kafi | open | T-06 |
| ISS-073 | Two replacement characters survive in `issues.md` itself | Low | Jim | **fixed** | — |
| ISS-075 | The shop does not match the agreed art direction | Low | Jim | fixing | T-57 |
| ISS-076 | The connection banner is in flow above a 100dvh shell, so it jumps the whole page every autosave | Medium | Hisham | **fixed** | T-58 |
| ISS-077 | `reverseGeocode` posted lat/lon to Open-Meteo's forward-search endpoint, so every farm was named "Current location" | **High** | Hisham | **fixed** | T-59 |

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

### ISS-009 ~~`hourly[0]` is midnight, not the current hour~~ — premise no longer holds
- Reported by Hisham · Owner: Afif · Status: **stale — will not occur**
- Where: `js/ui/weatherPanel.js`, `js/domain/weather.js`
- Original problem: a live response fetched at 12:15 returned `current.time = "12:15"` and
  `hourly.time[0] = "00:00"`, with **48 entries for `forecast_days=2`**. The plan states
  `classify()` returns "24 entries starting at the current hour" but never says how to find it, and
  `simulator.tick` reads `hourly[0]`. Implemented naively, the simulator would treat midnight as
  now: wrong evaporation, wrong rain, wrong health drain for up to 24 hours.
- **Why it no longer applies.** That observation was against a request sending `forecast_days=2`.
  `js/services/weatherApi.js` now sends **`forecast_hours=24`** instead, which makes Open-Meteo start
  the hourly series at the **current hour**. Verified live against four timezones on 2026-10-13:

  | Location | `current.time` | `hourly.time[0]` |
  | :--- | :--- | :--- |
  | Dhaka | `01:15` | `01:00` |
  | London | `20:15` | `20:00` |
  | Sydney | `06:15` | `06:00` |
  | Reykjavik | `19:15` | `19:00` |

  `hourly.time[0]` matched the current hour in every case. 24 entries, not 48.
- **The planned fix would have introduced the bug it was meant to prevent.** `current.time` carries
  the minutes past the hour and **never appears in `hourly.time`** (exact-match index is `-1` in all
  four probes). A loop seeking the "first hour at or after" `current.time` therefore lands on the
  *next* hour — at 01:15 the strip would begin at 02:00, skipping the hour in progress. One was
  written that way, against this issue as authority, and was reverted: `weatherPanel.js` reads
  index 0 for both the hourly strip and the precipitation stat, which is correct under
  `forecast_hours`.
- Fix: **not needed.** Kept as stale rather than closed as fixed, because "fixed" would leave a
  false record that someone trusts next time — the remedy is recorded above so nobody re-derives it.
- **Still worth doing for a different reason:** nothing asserts that `hourly.time[0]` tracks the
  current hour, so a change back to `forecast_days` would reintroduce the original bug silently. A
  test pinning the shape would be the real close.

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

### ISS-011 Stale sample data shows weather from the day it was captured
- Reported by Hisham · Owner: Afif · Status: open
- Where: `js/services/weatherApi.js`, `data/sample-forecast.json`
- Original problem: `data/sample-forecast.json` is a saved response with fixed timestamps. Once its
  date is in the past, the `startIndex` lookup from ISS-009 cannot match "now", so the offline
  fallback either throws or silently shows weather from the day it was captured.
- **Revised after ISS-009 went stale.** The `startIndex` lookup no longer exists, so the original
  failure mode is gone with it — there is nothing left to "not match". The problem underneath it is
  real and unchanged: the panel reads index 0 as *the current hour*, which is only true for a live
  response. On a captured sample it reads the capture hour on whatever day it was taken, which is
  wrong in a way nothing currently flags.
- Cause: Fallback path was not traced through the same parser as the live path.
- Fix: _pending._ If the sample's date is not today in its timezone, set `weather.source = 'sample'`
  and show the offline badge, so a stale sample is labelled rather than passed off as live. The
  already-shipped `sync: 'pending'` line ("Live weather paused — last read …") is the model.

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
- Note (2026-10-16, relogged as **stale**): `tileAspect: 0.538` is what shipped, so the 3% error this
  issue was written against no longer exists. Re-measured `ground_unwatered.png` at 991×**535** →
  0.5399, against the 991×533 → 0.538 in `docs/architecture.md`. That two-row difference is the
  alpha threshold — this pass cut at `A > 8`, whoever measured first cut at something stricter — and
  not a defect. `0.538` is left alone: AGENTS.md section 5 says the measured geometry is not to be
  re-derived, and churning a constant on threshold noise is how a "measurement" stops meaning
  anything. No debug sliders exist to refine it anyway — `js/debug/` is still unbuilt (T-06).

### ISS-004 Diamond clip-path over-hangs the bottom tip
- Reported by Hisham · Owner: Hisham · Status: fixed
- Where: `js/utils/iso.js` → `css/scene.css` (`.plot__hit`), `js/ui/farmView.js`
- Problem: `diamondClipPath()` in the plan is `polygon(50% 22%, 100% 50%, 50% 78%, 0 50%)`.
  The real diamond runs y 22.4%–75.6%, so the click target extends 2.4% past the visible bottom
  tip. The clip itself was never written, though, and that turned out to be the larger half: nothing
  had ever made a plot's hit area its diamond, so the square canvas box took every click.
- Cause: Rounded numbers in the plan, on a function the plan scheduled and nobody built.
- Fix: **done, with one deviation from the plan.** The polygon is
  `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`, matching `FIELD.DIAMOND_CLIP`, and
  `tests/iso.test.js` asserts the constant and the stylesheet agree. It landed in `css/scene.css` on a
  `.plot__hit` layer rather than as `iso.js`'s `diamondClipPath()`, because it is the same for all
  sixteen plots and never moves — the same call `aspect-ratio` over `FIELD.frameAspect` already makes,
  and already tests the same way. The deviation that matters: the clip is **not** on the button,
  because `clip-path` clips everything an element paints. ISS-074.
- Note: the hit-area defect that nobody had written an issue for was measured before it was fixed rather
  than described. With the box as the hit area, **66.2%** of each tile's visible diamond answers as a
  different plot — the ones in front, which win on `z-index`; with the clip, **0.0%**. The two numbers
  come from sampling every diamond against every plot box at 60×60 per tile. `tests/farmView.test.js`
  covers the structure instead, because the fake DOM measures no layout and therefore cannot reproduce
  that number itself.

### ISS-005 `tileScale` leaves an uneven rim
- Reported by Hisham · Owner: Hisham · Status: fixed
- Where: `js/config/field.js`
- Problem: `tileScale: 0.22` puts the 4×4 cluster at 0.926 × 0.499 of the stage inside a
  `base.png` slab of 0.991 × 0.595, leaving a 0.033 rim at the sides and 0.048 top and bottom.
  The slab looks visibly thicker at the front and back than at the left and right.
- Cause: `base.png`'s diamond is h/w 0.600 while a 4×4 cluster of 0.538-aspect tiles is 0.538,
  so the two cannot nest perfectly.
- Fix: **superseded by T-54.** The intended fix was to start calibration at `tileScale: 0.204`, which
  solves `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` for an even `r ≈ 0.067` all round — and the
  second of those equations is the slab's bounding box, so the solve was never valid. The rim is now
  flush front-to-back with a 1.3% border at the sides. See the note below.
- Note (2026-10-16, **closed by T-54**; an earlier T-53 closure was wrong): this was marked "closed by
  T-53" on the strength of a `0.066` rim measured against `base.png`'s **bounding box**. That was
  wrong, for exactly the reason the Cause line above already gives. The slab's top face is h/w
  `0.524` (ISS-069) and a cluster of `0.538`-aspect tiles is taller still relative to its width, so
  **the two cannot nest evenly**: solving `4.21t + 2r = 0.991` against `2.265t + 2r = 0.520` returns
  `r = −0.015`. T-53 did fix what it said it fixed — the cluster was 15.3% of the stage off-centre
  (ISS-065) and `shift()` corrected that — but that was necessary, not sufficient, and not this
  issue. Closed instead by T-54 with an explicit **choice** of fit rather than a solved even rim:
  `tileScale: 0.2296`, flush front-to-back with a 1.3% border at the sides. ISS-071, DEC-034.
  `DIAMOND_CLIP` and the click targets remain untouched here — ISS-004.

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
### ISS-043 Every page showed a blank white screen while it booted
- Reported by: Hisham | Owner: Hisham | Status: **fixed**
- Where: `js/main.js`, `js/auth-main.js`, `js/shop-main.js`, `js/settings-main.js`
- Problem: all four entry points awaited the session **and** the remote save before mounting a
  single panel, so the player looked at an empty page for the whole of it. `#top-bar`,
  `#sidebar`, `#farm-view`, `#shop-root`, `#settings-root` and `#auth-root` are all empty
  containers until boot finishes. On the farm page the wait is bounded only by the
  `Promise.race` in `js/services/authApi.js` (`RESTORE_HARD_LIMIT_MS`, 15 s) — `js/services/
  gotrue.js` sets no `AbortController` at all, so sign-in, sign-up and token refresh can hang
  indefinitely. A player on a bad connection had up to fifteen seconds of white and no way to
  tell whether the page was broken or merely slow.
- Cause: not a bug so much as a missing feature. Boot deliberately renders nothing before the
  session is known (see `docs/architecture.md`), and nothing was ever put on screen in the gap.
- Fix: `js/ui/loadingTips.js`. A veil with a spinner and a rotating fact, mounted as the first
  statement of every `start()` and dismissed by `done()`. `js/config/tips.js` holds the facts and
  the three thresholds. See DEC-026 for why it is allowed to paint before auth.

### ISS-044 `clearSave()` called in `settings-main.js` but never imported
- Reported by: Hisham (audit, found while building ISS-043) | Owner: unassigned | Status: **open** — deliberately not fixed here, it belongs to whoever owns settings
- Where: `js/settings-main.js:181` against the import list at `js/settings-main.js:27`
- Problem: the account-deletion path calls `await clearSave()`, but the module imports only
  `clearLocalSave`. `clearSave` is `undefined` in that scope, so the call throws a
  `ReferenceError`. The surrounding `try/catch` swallows it and logs a warning, so the flow
  reports **success** to the player while the local-storage half never runs — the account row is
  gone server-side but the farm is left in `localStorage` on a shared machine.
- Cause: a rename that was applied to the call but not the import list. `store.js` exports both
  names and they are not interchangeable: `clearLocalSave()` is the local half only,
  `clearSave()` is the one that also deletes the server row.
- Why it is not fixed in the loading-tips commit: this is unrelated to the boot loader and sits
  in another person's area (`docs/team/ownership.md`). Folding an account-deletion data-loss fix
  into a UI commit is exactly the bundling AGENTS.md §8 warns against. **It should be treated as
  a security-adjacent bug, not a cosmetic one** — the player is told their data is gone and it
  is not.
- Note: DEC-025 changed this call to `clearLocalSave()` deliberately, so whoever picks this up
  should read that decision first — the correct fix may be to change the *call* rather than add
  the import.

### ISS-038 Account deletion has no emailed confirmation
- Reported by: Shabab | Owner: Shabab | Status: **open** (deliberate, not blocked)
- Where: `js/settings-main.js`, `supabase/migrations/005_immediate_account_deletion.sql`
- Problem: deleting an account takes two clicks and the password, but nothing is sent to
  the player's inbox. There is no "was this really you?" link on a second device.
- Why it is not worse now: the password is verified in the database before anything is
  deleted (DEC-024, ISS-040), so the deletion cannot be performed with a stolen session
  token alone — which is what the old 7-day window used to be guarding. What remains is
  that someone who knows the password *and* holds a live session can delete without a
  second channel, which is the same position as being signed in.
- The fix, if wanted: a Supabase Edge Function holding the `service_role` key in Supabase's
  secret store, minting a single-use token with a 15-minute expiry and emailing it.
  Rejected on cost (DEC-022): a deploy step, an email provider and a token table, against a
  risk the password check already bounds. **Nothing secret enters this repo either way** —
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

### ISS-045 The docs point at `css/field.css`, which does not exist
- Reported by Jim · 2026-10-11 · Owner: Jim · Status: fixed
- Where: `docs/architecture.md` (the "where to change what" table and the project structure tree)
- Problem: two places named `css/field.css` as the file holding the isometric stage and the plot
  layers. No such file has ever existed — the stage and the plots were in `css/farm.css`. The
  project structure tree was worse: it listed `field.css` as "planned", so it read as work still
  to do, while `farm.css` was already on disk and already drawn.
- Cause: the stage was renamed during T-05/T-06 and the docs did not follow. The plan documents
  still name `css/field.css` as well, so this is not a one-line typo to correct in one file.
- Fix: both references corrected. The file was itself renamed to `css/scene.css` in the same pass
  (DEC-029), so the doc fix and the rename landed together and the entry above records the name it
  had at the time. `docs/game-design/implementation-plan.md` and `docs/team/tasks.md` still say
  `field.css`; those are the plan's record of intent rather than a description of the repo, so they
  were left, and T-06's owner should reconcile them when the static field lands.

### ISS-046 `.btn--secondary` and four other rendered classes have no rule anywhere
- Reported by Jim · 2026-10-11 · Owner: Hisham · Status: open
- Where: `js/ui/savePanel.js`, `js/ui/navbar.js`, `js/ui/locationBar.js`, `css/components.css`
- Problem: a sweep of every class any panel in `js/ui/` can render, against every stylesheet, found
  nine with no rule at all. Four matter:
  - `.btn--secondary` — `savePanel.js:123` renders `btn btn--secondary btn--block` as the Save
    button. `components.css` defines `--primary`, `--ghost`, `--danger` and `--block`, but no
    `--secondary`. The button has been rendering as a plain `.btn` since T-30 landed.
  - `.divider` — `savePanel.js:266` renders `<hr class="divider">` with no rule, so it draws as a
    default 2px inset border.
  - .`navbar__name` — `navbar.js:40` renders it inside the logo link; `navbar.css` styles
    `__mark` and `__logo` but not this, so it inherits body font. Probably wanted at the logo's
    650 weight.
  - `.location-bar`, `__input`, `__btn`, `__btn--icon` — all four rendered by
    `locationBar.js`. **Fixed 2026-10-13, and the class names changed with it.** The search moved
    onto the wooden forecast board and is now styled in `css/weather.css` as `.location-bar`,
    `.location-bar-input`, `.location-bar-locate` and `.location-bar-go` — see T-48. The current-
    location button did not survive as its own control: it is the pin inside the field now, because
    a third control beside the field was what made the row wrap in the first place (ISS-046 proper).
  - `.farm-view` and `.card__body` are structural hooks with no rules by design — `.card` carries
    the padding. `tests/settingsDom.test.js` explicitly carves those out.
- Cause: no check covers a class that has no rule. `settingsDom.test.js` asserts the inverse
  direction — *if* a class is styled somewhere, the page must load that file — and deliberately does
  not assert that every class has a rule, because structural hooks are legitimate.
- Risk: Low. Nothing is invisible; the Save button is simply unstyled next to its neighbours, which
  reads as an oversight rather than a break.
- Fix: partially done — the `.location-bar*` half is closed above. Not started for the rest.
  `.btn--secondary` needs a variant in `components.css` — note that whichever file ends up holding
  `.btn` is the one to put it in, per DEC-029. `.divider` is one rule.

### ISS-047 Five duplicate rice sprites at the pre-refactor flat path
- Reported by Hisham · 2026-10-12 · Owner: Kafi · Status: open
- Where: `assets/images/crops/rice_1.png` … `rice_5.png`, against `js/config/assets.js`
- Problem: `npm test` fails with `assets/images/crops/rice_1.png exists on disk but is not listed in
  js/config/assets.js`. Five files sit at `assets/images/crops/rice_N.png` while the registry — and
  every path builder in `assets.js` — expects `assets/images/crops/rice/rice_N.png`.
- Cause: commit `855dc32` ("Login UI implemented", from the `jim` branch, merged by `cb7fe4c`)
  re-added files at the old flat path. That branch was based on the pre-refactor tree, and the flat
  copies were deleted in `59d7898` ("refactor(assets): one folder per crop"). A merge from an old
  base reintroduced them.
- Verified: all five are byte-identical to the nested copies (SHA256 match, identical byte sizes),
  and `grep` finds **zero** references to the flat path in any `.js`, `.css` or `.html`. They are
  dead weight, not a parallel set that anything loads.
- Risk: Low, and the duplication is what makes it safe to resolve — nothing is lost by removing
  the stray copies, since the real files remain. But `assets/` is Kafi's folder per
  `docs/team/ownership.md`, so this is his to sign off, not Hisham's to delete silently.
- Fix: not started. The fix is deleting the five flat files, which restores the state `59d7898`
  intended. Not bundled with other work — AGENTS.md §8 says one step per commit, and §3 says an
  unfamiliar change in someone else's folder gets investigated and flagged first, which is what
  this entry is.

### ISS-048 A transient refresh failure permanently destroys the refresh token
- Reported by Hisham · 2026-10-12 · Owner: Hisham · Status: **fixed**
- Where: `js/services/authApi.js`, `restore()`
- Problem: players are logged out on their own, at random, on the hosted build — and the logout is
  permanent. `restore()` treats *every* unsuccessful refresh as an invalid token:
  ```js
  const result = await post('token?grant_type=refresh_token', { refresh_token: refreshToken });
  if (!result.ok) {
    log.warn('refresh failed, signing out');
    writeRefreshToken(null);   // ← runs for a 500, a 502, a rate limit, and a dropped connection
    return null;
  }
  ```
  `gotrue.post()` returns `{ok:false}` for **any** non-2xx response, so one transient blip deletes
  the stored refresh token. Silent re-login can then never work again — the player has to retype
  their password. This is the reported "auto logs out on its own".
- Cause: `ok` from the transport conflates "the server rejected your credential" with "the server
  was unreachable or broken". Only the first justifies deleting a credential.
- Risk: **High** — it is a live data-adjacent defect on the deployed build, and it affects every
  signed-in player. The fix deliberately *loosens* a rule, so it is recorded as a DEC rather than
  shipped as a silent bugfix.
- Fix: `68f69cc`. Only a `400`/`401` clears the token now. `restoreSession()` answers
  `{ok, session|reason}` with `invalid_token` / `offline` / `server_error`, and the 15 s race keeps
  the token rather than destroying it. `gotrue.post()` returns the HTTP `status` alongside the
  reason, which is what made 401-versus-502 decidable at all. Tests assert the token survives a
  network failure, a timeout and a 502, and is cleared by a 401. DEC-030.

### ISS-049 `gotrue.post()` has no request deadline
- Reported by Hisham · 2026-10-12 · Owner: Hisham · Status: **fixed**
- Where: `js/services/gotrue.js`, `post()` and `postAuthed()`
- Problem: no `AbortController`, so a request that never answers hangs indefinitely. `saveApi.js`
  and `authApi.js`'s `rest()` both arm a 10 s timer; `gotrue.js` does not. On the hosted build —
  CDN cold starts, a proxy, a captive portal — the boot-time refresh stalls until the 15 s
  `Promise.race` in `restoreSession()` fires, which reports "signed out" and redirects to the login
  page. So a slow network is indistinguishable from a logged-out account, and the player sees a
  blank page for 15 s first.
- Cause: the deadline was added to `saveApi.js` and to `authApi.rest()` but never carried across to
  the GoTrue transport those were modelled on.
- Risk: High — this is what turns a slow connection into a false logout, and it is the reason the
  boot path is slow to fail rather than quick.
- Fix: `ee1d02b`. `AbortController` + a 10 s timer in `post()` and `postAuthed()`, with
  `AUTH_TIMEOUT_MS` moved into `js/config/game.js` so one number governs every wait on the server.
  An abort reports `reason: 'timeout'` rather than `network_request_failed`, because the caller
  needs to tell "we gave up waiting" from "the request never left".

### ISS-050 A failed server save is invisible, so "autosave" is not what it claims
- Reported by Hisham · 2026-10-12 · Owner: Hisham · Status: **fixed**
- Where: `js/state/store.js`, `saveNow()`
- Problem: the local write is correct and synchronous, but a failed server write is swallowed into
  a `log.warn`. The player is never told their farm is not reaching the server, and the autosave
  interval keeps re-firing a doomed 10 s request every 10 s. Clear site data, switch device, and
  the farm is gone with no warning having been given at any point.
- Cause: the save path has no health signal and no UI consumer for one. Nothing in `store.js` or
  `state/` records *whether* the last write reached the server.
- Risk: Medium — no data is lost while the tab stays open, but the player is given false
  confidence, and the retry loop wastes battery and requests on a dead connection.
- Fix: `46f9b71`. `store.js` tracks `synced` / `saving` / `pending` and emits `sync`; a failed write
  is queued instead of retried every 10 s, and flushed on `window.online` or after
  `SAVE_RETRY_BACKOFF_MS`. `ui/connectionBanner.js` is persistent rather than a toast, says the
  farm is device-only and that live weather is paused, and offers the `.farm` export that already
  existed. `ui/weatherPanel.js` labels the last forecast as paused instead of showing a timestamp
  that reads as live. Wired for all four pages through `js/connection.js`.

### ISS-051 The Save data card rendered `[object Object]` instead of the import/export controls
- Reported by Jim · 2026-10-12 · Owner: Hisham · Status: fixed
- Where: `js/ui/settingsView.js`, `js/ui/savePanel.js`
- Problem: the Save data card on the settings page showed the literal text `[object Object]`
  where the Export and Import controls should be. No button, no file input, nothing to press.
  Reproduce: sign in, open settings, scroll to the bottom. The card is there and it is wrong.
- Cause: two defects, both in the block added in `d286551`.
  1. `mountSavePanel(el('div'), actions)` returns `{ unmount }`, not a DOM node, and that
     return value was passed straight into `el()` as a child. `el()` appends
     `document.createTextNode(String(child))` for anything that is not a `Node`, so the card
     body got the string `"[object Object]"` and the panel itself was mounted into a detached
     `<div>` that never reached the page. Every other panel in `js/ui/` returns the same shape
     and is either the last statement or is unmounted separately — this was the only call site
     that tried to nest one inside `el()`.
  2. The card was gated on `actions.canExport ?` — tested, not called. `canExport` is a
     function, so the test was always truthy and the ternary never hid anything. It read as a
     deliberate guest gate and was not one.
- Fix: build the host element first, mount into it, then embed the host; and render the card
  unconditionally, since `savePanel.js` already explains in place why a guest farm cannot be
  exported. `tests/settingsDom.test.js` now asserts both the controls are present and that no
  `[object Object]` appears anywhere on the page.

### ISS-052 A guest sees the word "null" on the settings page
- Reported by Jim · 2026-10-12 · Owner: Shabab · Status: fixed
- Where: `js/ui/settingsView.js`, `js/utils/dom.js`, `tests/helpers/fakeDom.js`
- Problem: a player signed in as a guest sees a bare `null` rendered between the "Erase progress"
  card and the "Save data" card. Reproduce: play as guest, open settings, look below the erase-progress
  card. Authed players do not see it — there is no account card to omit.
- Cause: `mountSettings` ends with `root.append(...)`, the **native** `ParentNode.append`, which accepts
  `(Node or DOMString)` and so stringifies a `null` argument into a text node. The last argument is
  `account ? el(...) : null`, which is null for every guest. `el()` has an explicit null filter and does
  not have this problem — and the comment above the line said so, describing the wrong function.
  Pre-existing, present since the delete-account card landed; not a regression from ISS-051.
- Fix: `appendAll()` in `utils/dom.js`, mirroring `el()`'s filter, and `mountSettings` uses it. The
  deeper problem is the test double: `fakeDom.append()` *skipped* null rather than stringifying it, so
  the fake DOM was laxer than the browser and `settingsDom.test.js`'s guest test passed against a page
  that was visibly wrong. `fakeDom.append()` now matches the real behaviour — `el()` keeps its own filter,
  so every `el()` call site is unaffected, and any future bare `append(null)` surfaces the way it would in
  a browser.
- Risk of the fix: low, and worth stating. `.settings-page` is the only body class in the repo, so the
  cascade cannot leak into `index.html`, which also links `settings.css`.

### ISS-055 The humidity and rain fill bars are rendered but never visible
- Reported by Jim · 2026-10-15 · Owner: Jim · Status: **wontfix** — superseded by removal, T-50
- Where: `css/weather.css` (`.board-meter-track`), `js/ui/weatherPanel.js`
- Problem: two of the three meter pills on the forecast board — humidity and rain chance — were
  supposed to carry a fill bar under the number, and wind deliberately did not, because it has no
  natural ceiling. The bars were never seen. Reproduce: open the game at any window size, look at the
  meters column on the right of the board, and there is no bar under Humidity or Rain Chance.
- Cause: `.board-meter-track` carried `display: none` and nothing anywhere set it back. The markup
  was correct — `renderMeters()` built the track and the fill and `meter()` set the fill's width to
  the clamped percentage — so the DOM was right and the stylesheet hid it. The reason two meters
  had bars and one did not was written up in `weatherPanel.js` under "Why wind gets no bar", and the
  progress log for T-48 repeats it, so the intent was carried by prose while the CSS said the
  opposite. Almost certainly left over from an earlier layout where the track overlapped the label.
- Why wontfix: the honest answer was never to restore the rule but to **remove the bar**. Looking at
  the board with the numbers alone, the 4px bar was clutter rather than information — the pills are
  narrow, and the value is already spelled out in full ("68%", "40%") rather than encoded as a
  length to be decoded. So the bars are gone from both layers: `.board-meter-track` and
  `.board-meter-fill` are deleted from `css/weather.css`, and `meter()` no longer takes a percentage
  or builds the track, so the DOM is smaller too. `weatherPanel.js`'s "Why wind gets no bar" section
  was rewritten, since wind is no longer an exception to bars — nothing has one.
- The part worth keeping: the bug was never the missing rule. It was **prose describing a feature the
  stylesheet had switched off**, in three places (this entry, `weatherPanel.js` and the T-48 log
  entry), which is how it survived. When a rendering is deliberately dropped, the argument for it has
  to be deleted too, not just the declaration.
- Not committed, and the reason is not this issue. `npm test` is red on `HEAD` for ISS-047 (five
  duplicate sprites at the pre-refactor flat path) and AGENTS.md §7 says both checks pass before a
  commit. The change sits in the working tree until ISS-047 is resolved.

### ISS-056 The note landed in an implicit grid row, so the board was too tall and the meters too short
- Reported by Jim · 2026-10-15 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.board-body`, and the `grid-row` on its two children)
- Problem: the board looked wrong in a way no single rule explained — too much wood, and three squat
  meter pills instead of three thin bars. Reproduce: on a normal desktop window, compare the height
  of the meters column against the sticky note beside it.
- Cause: `.board-body` is a two-column grid and both children carry an explicit `grid-column`, set
  because `renderMeters()` appends the meters **before** the note and DOM order would otherwise put
  them in the wide left slot. With a definite column and an automatic row, the auto-placement
  algorithm is free to put each item in whichever row it likes, and it did not put them in the same
  one: the meters took row 1 and the note was auto-placed into an implicit row 2. One row too tall,
  and the meters left sharing half the space they should have had.
- Fix: pin both children to `grid-row: 1` explicitly. The `grid-column` rules stay — they are still
  load-bearing for the same DOM-order reason.
- Note: a comment in `.board-body` cited this as ISS-055, which is the meter-bar issue and something
  else entirely. Corrected to ISS-056. Worth flagging because a mis-cite sends the next reader to an
  entry that cannot explain the bug they are looking at.

### ISS-057 The hour notes clipped their own temperature
- Reported by Jim · 2026-10-15 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.board-notes`)
- Problem: none of the six hour notes showed its temperature. The strip was a short row of times and
  icons with the most useful number on each note cut off. Reproduce: look at the bottom strip of the
  board; every note reads time, glyph, then nothing.
- Cause: `.board-notes` was `height: 52px`, chosen when it held only a time and an icon. Each note is
  a column of `padding 17px 4px 5px`, a 10px time, a 22px glyph and a 13px temperature, and the glyph
  is the tallest of the three — so the temperature fell below the clip that `overflow: hidden` on
  `.note-hour` puts at the bottom.
- Fix: `height: 72px`, and `flex: 0 0 72px` with it so the strip claims that height in the board's
  flex column instead of being a suggestion. 17 + 10 + 22 + 13 + 5 is 67px of content plus the 1px
  gap, so 72px is the first whole number that fits.
- Note: the same short-window block that trims the strip to 56px carries its own copy of the rule, so
  the two must be changed together — which is the cost this file has for keeping a media block.

### ISS-058 The freshness line was drawn on top of the hour notes
- Reported by Jim · 2026-10-15 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.board-updated`)
- Problem: the "Updated 14:05" line sat across the bottom of the hour notes, overlapping them.
  Reproduce: on a window short enough that the board has no spare room, the freshness text lands on
  the hour strip.
- Cause: `.board-updated` was `position: absolute; bottom: 4px`, which was fine while the board was
  taller than its content and had empty wood at the bottom for the line to occupy. Once the board was
  sized to a third of the column the absolute positioning took it out of the flow, so it no longer
  reserved any space and simply overlaid whatever was at the bottom.
- Fix: back into the flow (`position: static`, `margin: 2px 0 0`), which is where a freshness line
  belongs once the board has no spare room — `#forecast-card` is already a flex column and takes it as
  a third child. `.board-updated:empty` hides it when there is no timestamp, so the board does not
  carry a blank line before the first reading.
- Note: **superseded by T-51 — `.board-updated` no longer exists.** The line's real problem was that
  it printed `current.time`, the same field the note's foot row already prints, so the board stated
  one instant twice. It is now a `.note-status` span inside the big note and renders only while the
  forecast is paused, so `#forecast-card` has two children again and nothing sits near the hour notes.
  The fix above is still what was true on 2026-10-15. See DEC-032.

### ISS-059 The board's right peg drew as a flat bar on short windows
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `css/weather.css`, inside `@media (max-height: 960px) and (min-width: 901px)`
- Problem: at a window under 960px tall the board's two pegs did not match. The left one stayed a
  vertical post; the right one rendered as a thin dark rectangle about 4px tall. Reported as "the
  right side board piece is missing", which is what it looked like — half the board's hanging
  hardware had gone.
- Cause: the short-window block overrode `::before` and `::after` as if they were two different
  things. `::before` became two 20×15px gradient planks, `::after` two 23×4px dark bars. Both
  pseudo-elements are pegs, so the pair only ever agreed at the base rule.
- Fix: both overrides deleted, with a comment in their place. Both pegs keep the base 10×16px post at
  every height, so there is one drawing of them rather than two that must agree.

### ISS-060 The last meter pill's bottom edge was clipped flat
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.board-meters`, `.board-body`)
- Problem: the rain-chance pill, bottom of the meters column, had no bottom edge, while humidity and
  wind above it did. Reproduce: any board size — the pill is always flush with the bottom of the
  board-body grid row. Reported as the hour notes "blocking the shadow of the rain chance pill".
- Cause: not the hour notes, which are outside `.board-body` entirely. `.board-meter` draws its
  bottom edge with `box-shadow: 0 3px 0`, and `.board-body` — the pill's own container — is
  `overflow: hidden`. The meters stretch to the grid row's full height, so the last pill's shadow
  falls past the row and is cut off inside `board-body`. The notes are the nearest thing below it,
  which is how they got the blame.
- Fix: `.board-meters` carries `padding-bottom: 3px` so the shadow has room inside the clip; the three
  pills share the shorter content box, so nothing else moves. `#forecast-card`'s `gap` also went
  6px → 10px, which is the breathing room that was actually being asked for — separate from the clip,
  and the reason the notes no longer touch the pill's edge.

### ISS-061 The wind meter's own label rendered as "W…"
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.board`, `.board-meter`), `js/ui/weatherPanel.js` (`renderMeters`)
- Problem: the wind pill read `W… 5 km/h NNW` — the label ellipsised to one letter while the value
  printed in full. Worse than untidy: the pill identified itself with a letter nobody can read.
- Cause: two things at once. `.board` is `clamp(420px, 38%, 520px)` and `38%` of the centre column is
  under 420px on a normal desktop, so the board sat at its floor and the meters column had about
  111px of inner width. In that space the value track is `auto` and takes what it asks for
  ("5 km/h NNW" is roughly 60px), leaving the label track about 19px. The label track was
  `minmax(0, 1fr)` — the explicit `0` minimum permits shrinking past the track's own `min-content`
  width, so "Wind" ellipsised rather than the layout admitting the row did not fit.
- Fix: three parts, all needed. The label track is a bare `1fr`, whose automatic minimum is
  `min-content`, so a short label can no longer be ellipsised. The compass bearing moved out of the
  value and into the pill's `title`, shortening the value to "5 km/h" (DEC-032). The board's width
  floor rose 420px → 450px.
- Note: the `min-content` floor means a row can now exceed the pill instead of ellipsising, so
  `.board-meter` gained `overflow: hidden` — a worst case that clips at the rounded border rather than
  drawing text on the bare wood. It does not clip the pill's own `box-shadow`, which is drawn outside
  the border box. Measured slack at the tightest full-size case ("Rain Chance" + "6%") is about 9px.

### ISS-062 The big note left its right-hand side empty while the place name was ellipsised
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `css/weather.css` (`.note-current`, `.note-loc`), `js/ui/weatherPanel.js` (`renderNow`)
- Problem: the place the forecast describes ran along the top of the big sticky note on one line,
  while the whole right-hand side of the same note was blank from top to bottom — about 84px of dead
  paper at the board's 450px floor and 127px at its 520px ceiling. Reported as "a lot of blank space
  on the right side of the current forecast", with the request to move the place name there.
- Cause: the note was a single left-aligned flex column. Its widest row is the temperature — glyph,
  gap and "24°" plus the unit — and that row is narrower than the note at every window size, so the
  space was never going to be used by anything. The place line, with nowhere to grow, was `nowrap`
  with an ellipsis: a two-word place became "Kuala L…".
- Fix: the note is a grid — the condition spans both columns, the temperature takes the left and the
  place takes `minmax(0, 1fr)` on the right, so it gets exactly what the temperature does not need.
  The place line wraps to two lines instead of ellipsising, which is what "Dhaka, Bangladesh" needs at
  the board's floor and what "Kuala Lumpur, Malaysia" needs at any width. See DEC-033.
- Note: `auto` for the left track rather than a percentage, so no window size can make the two
  overlap. Two side effects rode along: `.note-status`'s `align-self: flex-end` became `justify-self:
  end` (in a grid, `align-self` is the block axis, so the paused line would have jumped to the left
  edge), and `.note-idle`'s `flex: 1` became an explicit span of every cell, since it is inert in a
  grid container and the idle note would have shrunk into the left column alone.

### ISS-063 A farm with no location printed an empty place line
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/ui/weatherPanel.js` (`locationLine`)
- Problem: any farm whose `location` had neither a name nor a country rendered the place line as an
  empty `<span>` — invisible, with nothing in the console to say why. On the board that is
  indistinguishable from the feature being missing, which is how it was reported: "the current
  location is missing from the weatherboard".
- Cause: `locationLine()` returned `''` for a location with nothing in it, and `renderNow()` builds the
  span unconditionally. The panel this replaced printed `parts || 'Unknown location'`; the wooden-board
  rewrite kept the span and dropped the fallback.
- Fix: `locationLine()` answers a name for every input, `'Unknown location'` included. It also stopped
  throwing on a null location, which the old `[location.name, location.country]` spelling did.
- Note: written up as part of T-52 because the right-hand column makes an empty line *conspicuous*
  rather than invisible — a blank column is worse than a blank row. `tests/weatherPanel.test.js` pins
  all four empty shapes: no location, `{}`, blank strings, null fields.

### ISS-064 The big temperature prints its unit twice
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: open
- Where: `js/ui/weatherPanel.js` (`renderNow`, `formatTemp`)
- Problem: the note's large temperature renders as **"24°°C"** — a degree sign on the number and a
  second one on the unit that follows it. Reproduce: any live reading.
- Cause: `formatTemp()` answers `24°`, and `renderNow()` puts that straight into `.note-temp-value`
  with `.note-temp-unit` — `°C` — as the next span. Both degrees are meant to be there for the hour
  notes, where `formatTemp()` is the whole value and there is no unit span following it; the big
  reading is the one place the two meet.
- Fix: **not fixed.** The big value should print the number alone beside the unit span. It needs the
  unit to come out of `formatTemp()` for this one call site without changing it for the hour notes,
  the `title` of a note, or "Feels like". Logged rather than folded into T-52 so the layout change and
  the unit fix stay separate commits.
- Note: it also costs the row that the place name now shares about 15px of width, since the stray
  degree is drawn inside `.note-temp-value` at 44px. Fixing it gives the place name that width back.

### ISS-065 The plot cluster was not centred on the base
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/ui/farmView.js` (`renderPlot`), `js/config/field.js`
- Problem: the 4×4 cluster sat about a sixth of the stage below the middle of `base.png`. The back row
  floated on bare wood and the front rows hung off the base's lower-left and lower-right edges. The
  screenshot was reported as "the positioning of the lands on the base".
- Cause: `renderPlot` placed plots with
  `yPct = 50 + (col + row) * FIELD.tileScale * 25` and `xPct = 50 + (col - row) * FIELD.tileScale * 50`.
  **The two axes are not symmetric.** Over a 4×4 grid `col - row` has mean 0, so x happened to be
  centred; `col + row` has mean **3**, so the whole cluster was pushed down by
  `3 × 0.204 × 25` = **15.3% of the stage**. The centring term `(i - (n-1)/2)` was simply absent.
  This is an inline reimplementation of a formula that `docs/architecture.md` "Field geometry" already
  specifies as `shift(i)`, belonging to `js/utils/iso.js` — a file that did not exist.
- Fix: `js/utils/iso.js` created with `shift()` and `plotToScreen()`, and `renderPlot` routed through
  it. The cluster is centred.
- Correction (T-54, ISS-069 / ISS-071): this entry originally ended "an even 0.066 of the stage on all
  four sides". The **centring** is fixed and unchanged — over a 4×4 grid the cluster now sits on the
  origin on both axes. The `0.066` rim was measured against `base.png`'s bounding box, and against the
  top face no `tileScale` gives an even rim at all. The fix was sound; the second number read off it
  was not.

### ISS-066 The pump was pinned to the stage's corner instead of the base's centre
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `css/scene.css` (`.field-stage__pump`), `js/config/field.js` (`pumpScale`)
- Problem: the pump rendered in the bottom-left corner of the field stage, several board-widths away
  from the base, with nothing around it. Reproduce: any field render.
- Cause: `.field-stage__pump` was `width: 18%; bottom: 4%; left: 4%` — a corner anchor that had nothing
  to do with the base. `FIELD.pumpScale` and `FIELD.originX/originY` were declared and never read, so
  the documentation's rule — "the pump uses the same centre formula at `u = v = 0`", i.e. the dirt
  cross — had no implementation at all. `pumpScale`'s real value was a second, hardcoded `18%`.
- Fix: `farmView.js` writes the pump's `left`/`top`/`width` from `pumpBox()` — the stage centre, sized
  by `pumpScale` — the same way it places the plots. `scene.css` keeps only `position: absolute`,
  `translate(-50%, -50%)`, `z-index` and `pointer-events: none`.

### ISS-067 Five `FIELD` constants and `DIAMOND_CLIP` were declared and never read
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/config/field.js`, `js/ui/farmView.js`, `css/scene.css`
- Problem: `gap`, `crossGap`, `originX`, `originY` and `pumpScale` had no reader anywhere in `js/`, and
  neither did the exported `DIAMOND_CLIP`. AGENTS.md section 5 states the field geometry as **measured
  fact** — "do not re-derive, do not 'fix'" — but the code computed its own geometry from two
  hardcoded `50`/`25` multipliers and a hardcoded `18%` pump width. The documented numbers were never
  the numbers on screen.
- Cause: `js/utils/iso.js` was specified in the plan and in `docs/architecture.md` but never created,
  so the constants were written against a module that does not exist. `farmView.js` grew a substitute.
- Fix: `iso.js` now reads `gap`, `crossGap`, `originX`, `originY` and `pumpScale`. `gap` and `crossGap`
  now actually open the gaps they were written for: roughly 2px between plots and an 11px dirt cross
  at a 720px stage. `DIAMOND_CLIP` is still unread — the click-target change is ISS-004's, and mixing
  it into this one would have bundled a layout fix with an interaction fix.

### ISS-068 `architecture.md`'s `img top` line understated the tile's half-height
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `docs/architecture.md` "Field geometry"
- Problem: the code block said `img top = centerY - tileScale/2`, but the image box is
  `tileScale × tileScale * tileAspect` tall, so its half-height is `tileScale * tileAspect / 2`.
  Following the block literally gives a cluster **2.727** tile-widths tall while the same section,
  nine lines later, states **2.266** — and the `2.266` is the figure the whole `tileScale: 0.204`
  calibration is solved from.
- Cause: the line was copied from the `img left` line above it, which is correct there because the box
  is `tileScale` wide.
- Fix: `img top = centerY - tileScale * tileAspect / 2`. With the correction the documented cluster is
  4.21 × 2.265 tile-widths, which reproduces the `4.21t + 2r = 0.991` / `2.266t + 2r = 0.595` solve
  for `t ≈ 0.2037` and `r ≈ 0.0661` — i.e. exactly the configured `tileScale: 0.204` and the
  documented rim. The typo was the only thing in that section that did not check out.
- Note (2026-10-16, **superseded by ISS-069**): the `0.595` in that solve is `base.png`'s whole
  bounding box, skirt included, so `r ≈ 0.067` was never the rim it claimed to be. The typo was real
  and the fix above is right; the numbers it was checked against were not.

### ISS-069 `base.png` is an extruded slab, and the origin was taken from its bounding box
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/config/field.js` (`originY`), `docs/architecture.md`, `AGENTS.md` section 5
- Problem: `originY` was `0.499`, `base.png`'s bounding-box centre, and the comment next to it said
  "base.png has no 3D extrusion". Both are wrong. The slab has a ~72px skirt, its **top face** —
  the surface the plots stand on — is 992 × 520 centred at image y **0.462**, and the plots were
  being centred 3.7% of the stage too low, with the front row hanging over the bevel onto the skirt.
  Reproduce: any field render; the bottom rim is thinner than the top one.
- Cause: measured `base.png` row widths, found the widest rows at y 507–527 (centre 517) against a
  bounding-box centre of 499.5, and concluded "peaks at mid-height, therefore flat". For a flat
  diamond the widest row is a single row at the centre; for an extruded slab the *plateau* is the
  vertical skirt and its centre lands at the same place, because the bbox grows downward by exactly
  as much as the plateau's own half-height. The observation was right and the inference was not —
  the tell was that the plateau was 21 rows tall rather than 1, and 21 was read as noise.
- Fix: the base is measured as **two boxes**, not one. Top face 992 × 520, centre (0.5035, 0.462);
  skirt 72px, giving a 992 × 596 bounding box. `originX/Y` are the top face's centre, because that is
  the surface the field sits on. `architecture.md` and the `AGENTS.md` section 5 table both gained the
  second row. The wrong comment in `field.js` is deleted rather than amended.

### ISS-070 The ground tiles rendered at about half their intended size
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/ui/farmView.js` (`renderPlot`), `css/scene.css` (`.plot`, `.plot__ground`)
- Problem: each plot's ground diamond drew about **0.109 of the stage width** where the geometry is
  built for **0.203**. Everything was spaced for diamonds twice the size of the ones on screen, so
  the 16 plots sat as small tiles in the middle of a large base with a gap between every pair far
  wider than `gap: 0.03` asks for, and a dirt cross several times its intended width. This is the
  "it doesn't fit properly" that T-53 was reported against and did not fix — T-53 corrected where the
  plots were, not how big they were.
- Cause: `.plot`'s box was `width: 20.4%` with `padding-top: 10.98%`, i.e. `tileScale × tileScale *
  tileAspect` — a 0.538-aspect box. `ground_*.png` is a **square** 1000×1000 canvas whose diamond
  occupies only 53.5% of its height, and `.plot__ground` is `object-fit: contain`, which fits the
  whole image inside the box. In a 0.538-aspect box the binding dimension is the height, so the
  square image scaled down to `0.1098 × W` and the diamond inside it to `0.991` of that. The
  `tileAspect` factor was applied twice: once as the shape of the box, and again as the shape of the
  art inside it.
- Fix: **`.plot` is a square box of side `tileScale`** (`padding-top: tileScale`), matching the
  square canvas, so `contain` is an exact fit and the diamond draws at its full `0.991 × tileScale`.
  `tileAspect` now appears in exactly one place — the vertical step in `plotToScreen`, which is what
  it is for. `tests/iso.test.js` gained the assertion that would have caught this: the visible
  cluster is `4.21 × 2.265` tile-widths, measured from the **diamonds'** extents rather than the
  boxes', and boxes are 2.727 tall.

### ISS-071 An even rim between the cluster and `base.png` is geometrically impossible
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `js/config/field.js` (`tileScale`), `docs/architecture.md`, `AGENTS.md` section 5
- Problem: the documented calibration solves `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` and
  reports `t ≈ 0.204`, `r ≈ 0.067`. Against the real top face (ISS-069) the second equation is
  `2.265t + 2r = 0.520`, and the pair gives **`r = −0.0149`** — a negative rim. The 4×4 cluster at the
  documented `gap`/`crossGap` is **2.7% too tall** for the slab, so it cannot nest inside it with an
  equal border at any `tileScale`. `0.204` only appeared to fit because the skirt's 72px absorbed the
  overflow, which is also why the field looked plausible while sitting 15% off-centre (ISS-065).
- Cause: two independent ones. `0.595` was the bounding box rather than the top face (ISS-069), and
  the cluster is genuinely a slightly different shape from the slab — the ground art's `tileAspect`
  is `0.538` while the top face's is `520/992 = 0.524`. The plots are drawn 2.7% "taller" than the
  surface they tile, and no constant can reconcile that.
- Fix: pick the fit rather than pretend there is one. `tileScale: 0.2296` fills the top face
  **front-to-back** with a 1.3% border at the left and right. This is a deliberate choice, not a
  solved value, and it is recorded as one: an even rim does not exist, and the two alternatives
  (fill the width, or inset vertically) both look worse. See DEC-034.
- Consequence for ISS-005: its "even rim" premise is void too, so the "fixed by T-53" note there is
  corrected below.

### ISS-072 The crop layer is still sized for the old, half-height plot box
- Reported by Jim · 2026-10-16 · Owner: Kafi · Status: open
- Where: `css/scene.css` (`.plot__crop`), the T-06 plot layers
- Problem: `.plot__crop { width: 70%; bottom: 10% }` was tuned while `.plot`'s box was
  `tileScale × tileScale * tileAspect`, a 0.538-aspect box. The box is square now (ISS-070), so both
  percentages resolve against a different shape and the crop no longer sits on the soil it is growing
  in. It is also 12.5% larger in the frame, because 70% of a bigger box is a bigger number.
- Cause: nothing about the crop art changed — the box moved out from under a rule that had been
  calibrated by eye against the old box. No test covers it, because nothing asserts the crop's size.
  It is invisible in a fresh save: `owned: false` and `cropId: null` on every plot, so no crop layer
  is rendered until the player buys and plants.
- Fix: _pending._ The arithmetic, for whoever has a browser open: against a square box of side
  `tileScale`, `width: 99%` makes the crop the width of the ground diamond underneath it (0.99 versus
  the diamond's 0.992) and `bottom: 21%` centres the crop's height on the diamond's centre — half the
  box, less half of `rice_3`'s 0.589 aspect. At that size the crop's 0.589 aspect stands it ~10% proud
  of the soil on its own, which is the intent recorded in AGENTS.md section 5. Deliberately not
  applied blind: `field-reference.jpeg` is the calibration reference and it needs eyes.

### ISS-073 Two replacement characters survive in `issues.md` itself
- Reported by Jim · 2026-10-16 · Owner: Jim · Status: fixed
- Where: `docs/team/issues.md`, both in the **ISS-038** entry
- Problem: two lines in the **ISS-038** entry carry a `U+FFFD` where an em dash belongs: one after
  "token alone", one after "**Nothing secret enters this repo either way**". It renders as a black
  diamond on GitHub and in any correct editor. The two are not quoted here verbatim, so that this
  entry does not itself add two more.
- Cause: not lone `0x97` bytes, so ISS-030 does not cover it — the file decodes as valid UTF-8. The
  wrong *character* was substituted rather than a wrong byte left behind: this file previously held 338
  of them (`git show HEAD:docs/team/issues.md` still does) and a cleanup pass replaced all but these
  two.
- Fix: **done.** Both replaced with the UTF-8 em dash. The third `U+FFFD` in the file, in the ISS-030
  entry, is deliberate — that line quotes what GitHub renders, so it stays. Verified by scanning every
  `.md` / `.js` / `.mjs` / `.css` / `.html` / `.json` / `.txt` in the repo for `U+FFFD`: one left, the
  intentional one.

### ISS-074 A `clip-path` on the plot button eats the focus ring and the selection ring
- Reported by Jim · 2026-10-16 · Owner: Kafi · Status: fixed
- Where: `css/reset.css`, `css/scene.css` (`.plot`, `.plot__hit`, `.plot--selected`)
- Problem: `clip-path` clips **everything** an element paints, including its `outline`. The obvious way to
  give a plot a diamond hit area is the polygon on the button itself, and it would have quietly deleted
  the field's only two focus indicators. `reset.css` gives every `:focus-visible` a 2px outline at
  `outline-offset: 2px`, drawn outside the border box and therefore outside a diamond clip entirely, so
  keyboard focus on a plot would show nothing at all. `.plot--selected::after` is a ring at
  `inset: -4px`, and for the same reason nearly the whole of it is outside the diamond. Neither throws
  and neither renders wrong: they simply stop rendering, and nothing in the suite looks at either.
- Cause: `clip-path` is a paint-time clip on the whole element, not a per-part shape. Anything that must
  straddle the element's edge has to live **outside** the clipped element.
- Fix: **done by construction, before it shipped.** The clip went on a `.plot__hit` layer inside the
  button; `.plot` took `pointer-events: none` and the property inherits, so the whole square box is inert;
  `.plot__hit` turns it back on with `pointer-events: auto`. The button itself stays unclipped, so both
  indicators render exactly as designed and need no replacement. `tests/farmView.test.js` asserts the
  pair of `pointer-events` rules, because deleting the `auto` makes the whole field silently
  unclickable — no throw, no visual fault, the same shape of defect as ISS-007.
- Consequence for later: a ring that **follows the diamond** rather than the box is not expressible as
  "clip-path plus border". It needs a second clipped layer or a `filter`/`drop-shadow` pair. The box ring
  stays, deliberately, because it is the one shape that survives a free clip.

### ISS-075 The shop does not match the agreed art direction
- Reported by Jim · 2026-10-17 · Owner: Jim · Status: fixing
- Where: `shop.html`, `js/ui/shopView.js`, `css/shop.css`
- Problem: the seed shop renders as a plain white "glass card" list on a flat grey background — a
  generic SaaS panel, not a farm shop. The reference mockup (`FARM SHOP`, wooden sign, golden card top
  with the packet on a shelf, cream card body, coin + price, one chunky green `BUY +`) is not represented
  anywhere in the code. The card also carries three quantity buttons and an "In your bag" line that the
  reference does not have, and `shop.html` never loads `css/fonts.css`, so the display face the reference
  is set in falls through to the system sans with no error.
- Cause: the shop shipped as T-31 with the token-based chrome the rest of the app had at the time; no
  visual pass has ever been made against the reference. Not a crash — a look that was never applied.
- Fix: **in progress (T-57).** Repaint the shop in CSS + inline SVG (no new assets, so
  `js/config/assets.js` and `tests/assets.test.js` are untouched): grass/log-frame scene, wooden
  `FARM SHOP` sign, dark-green board with a fence strip, golden/cream cards, coin and sprout icons.
  `shop.html` gains the `css/fonts.css` link. The three `×1 / ×5 / ×10` buttons are kept (the purchase
  model and its tests are unchanged); only their labels and markup change. The page widens to ~1400px for
  four columns, the purse stays as a small top-right pill, and unavailable crops stay listed in the same
  card shape, dimmed. The shop becomes painted art like `login.html` and does not read `data-theme`.

### ISS-076 The connection banner is in flow above a 100dvh shell, so it jumps the page every autosave
- Reported by Hisham · 2026-10-17 · Owner: Hisham · Status: fixed
- Where: `index.html` / `shop.html` / `settings.html` / `profile.html` (`#connection-banner`),
  `js/ui/connectionBanner.js`, `css/components.css`, `js/main.js`
- Problem: the farm visibly lurches down and back every ten seconds, and again whenever the connection
  drops. Reproduce on a healthy connection with no action at all: open the game, plant nothing, wait.
  `#connection-banner` is an in-flow sibling **above** `<div class="app">`, and `.app` is `height: 100dvh`
  (`css/layout.css`). So when the banner un-hides it claims vertical space above a full-viewport box: the
  document grows past the viewport, the entire shell is pushed down, a scrollbar appears, and when the
  banner hides again everything snaps back. It is not a subtle nudge — the whole interface jumps.
- Cause: two things compound. First, the mount point is in normal flow rather than out of it, so any
  visibility change is a layout change. Second, and much worse, `copyFor('saving', …)` returns copy as well
  as `copyFor('pending', …)`, and `AUTOSAVE_MS` is `10000` — so a **routine successful autosave** briefly
  inserts a full-width bar. A save that works perfectly is the thing causing the jumping, which is why it
  reads as random: it recurs on a timer, not on any player action.
- Verified: `setSync('saving')` fires in `store.js` `saveNow()` on every write, and `main.js` re-renders the
  entire shell on every `sync` event, so the churn is doubled — the panel rebuild is a second, independent
  source of the flicker.
- Risk of the fix: the banner is deliberately loud and persistent (DEC-030, ISS-050), because "your farm is
  only on this device" is a fact to act on. Shrinking it to a corner chip must not quietly regress ISS-050,
  or a player stops noticing their farm has stopped syncing — which is the exact bug ISS-050 was filed for.
- Fix: **fixed in T-58.** `js/ui/connectionBanner.js` is now `js/ui/syncIndicator.js` — a
  `position: fixed` chip pinned bottom-left, which cannot shift layout on any page by construction. Two
  small dots: they wave while a save is in flight, sit static and dim when synced, and turn amber with a
  persistent `No connection` label when a write is queued. The escape hatch survives as a popover on click
  (Export + Retry + the ageing "last reached your account" line). To keep ISS-050 fixed, the *first* failed
  write still raises one toast — then the small persistent label holds the floor. Separately, `main.js`
  narrows its `on('sync')` re-render to the `pending` transition only, since that is the only one the panels
  render differently; that was the second, independent source of the flicker. `prefers-reduced-motion`
  needed no work — `reset.css:109` already clamps the wave. See DEC-037.
- Verified: `tests/connectionStatus.test.js` 20 → 28 cases, covering the always-present dots, the
  label-only-when-pending rule, the popover toggle and its `aria-expanded`, the unmount removing its own
  `document` listeners, and `advanceAnnouncement`'s one-toast-per-outage rule. `npm run check` passes.
  The pre-existing ISS-047 failure is unrelated and untouched.
### ISS-077 `reverseGeocode` posted lat/lon to Open-Meteo's forward-search endpoint
- Reported by Hisham · 2026-10-17 · Owner: Hisham · Status: fixed
- Where: `js/services/geocodeApi.js` (`reverseGeocode`), `js/main.js` (`useDeviceLocation`, `bootWeather`)
- Problem: every farm the game pins to the player's own coordinates is labelled **"Current location"**,
  on the weather board and in the success toast, instead of a place name. Reproduce on a clean profile:
  clear localStorage, open `index.html`, and read the place line on the board. Nothing needs to be
  clicked — see "Why it was always broken" below.
- Cause: `reverseGeocode()` sent `latitude`/`longitude` to `GEOCODE_URL`, which is
  `https://geocoding-api.open-meteo.com/v1/search` — Open-Meteo's **forward search** endpoint. That
  endpoint requires a `name` parameter and has no reverse mode at all, so the request can only ever
  fail. Verified live, not inferred:
  ```
  GET …/v1/search?latitude=23.81&longitude=90.41&count=1&language=en&format=json
  → 400 {"reason":"No value found (expected type 'String') at path 'name'. …","error":true}
  ```
  So `reverseGeocode` returned `{ok:false, reason:'http_400'}` for every coordinate on earth, and
  `main.js` fell back to the literal string `'Current location'`. The search box was never affected —
  `searchPlaces` sends `name=` correctly, which is why only this path shows the placeholder.
- Why it was always broken, and why nobody noticed: it is not intermittent and not environment-specific.
  A 400 looks identical to "the network is down" in a `catch`-and-fallback path, and the fallback is a
  plausible-looking English phrase rather than a blank or an error. Worse, `bootWeather()` calls
  `useDeviceLocation({announce:false})` automatically on first boot whenever `!saved.pinned`, so a brand
  new farm silently took this path and stored the placeholder as its location name.
- Cause of survival: **there is no `tests/geocodeApi.test.js`**. The module had zero coverage, and a
  permanently-400ing request is invisible without either a test or a live call.
- Fix: **fixed in T-59.** Point `reverseGeocode` at BigDataCloud's keyless
  `reverse-geocode-client` endpoint (`REVERSE_GEOCODE_URL` in `js/config/api.js`), which returns a place
  rather than the nearest building. Kept the existing `{ok, name, country, admin}` contract, so
  `main.js`'s call site and `locationLine()` are untouched. The name ladder is
  `city → principalSubdivision → countryName → coordinates`. That last rung is the point: the ladder
  always terminates in something truthful, so the `'Current location'` literal is deleted rather than
  shrunk, and a farm pinned mid-ocean still says where it is. Nominatim and Photon were measured and
  rejected — both return the nearest building. See DEC-038.
- **A test changed the design.** `locality` was on the first draft of the ladder and a test removed it:
  it carries regions rather than settlements (`"City of Westminster"` for London, `"Polynesian
  Triangle"` mid-ocean), so it would have put a plausible-sounding lie on the board in exactly the case
  the coordinate rung exists to handle. `city` was populated for every land coordinate probed, so
  dropping it costs nothing on land.
- Verified: `tests/geocodeApi.test.js` added, 16 cases — the module had **no test file at all** before,
  which is how this shipped. The load-bearing ones assert that the two directions do not share an
  endpoint and that neither sends the other's parameter, so the exact mistake cannot recur silently.
  `npm run check` passes. `locationLine()` is unchanged; its `'Unknown location'` guard (ISS-063) is now
  even less reachable, since `name` always carries a value.
- **The fix needed a second commit, because the first one only worked for new farms.** `bootWeather()`
  re-resolves the location when `!saved.pinned` — but the broken code pinned the coordinates
  *successfully* and failed only to name them, so it wrote `pinned: true` next to
  `name: 'Current location'`. `pinned` never returns to false, so **no pre-existing farm was ever
  re-resolved** and every current player kept the placeholder for the life of their save. Found by
  actually running the game, not by reading the diff. `needsLocationRefresh(saved)` in `js/main.js` is
  now that gate: exported, pure, and tested — it also checks the name against the one string the broken
  code could write, which is the honest way to migrate stored data since a flag added today cannot
  describe saves written before it existed. A farm that already has a real name is left alone, so
  nothing re-resolves on every load.
- **The migration then needed a third correction, again found by running it.** It called
  `useDeviceLocation()`, which asks `navigator.geolocation` for permission — to repair a *text label*.
  With the prompt pending or denied it silently did nothing on every load, which is indistinguishable
  from the fix not existing, and it re-prompted the player each time. The coordinates are already in the
  save, so `nameExistingLocation()` now reverse-geocodes those and touches no browser API at all. That is
  also more correct: it names the farm where it *is*, rather than wherever the device is standing now.
  Nothing is written unless the lookup succeeds, so a farm that cannot be named yet keeps its name and
  simply tries again next load.
- **Lesson, for whoever writes the next fix here:** both of these failed only at runtime, and both were
  invisible to `npm test` and to reading the diff. A migration that depends on a permission prompt is a
  migration that silently does nothing.

