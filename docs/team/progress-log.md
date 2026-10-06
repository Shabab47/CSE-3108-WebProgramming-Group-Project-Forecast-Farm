# Progress Log

One entry per work session, newest on top. Keep it to a few lines: what you did, what you
touched, what broke, what is next.

The per-person weekly notes that used to live in the README table are now in `members/`.

---

## Supabase project created, and the switch that would have broken login

- **Did:** Picked up T-29. Project `ygfrvwyydxrocvywzysk` created, URL and the `anon` key committed
  to `js/config/supabase.js`, `USE_LOCAL_PROVIDER = false`. That part is mechanical.
- **Problems:** Two, and the second is the reason this entry exists. **ISS-033** — the flag lived in
  `js/auth-main.js`, which only `login.html` loads, but `js/main.js` imported `currentSession` and
  `signOut` straight from `localAuth.js`. Filling in the config and flipping the flag as documented
  would have signed a player in on the login page and then bounced them straight back to it from the
  game page, forever. Related: `authApi.restoreSession()` had **zero callers**, so the memory-only
  access token made every page load look like a sign-out. `loadProvider` is now exported from
  `auth-main.js` and both entries call it. **ISS-034** — `isSupabaseConfigured()` read the
  test-override variables instead of the exported constants, so the guard and the request it protects
  were answered from different sources; both go through `connection()` now.
- **Files:** `js/config/supabase.js`, `js/auth-main.js`, `js/main.js`, `tests/mainBoot.test.js` (new),
  `tests/authApi.test.js`, `docs/*`, `README.md`
- **Also:** the anon key is committed, per DEC-018. `tests/mainBoot.test.js` decodes its JWT payload
  and asserts `role: "anon"` and the matching project ref, so a pasted `service_role` key fails the
  suite rather than shipping. ISS-027's fix was wrong — it said delete `localAuth.js`, but guest play
  has no account, so `signInAsGuest` lives only there.
- **Tests:** **131 passing, up from 121.** 10 new, all in `mainBoot.test.js`: boot step 0 in six
  shapes including the local provider having no `restoreSession`, plus the key-shape assertions.
- **Next:** ISS-031 — Shabab adds `http://localhost:5173` and the deployed origin to **Redirect URLs**
  and sets **Site URL** in the Supabase dashboard. Cannot be committed, so it is now a README setup
  step. Confirm email is off while iterating; free-tier SMTP is a few emails an hour shared by
  everyone. ISS-032 stays partly open: export is still **unsigned**, no server to hold the signing
  secret (DEC-021), and nothing may call it signed.

---

## Supabase provider, password reset, and exporting a farm

- **Did:** Picked up Shabab's login page and finished the parts that needed a real backend, then
  added saving. `js/services/authApi.js` now calls the Supabase REST API with plain `fetch()` —
  no SDK, per DEC-018 — split three ways so each has one job: `authApi.js` shapes sessions and
  decides which failures may differ, `gotrue.js` is the transport and the GoTrue error mapping,
  and `tokenStore.js` is the only writer of a token. Added `ui/passwordReset.js` for
  forgot-password, `state/transfer.js` for the export format, `utils/checksum.js`, and
  `ui/savePanel.js` for the buttons. `store.js` gained `adoptState`, `exportPayload` and
  `readImport`. Tests are at **121 passing, up from 56**.
- **Files:** `js/services/authApi.js`, `gotrue.js`, `tokenStore.js`, `js/config/supabase.js`,
  `js/ui/passwordReset.js`, `savePanel.js`, `js/ui/authErrors.js`, `js/ui/loginPanel.js`,
  `js/auth-main.js`, `js/main.js`, `js/state/store.js`, `transfer.js`, `js/utils/checksum.js`,
  `index.html`, `package.json`, `docs/architecture.md`, `docs/team/decisions.md`, `issues.md`,
  `ownership.md`, `tasks.md`, `README.md`, `tests/*`
- **Problems:** Four found, all fixed. **ISS-029** — `npm test` could not run at all: the script
  was `node --test tests/`, which Node 24 rejects, so all 56 tests were unreachable through the
  documented command. **ISS-030** — `decisions.md` was not valid UTF-8; three em-dashes had been
  saved as raw Windows-1252 bytes, which is the same failure that once turned `t` into `h` across
  82 lines. Two more caught while testing: `localAuth.js` did not implement `requestPasswordReset`,
  so the panel called `undefined` and told the player to check their connection; and the reset panel
  fell through to "a link is on its way" for any error that was not a rate limit, so on the local
  provider it claimed an email had been sent. Then a rebase bug of my own: it returned a shifted
  number instead of the plot object, which would have replaced all 16 plots with bare numbers on
  import. Three tests now exist so each cannot come back.
