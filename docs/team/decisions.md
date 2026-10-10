# Decisions

Short records of choices that were made, so nobody re-litigates them or accidentally reverses
them. Newest first.

Format: who decided, the choice, why, and what was rejected.

---

### DEC-026 The loading tips may paint before the session is known
**Decided by:** Hisham

**Choice:** a full-page veil with a spinner and a rotating weather/farming fact is mounted as the
first statement of `start()` on all four pages, and is therefore on screen while boot step 0 —
resolving the session — is still in flight.

**Why this needed deciding at all:** `docs/architecture.md` says the shell must not render before
auth, and boot step 0 exists precisely so a signed-out visitor never sees a flash of farm UI. A
loader sitting in that gap looks, to a reader, like a violation of that rule. It is not: the veil
reads no state, holds no farm data, and is destroyed on `location.replace`. What is forbidden is
the *shell* rendering early — a spinner does not tell anyone their gold or their crops.

**Rejected: putting the loader in the HTML.** It would be painted before any JS runs, which is
the one case that would genuinely leak pre-auth, and it needs an empty `<div>` in four markup
files — `almanac.html` is still a zero-byte file and would have needed one too. Appending from
`js/ui/loadingTips.js` keeps the rule "nothing is on screen until JS decides" intact.

**Rejected: showing nothing and shortening the wait instead.** `js/services/gotrue.js` really does
need `AbortController` deadlines; that is a separate fix and should happen regardless. A loading
screen is not a substitute for a request timeout, and this decision does not claim it is.

**The rule that makes it safe:** the veil paints nothing at all until `SHOW_AFTER_MS` (250 ms).
A page that renders faster than that never shows it, so the common case is unchanged and there is
no flash to get used to. See `js/config/tips.js` for the three thresholds and why each exists.

### DEC-025 Erasing progress is behind a password too, not just deleting the account
**Decided by:** Shabab47

**Choice:** the settings page's *second* destructive action — "erase all progress" — now takes
the password as well: two clicks and the password, same as deleting the account.
`supabase/migrations/006_password_gated_erase.sql` adds `erase_progress(password)`, which
compares the password with `crypt()` against the same bcrypt hash and deletes **only**
`public.farm_saves`, leaving `auth.users`, identities, usernames and farmers untouched so the
player stays signed in.

**Why it was not already:** the original reasoning was that the farm is entirely the player's
own and one click away from being rebuilt, so it was not "as bad as" deleting an account. That
is the wrong test. A farm is the accumulated product of real play, and *easy to replace is not
protected* — a stolen session token could destroy weeks of work, and after the fact the panel
could not tell the player it had done something irreversible without one. DEC-024 established
the rule for the account; this applies it to the other irreversible thing on the page.

**Same three properties as `delete_my_account`,** and each one is load-bearing: it takes no
account id and acts on `auth.uid()` only; `set search_path = ''`; EXECUTE revoked from
`PUBLIC` and granted only to `authenticated`. It fails closed the same way. `docs/setup.md`
checks all three functions' privileges in one query, because two of them being callable by
`anon` would undo both decisions.

**Also: one statement, not two calls.** The check and the delete are the same SQL, as in
DEC-024. A separate `verify_password` RPC would be one the browser could skip, which is the
exact gap DEC-022 had. `false` comes back on a wrong password and nothing is deleted.

**Also: the order in the entry point is the feature.** `makeDeleteProgress()` verifies and
deletes the server row *first*, then calls `clearLocalSave()` — not `clearSave()`, whose server
half is now a pointless request whose failure could be reported as a real one (ISS-041). The
earlier code cleared both copies first and asked afterwards, so a **wrong password wiped the
farm and still reported that nothing had changed.**

**Both actions now run through `runDestructive()`** (`js/ui/runDestructive.js`), which owns
that ordering and takes its collaborators as arguments so the invariant can be tested without a
DOM — `tests/dangerAction.test.js` asserts it as behaviour with fakes. The two hand-written
handlers had already drifted, and drift between two copies of "check the password, then
destroy" is exactly how the original bug happened.

