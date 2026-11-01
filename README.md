# 🌾 Forecast Farm

A 2D web farming game driven by **real weather at the player's own location**. The game asks
where you are and runs your farm on that place's live forecast.

**Live build:** [forecast-farm.vercel.app](https://forecast-farm.vercel.app)

---

## 📖 What This Project Is

Forecast Farm is a browser game where the weather is real. The player allows the game to know
their location, and from then on the farm belongs to that place — the weather on screen is the
weather outside their window. Rain genuinely waters the crops, heat genuinely dries them out, and
frost can wound them, because all of it comes from a live forecast rather than being invented.
Weather never kills outright — it costs a crop its health and its payout, and only a plot left
bone dry through a whole day actually dies.

The place can be changed at any time from the search bar. A crop already in the ground keeps the
verdict it was sown with, but every hour after that is judged against the new place's forecast — so
moving the farm mid-season is a real decision, not a free reset.

Play is one loop: **plant → water → wait → harvest.** Crops grow in real time, so a six-hour crop
takes six hours whether or not the game is open. Every plot carries its own water meter, and
clicking one opens that plot's gauge and the button that waters it. Spending is the tension — the
pump starts on **two plots**, and can be upgraded through five levels to water **four, eight,
twelve or sixteen at once**, charging gold for every drop it actually delivers until each target
reaches its own target and no further, and rain on the way means it might be better not to. A crop
left dry, or left drowned, is **damaged for good**: it still harvests, but for less. The player is
always reacting to genuine conditions, so decisions carry weight rather than luck.

The goal is to unlock all sixteen plots. The first is free, and each one after costs exactly twice
the last — 100, 200, 400, 800 … up to 1,638,400 — which turns the farm into something a player
returns to over months rather than finishes in an afternoon.

**All five crops are playable.** Rice, potato, tomato, wheat and corn each have their own five
growth stages, their own seed packet, and two damage sprites. The farm runs on the real clock, the
pump has five levels with their own drawings, and the whole thing is playable end to end: search a
place, buy a seed, plant it, water it, watch the forecast change its health, and harvest it for
gold.

---

## 🎮 The Game in a Minute

- A browser farming game where the weather is real and comes from the player's **own location** —
  the farm is not somewhere fictional. → [crop-choice-guide.md](docs/crop-choice-guide.md)
- Play is one loop: **plant → water → wait → harvest**. Crops grow in real time, so a six-hour
  crop takes six hours whether the game is open or not. → [crops.md](docs/crops.md)
- **Five crops** — rice, potato, tomato, wheat and corn — each unlocked by owning more land, so the
  shop is a progression rather than a menu. → [crops.md](docs/crops.md)
- The weather acts on the field. Rain waters the soil, sun and heat dry it out, and wind, hail and
  frost wound a crop — damage that stays. → [weather-events.md](docs/weather-events.md)
- The pump starts watering **two plots at a time** and can be upgraded to **4, 8, 12 or 16**
  outlets, each delivering the same rate. It **bills only the water that actually lands**, so
  expanding the machine widens what it can reach without making water cheaper.
  → [weather-events.md](docs/weather-events.md)
- The forecast warns you in advance, crop by crop — *"Heavy rain coming — wheat rots in standing
  water"* — so checking tomorrow's weather is worth doing.
  → [notifications.md](docs/notifications.md)
- **The goal is to unlock all sixteen plots.** Each costs exactly twice the last, so the farm is
  never finished. → [crops.md](docs/crops.md)
- You sign in, or play without an account, and **your farm is saved for you** — and you can write it
  to a file to keep, or move to another computer. → [architecture.md](docs/architecture.md)
- Easy and normal modes, seven preset avatars, sound effects, a crop almanac, a seed inventory, and
  a bug-report form. → [Where We Stand](#stand)

**→ New here? Read [Where We Stand](#stand), then [What v0.1 Does Not Do](#limits).**

---

## 📦 What Is in v0.1

| System | What shipped | Where |
| :--- | :--- | :--- |
| **The field** | 16 plots in four 2×2 zones, isometric, one water meter per plot, locked plots with price tags | `js/ui/farmView.js`, `js/config/field.js` |
| **Weather** | Live Open-Meteo forecast for the player's location, 24 h strip, nine classified events, place search with suggestions | `js/services/`, `js/domain/weather.js` |
| **Crops** | Five crops, five stages each, real-time growth from `plantedAt`, season suitability by latitude | `js/crops_logics/`, `js/config/crops.js` |
| **Water** | Rain, evaporation, per-plot target band, permanent damage latch, death from drought | `js/domain/water.js`, `js/domain/plotWater.js`, `js/domain/damage.js` |
| **Pump** | Five levels (2 / 4 / 8 / 12 / 16 plots), bills only delivered water, hand-over between plots, upgrade in the shop | `js/domain/pump.js`, `js/domain/pumpUpgrade.js`, `js/domain/pumpSwap.js` |
| **Economy** | Gold, seed packets, harvest paid by health, land doubling in price, seed selling at 75 % | `js/domain/shop.js`, `js/domain/land.js`, `js/domain/farm.js` |
| **Accounts** | Email or username sign-in, guest play, password reset, seven preset avatars | `js/services/authApi.js`, `js/ui/authViews.js` |
| **Saving** | Server save per account, autosave, offline retry, `.farm` export and import | `js/state/store.js`, `js/services/saveApi.js`, `js/state/transfer.js` |
| **Pages** | Farm, login, shop, settings, profile, almanac, inventory | root `*.html` |
| **Polish** | 16 sound effects, phone layout at ≤900 px, loading tips, sync indicator, bug report | `js/utils/sound.js`, `css/phone*.css`, `js/ui/reportBug.js` |

---

<a id="limits"></a>

## ⚠️ What v0.1 Does Not Do

Recorded here so nobody mistakes a gap for an oversight. Each one links to its issue or decision.

- **Five `_dead` sprites are missing** — one per crop. A dead crop is shown by the damage word,
  not a picture. That is [DEC-014](docs/team/decisions.md) working as intended: the team chose
  broken art over a fallback layer, and never built the fallback.
- **The nine weather icons and five crop icons are still 0 bytes** (ISS-001). Text labels carry
  the meaning in the forecast strip and the seed picker.
- **There is no separate market.** A harvest pays its gold at the moment you harvest it, and the
  inventory page is a read-only record of the seeds you own. Selling harvest as a second step was
  specified and never built — see [ISS-099](docs/team/issues.md).
- **Buying land has no confirm step** (ISS-080). A misclick spends the gold.
- **Exported `.farm` files are integrity-checked but not signed** ([DEC-021](docs/team/decisions.md)).
  Anyone who knows the format can edit the numbers and update the check.
- **A guest farm is local only.** It cannot be exported, and clearing site data deletes it.
- **Sound effects play, but there is no mute toggle.** The navbar's sound tile is decorative and
  says "coming soon" (ISS-023).
- **The Farmer 3 avatar regression is open (ISS-122).** It is why seven tests fail in
  `npm test` — see [Verification](#verification).
- **`js/domain/simulator.js` is still a 0-byte planned file** (ISS-098). Nothing imports it.
- **There is no debug panel** (`?debug=1`). The geometry sliders, cheats and forced-weather
  dropdown planned as T-06 were never built.

---

## 📚 Documentation

The README is deliberately short. Everything below is the detail.

| Doc | What it covers |
| :--- | :--- |
| [`crops.md`](docs/crops.md) | Crop numbers, growth stages, **land prices**, harvest and quality |
| [`asset-checklist.md`](docs/asset-checklist.md) | **Every asset the game needs and what is still missing** |
| [`weather-events.md`](docs/weather-events.md) | The nine weather events, how real weather maps to them, what each does to crops |
| [`notifications.md`](docs/notifications.md) | The crop warning messages and when they fire |
| [`crop-choice-guide.md`](docs/crop-choice-guide.md) | Which crop to plant in each season, and using the forecast |
| [`architecture.md`](docs/architecture.md) | Project structure, layering rules, accounts and saving, data flow, and **the full annotated file tree** |
| [`setup.md`](docs/setup.md) | **Start here to run it** — migrations in order, and how to check each one worked |
| [`team/decisions.md`](docs/team/decisions.md) | Choices already made, so nobody relitigates them — **read this before changing how accounts or saves work** |
| [`game-design/implementation-plan.md`](docs/game-design/implementation-plan.md) | The original build plan, and how the build compared to it |
| [`team/`](docs/team/README.md) | Goals, tasks, ownership, logged issues, decisions, weekly notes |
| [`team/goals.md`](docs/team/goals.md) | The five-week plan with done marks |
| [`team/issues.md`](docs/team/issues.md) | Every known problem, with owner and status |
| [`team/progress-log.md`](docs/team/progress-log.md) | What each session did, newest first |

---

## 🗂️ Project Structure

Vanilla ES modules, plain CSS, no framework and no runtime dependencies.

```
index.html      the game page
login.html      the opening menu, sign in, or create an account
shop.html       the seed and pump shop
settings.html   difficulty, save import/export, erase progress, delete account
profile.html    who is signed in, avatars, and the way out
almanac.html    a static reference of the five crops — no session needed
inventory.html  the seeds you own
css/            styling — one file per component or page, including the four phone reflow files
js/             the game code, split by responsibility
assets/         every image, icon, font and sound — 59 MB on disk, 19 still missing
js/config/      field geometry, crops, game balance, weather events, preset avatars, asset registry
js/crops_logics/ one file per crop: prices, grow time, water need, stage schedule
js/land_squares/ one file per plot: identity and the price ladder
supabase/       database migrations — run these by hand, see setup.md
data/           sample-forecast.json — 0 bytes; the offline fallback was never built
docs/           all project documentation
tests/          800 tests, run with npm test
```

The full annotated tree, showing what each module does, is in
[`docs/architecture.md`](docs/architecture.md#project-structure).

---

## 👥 Team

| Member | ID | Role | Responsibility |
| :--- | :---: | :--- | :--- |
| **Tawfik Rahman Shabab** | 25 | Team lead | Project setup, game plan, crop and season design, Supabase, shop, settings, deployment |
| **Mutasim Afif** | 13 | Services and testing | Weather, time and place-lookup services; the weather board; bug reporting |
| **Abdullah Hil Kafi (Jim)** | 19 | Design and interface | Crop, pump and UI artwork; screen layout; panels, dialogs, avatars, phone layout |
| **Hisham Walid** | 31 | Game systems | Project structure, data flow, state and saving, water and pump rules, art direction |

Kafi and Jim are the same person — the Git handle is `aa-jim` / `Jim`. Per-person notes are in
[`docs/team/members/`](docs/team/members/).

### Who Built What

The build ran five weeks. This is the final attribution, by area rather than by commit count.

**Shabab — team lead, accounts and economy.**
Started the project and wrote the implementation plan, the crop and season design and the team
workflow. Connected Supabase and built the account side: the credentials and provider switch,
username sign-in, password recovery, the settings page, and the password-gated erase-progress and
delete-account functions verified in the database. Built the state store and the shape of a fresh
save, and wired the game page itself — `js/main.js` and `js/farmActions.js`, the layer that turns a
click into a rule. Built the seed shop and later its pump section, the almanac and inventory pages,
the land ladder and the five crops' data files, the difficulty modes, seed selling, the pump billing
fix that stopped charging for water it threw away, and the seed picker's forecast verdict. Deployed
the game to Vercel and wired the Brevo SMTP relay for reset mail. Enabled wheat and corn once their
art landed, mapped the five pump drawings to their levels, and repaired avatar rendering.

**Hisham — game systems and documentation.**
Designed the folder and module structure, the data flow and the layering rules that `npm run check`
enforces, and wrote the bulk of `docs/` — `architecture.md`, `setup.md`, most of `weather-events.md`
and nearly all of `team/`. Built the save layer: the server-side save, the `.farm` export/import
file with its checksum, the sync indicator and the offline retry loop, plus the asset registry every
image and sound passes through. Built the weather-to-farm layer — water, evaporation, damage, death
and the environment card — and the pump: five levels, per-plot targets, hand-over and billing. Wrote
the field geometry, the plot inspector, the diamond hit-area rules, and the loading screen.

**Kafi (Jim) — art and interface.**
Drew the rice art, the farm ground, then every crop that followed: potato, tomato, wheat and corn,
five stages and two damage states each, plus the seed packets. Drew the five pump levels, the farm
backdrop, the book and inventory buttons, the UI icons and the avatar busts, and sourced the sixteen
sound effects. Built the sign-in menu, the game scene, the navbar, the profile page, the shop
repaint, the timber dialogs, the phone layout and the almanac styling. Every visual decision a
player sees went through this folder.

**Afif — services and testing.**
Added the base weather and time services, then the live weather path: fetching the forecast for the
player's own coordinates and putting it on the game screen. Built the place search that suggests
locations as you type and names the farm from its saved coordinates, and the Web3Forms bug-report
form in the navbar. Wrote the geocoding, location-bar and report-service tests, and recorded the API
behaviours that bit — the weather field keys, the `hourly[0]`-is-midnight rule and the absent
`results` key — so nobody has to rediscover them.

**The split was never clean.** Several modules were opened by one person and finished by another —
the state store, the weather domain and the field view all moved hands at least once. The area-level
version above is the useful one; `git log` has the rest, and `docs/team/ownership.md` says plainly
that its table records where work landed rather than a rule about who may touch what.

---

## ▶️ Run Locally

ES modules do not work from `file://` — the page must be served over HTTP.

```bash
npm run dev      # serve this folder, open the URL it prints
npm test         # node --test tests/
npm run check    # layering rules: imports, fetch, DOM access
```

| Page | What it is |
| :--- | :--- |
| `/login.html` | The opening menu, sign in or create an account, and the avatar step after registration. `index.html` redirects here if there is no session. |
| `/index.html` | The farm. Loads your save, or starts a new one. |
| `/shop.html` | The shop. Buys seed packets and pump upgrades; gold is deducted and the farm is saved immediately. |
| `/settings.html` | Difficulty, save import and export, erase all progress, or delete your account. |
| `/profile.html` | Choose a preset avatar, see who is signed in, and sign out or leave the guest farm. |
| `/almanac.html` | A reference of the five crops. Static — no session, no save. |
| `/inventory.html` | The seeds you own. Read-only. |

There is no debug panel in this build. `?debug=1`, the geometry sliders, the gold and time cheats and
the forced-weather dropdown were planned as T-06 and never written — `js/debug/` does not exist. The
debug flag that did ship is **`?fast=N`**: it divides every grow time by N (1–1000), never touches
gold, and is never saved, so `?fast=60` turns a six-hour rice cycle into six minutes. The `?guest=1`
query string is also real: it is how the shop, almanac, inventory and profile pages know the player
is on a guest farm.

### Verification

```
npm run check    check-imports: no new violations. 2 known, awaiting T-04.
npm test         800 tests — 793 pass, 7 fail, all of them ISS-122.
```

The seven failures are the Farmer 3 avatar regression and the three grey-person cases that depend
on the same drawing (`tests/avatar.test.js`, `tests/navbar.test.js`,
`tests/profileView.test.js`). They are a known, open defect, not a flake.

---

## 🌐 The Live Build

The game is deployed on Vercel at **[forecast-farm.vercel.app](https://forecast-farm.vercel.app)**
and redeploys on every push to `main`. The Supabase redirect URLs include both the local origin and
the deployed one.

> **Accounts are live.** Sign-in runs against Supabase over plain `fetch()`, with the project URL and
> the `anon` key in `js/config/supabase.js` ([DEC-018](docs/team/decisions.md),
> [DEC-020](docs/team/decisions.md)). A farm is also saved server-side, in a `farm_saves` table with
> Row Level Security, so one account cannot read another's.

---

## 🔐 Accounts, Saving, and the Database

**→ [docs/setup.md](docs/setup.md) has the database migrations, in order, and how to check each one
worked.** They cannot be committed and cannot be run from the browser, so a clone needs them.

| Migration | Gives you | Without it |
| :--- | :--- | :--- |
| `001_farm_saves.sql` | The server-side save | Saves stay in this browser only |
| `002_usernames.sql` | Username sign-in | **Username login fails silently** |
| `003_account_deletion.sql` | A 7-day countdown | Superseded by `005` — **do not run it** |
| `004_clear_all_accounts.sql` | A maintenance tool | Not a setup step |
| `005_immediate_account_deletion.sql` | Account deletion, behind a password check | **Deletion fails** |
| `006_password_gated_erase.sql` | Erase progress, behind a password check | **Erasing progress fails** |

Run them in the Supabase dashboard's SQL Editor, in numeric order; all are safe to re-run.

> **Also needed on the dashboard.** Authentication → URL Configuration: add
> `http://localhost:5173` and the deployed origin to **Redirect URLs**, and set the same origin as
> **Site URL**. Both are set on the live project. Without them, "forgot password" silently never
> delivers an email ([ISS-031](docs/team/issues.md)).
>
> **Custom SMTP is required for real players.** Supabase's built-in mailer only delivers to
> addresses on the project's team, and answers every other address with *"Email address not
> authorized"* — which the app now reports instead of pretending an email was sent. The live
> project uses Brevo's SMTP relay. Its free plan is 300 messages/day and rewrites the sender to a
> shared `brevosend.com` domain, so reset mail lands in **spam** until a custom sending domain is
> verified in Brevo.
>
> **The recovery template must point at our page.** Authentication → Emails → **Recovery**:
>
> ```html
> <h2>Reset your password</h2>
> <p>Follow this link to choose a new password:</p>
> <p><a href="http://127.0.0.1:5173/login.html?token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
> ```
>
> `{{ .ConfirmationURL }}` must not appear anywhere in it. That variable produces the old
> `/auth/v1/verify` redirect chain, which loses the token on the way back — see
> [ISS-031](docs/team/issues.md). Swap the hardcoded origin for the deployed one before a demo.
>
> **Confirm email** is currently **off**, so a new account signs in immediately. Turn it on before a
> demo to exercise the confirmation step — but the free tier's SMTP allowance is a few emails an
> hour shared by everyone, so a reviewer who signs up after the first may receive nothing.
>
> **Play as guest** stays local by design and writes nothing to the server; a guest farm cannot be
> exported. Clearing site data deletes a guest farm for good. Exported farm files are
> integrity-checked but **not signed** — see [ISS-032](docs/team/issues.md).

### Accounts and saving — what works today

| Works now | Detail |
| :--- | :--- |
| Sign in, register, guest play | **Email or username** and password, or play without an account |
| The farm is kept per account | Two people on one machine do not share a farm |
| Save and restore | Progress survives a reload and a closed tab; the save retries when the network drops |
| **Export your farm** | Settings page. Writes a `.farm` file you can keep or move to another computer |
| **Import a farm** | Settings page. Reads one back, with a confirmation before it replaces anything |
| Password reset | Live — needs the redirect URL set in the Supabase dashboard, see above |
| Buy seeds and pump upgrades | The shop, in its own page. Gold is deducted and the save is written immediately |
| **Erase all progress** | Settings page. Two clicks **and** the password. Starts a brand new farm under the same account |
| **Delete account** | Settings page. Two clicks **and** the password, checked in the database |

**Username and farmer name are different things.** The farmer name is what the game greets
you by and may contain spaces. The username is the login handle: letters, numbers and
underscores only, 3–20 characters, unique, and never shown to anyone but you.

**Deleting an account is immediate and irreversible.** The password is verified by the
database before anything is removed, so a stolen session token cannot do it. The account,
its farm, its username and its farmer name all go together — see
[DEC-024](docs/team/decisions.md).

**Two limits worth knowing:**

- **A guest farm is local only.** "Play as guest" writes nothing to the server, so clearing site data
  deletes that farm permanently, and it cannot be exported. A real account's farm can be moved with a
  `.farm` file. See [ISS-027](docs/team/issues.md).
- **An exported file cannot be trusted against a determined editor.** It is checked for corruption, and a
  hand-edited file is refused — but anyone who knows how can change the numbers and update the check.
  Making that impossible needs a server-held key. See
  [DEC-021](docs/team/decisions.md).

---

<a id="stand"></a>

## 📍 Where We Stand

**v0.1 is built.** The game runs in a browser, the weather is real, and the whole loop closes:
search a place, buy a seed, plant it, water it, watch the forecast wound it, harvest it for gold,
buy another plot, and do it again on land that costs twice as much.

That took five weeks and four people working on four different layers.

- **The field** is sixteen isometric plots with their own water and health, four 2×2 zones, a pump
  at the crossing, and a diamond hit area measured from the art rather than guessed.
- **The weather** is live Open-Meteo for the player's own coordinates: a 24-hour strip, nine
  classified events, a season from latitude, and a verdict on every sowing that refuses to plant
  without one.
- **The water** is the heart of the game. Rain adds, sun subtracts, the pump bills only what lands,
  and a crop left outside its band is damaged for good. Easy mode narrows that pressure to ripe
  crops only; normal mode does not.
- **The money** is a loop: seeds cost, harvests pay by health, land doubles in price sixteen times,
  and the pump is a machine you upgrade four times and pay to run.

The build did not go as planned, and the plan was changed rather than hidden. The land economy and
the market were scheduled for week 4 and the market never shipped; the pump and weather effects
were scheduled for weeks 5 and landed in week 3; the crops' art arrived over three weeks and each
one was switched on the day its fifth stage landed. The honest scoreboard is in
[`goals.md`](docs/team/goals.md), which still shows the goals that were not met.

<a id="progress"></a>

## 🛠️ Build History

Each week is broken out per person, because "all four" tells you nothing about who to ask about what.

| Week | Focus | Status | Done | By |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Project plan, crop and season design, team workflow | ✅ Complete | Implementation plan · crops · seasons · goals · ownership · issue log · decision log | **Shabab** |
| 1 | Crop and environment artwork | ✅ Complete | Rice 5 growth stages · watered and unwatered ground · folder-per-crop structure | **Kafi** |
| 1 | Base service connections | ✅ Complete | Weather API · time API · place lookup | **Afif** |
| 1 | Structure, data flow and art direction | ✅ Complete | Folder and module design · layering rules · art direction · 16 doc files | **Hisham** |
| 2 | Sign-in menu UI | ✅ Complete | Login page · sign-in, register and guest play · password reset | **Kafi** |
| 2 | Gameplay scene UI | ✅ Complete | Farm screen · plots · panels and controls | **Kafi** |
| 2 | Supabase connection | ✅ Complete | Project URL and anon key · provider switch | **Shabab**, **Hisham** |
| 2 | Farm save, export and import | ✅ Complete | `farm_saves` table with Row Level Security · `.farm` file export and import | **Hisham** |
| 2 | Asset registry | ✅ Complete | `js/config/assets.js` — every image and sound in one place | **Hisham** |
| 2 | Shop and username sign-in | ✅ Complete | Seed shop · `usernames` table | **Shabab** |
| 2 | Erase progress and delete account | ✅ Complete | Both behind a password check, verified in the database | **Shabab** |
| 2 | Weather on the game screen | ✅ Complete | Live weather for the player's location · weather panel and location bar | **Afif** |
| 3 | The weather reaches the farm | ✅ Complete | Plantings judged against 6 h of live forecast · seasons from latitude · the seed picker refuses without a verdict | **Shabab** |
| 3 | Difficulty, and selling seeds | ✅ Complete | Easy and normal modes · existing saves read normal · seeds sell back at 75 % | **Shabab** |
| 3 | Free first plot, and what it unlocks | ✅ Complete | The first plot free · locked plots carry a price tag · seeds unlock every 4 plots · a growth timer on each crop | **Shabab**, **Hisham** |
| 3 | Water, and a pump that works | ✅ Complete | Rain and evaporation · a water meter on every plot · the starter pump waters two plots · click a plot for its gauge · damage that is permanent | **Hisham** |
| 3 | Five pump levels, and multi-plot watering | ✅ Complete | 2 / 4 / 8 / 12 / 16 plots · land gates at 4 / 8 / 12 / 16 owned · shop Pump section · level art on the field · targets add and remove per plot | **Hisham**, **Shabab** |
| 3 | The pump stops billing for water it throws away | ✅ Complete | Nothing billed once a plot is full · the quote matches the bill · the meters animate | **Shabab** |
| 3 | The environment card | ✅ Complete | The rail reports the weather and what it does to the farm · three metres — water loss, frost and heat — always all shown | **Hisham** |
| 3 | Weather board and shop, rebuilt | ✅ Complete | Weather board to the design · shop repainted to the Figma reference · profile moved to its own page · five tomato growth stages | **Kafi** |
| 3 | Place lookup you can type | ✅ Complete | Suggestions as you type · the farm named from its saved coordinates | **Afif** |
| 4 | Land economy | ✅ Complete | Free starter plot · price tags · buying with gold · the doubling ladder · seeds gated by plots owned | **Shabab**, **Hisham** |
| 4 | Phone layout | ✅ Complete | The farm reflows onto the 430 × 1232 frame · four phone stylesheets · phone typography matched to desktop | **Kafi** |
| 4 | Avatars and dialogs | ✅ Complete | Seven preset avatars · avatar step at sign-up · timber plot inspector and seed picker · seed-packet art | **Kafi**, **Shabab** |
| 4 | Five pump drawings and sounds | ✅ Complete | `pump_1.png`–`pump_5.png` · sixteen sound effects wired to actions · pump loop | **Kafi**, **Shabab** |
| 5 | The other four crops | ✅ Complete | Potato, tomato, wheat and corn switched on as their five stages landed; all five playable | **Kafi**, **Shabab** |
| 5 | Pages and polish | ✅ Complete | Almanac · inventory · bug report · difficulty · profile · settings · farm backdrop · timber environment card | **Kafi**, **Shabab**, **Afif**, **Hisham** |
| 5 | Ship v0.1 | ⚠️ **Shipped with open items** | Deployed to Vercel · docs brought to the final build · `v0.1` tag not cut | **Shabab**, **Hisham** |

**What the final week did not close:** the separate market (ISS-099), the land-purchase confirm step
(ISS-080), the missing `_dead` sprites, the empty weather and crop icons, the empty/error states on
some panels, and the Farmer 3 avatar regression. They are listed in
[What v0.1 Does Not Do](#limits) and tracked in [`issues.md`](docs/team/issues.md).

---

## 📄 License

[MIT](LICENSE) — © 2026 Tawfik Rahman Shabab.
