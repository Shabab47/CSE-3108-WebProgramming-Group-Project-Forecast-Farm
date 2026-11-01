# Task Board

Status is one of `todo`, `doing`, `blocked`, `done`. Move a task to `doing` when you pick it up and
to `done` when it works. Weekly goals are in `goals.md`; the full commit-level detail is in `git log`
and `issues.md`.

**This board is closed out for the shipped build.** Every row carries its final status, and the
handful of tasks that shipped without their whole scope say so in the row rather than in a
footnote. Nothing here is aspirational: if a row says a feature exists, it was run and seen.

Kafi and Jim are the same person. **T-56 was never used. The next free ID is T-95.**

---

## At a glance — final

| Who | Shipped | Still open |
| :--- | :--- | :--- |
| **Shabab** | Project plan, crop and season design, team workflow, Supabase accounts, shop, settings, difficulty modes, seed selling, pump billing, pump shop section, forecast verdict, land ladder, wheat and corn, Vercel deploy, Brevo SMTP, avatar repair, docs | Land-purchase confirm step (ISS-080) |
| **Hisham** | Structure, data flow, layering rules, state and store, server save, `.farm` export/import, asset registry, weather→farm effects, water and damage, pump levels, field view and geometry, inspector, sync indicator, loading screen, most of `docs/` | A "skip the pump, rain is coming" line (ISS-097); two stale planned modules (ISS-098) |
| **Kafi (Jim)** | Every crop and ground sprite, seed packets, five pump drawings, farm backdrop, UI icons, avatars, all CSS, login/menu, scene, navbar, weather board, shop, profile, settings, dialogs, phone layout, almanac styling, sound effects | Five `_dead` crop sprites, nine weather SVGs, five crop SVGs (ISS-001, T-26); mute toggle (ISS-023); Farmer 3's avatar (ISS-122) |
| **Afif** | Weather, time and place services; weather panel; environment metres; location suggestions; bug-report form; live API verification | Drought rating ignores the plot's water (ISS-015) |

---

## Week 1 — Planning (complete)

| ID | Who | What | Status |
| :--- | :--- | :--- | :--- |
| T-01 | Shabab | Docs skeleton and plan copy | done |
| T-23 | Shabab | Implementation plan, crop and season design, team workflow | done |
| T-17 | Hisham | Project structure and data flow design | done |
| T-18 | Hisham | 16 documentation files written | done |
| T-24 | Hisham | Art direction and naming rules for sprites | done |
| T-19 | Kafi (Jim) | Rice artwork, 5 growth stages | done |
| T-20 | Kafi (Jim) | Farm ground artwork, watered and dry | done |
| T-21 | Kafi (Jim) | One folder per crop for artwork | done |
| T-25 | Kafi (Jim) | Asset checklist | done |
| T-22 | Afif | Base weather, time and place-lookup APIs | done |

## Week 2 — Foundation and accounts (complete)

| ID | Who | What | Status |
| :--- | :--- | :--- | :--- |
| T-28 | Shabab | Supabase sign-in code | done |
| T-29 | Shabab | Supabase project created and connected | done |
| T-31 | Shabab | Seed shop page | done |
| T-32 | Shabab | Settings page: erase progress, delete account | done |
| T-33 | Shabab | Sign in with username | done |
| T-34 | Shabab | Account deletion with password check | done |
| T-02 | Hisham | Tooling, import checks, first test | done |
| T-03 | Hisham | Config and game state files — **`state/types.js` was never written**; the store and `initialState` carry the shape | done |
| T-27 | Hisham | Login logic and guest play | done |
| T-30 | Hisham | Export and import a farm file | done |
| T-35 | Hisham | Farm saved on the server | done |
| T-36 | Hisham | Asset registry (every image in one place) | done |
| T-05 | Kafi (Jim) | Page layout shell | done |
| T-37 | Kafi (Jim) | Sign-in menu UI | done |
| T-81 | Kafi (Jim) | Opening menu and sign-in redesign (same work as T-37 in the end) | done |
| T-38 | Kafi (Jim) | Game scene UI: grid, plots, panels | done |
| T-04 | Afif | Weather, time and place services cleanup; reverse lookup finished in T-59 — **two known import violations in `services/timeApi.js` remain** | done |
| T-11 | Afif | Weather panel and live weather on the game screen — **the offline sample badge was never built**; `data/sample-forecast.json` is 0 bytes | done |