**Rejected: asking in the browser only.** A password field that the client compares is
decoration; `authApi` would then have needed to expose a delete-without-password entry point,
which is the thing DEC-024 deleted and `tests/mainBoot.test.js` guards against.

**Rejected: one function with a flag,** e.g. `erase_progress(password, also_delete_account)`.
Two rows and two grants are cheaper to reason about than one function whose behaviour depends
on a boolean, and the permissions differ: neither may be callable by `anon`.

---

### DEC-024 Account deletion is immediate, behind a server-side password check
**Decided by:** Shabab47

**Choice:** `supabase/migrations/005_immediate_account_deletion.sql` installs one
`security definer` function, `delete_my_account(password)`. It compares the password
against the bcrypt hash in `auth.users.encrypted_password` using `pgcrypto`'s `crypt()`,
and only on a match deletes the row — which cascades to `auth.identities`,
`public.farm_saves` and `public.usernames`. The settings page takes two clicks and the
password; there is no delay and nothing to cancel.

**Also:** the password is checked **in the database**, not the browser. An earlier
version (DEC-022) scheduled the deletion and checked the password in
`js/services/authApi.js`, which left the RPC callable with any valid access token and no
password at all — ISS-040. Behind a 7-day window that was survivable, because `adopt()`
cancelled it on the next sign-in. Deleting on the spot turns that same request into
permanent loss, so the check had to move to where it cannot be skipped. The browser-side
`verifyPassword` is deleted, and `tests/mainBoot.test.js` asserts it stays gone.

**Also: the local provider verifies in the same call that deletes**, so neither provider
exposes a deletion a token alone can perform. `deletesAccountsInPlace` tells
`js/settings-main.js` which one to call.

**Why `crypt()` and not the admin API:** GoTrue's admin endpoint needs a `service_role`
key, which must never enter this repo (DEC-018). Comparing the hash is the only route to
a server-side check without one. The password is a bind parameter, not a query literal,
so it does not reach the Postgres statement log.

**It fails closed.** If `crypt()` is unavailable, pgcrypto lacks bcrypt, or the stored
hash is not bcrypt, the function raises and deletes nothing. An unverifiable password is
never treated as a correct one — the cost is that a project in that state cannot delete
an account at all, which is why `005` includes a test query for it.

**Rejected: keeping the 7-day window.** Both the delay and the automatic cancellation are
gone, so `003_account_deletion.sql`'s table, functions and `pg_cron` job are dropped rather
than left as dead weight. `003` stays in version control, so the countdown is one re-run away.

### DEC-022 Account deletion is a 7-day countdown cancelled by signing in
**Status:** superseded by DEC-024. Kept for the record — the grace period and the
server-side password check it forced are both explained above.
**Decided by:** Shabab47

**Choice:** `supabase/migrations/003_account_deletion.sql` installs four
`security definer` Postgres functions. A player who asks to be deleted gets a row in
`public.account_deletion_requests` with `delete_after = now() + 7 days`, and is signed
out. `pg_cron` runs `purge_expired_account_deletions()` hourly, which deletes from
`auth.users` and cascades to the farm, the username and `farmer_name`. **Signing in
again cancels it**, wired into `adopt()` in `js/services/authApi.js` rather than to a
button on the settings page.

**Why:** Deleting on the spot is unrecoverable for a misclick, and a sign-out-and-return
is exactly what someone who closed the tab halfway through does. The countdown is the
standard compromise: the account is genuinely on its way out, but there is a week in
which coming back cancels it. Because a returning player restores the session through
`adopt()` on every page load, "signing in cancels" needs no UI at all and cannot be
missed by a player who never finds a cancel button.

**Also:** the settings page asks for the password before scheduling
(`verifyPassword` in `authApi.js`, discarded rather than adopted — a credential check is
not a sign-in). The two-click confirm guards against a misclick; the password guards
against someone else at an unlocked keyboard. GoTrue rate-limits the endpoint, so it
cannot be brute-forced.