- **Also:** the export file is `.farm`, unsigned. It catches corruption and refuses a hand-edited
  file, but anyone who reads `utils/checksum.js` can recompute the checksum — there is a test that
  does exactly that and asserts it succeeds. Closing it needs a server-held key (DEC-021, ISS-032).
  Recorded rather than papered over.
- **Next:** Shabab creates the Supabase project and sends the URL and anon key (T-29, ISS-032);
  until then one flag in `auth-main.js` decides which provider runs. The reset flow also needs the
  origin in the project's allowed redirect URLs (ISS-031) or no email ever arrives. UI is still
  untested — no DOM in `node --test` and no browser here, so the panels need a manual pass.

---

## Hisham — dead code sweep after the Supabase project landed

- **Did:** Went looking for code nothing can reach, rather than trusting the word "dead" in a
  comment. Checked every file under `js/` for an import of it anywhere in `js/`, `scripts/`,
  `tests/` and the HTML, then checked every export of `config/auth.js` the same way.
- **Deleted `js/services/map.js`.** DEC-012 deleted this file weeks ago and the decision was
  logged, but it was still sitting on disk — broken Leaflet code calling an undefined `map`
  global and `alert()`. It was one of the six known layering violations, which is how a file that
  was supposed to be gone kept showing up in `npm run check`. Known violations are now **5, not 6**.
- **Deleted two dead config exports.** `SESSION_LIFETIME_MS` and `STRENGTH_LEVELS` were read by
  nothing anywhere. The password-strength buckets were never wired to the meter on the sign-up form,
  which shows live per-rule guidance instead, so the buckets described a UI that does not exist.
- **Fixed a duplication rather than deleting it.** `saveFile.js` spelled out
  `forecastFarm.save.v1:` while `config/auth.js` exported `AUTH_KEYS.savePrefix` for the same
  thing. Two sources for one storage key is how a change to one silently orphans every existing
  save. `saveFile.js` now reads the config. No behaviour change: the tests assert the exact keys.
- **What I did NOT delete, and why.** `localAuth.js` is 6.8 kB of account table, PBKDF2 hashing
  and session storage, and ISS-027 does prescribe deleting it now that `authApi.js` is live. I left
  it. It is not dead: `auth-main.js` still uses it as the fallback when `authApi.js` fails to
  import, `main.js` calls its `signInAsGuest()`, and **three test files use it as a fixture**,
  including `tests/mainBoot.test.js`. Deleting it is a refactor across Shabab's tests, not a
  dead-code sweep, and it belongs in its own commit with him rather than folded in here. It goes
  when `HASH` and the `accounts`/`session` keys go with it.
- **Also left alone:** `weatherApi.js` and `timeApi.js`. Both are junk today — a fake
  `YOUR_API_KEY` and code that writes straight into the DOM — but both are scheduled for T-04 and
  DEC-003 keeps `timeApi.js` as a deliberate fallback. Deleting them would delete planned work in
  Afif's folder, not dead code. They are the remaining five known violations and should disappear
  when T-04 rewrites them.
- **Files:** `js/services/map.js` (deleted), `js/config/auth.js`, `js/state/saveFile.js`,
  `scripts/check-imports.mjs`, `docs/architecture.md`, `docs/team/goals.md`, `docs/team/tasks.md`
- **Next:** ISS-027 with Shabab, once he is happy with the fallback behaviour. T-04 for the two
  placeholder services.

---

## Hisham — live provider check after the Supabase project landed

- **Did:** Shabab created the Supabase project and flipped `USE_LOCAL_PROVIDER`, and fixed two
  things my flag flip would have broken: **ISS-033**, where the login page held a Supabase session
  while the game page still read `localAuth` and redirected back in an inescapable loop, and
  **ISS-034**, where the "is it configured" guard answered about different values than were sent.
  Both good catches. With credentials in the repo I could finally do the thing none of the tests
  could: **probe the live GoTrue API.**