## Week 3 — Gameplay, water and polish

### Shabab

| ID | What | Status |
| :--- | :--- | :--- |
| T-86 | Easy and normal modes; sell seeds back at 75% | done |
| T-87 | Pump no longer bills for water it wastes | done |
| T-89 | Deployed to Vercel (`forecast-farm.vercel.app`) and added the URL to Supabase redirect URLs; redeploys on every push to `main` | done |
| T-90 | Brevo SMTP relay wired into Supabase Auth for password recovery mail | done |
| T-91 | Pump logic scales with its level: 2/4/8/12/16 plots, per-level targets and per-level art | done |
| T-07 | Free first plot and the doubling land ladder (with Hisham) | done |
| T-12 | Seed picker shows the forecast verdict and refuses to plant without one (with Hisham) | done |
| T-10 | Seeds sell back; selling harvested crops was never built | open — ISS-099 |

### Hisham

| ID | What | Status |
| :--- | :--- | :--- |
| T-12 | Real weather now affects crops | done |
| T-09 | Water and pump system; damage when too dry or too wet | done |
| T-13 | Crop warnings that say what to do | done |
| T-80 | Five pump levels, watering up to 16 plots | done |
| T-39 | Connection handling and honest autosave | done |
| T-58 | Sync indicator replaces the page-jumping banner | done |
| T-59 | Farm shows its real place name (reverse lookup fixed) | done |
| T-60 | Leftover merge-conflict markers removed, test added | done |
| T-61 | Lag fix: field no longer rebuilt every second | done |
| T-06 | Field geometry and pump placement — **the debug sliders were never built**; `js/debug/` does not exist | done |
| T-08 | Planting, growth and harvest; the seed bag is its own page, not a panel | done |

### Kafi (Jim)

| ID | What | Status |
| :--- | :--- | :--- |
| T-40 | Navbar sets its own height | done |
| T-41 | Save data card works on settings | done |
| T-42 | Settings page loads the game font | done |
| T-43 | Guest no longer sees "null" | done |
| T-44 | Navbar restyled to the design | done |
| T-45 | Save card moved to settings, account card to a new profile page | done |
| T-46 | Game scene fits one screen | done |
| T-47 | Location bar fixed | done |
| T-48 | Forecast panel is a wooden board | done |
| T-49 | Weather hour-index issue re-checked and logged | done |
| T-50 | Board proportions tuned, meter bars removed | done |
| T-51 | Board freshness label and layout bugs — the label now renders only while the forecast is stale | done |
| T-52 | Place name moved into the weather note (DEC-033) | done |
| T-53 | Field centred on the base, pump placed correctly | done |
| T-54 | Plot size and base fit corrected (verified on screen) | done |
| T-55 | Plot click areas fixed, "Buy" caption removed | done |
| T-57 | Shop repainted to the Figma design | done |
| T-62 | Environment card is three meters | done |
| T-63 | Lock pins on plots, potato art registered | done |
| T-64 | Field fit retuned by eye | done |
| T-65 | Gold coin on plot price tags | done |
| T-66 | Profile and settings pages repainted | done |
| T-67 | Danger cards share a row | done |
| T-68 | Ground sprite follows the water level | done |
| T-69 | Preset profile avatars | done |
| T-70 | Navbar shows the chosen avatar | done |
| T-71 | Fourth preset avatar | done |
| T-72 | New crop no longer inherits old damage | done |
| T-73 | Old damage sprites clear themselves | done |
| T-74 | New accounts pick an avatar at sign-up | done |
| T-75 | Damage sprite replaces the growth sprite | done |
| T-76 | Game page reflows for phones | done |
| T-77 | Phone fonts match the desktop game | done |
| T-78 | Plot inspector and seed picker dialogs | done |
| T-79 | Seed picker with small cards and an info icon | done |
| T-82 | Login CSS split by component | done |
| T-83 | Game page CSS split by component | done |
| T-84 | Spacing and radii moved into each file — **stopgap tokens remain in `variables.css`**; `css/components.css` still has 41 references | open |
| T-85 | `topbar` renamed to `navbar` | done |
| T-92 | Five pump level drawings (`pump_1.png`–`pump_5.png`), one per level | done |
| T-93 | `farm_bg.png` behind the game page above 900px; never fetched on a phone (DEC-062) | done |
| T-94 | Environment card is a timber plaque; its meter descriptions open from an (i) (DEC-063) | done |