**Also: nothing is deleted when the deletion is *scheduled*.** Not the farm, not the
username, not the local save. An earlier version cleared the save at request time, on the
reasoning that the player had asked to be forgotten — which is wrong, and wrong in the
way that matters most here. A grace period exists so that changing your mind costs
nothing; clearing the farm the moment someone expresses doubt turns the countdown into a
countdown to *losing* the data rather than to choosing to lose it, and a player who comes
back to an empty farm has lost something they had not yet agreed to lose. Everything goes
at the end instead, in the purge's single statement, so there is no half-deleted state
either.

**Also:** the grace period means the email is **not** free for those 7 days — GoTrue
still holds the account, so a re-registration gets `email_taken`, whose message already
reads "sign in instead". Inherent to delaying a deletion, not fixable.

**Rejected: an Edge Function.** It works, and holds the `service_role` key in Supabase's
secret store rather than the repo. But it costs a deploy step, an email provider
(Resend or similar) for confirmation, and a token table — all to reach the same
privilege that `SECURITY DEFINER` reaches for free. See ISS-038 for the confirmation
step it would have bought.

**Rejected: `SECURITY DEFINER` over plain table permissions.** GoTrue owns `auth.users`,
so there is no grant available to a player. The function is the only route that needs no
secret anywhere.

**The safety argument, since this is the one place the project grants itself privilege:**
every function takes **no parameter** and acts on `auth.uid()` only, so a caller can
never name another account. Every function sets `search_path = ''` to close the
schema-hijack route. And EXECUTE is revoked from `PUBLIC` — which Postgres grants by
default, and which `anon` inherits — then granted only to `authenticated`. Drop any one
of those three and this becomes a way to delete anyone's account. `003` says so at the
grant.

### DEC-023 The local provider deletes accounts in place, and says so
**Status:** superseded by DEC-024, which keeps the shape and closes the gap. `deletesAccountsImmediately`
became `deletesAccountsInPlace`, and the local provider now verifies the password in the
same call that deletes rather than being exempted from the check.

**Choice:** `localAuth.deleteAccountData({ password })` removes the account at once and sets
`deletesAccountsInPlace = true`, which the settings page reads to choose between this and
the Supabase RPC.

**Why:** A scheduled deletion has nowhere to live on this provider. The moment the
player is signed out, the record of the request goes with the session, so
sign-out-and-return would reset the countdown forever — a countdown that cannot be
trusted is worse than none. The accounts table *is* the account there, so deleting it
is a real deletion rather than the real provider's approximation of one.

**Also:** the divergence is confined to the stopgap provider, which ships only if
`authApi.js` fails to load (ISS-027). Nobody should be on that path.

---

### DEC-020 The provider is chosen by one flag in `auth-main.js`
**Decided by:** Hisham

**Choice:** `js/auth-main.js` holds `const USE_LOCAL_PROVIDER`. When it is false,
the Supabase provider is loaded with a dynamic `import()`; when true, `localAuth.js`
is used. It is currently `false`, since `js/config/supabase.js` has a project URL and
anon key (ISS-028, T-29).

**Why:** DEC-017 and DEC-028 both describe the swap as "one import". A dynamic
import keyed off a named constant makes that literally true, keeps both providers
loadable for comparison, and means the switch is greppable rather than a
commented-out line someone re-enables by accident.

**Also:** the Supabase provider is loaded inside a try/catch. If the module is
missing or throws on import, the page falls back to the local provider and logs
the reason, because a working login beats a blank page.

**Also (T-29):** `loadProvider` is exported so `js/main.js` boots against the same
provider. It used to import `localAuth.js` directly, so with the flag flipped only on
the login page the two disagreed and the player was caught in a redirect loop — ISS-033.
Both entry scripts now call `loadProvider()` and both `await restoreSession?.()`, since
the Supabase access token is memory-only.