- **The point of the probe:** all 20 provider tests stubbed `fetch`, so the error table had never
  been compared against what the server actually says. It had been written from the docs.
- **Found:** **ISS-035** — GoTrue does not say `invalid email` for a refused address, it says
  `Email address "someone@example.com" is invalid`. My pattern missed it, so the reason became
  `auth_unknown` and a player who typed a bad address was told to try again rather than what was
  wrong with it. Fixed, with a test holding the real string. Two things the probe confirmed rather
  than broke: wrong password and unknown account return **byte-identical** text, so the enumeration
  guard holds at the provider as well as in the message layer; and rate limiting is live on the
  free tier, returning 429, which was already mapped correctly.
- **Also fixed:** the reset flow never sent `redirect_to`, so the recovery link depended on the
  dashboard's **Site URL** happening to point at `login.html` — the one page that reads the token
  out of the fragment. `auth-main.js` now derives it from `location.href`. That removed a silent
  failure where a reset could never complete. ISS-031 is now half mine and half Shabab's: the
  dashboard still needs the redirect URLs, and a live probe proved the endpoint returns 200 even
  for a disallowed origin, so that **cannot** be verified without receiving a real email.
- **Files:** `js/services/gotrue.js`, `js/services/authApi.js`, `js/auth-main.js`,
  `js/config/auth.js`, `tests/authApi.test.js`, `docs/team/issues.md`, `docs/team/ownership.md`
- **Also:** `js/config/auth.js` still claimed "this project has no backend". Now that it has one,
  that sentence was actively misleading, so it describes the legacy keys as legacy.
- **Next:** ISS-027 is now actionable and still open — with the real provider live, the account
  table and PBKDF2 hashing in `localAuth.js` are dead code kept alive only by a fallback path
  that never runs. **ISS-026** should be revisited too: accounts are genuinely server-backed now,
  so it is no longer accurate as written.

---

## Login rebuilt to the panel contract

- **Did:** Reworked the login page to the agreed contract after review. `ui/loginPanel.js` now
  exposes `mountLoginPanel(root, actions)` and imports no service, so it has no idea a provider
  exists. Split the file because a single version hit 277 lines against the ~200 budget:
  `ui/loginFields.js` holds the labelled inputs, `ui/uiPanel` keeps render and state. Added
  `ui/authErrors.js` — one pure `authErrorToMessage(reason, context)` that is the only place
  provider codes become sentences, and the only place that decides which sentence. On the sign-in
  path every account-existence reason collapses to one neutral message (DEC-019); sign-up may be
  specific. Session moved out of storage and into `state.session` as
  `{status, userId, email, farmerName}`, persisted by `store.js`. Added boot step 0 to
  `main.js`: resolve the session first, and if there is none redirect to login **without mounting
  the game**, so there is no flash of farm UI. Added the missing states — `aria-busy` plus a busy
  guard that absorbs a triple submit, an `aria-live="polite"` region, and guest play via
  `?guest=1` so a guest's farm cannot be resumed by anyone else on the machine. 56 tests.
- **Files:** `js/ui/{loginPanel,loginFields,authErrors}.js` (replacing `authView.js`),
  `js/domain/authRules.js`, `js/services/localAuth.js`, `js/state/{store,initialState}.js`,
  `js/{main,auth-main}.js`, `js/ui/topBar.js`, `css/auth.css`, `css/layout.css`,
  `tests/{authErrors,authRules,localAuth,store,initialState}.test.js`, `docs/architecture.md`,
  `docs/team/{decisions,issues,ownership,tasks}.md`
- **Problems:** My first rewrite cloned the sign-in fields to build the sign-up form, which
  duplicated every `id` — the labels and `aria-describedby` pairs would have silently pointed at
  the wrong element, and a duplicate id is exactly the accessibility bug the project cares about.
  Caught by asserting on the live DOM before trusting the screenshot. Now each form builds its own
  scoped fields, and there is a test-visible guarantee of zero duplicate ids.
- **Problems logged:** ISS-027, `localAuth.js` is a second writer to localStorage, which breaks the
  one-writer rule — it has an expiry and dies with the real provider. ISS-028, `authApi.js` does
  not exist yet, so login runs on the local stand-in. ISS-026, unchanged: client-side accounts are
  not security.