### Afif

| ID | What | Status |
| :--- | :--- | :--- |
| T-88 | Place search suggests locations as you type, and the farm is named from its saved coordinates | done |

## Weeks 4–5 — Land, phone, crops, ship

| ID | Who | What | Status |
| :--- | :--- | :--- | :--- |
| T-07 | Shabab, Hisham | Land economy: buying with gold, the doubling ladder, price tags, seeds gated by plots owned | done |
| T-14 | Shabab | Turn on the other crops as art arrives — all five are playable, each switched on the day its fifth stage landed | done |
| T-15 | Kafi (Jim) | Polish: almanac done; **per-panel empty and error states still uneven** | done |
| T-16 | Shabab | Handover: final docs written, `v0.1` tag never cut | open |
| T-26 | Kafi (Jim) | Missing art. **The 2 rice failure sprites and the 28 for the other four crops landed.** Left: 5 `_dead` crop sprites, 9 weather SVGs, 5 crop SVGs — 19 files | open |

---

## Still open at ship

Verified against the code on 1 November 2026. Full detail in `issues.md`.

| ID | What | Owner |
| :--- | :--- | :--- |
| ISS-122 | Farmer 3's avatar carries six black bars; seven tests fail on it | Jim |
| ISS-099 | No market screen — a harvest pays gold when picked, the bag is read-only | Everyone |
| ISS-080 | Buying land spends gold with no confirm step | Shabab |
| ISS-097 | Nothing tells the player to skip the pump when rain is coming | Hisham |
| ISS-015 | The drought rating ignores how wet the plot already is | Afif |
| ISS-001 | Nine weather icons and five crop icons are 0 bytes | Kafi |
| ISS-032 | Exported `.farm` files are integrity-checked but unsigned | Shabab |
| ISS-100 | DEC-039, DEC-040 and DEC-041 each name two different decisions | Hisham |
| ISS-098 | `domain/simulator.js` is 0 bytes; `domain/inventory.js` was never written | Hisham |
| ISS-023 | Sound effects play but there is no mute toggle; the three ambient files are 0 bytes | Kafi |
| ISS-027 | `localAuth.js` is a second writer to `localStorage` | Hisham |
| T-84 | Stopgap spacing and radius tokens still in `variables.css` | Jim |
| T-16 | No `v0.1` tag | Shabab |

## Questions this board used to carry — answered

- **Week boundaries.** Work dated 11–23 Oct is filed under week 3 in the README; the late items
  (avatars, phone layout, dialogs, pump levels) ran into week 4. Weeks are numbered, not dated.
  Nothing depends on the boundary, so it was left as written rather than re-dated.
- **T-81 and T-37.** The same work, done once. Both rows kept so the old references still resolve.
- **T-89 (Vercel).** Listed under Shabab because the repo and the Vercel project sit under that
  account. It has not been moved.
- **T-56.** Never used. The next free id is **T-95**.