**Also (T-29):** guest play stays on `localAuth.js`, because a guest has no account
to sign into. So `localAuth.js` survives as the guest provider rather than being
deleted, which revises ISS-027's original fix.

**Note:** `js/config/supabase.js` exposes `__setForTest()`. An ES module namespace
is frozen, so a test cannot assign to an exported binding; without that hook the
provider suite could only ever exercise the "not configured" branch, leaving the
GoTrue error mapping — the part most likely to be wrong — untested. Now that the
committed URL and key are real, it is also what stops `tests/authApi.test.js` from
calling the live project.

---

### DEC-021 Save export ships unsigned until the backend exists
**Decided by:** Hisham

**Choice:** Export and import are built with a versioned envelope, a magic header,
a custom `.farm` extension, and a checksum for corruption detection — but **no
signature**, and no encryption. The payload stays readable.

**Why:** The signing secret has to live somewhere the browser cannot read, or it
is not a secret — anyone can open devtools and pull it out of the module graph.
Right now there is no server at all (ISS-032), so any client-side signature would
be decorative. Labelling it "encrypted" or "signed" in the UI would be a false
claim; a checksum that honestly detects a truncated or corrupted file is useful
today and costs nothing.

**The extension and header are labels, not protection, and are recorded as such.**
The OS does not enforce extensions — any file can be renamed, and any file can be
opened in an editor whatever it is called. What they buy is real but small: the file
identifies itself when it turns up somewhere unexpected, and an unrelated file fed
to the importer is refused before parsing. Anyone determined reads past the header in
five seconds.

**Double-clicking a `.farm` does nothing, deliberately.** The OS has no handler for
the extension and this project ships no desktop app, so double-clicking opens
whatever the OS guesses. Import is a click in the game that opens the file picker.
Registering an OS association would need an installed application, which is out of
scope.

**`.farm` was chosen over `.ffsave`, and it is a known collision risk.** It is a
common extension for unrelated farming games and mod files, so a player's Downloads
folder may hold other `.farm` files. That is tolerable *because* the magic header
(`FFARM/1`) is what actually identifies our files — the importer never trusts the
extension, and an unrelated `.farm` is refused with a clear message rather than
half-loaded. The header is named after the product rather than the extension so the
two cannot drift apart if either is renamed later.

**No client-side cipher was added, on purpose.** Encryption cannot work here: the
key must reach the browser to decrypt, and a key the player can read is not a
secret. XOR or base64 would turn a ten-second attack into a five-minute one and
change nothing about whether it succeeds, while costing the team a hand-rolled
cipher to maintain and audit.

**The tamper analysis lives in the code**, at the bottom of `js/state/transfer.js`,
next to a test that performs the whole attack and asserts it succeeds. It is not
only in this record on purpose: a security claim nobody runs is a security claim
nobody checks.

**Filename carries no player name** — just `forecast-farm-<date>.farm`. Filenames
leak into cloud-sync listings, backup catalogues, directory indexes and
screenshots; the display name is already inside the file, where it belongs.

**Consequence:** the export format carries a `verify` step that is a documented
no-op until the backend lands, so adding the signature later is a change inside
one function rather than a format change. The email or account id goes *inside*
the envelope as an identity claim; it is never used as key material, because
emails are public or guessable and a signature keyed on one is forgeable by
anyone who knows the address.

**Rejected:** client-side encryption of the save file, for the same reason DEC-018
rejected `supabase-js` — it would look like security while providing none, and it
would cost the team a dependency and a hand-rolled cipher.

**Related:** ISS-026 (client-side accounts are not real security), ISS-032 (no
project yet).

---

### DEC-018 Supabase over REST, no supabase-js
**Decided by:** team lead

**Choice:** The auth provider is the **Supabase REST API called with plain `fetch()`**,
in `js/services/authApi.js`. Not the supabase-js SDK. Anon key in
`js/config/supabase.js`; no secret in the client, ever — the export signing
secret stays server-side.