- **Open, needs Shabab:** the five blocking questions — identity (`auth.uid()` or email),
  `farmerName` uniqueness and where it lives, whether email confirmation is required, whether
  guest play is allowed in a release, and whether localStorage stays the save of record. The last
  one changes `store.js`, so I left the save local and did not invent a migration. See DEC-017
  and DEC-018.
- **Next:** `services/authApi.js` (T-28), then the isometric field (T-06).

---

## Login and registration, before the field

- **Did:** Built the sign-in / sign-up page the team lead asked to come first, and the shell it
  hands off to. `login.html` with two tabs, all validation in pure `domain/authRules.js`, the
  form itself in `ui/authView.js` with every account operation injected, and
  `state/accounts.js` doing salted PBKDF2-SHA256 at 210,000 iterations. `index.html` now
  guards on a session, resumes `forecastFarm.save.v1:<accountId>` or builds a fresh 200-gold
  farm, and matches the wireframe with placeholder panels. Also `package.json`,
  `scripts/dev-server.mjs` (dependency-free static server), `scripts/check-imports.mjs`,
  `.gitignore`, the full CSS layer, and 44 tests.
- **Files:** `login.html`, `index.html`, `package.json`, `.gitignore`, `scripts/*`, `css/*`,
  `js/config/{auth,api,field,game}.js`, `js/domain/authRules.js`, `js/state/{accounts,store,
  initialState}.js`, `js/ui/{authView,topBar,toastStack}.js`, `js/utils/{log,dom,normalize}.js`,
  `js/main.js`, `js/auth-main.js`, `tests/*`, `assets/icons/favicon.svg`, `docs/architecture.md`,
  `docs/team/{decisions,issues,tasks}.md`
- **Problems:** Two bugs only the browser could find. `store.init` read `account.id` while
  `currentSession()` returns `accountId`, so every save was written under the key `undefined`
  and no farm was ever resumed — the state was fine in memory, which is exactly why no unit
  test caught it; both are covered now. And `validateLogin` returned no `values`, so a failed
  login threw a `TypeError` and every credential error showed as "Something went wrong".
  `check-imports` also passes only because of a `KNOWN` list holding the six violations in the
  three legacy service files; it prints them and fails only on new ones.
- **Problems logged:** ISS-026. Accounts in localStorage are not security, whatever the hashing
  — no server, no recovery, and the save can be edited by hand. DEC-017 records that this
  reverses the plan's "accounts are out of scope", and why a mock was rejected instead.
- **Next:** the isometric field (T-06), which needs `utils/iso.js`, `farmView`, `plotTile`,
  `pumpView` and `css/field.css`. The panels are all placeholders and say so.

---

## Week 1 — team contributions

No game code was written this week. Everything below was design, artwork, services and
documentation, so that the build does not have to stop and ask questions later.

- **Shabab** — started the initial project and wrote the implementation plan, designed the crops
  and the seasons, and set up the team workflow.
- **Kafi** — produced all the crop artwork for rice (five growth stages) and the farm ground
  (watered and unwatered), and gave each crop its own folder so future art drops in cleanly.
- **Afif** — added the base APIs: weather, time and place lookup. Reverse geocoding is the one
  still outstanding, carried to week 2.
- **Hisham** — designed the full project structure and how the parts will pass data between each
  other, set the art direction every sprite follows, then wrote and committed the 16
  documentation files, including the layering rules and the 25-problem log.

Every known problem now has an owner. Three that would have broken the game were caught in that
review before any game code existed.

Art status is tracked separately in [`docs/asset-checklist.md`](../asset-checklist.md). Rice has
its five growth stages but **still needs both failure sprites**, and those are per-crop — so 46
assets are outstanding in total.

---

## Hisham — fix the project structure tree rendering

- **Did:** The annotated file tree in `architecture.md` was rendering as one collapsed paragraph.
  The section had no opening code fence, so the intended closing fence opened a block instead and
  every fence after it shifted by one — the tree *and* the field-geometry formulas below it both
  lost their code formatting. Added the missing fence: one line, CRLF, no content change.
- **Files:** `docs/architecture.md`, `docs/team/progress-log.md`. `architecture.md` is Shabab's
  folder per `ownership.md`, so this is a small fix that left the surrounding style alone and is
  flagged in the PR.
- **Problems:** None beyond the formatting. It went unnoticed because `architecture.md` holds the
  repo's only file tree — `README.md` links out to it rather than duplicating it — so one missing
  fence hit every reader at once. Checked all 21 markdown files; this was the only unbalanced one.
  Lines 84–90 were the file's only bare-LF lines in an otherwise all-CRLF file, which is what
  identified the bad paste.
