# 🌾 Forecast Farm

A 2D web farming game driven by **real weather at the player's own location**. The game asks
where you are and runs your farm on that place's live forecast.

---

## 📖 What This Project Is

Forecast Farm is a browser game where the weather is real. The player allows the game to know
their location, and from then on the farm belongs to that place — the weather on screen is the
weather outside their window. Rain genuinely waters the crops, heat genuinely dries them out, and
frost can kill them, because all of it comes from a live forecast rather than being invented.

If you sow from one location and travel to another location before the harvest time comes, the game will still be locked with the previous location's real-time weather until it's been harvested.

Play is one loop: **plant → water → wait → harvest.** Crops grow in real time, so a six-hour crop
takes six hours whether or not the game is open. Spending is the tension — a water pump keeps a
drying crop alive but charges gold every second it runs, and rain on the way means it might be
better not to. The player is always reacting to genuine conditions, so decisions carry weight
rather than luck.

The goal is to unlock all sixteen plots. The first is free, and each one after costs exactly twice
the last, which turns the farm into something a player returns to over months rather than finishes
in an afternoon.

**The field itself is not on screen yet.** What exists today is the design, the artwork for rice
and the farm ground, the service connections, the documentation, and a working sign-in and save
system. Four weeks of building remain.

---

## 🎮 The Game in a Minute

- A browser farming game where the weather is real and comes from the player's **own location** —
  the farm is not somewhere fictional. → [crop-choice-guide.md](docs/crop-choice-guide.md)
- Play is one loop: **plant → water → wait → harvest**. Crops grow in real time, so a six-hour
  crop takes six hours whether the game is open or not. → [crops.md](docs/crops.md)
- The weather acts on the field. Rain waters the soil, sun and heat dry it out, and wind, hail and
  frost can damage or destroy a crop. → [weather-events.md](docs/weather-events.md)
- A water pump saves a drying crop, but **costs gold every second it runs**, so watering well is a
  real decision. → [weather-events.md](docs/weather-events.md)
- The forecast warns you in advance — *"Rain incoming — skip irrigation"* — so checking tomorrow's
  weather is worth doing. → [notifications.md](docs/notifications.md)
- **The goal is to unlock all sixteen plots.** Each costs exactly twice the last, so the farm is
  never finished. → [crops.md](docs/crops.md)
- You sign in, or play without an account, and **your farm is saved for you** — and you can write it
  to a file to keep, or move to another computer. → [architecture.md](docs/architecture.md)