**Why:** DEC-002 and AGENTS.md both say no runtime dependencies, and a university
course project is the worst possible place to hand a judge a dependency tree. The
auth surface we need is seven calls: sign in, sign up, sign out, refresh,
password reset, password update and session restore. REST covers all of them
without a package, and `fetch()` is already allowed inside `js/services/` by the
layering rules.

**Consequence:** we write the request and error mapping ourselves, so
`js/ui/authErrors.js` has to exist and has to be the single place provider codes
become sentences. See DEC-019.

---

### DEC-019 One neutral message for every account-existence leak
**Decided by:** Hisham

**Choice:** On the sign-in path, every reason that reveals whether an email has an
account — wrong password, no such account, email not confirmed — returns the same
sentence: *"Check your email and password and try again."* On the sign-up path the
same reasons may be specific, because the player just typed that address.

The set of sensitive reasons is `ENUMERATION_SENSITIVE` in `js/ui/authErrors.js`,
and a test asserts every entry is neutralised.

**Why:** A login form that says "no account with that email" is an account
enumeration oracle. On a public form it lets anyone confirm whether a given address
is registered, which is the first step of targeted harassment and of credential
stuffing. This is not theoretical for a game anyone might link to.

**Rejected:** per-reason specificity on sign-in, because it is a better developer
experience. It is a worse player experience for the people it puts at risk, and the
developer already has the logs.

**Also:** the provider layer returns one reason for both branches too, not only the
message layer. Two layers is defence in depth, and the provider test asserts the
two reasons are equal so the layers cannot drift apart.

---

### DEC-017 Login ships before the field; local provider until authApi.js lands
**Decided by:** the team lead, on the lead's instruction

**Choice:** Sign-in and registration ship first, ahead of the isometric field.
`js/services/localAuth.js` is a **temporary** local provider implementing the same
contract as `authApi.js`, so the panel can be built and tested before the real
provider exists. It is deleted, and one import in `js/auth-main.js` changed, when
`authApi.js` lands.

**Why:** Login had to come first, but `authApi.js` needs a Supabase project and is
Shabab's file. A mock provider that hard-codes a session would teach nobody
anything; a local provider implementing the real contract lets the panel, the
wiring, the boot gate and the tests all be finished now, and leaves the provider
swap as a one-line change.

**Rejected:** writing `authApi.js` here too. It is Shabab's file and needs a project
URL and anon key I do not have. Two people writing it would be worse than a
documented gap.

**Consequence:** `localAuth.js` writes its own localStorage keys, which breaks the
"only `state/store.js` writes storage" rule. Logged as ISS-027 with an expiry: it
goes away with the real provider and must not survive into a release.

**Reverses:** section 14 of the implementation plan, which listed accounts as out of
scope. The plan is the older document; this record is the current intent.
---

### DEC-016 One folder per crop under `assets/images/crops/`
**Decided by:** team

**Choice:** Crop art lives at `assets/images/crops/<cropId>/<cropId>_<stage>.png`. Rice is
`assets/images/crops/rice/rice_1.png` through `rice_5.png`. Empty folders for wheat, potato, corn
and tomato are committed with a `.gitkeep` so the target is obvious and git tracks them.

```js
export const cropImg = (cropId, stage) =>
  `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
