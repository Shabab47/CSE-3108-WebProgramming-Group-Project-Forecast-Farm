# Progress Log

One entry per work session, newest on top. Keep it to a few lines: what you did, what you
touched, what broke, what is next.

The per-person weekly notes that used to live in the README table are now in `members/`.

---


## Square book and inventory button art — 2026-10-20

- **Did:** both sidebar buttons got redrawn art — `book.png` and `inventory.png` are now both
  1254×1254, matching the square shop and settings buttons. The previous book drawing was
  1470×1070 and letterboxed to a smaller size inside the 64×64 `.sidebar-btn__img` slot; that
  mismatch is gone.
- **Touched:** `assets/images/book/book.png`, `assets/images/inventory/inventory.png`,
  `js/config/assets.js` (sizes and the book dimensions/comment), `docs/asset-checklist.md`,
  `docs/team/progress-log.md`.
- **Verified:** `npm test` and `npm run check` pass; PNG headers read back 1254×1254.
- **Next:** commit and push after approval.

## Navbar avatar, fourth preset and ring — 2026-10-20

- **Did:** the farm navbar's profile tile now shows the selected preset instead of the generic
  user icon, falling back to the same gray person as the profile page. `mountNavbar()` receives
  `state.profile.avatar` from `main.js`; the 40px tile is circular, carries the same 2px tan ring as
  the profile picker, and still links to `profile.html` with `?guest=1` preserved.
- **Fourth preset:** `farmer4` joined `AVATARS` with the supplied drawing in `avatarArt.js`; the
  picker now shows five options and wraps if the avatar panel is too narrow for the row. Because
  the drawing carries `<clipPath>` ids, `avatarArt()` suffixes them per render so the main circle
  and the selected option cannot repeat an id. T-71 is done.
- **Fixed:** ISS-111. `HEAD` still had the six black bars in Farmer 3's SVG; they were removed
  together with the redundant `clip0_3_11` wrapper, and `avatar.test.js` now guards the bars and the
  wrapper.
- **Touched:** `js/ui/navbar.js`, `js/ui/avatarArt.js`, `js/config/avatars.js`, `js/main.js`,
  `css/navbar.css`, `css/profile.css`, `tests/navbar.test.js`, `tests/avatar.test.js`,
  `tests/profileView.test.js`, `tests/mainPageBoot.test.js`, `docs/architecture.md`,
  `docs/team/{decisions,issues,tasks,progress-log}.md`.
- **Verified:** `npm test` 650/650 pass, `npm run check` clean (2 known, T-04); the four preset
  tiles were also rendered at 40px and checked by eye.
- **Next:** commit only after approval.

## Third preset avatar, after pulling main — 2026-10-20

- **Did:** pulled the latest `origin/main` into `jim` (almanac and inventory pages), then
  added `farmer3` to the preset list and removed the stray black bars and the redundant
  `clipPath` from its inline SVG. `avatarArt.js` now has three drawings, and the picker has
  four buttons including the default.
- **Why:** the third drawing was in `ART` but not `AVATARS`, so the store could not select
  it. The black bars behind the head read as a swastika at avatar size and could not ship.
- **Touched:** `js/config/avatars.js`, `js/ui/avatarArt.js`, `tests/avatar.test.js`,
  `tests/profileView.test.js`, `docs/architecture.md`,
  `docs/team/{decisions,tasks,progress-log}.md`.
- **Verified:** `npm test` 642/642 pass, `npm run check` clean (2 known, T-04).
- **Next:** merge the branch.

## The seed bag page, and the inventory button - 2026-10-20

- **Did:** added a fourth button to the farm sidebar, under the almanac button — the crate
  (`assets/images/inventory/inventory.png`). It opens a new page, `inventory.html`, which lists the
  five crops with how many seeds are in the bag, the seed packet art the shop uses, and the purse.
  The page resolves the session and loads the save like the shop does, because it reads the bag.
- **Read-only:** no buy or sell buttons. The shop stays the only place gold moves, so the two pages
  cannot disagree about a count.
- **Split:** `js/ui/inventoryView.js` (page), `js/ui/inventoryLauncher.js` (sidebar button),
  `js/inventory-main.js` (entry), `css/inventory.css`. `tests/inventory.test.js` covers the view.
- **Touched:** `inventory.html`, `js/inventory-main.js`, `js/ui/inventory{,View,Launcher}.js`,
  `js/main.js`, `index.html`, `js/config/assets.js`, `css/inventory.css`, `tests/inventory.test.js`,
  `tests/mainPageBoot.test.js`, `docs/architecture.md`, `docs/asset-checklist.md`, `docs/setup.md`,
  `docs/team/{decisions,progress-log}.md`
- **Verified:** `npm test` 616/616 pass, `npm run check` clean.
- **Next:** the book button's art is still landscape in a square box.


## The crop almanac — a static reference page — 2026-10-20

- **Did:** the book button on the farm sidebar (directly under the shop button) opened the farm
  itself. It is now the almanac button: `js/ui/inventoryLauncher.js` renamed to
  `js/ui/almanacLauncher.js`, mounted at `#almanac-launch`, and it opens a new page —
  `almanac.html` — with the five crops and, for each, how long it grows, what a full-health
  harvest pays, and how it reacts to every weather event. The page is static: no session, no save,
  no network, because it only wants reference text (ISS-019).
- **Split:** `js/ui/almanac.js` (page: header, back link, grid), `js/ui/almanacCard.js` (one crop)
  and `js/ui/almanacWeather.js` (the reaction grid). `RATING_WORDS` moved out of `cropPicker.js`
  into `config/cropWeatherMatrix.js` so the picker and the almanac cannot disagree.
- **Noticed:** the canonical event list (`config/weatherEvents.js`) has nine events, but
  `CROP_WEATHER` rates eight — high humidity has no crop opinion, so it reads "fine". The almanac
  lists all nine so it matches the forecast.
- **Touched:** `almanac.html`, `js/almanac-main.js`, `js/ui/almanac{,Card,Weather}.js`,
  `js/ui/almanacLauncher.js`, `js/ui/inventoryLauncher.js` (renamed), `js/ui/cropPicker.js`,
  `js/config/assets.js`, `js/config/cropWeatherMatrix.js`, `js/main.js`, `index.html`,
  `css/almanac.css`, `tests/almanac.test.js`, `tests/mainPageBoot.test.js`, `docs/architecture.md`,
  `docs/asset-checklist.md`, `docs/setup.md`, `docs/team/{issues,tasks,goals,decisions}.md`,
  `docs/team/members/kafi.md`, `js/ui/loadingTips.js`
- **Verified:** `npm test` 609/609 pass, `npm run check` clean.
- **Next:** the book button's art is landscape (1470×1070) in a square 64×64 box, so it letterboxes.


## Wet ground dries in place, and profile gets preset avatars — 2026-10-20

- **Did:** fixed ISS-110 — a plot crossing the 40-water threshold now swaps `.plot__ground`
  in the same fast path that moves the meter, so a drying plot cannot keep the watered sprite
  until an unrelated rebuild. The meter's CSS transition is untouched, and the new
  `tests/farmView.test.js` case walks below → above → below and proves the tile is reused.
  The Account card now shows a default gray person or one of two inline-SVG farmer busts, with
  three picker buttons under the circle; the authed "These are the details you signed up with."
  hint is gone, while the guest browser-only note stays. `state.profile.avatar` stores
  `farmer1` / `farmer2` / `null`; old saves are repaired by `ensureProfile()` without a
  `STATE_VERSION` bump, and an id this build does not know falls back to the default.
- **Kept:** the shop files, every tested string, both danger-card flows, the guest hint, and the
  avatar across "Erase progress" — it is a profile choice, not farm progress. Deleting the
  account removes it with the save.
- **Touched:** `js/ui/farmView.js`, `js/ui/plotLayers.js`, `js/ui/accountCard.js`,
  `js/ui/profileView.js`, `js/ui/avatarArt.js` (new), `js/config/avatars.js` (new),
  `js/state/initialState.js`, `js/state/store.js`, `js/profile-main.js`, `js/settings-main.js`,
  `css/profile.css`, `tests/farmView.test.js`, `tests/profileView.test.js`,
  `tests/avatar.test.js` (new), `tests/store.test.js`, and the docs below. Cross-folder edits:
  `farmView.js` / `plotLayers.js` / `state/` are Hisham-owned; `accountCard.js` / `profileView.js`
  / `profile.css` are Kafi-owned.
- **Verified:** `npm test` 628/628 pass, `npm run check` clean (2 known, awaited by T-04).
  Headless Chrome at 1272×860 and an emulated 420×932 guest profile — the cards fit, the picker
  is legible at both widths, selecting Farmer 1 / Farmer 2 repaints the main circle and persists
  in localStorage, and the default gray person returns when `null` is chosen.
- **Next:** review the branch and click through a signed-in erase with the real server; the avatar
  carry-over is covered by code and state tests, not by a live deletion click.


## Danger cards side by side, and the account frame trimmed — 2026-10-20

- **Did:** Erase progress and Delete account now share one row on settings — two equal columns in
  `.settings-danger-row` at the 980px board, stacked below 900px. A guest has no delete card, so the
  lone erase card stays full width instead of leaving an empty half. The shared account frame lost
  the two full-height edge posts and the stone base: the beam, leaf garland, sign and dark wall
  remain, and the wall now runs to the bottom edge, so the scrolling board is never covered by a
  fixed plinth. Board bottom padding 72 → 40px (32 on mobile).
- **Kept:** the board order Difficulty → Erase → Delete → Save data, both arm→confirm→password
  flows, every tested string, and the shop's own frame — no `shop.css`, `shop-card.css`, `shop.html`
  or `shopView.js` change.
- **Touched:** `js/ui/settingsView.js`, `js/ui/pageFrame.js`, `css/settings.css`,
  `css/page-frame.css`, `css/page-header.css`, `tests/settingsDom.test.js`,
  `tests/profileView.test.js`, and the docs below.
- **Verified:** `npm test` 614/614 pass, `npm run check` clean (2 known, awaited by T-04). Headless
  Chrome at 1920×1006 (guest profile, signed-in settings) — the row is side by side, there are no
  posts or base, and the wall reaches the bottom. Settings still scrolls on a short window, by design.
- **Next:** hard-refresh and look at both pages. If the wall's thin vertical plank seams also count
  as beams, they are a one-rule change in `css/page-frame.css`.


## Profile and settings painted onto the shop's frame — 2026-10-20