**→ New here? Read [Where We Stand](#stand), then [Weekly Progress](#progress).**

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
| [`game-design/implementation-plan.md`](docs/game-design/implementation-plan.md) | The complete build plan |
| [`team/`](docs/team/README.md) | Goals, tasks, ownership, logged issues, decisions, weekly notes |
| [`team/goals.md`](docs/team/goals.md) | The five-week plan with done marks |
| [`team/issues.md`](docs/team/issues.md) | Every known problem, with owner and status |

---

## 🗂️ Project Structure

Vanilla ES modules, plain CSS, no framework and no runtime dependencies.

```
index.html      the game page
login.html      sign in or create an account
shop.html       the seed shop — buy seed packets with your gold
settings.html   account details, erase progress, delete account
css/            styling — layout, colours, components, fields, login card, shop, settings
js/             the game code, split by responsibility
assets/         artwork and icons
supabase/       database migrations — run these by hand, see setup.md
docs/           all project documentation
tests/          the test suite, run with npm test
```

The full annotated tree, showing what is built and what is still empty, is in
[`docs/architecture.md`](docs/architecture.md#project-structure).

---

## 👥 Team

| Member | ID | Role | Responsibility |
| :--- | :---: | :--- | :--- |
| **Tawfik Rahman Shabab** | 25 | Team lead | Project setup, game plan, crop and season design, team workflow |
| **Mutasim Afif** | 13 | Services and testing | Weather, time and place-lookup services; testing against live data |
| **Abdullah Hil Kafi** | 19 | Design and interface | Artwork for crops and farm tiles, screen layout, panels and controls |
| **Hisham Walid** | 31 | Game systems | Project structure, data flow, art direction, land, planting, growth, saving |

Per-person weekly notes are in [`docs/team/members/`](docs/team/members/).

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
| `/login.html` | Sign in or create an account. `index.html` redirects here if there is no session. |
| `/index.html` | The farm. Loads your save, or starts a new one. |
| `/shop.html` | The seed shop. Buys seed packets; gold is deducted and the farm is saved immediately. |
| `/settings.html` | Your account details, erase all progress, or delete your account. |

Append `?debug=1` to the URL for the debug panel: geometry sliders, gold and time cheats,
forced weather, plot IDs.

> **Accounts are live.** Sign-in runs against Supabase over plain `fetch()`, with the project URL and
> the `anon` key in `js/config/supabase.js` ([DEC-018](docs/team/decisions.md),
> [DEC-020](docs/team/decisions.md)). A farm is also saved server-side, in a `farm_saves` table with
> Row Level Security, so one account cannot read another's.
>
> **→ [docs/setup.md](docs/setup.md) has the database migrations, in order, and how to check each one
> worked.** They cannot be committed and cannot be run from the browser, so a clone needs them. The
> short version:
>
> | Migration | Gives you | Without it |
> | :--- | :--- | :--- |
> | `001_farm_saves.sql` | The server-side save | Saves stay in this browser only |
> | `002_usernames.sql` | Username sign-in | **Username login fails silently** |
> | `005_immediate_account_deletion.sql` | Account deletion, behind a password check | **Deletion fails** |
>
> `003` is superseded by `005` — do not run it. `004` is a tool that deletes every account,
> not a setup step. Run them in the Supabase dashboard's SQL Editor, in numeric order; all are
> safe to re-run.
>
> **Also needed on the dashboard.** Authentication → URL Configuration: add
> `http://localhost:5173` and the deployed origin to **Redirect URLs**, and set the same origin as
> **Site URL**. Both are set on the live project. Without them, "forgot password" silently never
> delivers an email ([ISS-031](docs/team/issues.md)).
>
> **Confirm email** is currently **off**, so a new account signs in immediately. Turn it on before a
> demo to exercise the confirmation step — but the free tier's SMTP allowance is a few emails an
> hour shared by everyone, so a reviewer who signs up after the first may receive nothing.
>
> **Play as guest** stays local by design and writes nothing to the server; a guest farm cannot be
> exported. Clearing site data deletes a guest farm for good. Exported farm files are
> integrity-checked but **not signed** — see [ISS-032](docs/team/issues.md).

---

<a id="stand"></a>

## 📍 Where We Stand

Forecast Farm is a browser farming game driven by real weather at the player's own location. Week
one was a planning week, and it is complete — each of the four of us owns a distinct piece of it.
**Shabab** started the project and wrote the implementation plan, the crop and season design, and
the team workflow. **Kafi** produced the artwork for rice and the farm ground. **Afif** connected
the base weather, time, and place-lookup services. **Hisham** designed the project structure, the
data flow between its parts, and the art direction every sprite follows, then wrote the
documentation now in this repository. Twenty-five known problems have been logged with owners, and
three that would have broken the game were caught in that review before a line of game code was
written. Art is tracked separately in [`asset-checklist.md`](docs/asset-checklist.md), where **46
assets are still outstanding** — including two failure sprites that rice itself still needs.

Week two has since added the sign-in and save system, the seed shop, username sign-in, and
the settings page — where a player can erase their progress or delete their account.
**Shabab** built the login and account flow, the shop, and the settings page; **Hisham**
added the state store, the Supabase provider, exporting and importing a farm, and the
layering rules that hold the project together. Four weeks of building remain: the farm
screen, then the economy, then live weather, then the finished release.

<a id="progress"></a>

## 🛠️ Weekly Progress

Week 1 is broken out per person, because "all four" tells you nothing about who to ask about what.

| Week | Focus | Status | Done | By |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Project plan, crop and season design, team workflow | ✅ Complete | Implementation plan · crops · seasons · goals · ownership · issue log · decision log | **Shabab** |
| 1 | Crop and environment artwork | ✅ Complete | Rice 5 growth stages · watered and unwatered ground · folder-per-crop structure | **Kafi** |
| 1 | Base service connections | ✅ Complete | Weather API · time API · place lookup | **Afif** |
| 1 | Structure, data flow and art direction | ✅ Complete | Folder and module design · layering rules · art direction · 16 doc files | **Hisham** |
| 2 | Sign-in and save system | ✅ Complete | Login page · session-gated boot · password reset · export and import a farm | **Shabab**, **Hisham** |
| 2 | Project foundation | 🔄 In progress | Tooling · config · state store · layering check · 209 passing tests | **Hisham** |
| 2 | Shop, settings, username sign-in | ✅ Complete | Seed shop · settings page · account deletion · `usernames` table | **Shabab**, **Hisham** |
| 2 | Working farm screen | ⬜ Next | — | **Kafi** page shell, CSS · **Afif** reverse geocoding |
| 3 | Land economy, then planting and growth | ⬜ Planned | — | **Hisham** |
| 4 | Pump, water and market, then live weather | ⬜ Planned | — | **Hisham** pump, market · **Afif** live weather |
| 5 | Weather effects, crop alerts, then ship v0.1 | ⬜ Planned | — | **Afif** weather effects · **Kafi** polish, almanac · **Shabab** handover |

### Accounts and saving — what works today

Sign-in and account creation run, on its own page. **The player is never shown a farm they
have not signed into**, and a guest can still play without an account.

| Works now | Detail |
| :--- | :--- |
| Sign in, register, guest play | **Email or username** and password, or play without an account |
| The farm is kept per account | Two people on one machine do not share a farm |
| Save and restore | Progress survives a reload and a closed tab |
| **Export your farm** | Writes a `.farm` file you can keep or move to another computer |
| **Import a farm** | Reads one back, with a confirmation before it replaces anything |
| Password reset | Live — needs the redirect URL set in the Supabase dashboard, see above |
| Buy seeds | The shop, in its own page. Gold is deducted and the save is written immediately |
| **Erase all progress** | Settings page. Starts a brand new farm under the same account |
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

Week one was spent behind planning rather than coding. Each week ends with something demonstrable. Full goal
breakdown in [`docs/team/goals.md`](docs/team/goals.md), per-person notes in
[`docs/team/members/`](docs/team/members/), and the outstanding work in
[`docs/asset-checklist.md`](docs/asset-checklist.md).

---

## 📄 License

[MIT](LICENSE) — © 2026 Tawfik Rahman Shabab.