```

**Why:** Five crops times five stages is 25 files, and only rice exists today. Flat, that folder
is already hard to scan and gets worse with every crop added. Per-crop folders make a missing
crop an empty folder instead of a scattering of loose files, and the folder name always matches
the file prefix so a misfiled sprite is obvious.

**Rejected:** keeping it flat. It works right up until it doesn't, and the cost of moving later
is 25 `git mv` calls plus a path change in every doc that mentions a sprite.

**Also applies to:** `assets/icons/crops/`, which still holds 5 loose files. Not moved yet — see
ISS-001, since those files are all empty and will be replaced anyway.

---

### DEC-015 Measured geometry overrides guessed constants
**Decided by:** Hisham

**Choice:** `tileAspect: 0.538`, clip-path `22.4% / 75.6%`, `tileScale` starting at `0.204` —
all measured from the PNG alpha bounding boxes rather than taken from the plan's estimates.

**Why:** The plan's `tileAspect: 0.553` was described as measured from a 1000×553 ground PNG, but
every PNG is 1000×1000 and the diamond sits inside it. The real ratio is 0.538. A 3% error
compounds across three row steps and visibly misaligns the field. `tileScale: 0.22` also leaves
a rim 1.5× thicker at the front and back than at the sides, because `base.png`'s diamond is
h/w 0.600 and cannot nest perfectly around a 0.538 tile cluster.

**Rejected:** keeping the plan's numbers because they were close enough. They are close enough
to look plausible during a first build and not close enough to look right, which is the worst
combination — the bug survives review.

---

### DEC-014 Code icon paths as specified, accept broken images
**Decided by:** team

**Choice:** `config/assets.js` builds icon paths with no existence check and no fallback layer.
All 14 SVGs are 0 bytes and will render broken until art arrives.

**Why:** Keeps config pure and the UI simple. Text labels already carry the meaning in the
forecast strip and crop picker, so the panels stay usable without icons.

**Rejected:** an `existsSync` check with an emoji fallback. It adds a filesystem dependency to
config and a second code path through every icon consumer, for a problem that disappears the
moment the art lands.

**Revisit:** T-15.

---

### DEC-013 Weather is real-data only
**Decided by:** team

**Choice:** Weather always comes from the live API. The player's only levers are their own
actions — pump on/off, what to plant, what to buy. There is no player-facing weather control.

**Why:** It is the premise of the game. A player who can set the weather is not reading a
forecast.

**Consequence:** the force-weather dropdown stays behind `?debug=1` as a test tool, never a
feature. It also means the `hourly[0]` staleness in ISS-024 cannot be corrected by the player,
so it is documented as a deliberate MVP simplification.

---

### DEC-012 Remove `map.js` (Leaflet + Nominatim)
**Decided by:** team

**Choice:** Delete `js/services/map.js`. Location picking is a text search via Open-Meteo
geocoding, with no map popup.

**Why:** The old file called `L.marker`, `L.marker().setView` and `bindPopup` against a global
`map` that was never defined in the repo, and used `alert()` for the not-found case. It would
not run. It also violated every layering rule at once: DOM, `alert`, and a global Leaflet
dependency.

**Rejected:** porting it to a working Leaflet map. Out of scope, and it would add a dependency
to a project that currently has none.

---

### DEC-011 Stage is computed, never stored
**Decided by:** Hisham

**Choice:** `Plot` holds `plantedAt`, never `stage`. `stageOf(plot, now)` derives the stage on
every render.

**Why:** Growth then continues while the tab is closed with no catch-up logic, and changing
`growHours` or the stage formula needs no save migration.

**Rejected:** storing `stage` and advancing it on a timer. It drifts from real time whenever the
tab sleeps and needs reconciling on load.

---

### DEC-010 DOM `<img>` layers, not canvas
**Decided by:** team

**Choice:** The field is absolutely positioned `<img>` elements inside a square stage, sized in
percentages. No `<canvas>`.

**Why:** Plots are `<button>` elements, so they get focus, keyboard activation and accessible
names for free. Hit testing is a `clip-path`, not a hand-written polygon routine. Debugging is
inspect-element rather than a replotted frame.

**Rejected:** canvas, which would have been faster to draw but loses all of the above and makes
the 1 Hz water animation a repaint-everything problem.

---

### DEC-009 Plot price by purchase count, not plot id
**Decided by:** team

**Choice:** The price of the next plot is `PLOT_PRICES[ownedCount]`. The first plot is free
whichever plot you click, and the 100-gold plot is whichever one you click second.

**Why:** It guarantees the opening is always affordable and keeps the UI simple — there is one
"next price" rather than sixteen different ones scattered across the field.

**Rejected:** price per plot id, which needs a per-plot price table and can put the cheap plots
in awkward corners.

---

### DEC-008 Pump is pre-owned in the MVP
**Decided by:** team

**Choice:** The pump exists from the start, toggled with a click. Buying it is later.

**Why:** It is the answer to drought, and drought is the game's main threat. Making it a
purchase first would gate the core mechanic behind 250 gold that a new player cannot earn
without already surviving a drought.

**Rejected:** selling the pump in the shop from the start.

---

### DEC-007 Empty plot is the ground tile
**Decided by:** Hisham

**Choice:** An empty plot renders `ground_watered.png` or `ground_unwatered.png` and nothing
else. `rice_1` through `rice_5` are the five growth stages of a planted crop.

**Why:** The art only provides one empty state, so this is the only reading that works. It is
also the most common misreading of the assets, which is why it is stated in `docs/crops.md`,
`docs/architecture.md` and `js/config/crops.js`.

---

### DEC-006 4×4 field, four 2×2 zones, dirt cross at the centre
**Decided by:** team

**Choice:** 16 plots in a 4×4 grid, grouped as four 2×2 zones, with the pump at the crossing.
The cross paths are `base.png` showing through `crossGap` — there is no path art.

**Why:** Matches `docs/reference/field-reference.jpeg` closely enough, keeps 16 plots to a
number a player can hold in their head, and the zones make the "check the forecast, pick a
zone" decision legible.

**Rejected:** the larger grid in the style mockup, and drawing cross paths as separate assets.

---

### DEC-005 Open-Meteo geocoding replaces Nominatim + Leaflet
**Decided by:** team

**Choice:** `js/services/geocodeApi.js` calls the Open-Meteo geocoding API and returns up to 5
places. No map library, no tile server, no runtime dependency.

**Why:** One API for both weather and geocoding, no key, and no dependency. The old Nominatim
code also called `alert()`, which the project bans.

**Note:** an empty result omits the `results` key entirely rather than returning `[]` — see
ISS-012.

---

### DEC-004 Open-Meteo replaces the OpenWeatherMap placeholder
**Decided by:** team

**Choice:** `js/services/weatherApi.js` calls `api.open-meteo.com/v1/forecast`. No API key.

**Why:** The placeholder needed a key the team does not have, and Open-Meteo returns
`precipitation_probability` and `uv_index` in the same response the game already needs, so the
forecast strip costs no extra request.

**Note:** response `hourly.time[0]` is local midnight, not the current hour — see ISS-009.

---

### DEC-003 Keep `timeApi.js` as a fallback only
**Decided by:** team

**Choice:** The Open-Meteo response carries `timezone` and `utc_offset_seconds`, so the local
clock comes from there. `timeApi.js` is used only if those are missing.

**Why:** One fewer network call in the normal path. The endpoint is still live, so the fallback
is real rather than theoretical.

---

### DEC-002 Vanilla ES modules, no framework or bundler
**Decided by:** team

**Choice:** Plain ES modules and plain CSS, served as-is. `package.json` holds scripts only.

**Why:** Nothing in the design needs a framework, and the layering rules the project depends on
are much easier to enforce on raw imports. It also means the game runs from any static host
with no build step.

**Consequence:** ES modules do not work from `file://`. The project must be served over HTTP,
which is what `npm run dev` is for.

---

### DEC-001 Layering is enforced by a script, not by convention
**Decided by:** Hisham

**Choice:** `scripts/check-imports.mjs` fails the build on a forbidden import, on `fetch(` outside
`js/services/`, and on `document.` outside `js/ui/`, `js/debug/` and `js/main.js`. It runs in
`npm run check` before every commit.

**Why:** Four people on one repo will drift from a convention within a week. A check that fails
in under a second is the only form of architecture rule that survives contact with a deadline.