- **Next:** Unchanged — week 2 still opens with T-02 tooling and T-03 config and state.

---

## Hisham — README cleanup, five-week shift, corruption repair

- **Did:** Recorded everyone's week 1 contributions and marked the planning week complete.
  Rewrote the README from 296 lines down to 101 — it was duplicating the crop table, the weather
  matrix, the notification strings and the season guide, all of which already live in `docs/`. It
  is now a short non-technical front page that links out. Moved the 78-line annotated file tree
  into `docs/architecture.md`, leaving a five-line summary behind. Shifted the plan to five weeks
  so week 1 is planning and weeks 2–5 carry the eight goals, two per week.
- **Files:** `README.md`, `docs/architecture.md`, `docs/team/goals.md`, `docs/team/README.md`,
  `docs/team/members/*.md`, `docs/team/tasks.md`, `docs/game-design/implementation-plan.md`
- **Problems:** Two documentation files were silently corrupted by a batch edit and had to be
  restored from git — `docs/team/README.md` and `members/shabab.md`, where the letter `t` had been
  replaced by `h` across 82 lines, turning "Team Docs" into "heam Docs". Caught by reading the
  actual `git diff` instead of trusting the edit to have landed. Both restored and verified.
  Bulk string replacement across markdown files is not safe here; edits go through the editor.
  Also removed a stale claim that a "Map API" exists — that file was deleted in DEC-012.
- **Next:** week 2 opens with T-02 tooling and T-03 config and state. Nothing in the game is built
  yet, so those two tasks unblock everything after them.

---

## Hisham — pull and README structure

- **Did:** Pulled `origin/main` (fast-forward `7e65a24..0cec268`), which brought in the MIT
  LICENSE from Shabab — closes ISS-002 and ISS-021. Rewrote the README project structure as a
  real annotated tree of the repo as it stands, with a status legend.
- **Files:** `LICENSE` (pulled), `README.md`, `docs/team/README.md`, `docs/team/issues.md`,
  `docs/team/progress-log.md`, `docs/team/members/shabab.md`
- **Problems:** ISS-002 fixed (LICENSE now MIT, © 2026 Tawfik Rahman Shabab). Worth raising with
  the team: MIT names one copyright holder — if the other three members want their names on it,
  one line and one commit is the cheapest time to change it. ISS-025 still open.
- **Next:** start T-02 (tooling) and T-03 (config and state). Phase 0 needs `package.json`,
  `scripts/check-imports.mjs`, `utils/log.js` and a first passing test before anything else can
  be built on.

---

## Hisham — goals board, no names

- **Did:** Removed owner names from `goals.md` — goals are shared work, and who is on what is
  tracked in `tasks.md` instead.
- **Files:** `docs/team/goals.md`
- **Problems:** none
- **Next:** pull `origin/main`, then T-02

## Hisham — initial audit and docs tree

- **Did:** Audited the implementation plan against the actual repository before writing any code.
  Measured the alpha bounding boxes of all 9 PNGs, verified both Open-Meteo endpoints with live
  requests, and checked the git state. Built the `docs/` tree: architecture, crops,
  weather-events, notifications, crop-choice-guide, the team docs, and the 4-week goals board.
  Restructured `assets/images/crops/` into one folder per crop so 25 files are not loose in one
  directory (DEC-016).
- **Files:** `docs/architecture.md`, `docs/crops.md`, `docs/weather-events.md`,
  `docs/notifications.md`, `docs/crop-choice-guide.md`, `docs/team/*`,
  `docs/reference/*.jpeg`, `assets/images/crops/rice/*`
- **Problems:** Three things the plan would have shipped broken. Dead crops could never be
  cleared or replanted, bricking a plot permanently (ISS-006). The pump's transparent PNG canvas
  covers the tips of two plots and eats their clicks (ISS-007). `check-imports` as specified
  fails on `utils/dom.js`, so it could never pass (ISS-010). Also 14 empty SVG icons (ISS-001),
  `tileAspect` off by 3% (ISS-003), and `hourly[0]` is midnight rather than the current hour
  (ISS-009).
- **Next:** Pull `origin/main`, then start T-02 tooling and T-03 config and state. Confirm the
  ownership split at the next meeting (ISS-025).