- **Did:** both account pages now sit inside the painted farm the shop wears — grass with a scalloped
  edge, full-height log posts, a beam, a **leaf/vine garland** under it (the shop's scalloped awning
  stays the shop's), a hanging wooden sign, a dark wall and a stone base. Cream cards scroll on a dark
  board in front of it. `js/ui/pageFrame.js` builds the frame once for both pages and hands back the
  board; `css/page-frame.css` paints it, `css/page-header.css` the sign and board, and
  `css/page-card.css` supplies the cream cards and buttons, with `css/page-form.css` holding the
  settings-only fields and status messages. Profile is now Account (initials avatar,
  Farmer/Username/Email rows, sprout rule) plus Session (status dot, signed-in sentence,
  **Sign out** / **Leave guest farm**). Settings is Difficulty (two-up panels, check mark,
  `SELECTED` tag), the two red-headed danger cards, and Save data. `js/ui/icons.js` gained `sprout`,
  `session`, `arrow-left`, `logout`, `history`, `trash`, `check`.
- **Kept:** every tested string and every arm→confirm→password gate. `mountProfile`/`mountSettings`
  contracts and the `board` order (Difficulty → Erase progress → Delete account → Save data) are
  unchanged. **The shop was not touched** — no `shop.css`, `shop-card.css`, `shop.html` or
  `shopView.js` edit; putting it on the shared frame is a separate task with its own visual review
  (DEC-050).
- **Fixed after review (ISS-109):** settings was mounting `pageFrame()`'s **board** but not its
  **node**, then putting the cards beside the empty board. The page therefore had no hanging sign,
  no back link, no frame and no scroll — the Save data card (import/export) was unreachable, and
  the cards ran the full window width. It now appends the node and fills the board; a new test pins
  the frame, the "Settings" sign and all four cards inside `.page-board`. The same pass compacted
  both pages: columns are 980px (settings) and 860px (profile), card/board spacing and title sizes
  came down, card headings align left (`components.css` was pushing the titles right), and the
  profile avatar/session row shrank so its two cards fit without scrolling on a laptop.
- **Touched:** `profile.html`, `settings.html`, `js/ui/pageFrame.js` (new), `js/ui/icons.js`,
  `js/ui/accountCard.js`, `js/ui/profileView.js`, `js/ui/settingsView.js`, `js/ui/difficultyCard.js`,
  `css/page-frame.css` (new), `css/page-header.css` (new), `css/page-card.css` (new),
  `css/page-form.css` (new), `css/profile.css`, `css/settings.css`,
  `tests/profileView.test.js` (new), `tests/settingsDom.test.js`, `docs/team/issues.md`, and the
  docs below.
- **Verified:** `npm test` 612/612 pass, `npm run check` clean (2 known, awaited by T-04). Not checked
  in a browser — this environment has none, so the layout is arithmetic and the tests above.
- **Next:** someone with a browser should look at both pages at 1440×900 and ~380px wide; the board's
  bottom padding is the one number most likely to want a nudge.


## Gold coin on the plot price tag, and the `--font-body` that never existed — 2026-10-20

- **Did:** the locked plot's price tag was a bare digit on a gold pill. It is now the same coin the
  shop draws (`coinEl()` from `js/ui/shopArt.js`) plus a `.plot__price-num` span, so the price reads
  like every other gold amount and a seven-figure price ellipsises beside the coin rather than
  through it. The coin's `G` gained `font-family="Luckiest Guy"` — the purse's in-game coin had it,
  this shared one did not, so the letterform differed. **ISS-107:** `.plot__price` and
  `.crop-picker__name` both declared `var(--font-body)`, a property that does not exist, so the whole
  declaration was invalid at computed-value time and both silently inherited Nunito. Now
  `var(--font-display)`, matching `.farm-gold`.
- **Also:** `c3f93d0` retuned `.plot__crop` to `93% / 6.5% / 50.5%` and left `.plot__damage` on the
  old 100% box with `translate(-0.5%, -1.5%)`, so a damaged crop drew larger and lower than the
  healthy one. The damage layer now repeats the crop's three numbers and `tests/farmView.test.js`
  asserts they match. The test was red on `HEAD` against the old `100% / 1.5% / 49.5%`.
- **Also logged:** ISS-105 (potato's registry kept the rice placeholders' sizes), ISS-106 (a damaged
  potato asked for a file that does not exist) — both already fixed in the code and finally written
  up — ISS-107, and ISS-108 (the `rice-first` boot tip still called rice the only plantable crop,
  now that potato is available). Triage rows added for ISS-101–108; ISS-101's fix is visibly in
  `css/scene.css` but its entry still said open.
- **Touched:** `js/ui/plotLayers.js`, `js/ui/shopArt.js`, `js/config/tips.js`, `css/scene.css`,
  `css/crop-picker.css`, `tests/farmView.test.js`, `tests/mainPageBoot.test.js`,
  `docs/team/issues.md`, `docs/team/decisions.md`, `docs/team/tasks.md`, `docs/crops.md`,
  `docs/asset-checklist.md`, `docs/architecture.md`, `docs/game-design/implementation-plan.md`,
  `docs/team/goals.md`, `README.md`, `AGENTS.md`
- **Verified:** `npm test` 603/603 pass, `npm run check` clean (2 known, awaited by T-04).
- **Next:** land economy and market.


## Explicit `border: none` on plot button — user-reported fix — 2026-10-18

- **Did:** `.plot` had no explicit `border` property, relying solely on `reset.css`'s `button { border: none; }`. Added explicit `border: none;` to `.plot` in `css/scene.css` so the intent is self-documenting and not dependent on stylesheet load order. The visible border the user reported was most likely the `:focus-visible` outline (keyboard focus) or `.plot--selected::after` selection ring (click) — neither is a CSS `border` property.
- **Also logged:** ISS-104 (plot border declaration).
- **Touched:** `css/scene.css`, `docs/team/issues.md`
- **Verified:** `npm test` 597/599 pass (2 pre-existing asset registration failures unrelated to this change), `npm run check` clean.


## Duplicate "Dry" on dry plots removed — user-reported fix — 2026-10-18

- **Did:** a dry-damaged plot showed "Dry" twice — once as the permanent damage badge (`plot__damage-word`) and once as the water meter's state word (`plot__water-word`). Changed `plotLayers.js` to pass `null` instead of the damage word to `waterMeter()` when damage exists, so the meter shows the live water state (`waterState()`) which can change (dry → low → optimal → saturated), while the damage word stays once as the permanent badge above it.
- **Also logged:** ISS-103 (duplicate Dry indicator).
- **Touched:** `js/ui/plotLayers.js`, `docs/team/issues.md`
- **Verified:** `npm test` 599/599 pass, `npm run check` clean.


## Water meter moved inside the diamond — user-reported fixes — 2026-10-18

- **Did:** `.plot__water` was at `right: 6%` / `bottom: 26%`, which floats outside the diamond. First move to `right: 20%` was still outside (meter at x ≈ 80%, diamond's right edge at x ≈ 75–61%). Corrected to `right: 40%` / `bottom: 30%` so the 11px bar spans x ≈ 57–60%, inside the diamond's right edge (x ≈ 75% down to x ≈ 61% at those heights). Updated the CSS comment.
- **Also logged:** ISS-101 (water meter placement) and ISS-102 (the "border around plot" is `.plot--selected::after`, the intentional selection ring; `.plot` itself has no border — the empty space around the diamond is `ground_*.png`'s transparent corners). Broken forecast-strip icons are already known (ISS-001 / DEC-014), no new issue needed.
- **Touched:** `css/scene.css`, `docs/team/issues.md`
- **Verified:** `npm test` 599/599 pass, `npm run check` clean.
- **Next:** land economy and market.

## Week 3 closed, and the record was brought back in line — Hisham

- **Did:** the README had drifted from what the game does. Four of its paragraphs were not
  merely incomplete but **false** — *"the field itself is not on screen yet"* while sixteen
  plots render; *"frost can kill them"* against a health floor of 25; a pump described as
  keeping a crop alive when it waters **one plot and stops at its target**; and a quoted warning,
  *"Rain incoming — skip irrigation"*, **that has never existed in the game**. That string was
  `goals.md`'s G-07 acceptance criterion from week 1, read out into the README as though it were
  a shipped message. Corrected all four, and wrote week 3 up properly.
- **The plan is not the record.** Week 3 was labelled *"Land economy, then planting and
  growth"* and week 4 *"Pump, water and market"*. What actually shipped is that **G-07 landed
  two weeks early** — the weather was being fetched, classified and displayed while doing nothing
  to the farm, which is not shippable. The table now carries a *"Where it actually landed"*
  column, and the gaps row the README would have carried is **not** in it: ISS-096 and ISS-097
  are in `issues.md` where they belong, not on a front page.
- **Five new issues.** ISS-095 a typo'd asset status that shipped silently because nothing read
  the field. ISS-096 the time-to-optimal quote ignoring rain — in the file that already knows the
  rain rate, because `minutesToOptimal` destructures `ratesFor(...).dry` and drops `.rain` beside
  it. ISS-097 no warning against paying for rain (measured: **13 gold** billed for water a storm
  provided). ISS-098 `inventory.js` never written and `simulator.js` still 0 bytes. ISS-099 a
  harvested crop cannot be sold, so the weather's effect on money **pays into nothing**.
- **ISS-100, and the one worth knowing about.** DEC-039, DEC-040 and DEC-041 **each name two
  different decisions** — allocated independently on two branches on 17 October and merged
  without either side seeing it. About twenty-eight references across `js/`, `tests/` and `docs/`
  now have to be read in context, including one where `DEC-040` means *the starter plot* and
  another where it means *the pump*. Left with a warning block rather than renumbered: touching
  thirty files for a numbering tidy on the day before a demo is a bad trade.
- **The economy is the team's.** It is what slipped, it is the last thing between here and v0.1,
  and it touches plots, gold, seeds, harvest and the shop — four people's work. Recorded as such
  in the README, `goals.md`, `tasks.md` and ISS-099 rather than assigned to whoever is free.
- **Touched:** `README.md`, `docs/{goals,tasks,issues,decisions,asset-checklist}.md` in
  `docs/team/`, `js/config/assets.js`, `tests/assets.test.js`. **Deleted `fix-conflicts.mjs`** —
  a 20-line one-shot for ISS-078, already run, superseded by `noConflictMarkers.test.js`.
- **Also:** counted the assets properly for the first time. **65 registered, 36 done, 29
  outstanding** — of which 5 are unused duplicates and 4 are placeholders, so **24 are art
  somebody still has to draw.** `asset-checklist.md` had said 60/14/46 since week 1. Three
  `rice_*.png` damage sprites are now registered as 0-byte placeholders so the count includes
  them, and two tests guard the status vocabulary so ISS-095 cannot recur quietly.
- **Next:** land economy and market, everyone's. Then damage sprites, ISS-015, and ISS-096/097.

---

## The pump was running and the game blamed it — Hisham

- **Did:** rebuilt the water system around an **optimal band**, from the report *"the pump
  logic is completely broken, 2 crops died, watering could have saved them all this time"* —
  **with the pump running.** It was not broken in the way it looked. Four defects around a
  pump that was delivering water perfectly well.
- **The four:** (1) the death toast was **one fixed string** that never asked where the pump
  was; (2) `dryDamage` billed the **whole elapsed period** whenever a plot *ended* at 0
  water, so 12 h cost 60 health instead of 14 and 20 h killed a crop in one step; (3) the
  `moved` gate in `main.js` compared only `waterLevel` and `spent`, so damage was computed and
  then **discarded**; (4) the pump delivered its water as one lump at the **end** of the
  window while evaporation ran continuously, which modelled a pumped plot as dry for 22
  hours and then watered — the same defect as (2), one layer down.
- **The model now:** `OPTIMAL` gives each crop a target from its `waterNeed` (rice 85, corn
  70, wheat 55) and a band at its bottom quarter. `WATER.max` 100 → 120 so over-watering is
  reachable at all. **Damage latches** onto the plot and never clears — water is a live
  reading, damage is a committed fact, and a sprite driven off a value that changes every
  second strobes. Damage **cuts the payout and never blocks the harvest**, so it cannot
  rebuild the ISS-006 trap.
- **The pump stops at the target**, so "30–60 minutes" is a promise it keeps: 58 min rice, 46
  corn, 36 wheat, counting the evaporation that happens while it fills. Rate 0.05 → **0.028**
  (2× rain, was 36×), upkeep scaled to hold 5 water per gold.
- **Touched:** new `js/domain/damage.js` and `js/domain/plotWater.js` (split out of a
  492-line `water.js`); `pump.js`, `config/game.js`, `config/assets.js`,
  `land_squares/index.js`, `ui/{plotLayers,pumpPanel,farmView}.js`, `main.js`,
  **`css/scene.css` (Kafi's folder)**; tests appended to `weatherPanel` and `farmView`, no new
  test files.
- **Broke:** three real bugs **I** introduced, all caught before commit. `minutesToOptimal`
  *added* the dry rate instead of subtracting it, so a drought read as *faster* to water for.
  `timeOutsideBand` returned 0 for a plot that started below the floor, and then had the
  rising/falling branch inverted. And the pumped plot latched `dry` damage it never suffered,
  because the band check was interpolating it across the whole period instead of modelling
  "fills fast, then holds".
- **Broke, and it was mine to own:** a `WriteAllLines` after a PowerShell `Get-Content` read
  two files as ANSI and wrote them back as UTF-8, turning 44 em-dashes into `â€”`. Found by
  a `SyntaxError` on a doc comment that lost its `/**`. Repaired by codepoint with node; the
  lesson is the third time in this repo that PowerShell text surgery has cost more than the
  edit tool would have.
- **Tests:** 540 pass (was 537), `npm run check` clean.
- **Next:** Zim's damage sprites, named in `cropFailureImg()` — the logic is wired and the
  word renders, so the files can land with no code change. Worth **opening ISS-008 and
  measuring** the 2× now that both sides of the comparison run.

---

## The pump was a picture of a pump — Hisham

- **Did:** built T-09 and T-13 together, from the question "will drainage or add water by pump
  work?". **Neither existed.** `plot.waterLevel` was written once, to `0`, when a plot was
  created, and read in three places — all of them for drawing. `state.pump` was `{on: false}`
  and read by nothing, and there was no pump control anywhere in the UI. Of the four `WATER`
  constants only `wateredThreshold` was ever read; `pumpPerSecond`, `baseDecayPerHour`, `max` and
  `startLevel` were dead, as were `PUMP.upkeepPerSecond` and `HEALTH.dryDrainPerHour`.
  **`ground_watered.png` — 318 KB, registered in `assets.js` — could never be seen**, and the
  pump art on the field was decoration.
- **Touched:** new `js/domain/water.js` and `js/ui/pumpPanel.js`; filled the 0-byte
  `js/domain/notifications.js` (**Afif's file — I am the listed backup**); `main.js`,
  `farmActions.js`, `initialState.js`, `config/game.js`, `config/weatherEvents.js`;
  `css/scene.css` (**Kafi's folder**); tests appended to `tests/weatherPanel.test.js`, no new
  test files. **Note the ownership drift:** `ownership.md` lists a `js/domain/pump.js` and a
  `js/ui/meters.js`; I wrote `water.js` and `pumpPanel.js` instead. Worth renaming one side.
- **Decided (DEC-040):** pump waters **one plot**, aimed by clicking it, so a per-second bill
  cannot scale with land owned. `pumpPerSecond` 0.5 → **0.05**, which is ISS-008's own
  recommendation — and its "36×" was never a guess, it is `1800/h` against heavy rain's
  `50/h`, so at 0.05 the pump is **3.6× rain** and the comparison is finally measurable.
  `upkeepPerSecond` 0.05 → **0.01** scaled with it, or a full plot would cost 100 gold against
  a 100-gold rice margin; it now costs 20.
- **Broke:** two of my own bugs, both caught before commit. `pumpPanel` read `.style.height`,
  which the fake DOM in `mainPageBoot` does not have — boot crashed and left a live timer
  behind, so the whole **file hung** rather than failing. And I read the evaporation table's
  column as an absolute rate instead of a multiplier on `baseDecayPerHour`, which made bare
  soil dry at 1.5/h: a plot would take 133 hours, so nothing could ever be dry and the pump
  would still have been pointless. Both fixed, both now pinned by tests.
- **Found:** nothing in the codebase ever set `dead: true`. `plotLayers.js` had a dead-crop
  sprite branch, `farmView.js` a `plot--dead` class, `plotClick.js` the fifth `clear` case, and
  ISS-006 is filed about dead crops bricking plots — all wired, all waiting for a writer that
  did not exist. Dryness is now that writer.
- **A tip stopped lying:** `config/tips.js` told every player on a slow load that *"Rain waters
  your crops at no charge. The pump bills you gold every second it runs."* Both halves were
  false. Both are now true.
- **Tests:** 511 pass (was 494), `npm run check` clean.
- **Next:** ISS-008 should be **re-opened and re-measured** now that both sides exist — check
  the 3.6× rather than trusting the 36×. The pump has no visual feedback while running beyond
  the panel meter, and `pumpView.js` is still unwired (ISS-007).

---

## The weather was on screen and did nothing — Hisham

- **Did:** fixed ISS-089, from the question "is the farm really influenced by the weather?". It
  was not. Real weather came from Open-Meteo for the player's coordinates and appeared on the board
  in full — temperature, humidity, wind, rain chance — and **none of it touched a crop**. Growth was
  purely `plantedAt + growHours`, rain never watered anything, `plot.health` was set to 100 and never
  moved so the `health / 100` payout always paid at full quality, and `HEALTH.dryDrainPerHour: 5`
  was defined and never read.
- **Why nobody caught it:** four modules that would have done it were **0 bytes and never imported by
  any runtime code** — `domain/simulator.js`, `config/weatherEvents.js`, `domain/notifications.js`,
  `utils/season.js` — and `config/cropWeatherMatrix.js` held 124 lines of real rating data that only
  a comment and a test referenced. The matrix documented its own gap: *"Not wired to the simulator
  yet … a crop will not actually be harmed by a drought until the simulator lands."* It was filed as
  T-12, which had never started.
- **The design, and the reversal it contains:** a planting is judged **once, at sowing**, against the
  **next six hours** — sized to the crop line, since every crop is 4–8 h — and stored as
  `plot.health` + `plot.forecast`. **There is no simulator**, and `domain/simulator.js` is meant to
  stay empty. That reverses the per-hour model the thresholds were written for, which is why DEC-039
  exists. Health is floored at 25 so weather wounds and never kills; the season is a soft flat −10 and
  never a gate; the most severe hour wins so one frost hour cannot be averaged away; and the picker
  shows the verdict before the seed is spent, then refuses to plant without a forecast.
- **Two real bugs found while auditing the empty files.** `domain/seasons.js` computed the southern
  hemisphere by rotating a six-element list by `HEMISPHERE_OFFSET = 6` — `(index + 6) % 6` is the
  identity, so **both hemispheres answered identically for all twelve months**, with no test at all.
  Seasons now come from the player's latitude, each band carrying its own calendar with the southern
  months written out. And the tropical band boundary had to be **27.5°, not the Tropic of Cancer's
  23.44°**, because Dhaka is at 23.81° and a textbook line put the game's own home location into
  the temperate band — a mistake caught by a test, since nothing else checks Dhaka.
- **Left alone deliberately:** `services/timeApi.js` — dead, writes `document.getElementById('time')
  .innerHTML` from a `services/` file, and hardcodes `timeapi.io` while `config/api.js` declares a
  different host. Real, wrong, and T-04's.
- **Touched:** `config/weatherEvents.js` and `config/seasons.js` (both empty, now filled),
  `domain/seasons.js`, `domain/weather.js`, `domain/farm.js`, `crops_logics/*.js` (added `seasons`,
  removed the dead `bestSeason`), `land_squares/*.js` (plots gain `forecast`), `ui/cropPicker.js`,
  `ui/seasonCard.js`, `farmActions.js`, `main.js`, `css/crop-picker.css`, and
  `tests/{weatherPanel,farm,cropPicker}.test.js`. `utils/season.js` deleted.
- **Tests:** 494, all passing (was 477). New cases cover the classification order, the snow codes,
  per-band seasons, **the two hemispheres no longer agreeing** — the assertion that could not have
  existed before, because before this they *were* identical — the window starting at the current hour
  rather than index 0, the most-severe-hour rule, the health floor across every crop and event, and
  the picker refusing.
- **Not done, and said so in the guide rather than hidden:** **rain still does not water anything.**
  `plot.waterLevel` is 0 at plot creation and nothing in the running game changes it — no pump, no
  evaporation. That is T-09, and it means ISS-008 (the pump being ~36× stronger than rain) still
  cannot be measured, because there is no rain to compare against.
- **Next:** PR. This is the game's premise, so it is worth watching a planting through the picker by
  hand before it merges.

## The field was rebuilt every second, re-decoding ~16 MB of PNG — Hisham

- **Did:** fixed ISS-088, from the report "the whole system is super unresponsive". The cause was
  not caching and not the network: `repaintFarm()` ran at 1 Hz into `mountFarmView()`, whose first
  statement is `clear(root)`, rebuilding the card, `base.png`, `pump.png` and all sixteen plot
  tiles — **~34 `<img>` elements over 313–712 KB of art, about 16.4 MB of PNG re-decoded every
  second.** The images were already in the HTTP and memory caches; what a cache cannot help with is
  **decoding**, because creating a fresh `<img>` re-decodes regardless of what the cache says. A
  CSS `filter` on the fourteen locked tiles re-rastered on top of that.
- **Three symptoms, one cause.** Constant lag; laggy clicks; and clicking land to buy it "shows
  nothing then suddenly it is bought". That last one is the diagnostic: `domain/land.js`
  `buyPlot()` is pure and synchronous with no network, so the click was never slow — it was queued
  behind the decode, and because every tile was replaced there was nothing local to see.
- **Why a repaint guard is nearly free.** Nothing the field shows moves at 1 Hz. A rice stage is
  ~72 minutes apart (6 h over 5 stages), the growth bar is `Math.round(progress * 100)` at 1% per
  ~3.6 min, the water bar is `Math.round(waterLevel)` at 1% per ~7.5 min, and `formatLeft()` already
  rounds to whole minutes. An idle farm needs about **one** repaint a minute, not sixty.
- **Touched:** `js/ui/farmView.js`, `js/main.js` (comment only), `tests/farmView.test.js`,
  `tests/helpers/fakeDom.js`, `docs/architecture.md`, `tasks.md`, `issues.md`. **No new files** — the
  guard is exported from `farmView.js` and its tests went into the existing suite.
- **Two bugs my own tests caught, both of which would have shipped looking fine.** `repaint()`
  closes over the mount's `state` parameter, so storing the new state on the controller left the
  diff comparing the *old* state against itself — sixteen matches, no repaint, a frozen field. And
  the reuse path **trusted** its cache: `tests/farmLoop.test.js` mounts the crop picker into the same
  root, which clears the field, and reusing a detached card left the root holding a picker and
  sixteen invisible tiles with nothing thrown. The guard now *verifies* its card is still standing
  in the root.
- **A harness defect, worth naming separately.** `fakeDom.replaceChildren()` dropped `childNodes`
  without detaching the removed children, so they kept pointing at their old parent and
  `contains()` answered `true` for nodes that were gone. That is how the second bug above hid from
  the check meant to catch it. A fake DOM that lies makes every assertion written against it
  worthless, so it is fixed and `replaceWith()` added.
- **Tests:** `tests/farmView.test.js` 11 → 20. The load-bearing case asserts the signature **stays
  equal** when nothing visible moved — a signature that drifted on every call would restore the whole
  jank while still looking correct. Another asserts the water *threshold* is tracked separately from
  the rounded water number, since 39 and 40 are one apart and crossing it swaps the ground sprite.
  `npm run check` clean; `npm test` 474 pass.
- **Deliberately not done, and reported alongside it.** **Slow first load is a separate problem and
  is still open.** The game page pulls ~3.9 MB on first paint because the art is 1000×1000 for a
  diamond roughly 55 px wide — about 300× the pixels needed. Invisible on localhost, slow on a hosted
  build. The fix is downscaling the art, which collides with `AGENTS.md` §5's measured geometry, §7's
  no-overwrite rule and DEC-010, so it needs its own decision rather than a footnote. **ISS-018**
  stays open too: it is about image *flicker*, this was about decode *cost*.
- **Next:** PR. Touches `js/ui/` and `js/main.js`, so Jim and Kafi are the reviewers who can judge it
  by eye — someone should watch a rice sprite change stage before and after.

## main was committed with an unfinished merge in it — Hisham

- **Did:** fixed ISS-078. Found while pulling: `origin/main` had moved `2802d1c` → `eddf829`, and four of
  those commits were **my own already-merged PR #21** plus Jim's shop repaint and the farm-work PR. All my
  work verified intact — nothing had been reverted.
- **The problem:** `8cccedb` ("merge: origin/main into jim", aa-jim) was committed with the merge
  unfinished and reached `main` via PR #22. It carries literal `<<<<<<<` / `=======` / `>>>>>>>` lines in
  **`css/shop.css`** and three team docs. Confirmed against the committed blob, so anyone cloning gets it.
  The same merge also resurrected `body.shop-page > #connection-banner` — dead CSS, since ISS-076 renamed
  that mount point to `#sync-indicator` — 40 lines above a comment saying the rule was deleted.
- **Why review missed it, which is the real lesson:** the suite was **435 green with the markers in it**.
  `check-imports.mjs` reads JS imports and `node --test` runs code; neither parses CSS or markdown, so a
  conflict marker was invisible to every tool this project had. That is a tooling gap, not a lapse.
- **Touched:** `css/shop.css`, `docs/team/issues.md`, `docs/team/progress-log.md`, `docs/team/tasks.md`,
  `tests/noConflictMarkers.test.js` (new).
- **The guard, and it is verified rather than assumed:** the new test walks the whole tracked tree for
  lines beginning with a merge marker, plus `git ls-files -u` for a merge left unfinished in the index,
  and a third case asserting the detector matches git's three real marker shapes and does not fire on
  ordinary content. **Confirmed against `origin/main` itself**: dropped into a worktree at the broken
  commit, it fails with 12 markers across 4 files; on the fixed tree it passes 3/3. A guard that cannot
  fail is worse than no guard, because it reads as coverage.
- **Tests:** 438 tests, 438 pass. `npm run check` clean. **ISS-047 is fixed upstream** — the duplicate
  flat-path rice sprites are gone and the asset registry is green, which was the last red test my own
  branch had been carrying.
- **Next:** merged as PR #23. Jim should sanity-check that his T-57 shop row and the `#connection-banner`
  removal are what he expects, since the resolution touched his files.

## Shop repainted to the Figma reference (ISS-075) — Jim

- **Did:** rebuilt the shop page to match Figma frame 114:2002. `css/shop.css` now paints the whole
  stall — grass floor, wood posts and beams, scalloped awning, stone base, hanging `FARM SHOP` sign
  (Luckiest Guy `#b2e557`), dark-green board with a wood-fence top strip — plus the purse pill and
  footer hint bar. `css/shop-card.css` now paints golden radial-gradient card tops over cream bodies,
  pack-size pill, Nunito name (Black 20px `#392b18`) and description (SemiBold 12px `#7a6844`),
  coin + price, and three green buy buttons (`BUY +`, `×5`, `×10`). `js/ui/shopView.js` rebuilt to
  the new markup with stall frame elements; `js/ui/shopArt.js` gained coin, arrow-left and plus SVGs.
  `css/fonts.css` declares Nunito Regular/SemiBold/ExtraBold/Black self-hosted; `js/config/assets.js`
  registers the four font files in `assets/fonts/`. Game data (`config/crops.js`) and rules
  (`domain/shop.js`) unchanged; the three buy buttons are kept (`BUY_STEPS [1,5,10]`).
- **Tests:** `tests/shop.test.js` 16 pass; `npm run check` clean. `npm test` fails only on the
  pre-existing ISS-047 (duplicate flat-path rice sprites), unrelated to this change.
- **Next:** nothing — ISS-075 is fixed, T-57 is done.

---
## Every farm was named "Current location" — Hisham

- **Did:** fixed ISS-077. `reverseGeocode()` was posting `latitude`/`longitude` to Open-Meteo's
  **forward search** endpoint (`/v1/search`), which takes `name=` and has no reverse mode — so the
  request returned `400 {"reason":"No value found … at path 'name'."}` for every coordinate on earth,
  verified live. `main.js` fell back to the literal string `'Current location'`. The search box was
  never affected, which is why only this path showed the placeholder. Reverse geocoding now goes to
  BigDataCloud's keyless `reverse-geocode-client` (new `REVERSE_GEOCODE_URL` in `js/config/api.js`);
  forward search stays on Open-Meteo. DEC-038 records the three services measured before choosing one.
- **The naming ladder:** `city → principalSubdivision → countryName → coordinates`, and it always
  terminates. `locality` was on the first draft and **a test removed it** — it carries regions, not
  settlements (`"City of Westminster"` for London, `"Polynesian Triangle"` mid-ocean), so a farm in open
  water would have been labelled with a plausible-sounding region that means nothing. The
  `'Current location'` literal is deleted rather than shrunk: a farm that cannot be named for any
  reason, including the reverse service being down, now shows its own coordinates
  (`23.81° N, 90.41° E`).
- **Why nobody caught it:** there was no `tests/geocodeApi.test.js` at all, and a 400 inside a
  `catch`-and-fallback path is indistinguishable from being offline. Worse, `bootWeather()` calls
  `useDeviceLocation({announce:false})` automatically on first boot when `!saved.pinned`, so every new
  farm took this path silently.
- **Touched:** `js/config/api.js`, `js/services/geocodeApi.js`, `js/main.js`,
  `tests/geocodeApi.test.js` (new), `docs/architecture.md` (its services tree was missing
  `geocodeApi.js` entirely), `decisions.md`, `issues.md`, `tasks.md`.
- **Tests:** `tests/geocodeApi.test.js` 16 cases — including the direct regression guard that the two
  directions do not share an endpoint. `npm run check` passes. `npm test` is 360 tests / 359 pass; the
  single failure is the pre-existing ISS-047 unregistered `rice_1.png`, untouched and unrelated.
- **Note:** this landed as ISS-077 rather than ISS-076, because the sync-indicator work below had already
  claimed 076 on its own branch. The two were combined into one PR, so the numbering is now contiguous.
- **Corrected twice at runtime, both times only visible by actually running it, and both worth
  remembering:** the first fix named *new* farms only, because the broken code pinned the coordinates
  successfully and left `pinned: true` next to the placeholder, so no existing save was ever
  re-resolved. The second attempt fixed that gate but still called `useDeviceLocation()`, which asks
  `navigator.geolocation` for permission just to repair a *text label* — with the prompt pending or
  denied it silently did nothing on every load. `needsLocationRefresh(saved)` (exported, pure, 3 cases in
  `mainBoot.test.js`) is the gate, and `nameExistingLocation()` reverse-geocodes the coordinates
  **already in the save** and touches no browser API at all. A fix that needs every player to wipe their
  farm by hand is not a fix.
- **Next:** push and PR.

## Sync indicator: the connection banner stops jumping the page — Hisham

- **Did:** fixed ISS-076. The full-width connection banner sat in normal flow above `.app`, which is
  `height: 100dvh`, so every appearance pushed the whole shell down and let it snap back — and because
  `copyFor('saving')` returned copy as well and `AUTOSAVE_MS` is 10 s, a *successful* autosave did it
  on a timer. `js/ui/connectionBanner.js` is now `js/ui/syncIndicator.js`: a `position: fixed` chip in
  the bottom-left corner, two dots that wave while saving, static when synced, amber with a persistent
  `No connection` label when a write is queued, and a popover behind the dots carrying the full text,
  the ageing line and both buttons. The first failed write of an outage also raises one toast, which is
  what keeps ISS-050 from regressing. Separately, `main.js` now re-renders the shell only on `pending`
  rather than on every `sync` — the other half of the flicker. DEC-037.
- **Touched:** `js/ui/syncIndicator.js` (renamed), `js/connection.js`, `js/main.js`, `js/shop-main.js`,
  `js/settings-main.js`, `js/profile-main.js`, `index.html`, `shop.html`, `settings.html`,
  `profile.html`, `css/components.css`, `css/shop.css`, `tests/connectionStatus.test.js`.
- **Tests:** `tests/connectionStatus.test.js` 28 pass (was 20). `npm run check` passes. `npm test` is
  352 tests / 351 pass — the single failure is the pre-existing ISS-047 unregistered `rice_1.png`,
  deliberately left alone because the fix deletes files in `assets/`, which is Kafi's folder.
- **Next:** T-58 is done, and ISS-076 is closed.

## Shop polish: per-crop unit pill and BUY + button — Jim

- **Did:** brought the seed cards closer to the reference mockup. Each crop now carries a
  `shopUnit` label ("5 SEEDS" for all five today) that renders in the card's top-left pill
  instead of a generic "Seed packet", and the primary "BUY +" button is now a rounded green pill
  matching the mockup. `js/config/crops.js` (new `shopUnit` field), `js/ui/shopView.js`
  (pill reads `crop.shopUnit`), `css/shop-card.css` (primary button border-radius). `docs/crops.md`
  documents the new field.
- **Tests:** `tests/shop.test.js` 16 pass; `npm run check` passes; the single pre-existing failure
  in `tests/assets.test.js` (unregistered `rice_1.png`) is untouched and unrelated.
- **Next:** nothing — shop polish is done.

---

## Two thirds of every tile was answering as a different plot, and the "Buy" was clipped — Jim

- **Did:** the hover complaint turned out to be a defect with a number attached, and a decision the
  docs had already made turned out to be code nobody had written. **ISS-004 closed**, **ISS-074 found
  and avoided**, **DEC-035** recorded. T-55. `tests/iso.test.js` 15 → 16, `tests/farmView.test.js`
  added with 6.
- **The hover was the hit box, not the art.** The plot was a `<div>` and its hit area was the square
  1000×1000 PNG canvas. That box is 46% empty above and below the art, and a neighbour's box overlaps
  it by half a box vertically — which is a consequence of T-54 making the plot box square (ISS-070).
  Hit testing it means **66.2%** of each tile's visible diamond answers as a *different* plot, and not a
  random one: the plots in front, which win on `z-index`. That is what "a little hard to hover on them"
  was. I measured it before describing it rather than guessing — 60×60 samples per diamond against all
  sixteen plot boxes — and the clip returns **0.0%**, exact rather than approximate, because the `gap`
  leaves the diamonds genuinely disjoint.
  Worth admitting plainly: **T-54 made this worse.** Before it, the plot box was the diamond's own
  aspect ratio, so box ≈ art and hover was precise.
- **DEC-010 said plots are `<button>` elements; they were divs.** The decision record had always said
  so, `architecture.md` spelled out the click targets, `DIAMOND_CLIP` was already exported from
  `js/config/field.js`, and `reset.css` clears button chrome with a comment about plots being tabbable.
  The code just never did it. Now: a button, with `pointer-events: none` on the button itself (it
  inherits, so the whole square box is inert) and one empty `.plot__hit` layer turning it back on for
  the diamond only.
- **ISS-074 was found by asking "and then what breaks?"** The obvious implementation — the polygon on
  the button — deletes two focus indicators, because `clip-path` clips everything an element paints,
  *including its outline*. `reset.css` draws the `:focus-visible` ring outside the border box, so a
  clipped button shows no focus at all; `.plot--selected::after` is a ring at `inset: -4px` and for the
  same reason nearly all of it is outside the diamond. Neither throws, neither renders wrong — they
  just stop rendering. The clip went on an inner layer instead, which is also why a *diamond-shaped*
  ring is not expressible as clip-path-plus-border, and the box ring stays.
- **The "Buy" caption was the other half of the same screenshot.** It sat under the padlock, in the half
  of the diamond the plot in front paints over, so it rendered as "BU.." or "..UY" depending on the row.
  Deleted — the reference render has the padlock alone, and it says the same thing. `.plot__lock-icon`
  also gained `line-height: 1`: at the default ~1.3em the emoji's line box is taller than its glyph, so
  the group overhung the diamond. At `1` the glyph's own box is centred and clears the diamond's edge by
  about 3px.
- **The shop and inventory do not get the navbar (DEC-035).** `navbar.css` calls itself "the game page's
  top bar", `main.js` is guarded on `#top-bar` which only `index.html` has, and on the shop page the
  navbar's logo link and `shopView.js`'s "back to the farm" link point at the same place. Mounting it
  there would cost two stylesheets and a second mount to buy a duplicate header. Recorded, not changed.
- **Next:** look at the field and confirm hover; then **T-56** (DEC-036 — unlock order, three states, the
  grey-out). **ISS-006** (`clearPlot`, the fifth click case) should ride along with it, because both
  land in the same click handler.

---

## The plots were half size, on a slab that is not flat, at a rim that cannot exist — Jim

- **Did:** the reported "it doesn't fit properly" was three defects stacked, and the geometry fix from
  the previous session was only the first one. ISS-069 the extruded slab, ISS-070 the half-size plots,
  ISS-071 the impossible rim; ISS-005 closed properly this time; ISS-072 opened. T-54.
- **What the art actually is.** `base.png` is not a flat diamond: its row widths plateau over
  y `462..533`, which is a 72px vertical skirt, and the top face the plots stand on is 992 × 520
  centred at y `0.462`. I set `originY: 0.499` last session — the *bounding box* centre — and wrote
  "base.png has no 3D extrusion" into `field.js` and `architecture.md`. The observation behind that
  was right (the widest rows are at mid-height) and the inference was not: an extruded slab's
  plateau centre lands at the bounding box centre too, because the box grows downward by exactly as
  much as the plateau's own half-height. The tell was that the plateau is 72 rows tall where a flat
  diamond's widest row is one row, and 21 rows got read as noise. That is my error, corrected in
  place rather than amended.
- **The rim the docs solved for does not exist.** The documented calibration runs
  `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` — and 0.595 is the slab's whole bounding box.
  Against the top face it is `2.265t + 2r = 0.520`, and the pair gives **`r = -0.015`**: the cluster
  is 2.7% too tall for the slab, because `ground_*.png` is h/w 0.538 and the face is 0.524. No
  `tileScale` reconciles two shapes, so this became a choice instead of a solve — fill the face
  front-to-back, border at the sides, DEC-034.
- **The half-size plots, which is what was actually visible on screen.** `.plot`'s box was
  `tileScale × tileScale * tileAspect` tall while `ground_*.png` is a **square** canvas, so
  `object-fit: contain` fitted the image to the box's *height*. Every diamond drew at 0.109 of the
  frame against a geometry built for 0.203 — sixteen plots spaced for tiles twice their size, which is
  the gap the screenshot showed. `padding-top: tileScale` makes the box square, and it is a one-token
  fix.
- **Then the base could grow.** `.field-stage` was `aspect-ratio: 1` and height-driven, so at
  1440×900 it was 509×509 inside an 896px column: 43% of the width unused and 40% of its own height
  empty above and below the slab. At `aspect-ratio: 1000/596` with `object-fit: cover` on the base —
  no cropping of any file, since the empty band *is* what cover removes — the same height gives an
  ≈848px base against ≈505px, and ≈195px plots against ≈55px.
- **The two things that made a wider stage safe, both found while wiring it up.** `top` resolves
  against a box's *height* while `width` and `padding-top` are percentages of its *width*; on a square
  stage those were the same number and the distinction did not exist. `iso.js`'s new `frameY()` is the
  single conversion. And a new `.field-stage__mount` holds the base's shape, so a stage whose width is
  clamped by a narrow column cannot end up with plots wider than the base beneath them.
- **Docs:** `architecture.md` Field geometry rewritten for the frame, the units and the two new
  defects; its measured-constants table split into top face and bounding box; `decisions.md` DEC-034;
  `issues.md` ISS-069…072 and a corrected ISS-005 closure; AGENTS.md section 5's table, which is
  gitignored and so local-only.
- **Broke:** nothing new. `npm test` still fails only on ISS-047, the five flat-path rice sprites.
- **Next:** look at it. Everything above is arithmetic and tests — there is no browser in this
  environment, so nothing here has been seen rendered. `.plot__crop` is known to be wrong the moment a
  crop is planted (ISS-072) and is deliberately left alone rather than guessed at.

---

## The field was never centred on the base, and the pump was in a corner — Jim

- **Did:** the reported screenshot was two bugs wearing one coat, and both were the same root cause.
  Fixes are ISS-065 to ISS-068; T-53. `js/utils/iso.js` now exists, which is the file
  `architecture.md` had been documenting as existing since before it was written.
- **The measurement that decided it.** `renderPlot` placed plots with
  `xPct = 50 + (col - row) * tileScale * 50` and `yPct = 50 + (col + row) * tileScale * 25`.
  **Those two axes are not symmetric.** Over a 4×4 grid `col - row` has mean 0, so x was centred by
  luck; `col + row` has mean **3**, so the cluster sat `3 × 0.204 × 25` = 15.3% of the stage below
  the middle. The centring term `(i - (n-1)/2)` was simply absent. `base.png`'s diamond centre is
  y = 49.9%, so the cluster's centre sat at 65.3% — 15.4 points low. The one axis that was right
  was the accident, not the evidence.
- **The documented formula was right all along.** `architecture.md` "Field geometry" already
  specified `shift()`, `centerX/centerY` and `z-index = col + row`, and named `js/utils/iso.js` as
  their home — the file just did not exist, and `farmView.js` had grown a substitute. Five `FIELD`
  constants (`gap`, `crossGap`, `originX`, `originY`, `pumpScale`) and `DIAMOND_CLIP` had no reader
  anywhere in `js/`, and the pump sat on `bottom: 4%; left: 4%` — a corner, nothing to do with the
  base. So this was not a re-derivation: it was writing down the contract that was already there.
- **Verified before adopting, not after.** `shift` = −1.605, −0.575, +0.575, +1.605, giving a
  cluster 4.21 × tileScale wide and 2.265 tall against the doc's 4.21 / 2.266; solving
  `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595` returns `t = 0.2037` ≈ the configured 0.204
  and `r = 0.0661` ≈ the documented 0.067. It reproduced on the first run, which is what makes the
  doc's numbers worth trusting rather than re-measuring.
- **One typo, and it mattered.** `architecture.md:920` said `img top = centerY - tileScale/2`. The
  box is `tileScale × tileScale * tileAspect` tall, so the half-height is
  `tileScale * tileAspect / 2`. Following the line literally gives a cluster **2.727** tile-widths
  tall while the same section, nine lines later, states **2.266** — and 2.266 is the figure the
  whole `tileScale: 0.204` calibration is solved from. ISS-068.
- **`tileAspect` deliberately not touched.** Re-measured `ground_unwatered.png` at 991 × 535 →
  0.5399 against the documented 991 × 533 → 0.538. That is the alpha threshold (this pass cut at
  `A > 8`), not a defect, and `AGENTS.md` §5 is explicit that the measured geometry is not to be
  re-derived. ISS-003 is relogged **stale** with the reasoning rather than quietly closed.
- **`.plot--selected` had to be renumbered.** Now that a plot carries `z-index: col + row` (0–6),
  the old `z-index: 5` on a selected plot would paint it *under* plots 4, 5 and 6. Selection is now
  100 and hover 200 — above the field's own range, hover still above selection so a neighbouring
  plot can be inspected. The pump is 20: above every plot, below both.
- **Touched:** `js/utils/iso.js` (new), `js/ui/farmView.js`, `js/config/field.js`, `css/scene.css`,
  `tests/iso.test.js` (new, 12 cases), `docs/architecture.md`, `docs/team/issues.md`,
  `docs/team/tasks.md`. `farmView.js`, `iso.js` and `field.js` are **Hisham | Kafi co-owned** and
  `scene.css` is Kafi's — all four edited, all flagged to them. Hisham's T-06 row gained one
  clarifying line and nothing else.
- **Not in this change:** the `<button class="plot">` + `diamondClipPath` click targets (ISS-004,
  ISS-007). `DIAMOND_CLIP` is still unread, deliberately — a layout fix and an interaction fix do
  not belong in one commit. Also still absent: `js/debug/`, so the documented "tune the sliders
  live" workflow does not exist and the constants went in as measured.
- **Verified:** `npm run check` clean; `npm test` 333/334, the one failure being the pre-existing
  ISS-047 rice-sprite path; `node --check` on the three changed JS files; em dashes intact in every
  edited file; `git diff --stat` shows only these files.
- **Next:** ISS-047, then commit.

## The place name moved into the note's empty right-hand side — Jim

- **Did:** the reported blank space on the right of the big sticky note was real and measurable, and
  the place name was already being cut to fit the wrong place. Fixes are ISS-062 and ISS-063, plus
  `tests/weatherPanel.test.js` — the panel had no test at all, which is why both bugs survived T-50 and
  T-51. DEC-033.
- **The measurement that decided it.** The note's widest row is the temperature — glyph, gap, `24°` and
  the unit — and it stops ~84px short of the paper's right edge at the board's 450px floor, ~127px at
  its 520px ceiling. Nothing else could ever grow into that space, because the widest row is what sets
  the note's content width. So the space was dead at **every** window size, while the one string that
  changes most between players was running along the top on a single `nowrap` line with an ellipsis.
  Moving it into the dead space fixes both at once and adds no element.
- **Why not percentages.** The first draft split the note `42% / 58%`. At the 450px floor that is 93px
  for the place against a ~137px temperature row — the name would have overlapped the number it
  describes. `minmax(0, auto)` for the temperature and `minmax(0, 1fr)` for the place means the number
  asks for what it needs and the name takes the remainder, so no window size can collide them, and no
  media block needs a second copy of the split.
- **The catch that would have bitten:** the condition cannot share a row with the place. "Freezing
  drizzle" is ~168px at 15px with 0.1em of letter-spacing — wider than one column at the floor. So
  `label` spans both columns and the place sits beside the temperature. Three words in `weather.js`
  ("Freezing drizzle", "Snow showers", "Light showers") are what make this true.
- **Two side effects of the container changing type, both silent:** `.note-status`'s
  `align-self: flex-end` was a flex idiom for right-alignment, and in a grid `align-self` is the block
  axis — the paused line would have jumped to the left edge. It is `justify-self: end` now.
  `.note-idle`'s `flex: 1` is inert in a grid container, so the idle note would have shrunk into the
  left column alone; it is an explicit full span instead.
- **ISS-063 — the place line could be empty.** `locationLine()` answered `''` for a location with
  neither name nor country, rendering an invisible empty span with nothing in the console. The old
  panel printed `parts || 'Unknown location'` and the board rewrite dropped the fallback — this is the
  most likely explanation of the original "the current location is missing" report, and it is now
  impossible: four empty shapes are pinned in the new test file. A blank column made it conspicuous
  rather than invisible, which is the one good thing about moving it.
- **Found while measuring, logged not fixed — ISS-064:** the big temperature renders as **"24°°C"**.
  `formatTemp()` answers `24°` and the unit span follows it with `°C`. It costs the row the place name
  now shares about 15px of width, so fixing it gives that width back. Deliberately left out of T-52 so
  the layout change and the unit fix stay separate commits.
- **Verified:** `npm run check` clean. `npm test` is **321/322** — my 5 new tests pass, and the one
  failure is **ISS-047** again (Kafi's duplicate rice sprites at the pre-refactor flat path), which is
  why nothing here is committed. Not verified in a browser: worth an eye at 1920px and at the 900px
  stacked layout, and a search for "Kuala Lumpur" to see the two-line wrap.
- **Still open:** ISS-047 blocks the commit. **ISS-064** is logged and unfixed.
- **Touching someone else's file:** `js/ui/weatherPanel.js` is Afif's — third session running (T-11 is
  still `doing`). He needs telling, and the fallback in `locationLine()` is the part he should look at
  first.

---

## The freshness label found its real home, and three layout bugs came with it — Jim

- **Did:** four fixes on the weather board, all from one screenshot. Three of them were bugs my own
  guess about the cause would have got wrong, so they are logged as ISS-059/060/061.
- **The finding that unlocked the first one:** `.board-updated` printed `Updated 6:45 PM` and the note's
  foot row printed `FRI 6:45 PM`, and **both read `weather.current.time`** — the same field. The board
  was stating one instant twice, twenty pixels apart, and the request to "move it into the note" would
  have printed it a third time had I just obeyed it. The line's actual job was to say the reading is
  **stale**, which is the paused case. So the label is now a right-aligned `.note-status` inside the
  note, renders only while paused, and the element's presence is the state — no `data-paused` to keep
  in step. `renderUpdated()` became `statusLine()`, `#forecast-card` went back to two children, and
  `formatClock()` became dead code and went with it. DEC-032.
  - **The colour question was real, not cosmetic.** The old line's amber `#ffd45e` was picked against
    dark wood; on the note's cream paper it measures **1.2:1** — invisible. `#7a4f0a` measures 5.8:1 on
    the paper's mid tone and 5.4:1 on its darkest, and still reads as a warning rather than a failure.
- **ISS-061 — the wind pill identified itself as "W…".** Two causes stacked. `.board` is
  `clamp(420px, 38%, 520px)` and 38% of the centre column is under 420px on a normal desktop, so the
  board was **always** at its floor, leaving the meters column ~111px of inner width. In that space the
  value track is `auto` and takes what it asks for ("5 km/h NNW" ≈ 60px), leaving the label ~19px — and
  the label track was `minmax(0, 1fr)`, whose explicit `0` minimum licenses shrinking past the track's
  own `min-content` width. So the label ellipsised rather than the row admitting it did not fit. Three
  changes were needed: bare `1fr` on the label track, the compass moved out of the value into the
  pill's `title`, and the board's floor 420px → 450px.
- **ISS-060 — the rain-chance pill had no bottom edge.** Reported as the hour notes "blocking the
  shadow", and the notes were not involved: they are outside `.board-body`. The edge is
  `box-shadow: 0 3px 0` and `.board-body` is `overflow: hidden`, so the last pill's shadow fell past the
  grid row and was cut off **inside its own container**. `.board-meters` gained `padding-bottom: 3px`
  (the pills share the shorter content box, so nothing else moved) and `#forecast-card`'s gap went
  6px → 10px, which is the breathing room that was actually being asked for.
- **ISS-059 — "the right side board piece is missing".** It was the right peg. The short-window block
  overrode `::before` and `::after` as if they were two different things: `::before` became two 20×15px
  planks, `::after` two 23×4px dark bars. Both are pegs, so under 960px tall the left one stayed a post
  and the right one rendered as a dark sliver. Both overrides deleted; the block now restates sizes and
  never shapes — recorded in DEC-031 so the next person does not re-add them.
- **Verified:** `npm run check` clean, `node --check js/ui/weatherPanel.js` clean, no dead
  `board-updated` / `formatClock` / `board-meter-track` references left. **`npm test` is 316/317**,
  failing only on **ISS-047** (Kafi's five duplicate rice sprites at the pre-refactor flat path) — so
  this work is deliberately **left uncommitted** rather than committing over a red suite.
- **Still open:** ISS-047 blocks the commit. `css/weather.css` is now ~670 lines, well past the ~200
  guidance — worth splitting as its own commit, after the suite is green.
- **Touching someone else's file:** `js/ui/weatherPanel.js` is Afif's, second time in two sessions
  (T-11 is still `doing`). Both touches need telling him.

---

## The board got tuned by eye, and lost its meter bars — Jim

- **Did:** went through the board's proportions by eye and fixed four things that were quietly wrong.
  The sizes are plain px literals with a single short-window block, which is where this landed after
  two other approaches failed — see DEC-031.
- **Three real bugs, all visible on every screen and none of them explained by any one rule.**
  - **ISS-056** — `.board-body`'s two children both carry an explicit `grid-column`, needed because
    `renderMeters()` appends the meters *before* the note. With a definite column and an automatic
    row, auto-placement is free to pick different rows, and it did: the meters took row 1, the note
    landed in an implicit row 2. One row too tall, and the meters squashed to half. Both are now
    pinned to `grid-row: 1`. The board's height never changed — the content inside it was wrong.
  - **ISS-057** — the hour notes showed a time and an icon and **no temperature, on every note**. The
    strip was 52px, chosen when it held two items; the temperature is the third and fell below
    `overflow: hidden`. Now 72px, which is 67px of content plus the gap.
  - **ISS-058** — "Updated 14:05" was `position: absolute; bottom: 4px`, which was fine while the
    board had spare wood at the bottom and stopped being fine the moment it was sized to a third of
    the column: it left the flow, reserved nothing, and lay across the hour notes. It is back in the
    flow, and hidden when there is no timestamp so the board carries no blank line.
- **ISS-055 closed `wontfix` — the bars are gone, not restored.** Humidity and rain chance are 0–100%
  and were supposed to get a fill bar; the stylesheet had `display: none` on the track, so they had
  never been visible. The real answer turned out to be that neither should have one: the pills are
  narrow and the value is already spelled out, so a 4px bar was clutter. `.board-meter-track` and
  `.board-meter-fill` are deleted, `meter()` no longer takes a percentage or builds the track, and
  `weatherPanel.js`'s "Why wind gets no bar" section is rewritten — wind was never an exception to
  bars, because there are no bars.
- **Two approaches built and rejected before this one.** A knob block of 39 custom properties and two
  scale variables, then inline `min(Npx, N*vh)` caps. Both were tidier than literals and both tuned
  worse: the first turned every size into a lookup, the second into a number you have to derive. The
  lesson is in DEC-031 because it is reusable — **a size you cannot read where it is used is not a
  size you can tune**, and tuning this board by eye is the whole point of it.
- **The short-window block moved from 820px to 960px and gained `min-width: 901px`.** It had to rise
  because the board's contents grew — the strip went to 72px and the freshness line joined the flow.
  The scope is new and deliberate: below 900px the layout is stacked and content-sized, so there is
  no viewport height to fit and trimming is simply wrong.
- **Also:** `.board` width `50%` → `clamp(420px, 38%, 520px)`. A comment in `.board-body` cited the
  grid-row bug as ISS-055, which is the meter-bar issue; corrected to ISS-056. A mis-cite sends the
  next reader to an entry that cannot explain the bug in front of them.
- **Touched:** `css/weather.css`, `js/ui/weatherPanel.js`, and docs. **The JS is Afif's file** (T-11,
  still `doing`) — the change is confined to `meter()` losing its percentage argument and the two
  call sites in `renderMeters()`; `clamp()` stays, it is still used for the humidity and rain-chance
  strings. `index.html`, `css/layout.css` and the markup are untouched.
- **Broken:** nothing. `npm run check` clean, `weatherPanel.js` parses, em dashes intact. `npm test`
  is **316/317** and the one failure is pre-existing and unrelated — `assets.test.js` on
  `assets/images/crops/rice_1.png`, which is ISS-047, five duplicate sprites at the old flat path
  reintroduced by a merge into this branch. Not committing red.
- **Next:** the 420–520px width band and the 960px breakpoint are estimates against a design image,
  not measurements — check them at 1920×1080 and 1280×720. ISS-047 needs five files deleted, by
  Kafi or by Jim, before anything commits. Still open from T-48: `ui/icon.js` and `ui/icons.js` are
  duplicate helpers, and `components.css` owns an unused generic `.meter`. `weather.css` is ~660 lines
  and over the ~200 guidance; splitting it is worth a separate commit.

---

## The forecast panel is now a wooden board — Jim

- **Did:** Restyled the top of the game page to the design: a wooden notice board carrying a
  search pill, one large sticky note for right now, three meter pills, and a row of six sticky
  notes for the coming hours. The board is drawn entirely in CSS — frame, posts, paper, pin,
  folded corner — because no artwork ships for it.
- **The split is a ratio, not content.** `.board` is `flex: 0 0 33.333%` of `.app__centre` with
  `min-height: 306px`; the field takes the rest. Before this the panel sized itself and on 16:9
  reached ~700px, leaving the field a 220px sliver. The floor is there for short screens, where
  a third is not enough to hold the notes legibly.
  > **Superseded.** That floor was itself the bug — ISS-054 — because 306px is taller than a third at
  > any ordinary window, so the ratio never applied. It is 150px now.
- **Two of the three meters get a bar, one does not.** Humidity and rain chance are 0–100%, so a
  fill bar beside them carries meaning. Wind has no ceiling — a bar would need an invented maximum
  and a half-full wind bar would mean nothing — so it shows the number only.
  > **Never true, and now moot.** The bar was `display: none` from the start (ISS-055), so two meters
  > carried a bar in the DOM and in this log and in `weatherPanel.js` while the stylesheet showed
  > nothing. All three meters are number-only as of T-50.
- **The current-location button became the pin inside the search pill.** As a third control beside
  the field it made the row wrap (ISS-046); as a leading action on the field it reads as part of
  searching. `onUseDeviceLocation` is unchanged. The place *name* now sits above the condition on
  the big note, where the design marked it.
- **Touched:** `js/ui/weatherPanel.js`, `js/ui/locationBar.js`, `js/ui/icon.js` (droplet, wind,
  umbrella, map-pin, search), `js/main.js` untouched — no API call, fetch or parser was changed,
  `index.html`, `css/weather.css`, `css/layout.css`, `css/sidebar.css`.
- **Convention (DEC-029 extended):** `css/weather.css` writes `#6b431f` literally and uses flat
  class names (`board-meter-value`, not `board__meter__value`). A wooden board is brown in a dark
  theme too, so a token has nothing to switch. `.card`/`.btn`/`.input` stay tokenised — they are
  app chrome and do follow `data-theme`.
- **Broken:** nothing. `npm run check` clean; `npm test` 316/317, the one failure being the
  pre-existing `assets.test.js` case for `assets/images/crops/rice_1.png`.
- **Next:** look at it at 1920×1080 and tune the board's proportions live. Two duplicate icon
  helpers still exist — `ui/icon.js` and `ui/icons.js` — and `components.css` still owns an
  unused generic `.meter`.

---

## Losing the network no longer signs the player out — Hisham

- **Did:** Fixed the hosted build logging players out at random. Three separate defects, in
  `gotrue.js`, `authApi.js` and `main.js`, all feeding the same symptom. The farm also now tells
  the player when it cannot reach the server, instead of failing silently.
- **Root cause 1 (ISS-049):** `gotrue.post()` had no `AbortController`, so a hung request sat
  there until the 15 s race in `restoreSession()` fired and reported a logout that had not
  happened. Every other module in the project already had a deadline; this one was missed.
- **Root cause 2 (ISS-048):** `restore()` called `writeRefreshToken(null)` on *any* failed
  refresh, and `gotrue.post()` returns `{ok:false}` for every non-2xx. A 502 from a proxy
  therefore **deleted the stored refresh token** and redirected to the login page — permanently,
  because the token was gone and silent re-login could never work again. The player had to retype
  a password for a session that was never invalid.
- **Root cause 3:** `resolveSession()` answered `session | null`, which made "invalid token",
  "no network" and "server broken" indistinguishable, and every caller read it as the first.
- **Touched:** `js/services/gotrue.js`, `js/services/authApi.js`, `js/main.js`, `js/state/store.js`,
  `js/ui/weatherPanel.js`, `js/auth-main.js`, `js/shop-main.js`, `js/settings-main.js`,
  `js/config/game.js`, `index.html`, `shop.html`, `settings.html`, `css/components.css`.
- **New:** `js/connection.js` (banner + retry wiring for all four pages), `js/ui/blockedScreen.js`,
  `js/ui/connectionBanner.js`, `tests/connectionStatus.test.js`.
- **How it behaves now:** boot with no connection shows a blocked screen with a retry, never the
  login page. Mid-session the farm keeps playing and saving locally; a persistent banner says the
  farm is device-only, that live weather is paused, and offers the `.farm` export. Reconnecting
  flushes the queued write and clears the banner. The weather panel keeps the last forecast but
  labels it *"Live weather paused — last read N minutes ago"* rather than showing a timestamp
  that reads as live.
- **Why a 5xx needed the HTTP status threaded through:** a proxy error body carries no
  `error_description`, so it mapped to `auth_unknown` — indistinguishable from a refusal.
  `gotrue.post()` now returns `status` alongside `reason`, which is what makes 401-versus-502
  decidable at all.
- **Also fixed while in there:** the boot and save wiring was copy-pasted across all four entry
  points, down to the `pagehide` line. Extracted to `js/connection.js` so the fix is written once.
- **Broke six existing tests, correctly:** `tests/mainBoot.test.js` asserted the old
  `session | null` contract — the exact contract that caused the bug. Updated to the new shape and
  kept their intent; added cases for offline, server_error and guest-with-no-network.
- **Layering:** `wireSaveOnExit` initially used `document` and `check-imports.mjs` refused it,
  which is the check working. It now takes the document as a parameter rather than widening the
  whitelist — ISS-016 is still open, so the rule was left intact.
- **Docs:** DEC-030 (this deliberately loosens a rule, so it needed a record), architecture.md
  boot order + module contracts, ISS-048/049/050 logged before any fix.
- **Tests:** `npm test` 310, 309 pass. The one failure is ISS-047 (duplicate rice sprites from
  Kafi's merge) and is untouched by this work. `npm run check` clean.
- **Not verified in a browser.** No desktop browser was attached to the session, so this was
  verified by `npm run check`, `npm test`, `node --check` on all twelve changed modules, and
  walking the import graph over HTTP from all four entry points — 67 modules, every import
  resolved. **Nobody has watched the banner appear, or the blocked screen render.** Two things
  want a human eye: that the retry button recovers cleanly, and that the export in the banner
  produces a valid `.farm`.

---

## Week-2 credit corrected, and Kafi/Jim unified — Hisham

- **Did:** Rewrote the week-2 half of the README so each piece of work has one name against it
  instead of three rows split three ways. The old `Sign-in and save system` row credited
  `Shabab, Hisham` for things four people built; it is now eight rows. Separately, **Kafi and
  Jim are one person** — the Git handle is `aa-jim` and the branch is `origin/jim` — and the
  repo was at risk of reading them as a fifth member.
- **Attribution now reads:** **Kafi** — sign-in menu UI, gameplay scene UI. **Shabab** — Supabase
  connection, shop, username sign-in, erase-progress and delete-account behind a password check.
  **Afif** — the weather API connected to the game interface. **Hisham** — the Supabase
  environment, the `farm_saves` SQL, export/import a farm, the asset registry.
- **Touched:** `README.md` (structure tree, team table, Where We Stand, Weekly Progress),
  `docs/team/tasks.md` (added T-35, T-36, T-37, T-38; T-11 moved `todo` → `doing`),
  `docs/team/members/{kafi,shabab,afif,hisham}.md`.
- **Removed from the README:** the `Project foundation / In progress / … 264 passing tests` row,
  and `loading tips` from the `js/config/` tree line.
- **Why the row had to go rather than be edited:** it was a catch-all that mixed real deliverables
  with a test count, and it credited a vague "foundation" instead of naming what was built. The
  work itself is not in question — it is split across the named rows now.
- **Not verifiable from the history:** `origin/jim` is **0 commits ahead of `origin/main`** and
  still holds only the two week-1 commits, so T-37 and T-38 are recorded from the team's report.
  Both are flagged in `tasks.md` and `members/kafi.md` rather than presented as shipped.
- **Also fixed while in there:** the README said "Week 1 is broken out per person" while showing
  week 2 too, and mixed `Kafi` and `Jim` in one table. The team table now reads
  `Abdullah Hil Kafi (Jim)` so the alias is discoverable once without being a second person.
- **Docs:** this entry; `tasks.md`; the four member notes; `README.md`. `AGENTS.md` §6 asks for
  all four, so they moved together.
- **Not done:** the loading-tips work is still credited to Hisham in this log and in
  `decisions.md`, `issues.md`, `ownership.md` and `tasks.md`, and `5640659` is authored by
  `Hishamwalid`. The README mention came out on request; the rest was left alone rather than
  delete a record of merged, tested code. **Decide before the next review.**
- **No code touched.** `npm run check` clean, `npm test` 280/280.

---

## A guest saw the word "null", and the settings page got its game font — Jim

- **Did, two things.** The settings page now sets its family once on `.settings-page` and gives the
  headings the display face, so card titles, buttons, labels, hints and body text are all Irish Grover
  and the `h1` plus every card title are Luckiest Guy. And the stray `null` a guest saw under the
  erase-progress card is gone. ISS-052.
- **The `null` was pre-existing and invisible to the suite.** `mountSettings` ended with the *native*
  `root.append(...)`, whose signature is `(Node or DOMString)` — so `account ? el(...) : null`, null for
  every guest, was stringified into a text node. The comment above that line said "`el()` skips null
  children", which was true and irrelevant: that call was never an `el()` call. Authed players never
  saw it, so it survived.
- **The test double was the deeper defect.** `fakeDom.append()` *skipped* null where the browser
  stringifies it, so the guest test passed against a visibly broken page. It now mirrors the real
  behaviour. `el()` keeps its own filter, so every `el()` call site is untouched — what changed is that
  a bare `append(null)` fails in the test exactly as it fails in a browser. This is the part worth
  remembering: **a fake must not be laxer than the thing it stands in for.**
- **Closed the trap rather than the instance.** `appendAll()` in `utils/dom.js` mirrors `el()`'s filter
  for code appending to an existing root, and accepts arrays the same way. Otherwise the next
  `root.append(a ? b : null)` repeats this exactly.
- **Verified by breaking it again.** Reverting `appendAll` to `root.append` fails
  *"a guest is not shown the word \"null\""* with `actual: [ 'null' ]`, and the authed twin still
  passes — which is the right shape, since the bug is guest-only. `settingsDom` is 24/24, up from 21.
- **Correction to the previous entry.** It said a `font-weight: 700` request against a 400-only face
  produces a *synthesised faux bold*. That is wrong: CSS Fonts 4 resolves a desired weight above 500
  with no near match to the **nearest available face**, so it renders at 400 and is simply not bolder.
  Nothing is faked and nothing errors. Corrected in `css/fonts.css`, `architecture.md` and the entry
  above. The visible symptom I predicted was right; the mechanism was not.
- **Why one CSS rule reached the whole page.** `components.css` declares no `font-family` at all, so
  `.card__title`, `.btn`, `.field__label`, `.field__hint` and `.form-message` all inherit from the body.
  Setting it on `.settings-page` reaches every one. It cannot leak: `index.html` also loads
  `settings.css`, but its `<body>` has no class, and `.settings-page` is the only body class in the repo.
- **Two judgement calls worth reviewing.** `.settings-top__title`'s inherited `letter-spacing: -0.01em`
  was dropped — the display face is narrow and already tight. And `.card__title` is `text-transform:
  uppercase` at `--text-sm`, which may sit small in Luckiest Guy; both are one-line changes if they
  look wrong in a browser.
- **Also edited Hisham's shared file:** `js/utils/dom.js` gained `appendAll`. Purely additive, nothing
  existing changed behaviour.

---

## `--font-ui` actually reaches the settings page — Jim

- **Did:** one `<link rel="stylesheet" href="css/fonts.css" />` in `settings.html`, placed after
  `components.css` to match `login.html`. The page now renders `.settings-top__back`,
  `.settings-top__title` and `.settings-accounts__row` in Irish Grover instead of the system stack.
- **Why it was doing nothing.** `--font-ui` is `"Irish Grover", var(--font-sans)`. On a page with no
  `@font-face` for Irish Grover, that is not an error — the browser walks the stack and lands on
  `--font-sans`. Three rules were asking for a face that was never loaded, and all three looked
  correct, which is what made it hard to spot.
- **The loading was implicit and had already drifted.** `login.html` links `fonts.css`; `index.html`
  inherits it from a `@import` at the top of `navbar.css`; `settings.html` loaded neither.
  **`shop.html` still loads neither**, so its `--font-ui` and `--font-display` fall through too. Not
  fixed here — flagged in `architecture.md` and in the `fonts.css` header.
- **Only three selectors.** Card titles, buttons, field labels and body text are unaffected:
  `components.css` has no `font-family` rule at all, so they come from `reset.css`'s
  `body { font-family: var(--font-sans) }`. Changing the whole page's face is a different job.
- **Expect the title to be the weak part.** Both faces are declared `font-weight: 400` only, and
  `.settings-top__title` asks for `700`. Per CSS Fonts 4 that resolves to the nearest available face,
  so it renders at 400 and is not bolder — nothing is synthesised and nothing errors, which is why the
  weakness is easy to miss.
- **Corrected a comment that is now false.** `fonts.css` stated that the settings page "still falls
  through to `--font-sans` and [is] unaffected" — it described the gap as intended. Rewritten to
  describe which pages load it and why the shop is still out.
- **Deliberately not touched:** the `page: 'login'` field on both font entries in `js/config/assets.js`.
  The field is singular, has no multi-page syntax, is not validated by any test, and was already
  inaccurate — Luckiest Guy is used by the `index.html` navbar today and still says `login`.
  Choosing a value would mean inventing a convention in Hisham's file for a cosmetic field.
- **Still no test for this.** `settingsDom.test.js` asserts that every *class* the page renders is
  styled by a stylesheet the page links. It has no equivalent for `@font-face`, which is exactly how
  this survived. Worth a test that walks each page's `font-family: var(--font-*)` rules and checks
  the named family has a face on that page.

---

## Import and export actually reach the settings page — Jim

- **Did:** the Save data card on `settings.html` showed the literal text `[object Object]` instead of
  the Export and Import controls. `mountSavePanel(el('div'), actions)` returns `{ unmount }`, not a
  node, and that return value was passed straight into `el()` as a child — so `utils/dom.js`
  stringified it and the panel itself stayed mounted into a detached `<div>` that never reached the
  page. The host is now made first, mounted into, and only then embedded. ISS-051.
- **The second half of the same defect:** the card was gated on `actions.canExport ?` — tested, not
  called. `canExport` is a function, so the test was always truthy and the ternary never hid
  anything. It read as a deliberate guest gate and was not one. Removed: the card renders for guests
  too, and `savePanel.js` already explains in place why a guest farm has no account to attach the
  file to. A card that says why beats a missing one.
- **Why no test caught it.** Every `mountSettings` call site in `settingsDom.test.js` omitted the save
  callbacks, and survived only *because* the broken ternary skipped the whole card — so a card that
  never rendered was indistinguishable from a card that was not supposed to. Making it unconditional
  meant all 12 call sites threw at once, on `actions.canExport()` at mount time. They now share a
  `saveActions()` helper.
- **One existing test had to change, and it was the test's fault.** "The two cards do not share a
  status line" counted `role="status"` nodes *page-wide* and asserted exactly 2. The Save card added
  a third of its own, so it failed on a correct page. Rescoped per destructive card — which is what it
  always meant to assert — plus a check that the two nodes are genuinely different objects.
- **Verified by breaking it again.** All four new tests fail against the pre-fix file, the
  stringified-mount one reporting `actual: [ '[object Object]' ]`, and pass after. `settingsDom` is
  21/21, up from 17.
- **Also corrected:** `architecture.md` said `main.js` mounts the save panel; it is
  `settings-main.js`. Added the `mountX`-returns-`unmount`-not-a-node rule to the contract table,
  since that is the generalisable half.
- **Not touched:** `js/ui/savePanel.js` (Hisham's) and `css/`. The nested `card__body` and duplicate
  "Your farm" title inside the Save data card are left as they are.
- **Still red, unrelated:** `tests/assets.test.js` — the crop PNGs are on disk but not in `ASSETS`.
  Present before this change. That failure is Hisham's **ISS-047**, the five duplicate flat-path rice
  sprites; the two ISS-047s collided across branches and this entry is the one that became ISS-051.

---

## Login CSS split by component — Jim

- **Did:** `css/auth.css` was one file holding three components. It is now three — `auth.css` (the
  backdrop and stage), `menu.css` (the menu and `.btn--menu`), `sign.css` (the board, its form
  overrides, `.btn--go` and `.btn--back`). The 19 `--art-*` tokens are gone from `variables.css`;
  those files write their values directly. DEC-029.
- **Why one file per component.** A component split means a file owns its element completely.
  `.btn--go` now sits beside `.sign` instead of back in a shared `components.css`, so adding a
  variant does not mean editing two layers and hoping the load order cooperates.
- **Why the tokens went.** DEC-027 already established that the login page does not follow
  `data-theme`, so nothing ever overrode `--art-*`. They were 19 names for values one page read.
  `--font-display` and `--font-ui` stay tokens — the faces are declared in `css/fonts.css` and are
  genuinely shared.
- **Value-neutral, and checked rather than asserted.** Every rule was diffed against the pre-split
  file with tokens resolved: 47 selectors, no computed value changed. The only intended differences
  are four `width: min(100%, Npx)` becoming `width: 100%; max-width: Npx`, and `--sign-shape` moving
  from `.auth` onto `.sign` — safe because `signBoard.js` always nests `.sign__inner` inside `.sign`.
  `tests/settingsDom.test.js` is 17/17, and all 32 classes the login JS renders resolve to a rule
  in a file the page links.
- **The contrast rationale moved with the tokens.** The notes explaining the wordmark green, the
  label colour on the board and the error chip were comments on the `--art-*` block; deleting the
  block would have deleted the reasoning. They are now in `architecture.md`.
- **Also did, same pass:** the game page. `.topbar*` (now `.navbar*`) moved out of `layout.css` into
  a new `navbar.css`, and `css/farm.css` became `css/scene.css` — it also absorbed the `.field-stage` rule
  `layout.css` was carrying, so one of two identical blocks is gone. `layout.css` is now just the
  grid. Verified value-neutral against `HEAD`: 32 selectors, one diff, and that one diff is the
  duplicate collapsing.
- **Colours stay tokens on the game page, unlike the login page.** `themes.css` really does override
  `--accent`, `--surface-sunken` and the rest, so inlining them would break dark mode here. The
  login page could drop its tokens only because DEC-027 had already taken it out of the theme. That
  asymmetry is the reason the two halves of this split are not identical.
- **Then the same pass took the spacing and radius scales out.** Seven `--space-*` steps and three
  `--radius-*` values are now hardcoded px. 52 references converted across `layout`, `navbar`,
  `reset`, `scene`, `weather`, `shop` and `settings`, each verified value-identical by resolving
  tokens on both sides and diffing rule by rule — zero differences, so nothing on any page moved.
- **`components.css` is deliberately untouched**, so its 41 references are the only ones left. The
  ten definitions stayed in `variables.css` marked STOPGAP purely so that file keeps rendering;
  deleting them before converting it would have silently dropped 37 `gap`s, 30 `padding`s and 18
  `border-radius`s to their initial values, which is invisible in CSS — no error, just no spacing.
  `AGENTS.md` and `architecture.md` both say so, and the block says how to finish it.
- **Why the scales went.** Nothing overrides spacing or radii. `themes.css` swaps colours and
  nothing else, so those were indirection with no second reader.
- **Renamed `.topbar*` to `.navbar*`, and the module to match.** `js/ui/topBar.js` is now
  `js/ui/navbar.js`, `mountTopBar` is `mountNavbar`, and the log scope is `navbar`. The class was
  renamed to match `css/navbar.css`, but leaving the module called `topBar.js` would have made it
  the only file in `js/ui/` not named after the class root it renders — `farmView.js`/`.farm-view`,
  `menuPanel.js`/`.menu`, `signBoard.js`/`.sign`, `shopLauncher.js`/`.shop-launch` all follow it.
  `#top-bar` and `.app__top` were deliberately left: the id is the mount guard that
  `shop-main.js` and `settings-main.js` both cite as the reason importing `resolveSession` is safe
  there, and `.app__top` is a grid area in the spatial set `top / left / centre / right`, not a
  component name. Verified: all 6 navbar classes resolve to a rule `index.html` links, the guard
  still fires on `index.html` and is still absent from `shop.html` and `settings.html`, and every
  relative import in the four entry scripts resolves.
- **The load order was wrong, which is why the height appeared to do nothing.** `index.html` loaded
  `navbar.css` *before* `components.css`. `.navbar` and `.card` are both single-class specificity,
  so `.card`'s `padding: var(--space-4)` won the tie and the bar measured `height + 32 + 2` —
  changing `height:` moved nothing, because padding dominated. Moved the link after
  `components.css` so the navbar owns its own box. This was my error: I asserted the order was
  already right in the plan and then inserted the link in the wrong position.
- **The navbar owns its own height now.** `.navbar` declares `height: 60px` and `padding: 0 8px`,
  so the bar no longer inherits `.card`'s padding — previously nothing set a height at all and the
  bar was as tall as its tallest child plus the card's 16px. Zeroing the padding means the height
  will not move when T-38 hardcodes `.card`'s `var(--space-4)`. 60px gives a 60px content box for a
  39px sign-out button; **48px is the floor**, below which the button touches the card border.
- **The placeholder search slot is gone.** `navbar.js` rendered a `disabled` input with the
  placeholder "arrives with live weather (T-11)", hidden under 900px, and duplicated the real one.
  The location search lives in the weather panel (`locationBar.js` → `#location-bar`).
- **That removal also fixed a grid bug it would otherwise have hidden.** The bar had three columns
  (`auto minmax(0,1fr) auto`) for three children. With the search gone, `.navbar__account` would
  have landed in the `1fr` track, stretched full width, and left-aligned its badge instead of
  sitting at the right edge. Now two columns with `justify-self: end` on the account, which is what
  preserves the old alignment. The tallest child also dropped from 50px to 39px, which is why 60px
  is comfortable rather than tight.
- **Found while checking coverage, logged as ISS-046:** `.btn--secondary`, `.divider` and
  `.navbar__name` are rendered but have no rule anywhere, and neither does the `.location-bar*`
  family. The save panel's "Save" button has been rendering as a plain `.btn` because of this.
- **Also fixed:** ISS-045. The docs pointed at `css/field.css`, which has never existed. Corrected to
  `css/scene.css` — which is also the name this file took in this pass, so the doc fix and the
  rename landed together.
- **Left alone:** `.menu__logo` keeps the 600px already in the working tree, and no class was
  renamed — three of the files that render them belong to Hisham.

---

## The opening menu, sign in and create account — Kafi

- **Did:** `login.html` is now the three screens in the design — a menu with the logo and three
  orange buttons, then the sign-in and create-account forms on a wooden sign, all over the painted
  farm background. The panel used to be a tab pair with both forms built and one hidden; each is now
  its own view, mounted alone. `show(view)` in `js/ui/authViews.js` is the only place a view changes.
- **No auth behaviour changed.** Same provider calls, same validation, same errors, same redirects.
  The sound toggle in the design was left out — sounds are out of scope (ISS-023) and there is no
  audio code, so a button that mutes nothing is worse than no button.
- **The view graph is its own module.** `js/ui/authViews.js` owns which button leads to which
  screen; `js/auth-main.js` keeps only the boot. It imports no provider and calls no service, and
  the split is what keeps both under the 200-line budget. `passwordReset.js` was split the same way
  (`resetRequest.js`, `resetSet.js`) — it was already over budget at 276 lines.
- **Three things the design asked for that could not be built as drawn.**
  - **The green sign-in button.** The mockup's green with white text is 2.2:1 and fails AA. The
    dark ink the mockup already uses on every other button keeps the fills as bright as drawn and
    passes at 4.96:1 or better.
  - **The field labels and error text.** Both were too light on the wood. Labels were darkened;
    errors got a pale chip, because no shade of red clears 4.5:1 against `#a9714a`. Every pairing
    was measured; the notes were on the `--art-*` tokens, and DEC-029 moved them to
    `architecture.md`.
  - **The board's outline.** `clip-path` cuts a border away rather than shaping it, so the sign is
    two stacked layers sharing one polygon. Because the percentages are relative to each layer's
    own box and the board grows with the number of fields, the first polygon clipped the right-hand
    column and the footer — caught by screenshotting the tall create-account view, not by reading
    the CSS.
- **Two bugs only a browser found:** the menu stole focus on page load (painting a focus ring nobody
  asked for), and the plank collided with the board's top arc at mobile widths.
- **Verified by driving it, not by eye:** menu → sign in → back → register → forgot password, the
  `?deleted=1` arrival notice, the recovery-link entry with fragment scrubbing, live password
  guidance, empty-submit errors, and all nine text pairings measured against real backgrounds.
- **Merged over the T-11 weather work** (loading tips, the asset registry, live location). Both sides
  were kept: `auth-main.js` now shows the boot loader *and* the new view graph, and the four new
  files are registered in `ASSETS` so `tests/assets.test.js` passes.
- **Editing another folder:** `js/ui/loginPanel.js`, `loginFields.js` and `passwordReset.js` are
  Hisham's; Kafi is the backup on all three. `js/auth-main.js` was unassigned and is now Kafi's.

---


## Loading tips on every page boot — Hisham

- **Did:** Added a full-page loading veil with a spinner and a rotating weather/farming fact.
  `js/ui/loadingTips.js` exposes `mountBootLoader()` / `done()`; `js/config/tips.js` holds 22 facts
  (12 weather, 10 game) and the three thresholds. Wired as the first statement of `start()` on all
  four pages, dismissed after the real UI mounts. Styles in `.boot-loader`, reusing the
  `.btn__spinner` that had been dead CSS since it was written.
- **Touched:** `js/config/tips.js` (new), `js/ui/loadingTips.js` (new), `tests/loadingTips.test.js`
  (new, 13 tests), `css/components.css`, `js/main.js`, `js/auth-main.js`, `js/shop-main.js`,
  `js/settings-main.js`, `docs/architecture.md`, `docs/team/issues.md`, `docs/team/decisions.md`.
- **Why:** Every page awaited the session *and* the remote save before mounting anything, so a
  player on a bad connection saw a blank white page for up to 15 s (ISS-043). `gotrue.js` sets no
  request deadline, so that bound is only the `Promise.race` in `authApi.js`.
- **Two thresholds, and why there are two:** nothing paints for 250 ms, so a fast load still shows
  no loader at all; and no fact appears until 1500 ms, so a short wait gets a spinner and no
  trivia. A loader that flashes on every navigation is worse than none.
- **Broke (and was caught before it shipped):** two bugs in the loader itself, both found by the
  new tests rather than by reading. `done()` called `unmount()` while `unmount` was an
  object-literal method — a `ReferenceError` on *every* page. And the first fact landed at
  1750 ms instead of the documented 1500 ms, because the delay was composed with the reveal
  delay. Both fixed; `js/ui/loadingTips.js` now has a named `unmount` function and measures both
  thresholds from mount.
- **Also logged:** ISS-044 — `js/settings-main.js:181` calls `clearSave()` but only imports
  `clearLocalSave`, so account deletion reports success while leaving the farm in localStorage.
  Found while auditing boot, **not fixed here**: it is another person's folder and an unrelated
  data-loss bug, and AGENTS.md §8 says one commit per step. DEC-025 may mean the fix is to change
  the call rather than add the import — read that first.
- **Docs:** architecture.md boot order + tree + "where to change", DEC-026 for painting pre-auth,
  ISS-043 and ISS-044 logged before any fix.
- **Not done:** `almanac.html` is still a zero-byte file, so it gets no loader until it exists.
- **Not verified in a browser.** Verified by `npm run check`, `npm test`, `node --check`, and
  confirming all four pages plus the new module serve HTTP 200 from the dev server — but no
  browser was attached to the session, so **nobody has watched it render**. Two things worth a
  human eye before it is trusted: the sign-out redirect path (the veil must close before
  `location.replace`, or it flashes during the hop), and that a screen reader announces
  "Loading your farm…" once rather than every 5 s. Throttle to Slow 3G to see anything at all —
  under 250 ms it correctly shows nothing.
- **Ownership:** `js/ui/loadingTips.js` and `js/config/tips.js` registered in
  `docs/team/ownership.md` as Hisham / Kafi — Kafi to sanity-check, since the whole of
  `js/ui/*` is his per the members page. `css/components.css` is also his, so the `.boot-loader`
  block is **appended** at the end rather than edited into existing rules, to keep the merge
  trivial for whoever next touches it. `js/config/tips.js` sits with the other config data
  because it is pure data and `config/` imports nothing — but note it is *not* covered by the
  existing `js/config/{field,game,assets}.js` row, which is why it got its own line.
- **Rebased over T-11, and it changed the answer.** `bb36161` (live weather, T-11) rewrote
  `js/main.js` — same file, four conflicts — and made the forecast a fire-and-forget
  `refreshWeather()` after the panels mount. So `done()` now fires after `renderPanels()`, not
  after the last `await`: holding the veil until weather settled would hide a perfectly playable
  farm behind a weather timeout. T-11 also replaced `wireHud()` with `renderPanels()`, so that
  call went with it. All 280 tests pass against the merged result.

## Central asset registry with automatic enforcement

- **Did:** Created `js/config/assets.js` — a registry of all 31 asset files with path, name, byte
  size, pixel dimensions, status, category and the page it appears on. Added path builders
  (`groundTile`, `cropStageImg`, `cropSeedImg`, `cropFailureImg`, `weatherIcon`, `cropIcon`,
  `pumpFrame`), plus `assetsForPage()` and `totalSize()`. Created
  `tests/assets.test.js` which scans the `assets/` directory and fails if any file is missing from
  the registry, any entry points to a missing file, or any size does not match.
- **Touched:** `js/config/assets.js` (new), `tests/assets.test.js` (new), `AGENTS.md` (doc matrix
  row + checklist item), `docs/asset-checklist.md` (pointer note), `README.md` (structure tree).
- **Why:** The team needed a single place to see and edit asset sizes, and a way to guarantee new
  assets get registered — the test makes it impossible to forget.
- **Problems:** None. All 162 tests pass, import check clean.

---

## Shop, settings, username sign-in, and account deletion

- **Did:** Four surfaces, in the order they were asked for. The seed shop as its own page
  behind an artwork button. A settings page behind a second one, holding two destructive
  actions: **erase all progress** (two clicks) and **delete my account** (two clicks and the
  password). Username sign-in alongside email. Then account deletion, rebuilt twice.
- **The interesting part was what each change broke rather than what it added.**
  - **The `usernames` table was world-readable.** The SELECT policy was `using (true)`, on the
    reasoning that resolving a username to an email happens before sign-in. That is true, and it
    says nothing about the endpoint: RLS governs *rows*, not queries, so `?select=*` returned
    every username and email to any holder of the anon key that ships in this repo. Replaced
    with a `security definer` function that resolves one name. ISS-040 by way of ISS-002.
  - **The username write was silently refused.** `Prefer: resolution=merge-duplicates` is refused
    by those policies — 403, verified on the live project, while the identical body without the
    header answers 201. So usernames were never recorded and username sign-in was dead. Every
    test passed, because the tests stub `fetch` and never saw the 403.
  - **Erasing progress wiped the farm on a *wrong* password.** `clearSave()` ran before the
    password was checked, and the panel then said "nothing was changed". Fixed by ordering, not
    by clearing later.
  - **`clearSave()` could not report a failed server delete** (ISS-041), so "your farm is cleared"
    could be false with an expired access token. It returns a result now.
  - **A shadowed import broke the delete button entirely.** `settings-main.js` imported
    `deleteAccount` and also declared a local function of that name, so the call resolved to
    itself and recursed until the stack blew. The `RangeError` surfaced as a generic failure with
    the server working and the password correct. `npm run check` now fails on a declaration that
    shadows an import — verified by reintroducing the bug.
- **On deletion itself.** It was built as a 7-day grace period, then changed to immediate. The
  grace period was doing two jobs and only one was the delay: it was the only thing bounding a
  client-side-only password gate. Immediate deletion turned that same gap into permanent loss, so
  the check moved into the database (`delete_my_account(password)`, comparing the bcrypt hash with
  `pgcrypto`) rather than staying in the browser. DEC-024 supersedes DEC-022; both are kept.
- **Also:** two migrations install and drop things the project had been carrying in chat only —
  `002_usernames.sql` (owner SELECT policy) and `005_immediate_account_deletion.sql` (which now
  installs `pgcrypto` itself after failing twice on projects without it). `docs/setup.md` was
  written for the person who clones this next.
- **Tests:** **209 passing at this point** (247 after the password gate on progress, below). The
  additions that mattered are the ones pinning behaviour a stub
  could not see: that the username insert carries no `Prefer` header, that a 409 is a success, and
  that a refused server delete is reported rather than swallowed.

---

## Both destructive actions behind the password, and the test that could not exist before

- **Did:** "Erase all progress" now takes the password. It did not before, and the reason it did
  not is worth recording because it was wrong in an instructive way.
- **The original argument:** deleting an account is irreversible, so that one is behind a
  password; erasing a farm is not, because the account survives and you get a new one in a
  second. Therefore the farm did not need protecting.
- **Why that is wrong:** a farm is weeks of accumulated play. *Easy to replace is not
  protected.* And the gap was concrete — a stolen session token could destroy it outright,
  with nothing to check and nothing logged. DEC-025 extends DEC-024's rule to the other
  irreversible thing on the page.
- **Same shape as the account function, on purpose.** `006_password_gated_erase.sql` adds
  `erase_progress(password)`: no account id, `search_path = ''`, EXECUTE revoked from
  `PUBLIC` and granted to `authenticated`, bcrypt compared with `crypt()`, fails closed. It
  deletes **only** `farm_saves`, so the player stays signed in. The check and the delete are
  one statement — a separate verify endpoint would be one the browser could skip, which is the
  exact gap DEC-022 had.
- **The order was the actual bug, and it was in the entry script.** `deleteProgress()` used to
  clear both copies of the save and *then* ask the server. So a wrong password wiped the farm
  and the panel reported that nothing had changed. Now the password-gated call goes first,
  and nothing is touched until it succeeds — the same order the account path already used.
  `clearSave()` became `clearLocalSave()` for the same reason: the server half is already done,
  and repeating it would be a request at a deleted row whose failure reads as a real one
  (ISS-041).
- **Two hand-written handlers had drifted, so they became one.** Both actions now run through
  `runDestructive()`. Writing it once is the fix; the part I would emphasise is *where* it
  lives: it takes its collaborators as arguments, so `tests/dangerAction.test.js` can assert
  the ordering with fakes. That is new — `js/settings-main.js` is an entry script and previously
  had no test at all, which is exactly how the original bug survived a green suite.
- **Also found while doing this: `js/services/accountApi.js` had no test file.** The client half
  of *both* RPCs — shipped, live, and never loaded by a single test — because the suite stubs
  `fetch` and nothing imported it. 17 tests now, covering the reason mapping the panel depends
  on: `not_migrated` for a 404, `cannot_verify_password` for a fail-closed project, and a
  timeout that is never reported as a wrong password.
- **Split the panel rather than grow it.** `settingsView.js` was 290 lines and past the budget
  it documents. It is now 197, with `passwordGate.js`, `runDestructive.js` and
  `dangerMessages.js` beside it.
- **Tests:** **247 passing** at this point. The one I would keep forever is the empty-list assertion in
  `dangerAction.test.js` — a refused password must not reach the success path. That is the
  original bug, pinned.

---

## "Checking your password." was in the DOM and completely invisible

- **Reported as:** the password check on the settings page gave no feedback at all.
- **It was not a missing feature.** `runDestructive` had been calling
  `announce('Checking your password.', 'info')` since it was written. The sentence was
  rendered, correct, in the right place in the tree. Three separate things were wrong.
- **1. The wrong card.** The page had **one** status node, rendered inside the *erase
  progress* card. Every sentence the *account* action produced appeared above the progress
  button, in a card the player might have scrolled past and had not clicked. And `onArm`
  cleared that same shared node, so arming one action wiped the other's words. Now each
  action owns a live region in its own card — which is also the right thing for a screen
  reader, since a shared node narrates a password check at the bottom of the page as
  page-level news.
- **2. No styling at all.** `.form-message` was defined in `css/auth.css`, and
  `settings.html` does not load `auth.css`. So on that page the sentence had no padding,
  no background and no colour: unstyled default text, indistinguishable from body copy.
  The rules now live in `css/components.css`, which every page loads. **This is the actual
  answer to "it doesn't show"** — the markup was never wrong, and reading the tree could
  never have revealed it.
- **3. `--info` did not exist.** Only `--error` was defined, so `info` fell back to the
  neutral base and read as a fault — which is the opposite of what "Checking your
  password." means. Added, with `--success` while there.
- **The fix that mattered most was the test, not the CSS.** `AGENTS.md` had recorded that
  this suite has no DOM and that the two headless smoke tests covering that gap lived
  outside the repo — "which is itself worth fixing". So: `tests/helpers/fakeDom.js`, a
  ~270-line fake `document` with no library, and `tests/settingsDom.test.js`. 17 tests
  that mount the real panel and assert on what a player can read and which card says it.
- **It immediately paid for itself by catching 2.5.** It found the shared-node bug, the
  `onArm` cross-clearing, *and* a class styled in a file the page does not load — which
  is the actual cause above, and which no amount of reading `settingsView.js` would have
  surfaced. Both fixes are mutation-tested: reverting each one fails the suite.
- **One thing I was careful not to "fix":** the test also flagged `card__body` as
  unstyled. It is styled nowhere and always has been, because `.card` carries the padding
  — a structural hook, not a bug. Rather than add a rule or silence the check, the
  assertion was narrowed to what actually matters: *if a class is styled somewhere, then
  this page's stylesheets must be where it is styled.* That is exactly the shape of the
  real bug, and it ignores semantics-as-markup on purpose.
- **Tests:** **264 passing**, up 3. `settingsView.js` is 201 lines after the split;
  `statusLine.js` took the widget out of it.
- **Lesson worth keeping:** three of these bugs were invisible to the suite and to a live test of
  the service in isolation. They were only found by probing the running project, and one of them
  by testing the thing a player actually clicks.

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

## Hisham — server-side save storage, pending one manual SQL step

- **Did:** Added the farm to Supabase so it follows a player across machines, which is the one
  thing the browser save could not do. `supabase/migrations/001_farm_saves.sql` creates the table
  and its Row Level Security policy; `js/services/saveApi.js` talks to PostgREST; `js/remoteSave.js`
  assembles the adapter and `store.js` calls it.
- **BLOCKED ON ONE MANUAL STEP.** The migration has to be pasted into the Supabase dashboard's SQL
  editor. A browser cannot create a table, and the only other route is a `service_role` key, which
  bypasses RLS and must never be in this repo (DEC-018). Until it is run, reads return "table not
  found" and **the game plays exactly as it did before** — no migration, no visible change.
- **localStorage is kept, deliberately, as an offline cache.** The server is the authority;
  localStorage is what the player falls back to when the network drops. Each save writes the local
  copy first — synchronously, so it survives the tab closing — then tries the server. Without
  that, one dropped connection would cost someone their farm. This also means shipping it is not a
  cliff: worst case before the SQL is run is the current behaviour.
- **A 404 is not treated as "no farm".** Only a 406 is, because 406 genuinely means "this player
  has no row yet". A 404 means the migration has not been run, and calling that "no farm" would
  start a new farm and then overwrite the real one on the next save. There is a test that pins
  that distinction, because it is the difference between a missing table and a data-loss bug.
- **Breaking change:** `store.init()`, `saveNow()` and `clearSave()` are now `async`. A synchronous
  `init` would write a fresh farm over the server's copy before reading it, so this one is not
  optional. `tests/store.test.js` and `tests/localAuth.test.js` updated accordingly, and the
  storage-throws case became `doesNotReject`, since the async equivalent of `doesNotThrow` is the
  honest assertion.
- **The layering check caught me putting the join in the wrong folder.** `state/` may not import a
  service, so `state/remoteSave.js` failed `npm run check` with exactly that error. Moved to
  `js/remoteSave.js`, beside `main.js` and `auth-main.js` — the entry points, which have no import
  rules. That is the check earning its keep rather than being decoration.
- **Tests 136 → 159.** `tests/saveApi.test.js` covers the request shape with `fetch` stubbed, so it
  passes whether or not the table exists: the upsert (`resolution=merge-duplicates` plus
  `on_conflict=user_id`), both auth headers, the no-farm 406, the missing-table 404, timeout, and
  that no `service_role` string appears anywhere. Seven more in `store.test.js` cover the fallback:
  server-first, offline fallback, failed write keeping the local copy, and `clearSave` removing
  both copies.
- **Also exposed:** `authApi.accessToken()`, because the token cannot cross from `services/` to
  `services/` or to `state/`. It is deliberately not exposed to any UI module — a panel must never
  see a token, or a template could render it into the page.
- **Files:** `supabase/migrations/001_farm_saves.sql`, `js/services/saveApi.js`,
  `js/remoteSave.js`, `js/state/store.js`, `js/state/saveFile.js`, `js/services/authApi.js`,
  `js/main.js`, `tests/saveApi.test.js`, `tests/store.test.js`, `docs/architecture.md`
- **Not verified:** the round trip. The table did not exist when this was written, so nothing
  that needs it was exercised.
- **Update 2026-10-06 (Shabab):** the migration has since been run against the live project, and the
  table is verified to exist — `GET /rest/v1/farm_saves` went from `404 PGRST205` to `200`, and
  `pg_policies` shows `own row only` / `ALL`. An anon-key read returns `*/0`, so RLS filters per-row
  rather than denying everything.
- **Still not verified:** whether the game actually writes through. Three checks are outstanding — a
  signed-in autosave lands a row, the same farm appears in a second browser with no localStorage
  copy, and a cross-account read returns `[]` rather than `403`. Until those pass this feature is
  unverified rather than done. "Changes survive a reload" cannot be tested yet either: nothing is
  implemented that can be changed, and localStorage being the fallback means a reappearing farm
  proves nothing on its own.
- **Next:** run those three checks. After that, ISS-027 with Shabab.

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

