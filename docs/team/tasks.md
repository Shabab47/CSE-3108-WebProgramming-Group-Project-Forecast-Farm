# Task Board

Status is one of `todo`, `doing`, `blocked`, `done`. Move a task to `doing` when you pick it up and to `done` when it works. Update the date when the status changes. Weekly goals are in `goals.md`; the full commit-level detail is in `git log` and `issues.md`.

Kafi and Jim are the same person. T-56 was never used. The next free ID is **T-90**.

---

## At a glance

| Who | Week 1 | Week 2 | Week 3 | Weeks 4–5 (planned) |
| :--- | :--- | :--- | :--- | :--- |
| **Shabab** | Project plan, crop and season design, team workflow | Supabase connection, shop page, settings page, usernames, account deletion | Easy/normal modes, selling seeds back, pump billing, forecast verdict in the seed picker, free first plot | Other crops, handover and `v0.1` tag |
| **Hisham** | Project structure, data flow, art direction, docs | Login logic, farm saves, export/import, asset registry | Weather reaches the farm, pump and water, crop warnings, field speed fix, connection handling | Land economy and market |
| **Kafi (Jim)** | Rice art, ground art, asset checklist | Sign-in menu UI, game scene UI | Navbar, weather board, field fit, shop/profile/settings look, avatars, phone layout, dialogs | Missing art, polish |
| **Afif** | Weather, time and place APIs | Weather on the game screen | Place search as you type | Land economy and market |

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

## Week 2 — Foundation

| ID | Who | What | Status |
| :--- | :--- | :--- | :--- |
| T-28 | Shabab | Supabase sign-in code | done |
| T-29 | Shabab | Supabase project created and connected | done |
| T-31 | Shabab | Seed shop page | done |
| T-32 | Shabab | Settings page: erase progress, delete account | done |
| T-33 | Shabab | Sign in with username | done |
| T-34 | Shabab | Account deletion with password check | done |
| T-02 | Hisham | Tooling, import checks, first test | done |
| T-03 | Hisham | Config and game state files | doing |
| T-27 | Hisham | Login logic and guest play | done |
| T-30 | Hisham | Export and import a farm file | done |
| T-35 | Hisham | Farm saved on the server | done |
| T-36 | Hisham | Asset registry (every image in one place) | done |
| T-05 | Kafi (Jim) | Page layout shell | done |
| T-37 | Kafi (Jim) | Sign-in menu UI | done |
| T-81 | Kafi (Jim) | Opening menu and sign-in redesign (may be the same work as T-37) | done |
| T-38 | Kafi (Jim) | Game scene UI: grid, plots, panels | done |
| T-04 | Afif | Weather, time and place services cleanup; reverse lookup done in T-59 | doing |
| T-11 | Afif | Weather panel and live weather on the game screen; sample-data badge still open | doing |

## Week 3 — Gameplay and polish (11–23 Oct)

### Shabab

| ID | What | Status |
| :--- | :--- | :--- |
| T-86 | Easy and normal modes; sell seeds back at 75% | done |
| T-87 | Pump no longer bills for water it wastes | done |
| T-89 | Deployed the game to Vercel (`forecast-farm.vercel.app`) and added the URL to Supabase redirect URLs; auto-redeploys on every push to `main` | done |
| T-07 | Free first plot (with Hisham) | doing |
| T-10 | Seeds can be sold; selling harvested crops still open (with Hisham) | doing |
| T-12 | Seed picker shows the forecast verdict and refuses to plant without one (with Hisham) | done |

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
| T-06 | Field geometry and pump placement; debug sliders still open | doing |
| T-07 | Land buying, price tags, free starting plot; confirm popover still open | doing |
| T-08 | Planting and growth; Seeds tab and inventory still open | doing |
| T-10 | Harvest pays by quality; sell tab still open | doing |

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
| T-50 | Board proportions tuned, meter bars removed | doing |
| T-51 | Board freshness label and layout bugs | doing |
| T-52 | Place name moved into the weather note | doing |
| T-53 | Field centred on the base, pump placed correctly | done |
| T-54 | Plot size and base fit corrected (verified on screen) | done |
| T-55 | Plot click areas fixed, "Buy" caption removed | doing |
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
| T-84 | Spacing and radii moved into each file | doing |
| T-85 | `topbar` renamed to `navbar` | done |

### Afif

| ID | What | Status |
| :--- | :--- | :--- |
| T-88 | Place search suggests locations as you type (from the README; check against `git log`) | done |

## Weeks 4–5 — Still to do

| ID | Who | What | Status |
| :--- | :--- | :--- | :--- |
| — | Everyone | Land economy and market (week 4); includes the confirm popover (T-07) and the sell tab (T-10) | todo |
| T-14 | Shabab | Turn on the other crops as art arrives; `tomato_5.png` is a different size (ISS-093) | todo |
| T-16 | Shabab | Handover: final docs and the `v0.1` tag | todo |
| T-15 | Kafi (Jim) | Polish: almanac done; empty and error states still open | doing |
| T-26 | Kafi (Jim) | Missing art: 2 rice failure sprites, 28 for other crops, 14 icons | todo |

---

## Still open (from `issues.md`)

- ISS-093: `tomato_5.png` is a different size from stages 1–4 (blocks T-14).
- ISS-007: pump's transparent canvas eats clicks.
- ISS-009, ISS-011, ISS-012: weather sample and geocode edge cases.
- ISS-010: `check-imports` fails on `utils/dom.js`.
- ISS-015: drought conditional has no home.
- ISS-027: `localAuth.js` is a second storage writer.
- ISS-032: no server for signed exports.

## To confirm with the team

- All work dated 11–23 Oct is filed under week 3 following the README. The late items (avatars, phone layout, dialogs, pump levels) may belong to week 4.
- Shabab's rows (T-86, T-87) and Afif's T-88 come from the README's weekly table. Check them against `git log --author`.
- T-81 and T-37 may be the same task.
- T-89 (Vercel deployment) is listed under Shabab because the repo and Vercel project are under that account. Move it if someone else did it.
