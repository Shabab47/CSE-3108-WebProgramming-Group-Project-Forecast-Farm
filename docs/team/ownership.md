# Ownership

One primary owner per area, so two people rarely edit the same file and merge conflicts stay small.

> **This is the split as it ended, not as it was proposed.** ISS-025 asked for it to be confirmed and
> it never was, and by the last week several modules had been started by one person and finished by
> another. The table therefore records **where the work landed and who to ask** — it is not a gate.
> The commit-level truth is `git log`; the area-level story is the *Who Built What* section of the
> [README](../../README.md).

## Areas

| Area | Where | Primary | Backup |
| :--- | :--- | :--- | :--- |
| Architecture, setup, weather and asset docs | `docs/` except `docs/team/` and `docs/crops.md` | Hisham | Shabab |
| Team process — goals, tasks, issues, decisions, this log | `docs/team/` | Shabab | Hisham |
| Crops, seasons and land data | `js/crops_logics/`, `js/land_squares/`, `js/config/{crops,seasons}.js`, `js/domain/seasons.js` | Shabab | Afif |
| Economy — shop, land buying, pump upgrades, gold | `js/domain/{shop,land,pumpUpgrade,pumpSwap}.js` | Shabab | Hisham |
| Accounts and authentication | `js/services/{authApi,accountApi,localAuth,gotrue,tokenStore}.js`, `js/config/{auth,supabase}.js`, `js/auth-main.js` | Shabab | Hisham |
| Shop, settings, almanac, inventory and profile pages | `js/{shop,settings,almanac,inventory}-main.js`, `js/ui/{shop*,settings*,almanac*,inventory*,difficultyCard,dangerAction,dangerMessages,passwordGate,runDestructive}.js` | Shabab | Kafi |
| State, saving and sync | `js/state/`, `js/remoteSave.js`, `js/connection.js`, `js/services/saveApi.js` | Hisham | Shabab |
| Farm rules — plant, grow, harvest, clear, damage, water | `js/domain/{farm,damage,plotWater,water,pump,environment}.js` | Hisham | Shabab |
| Field geometry and field UI | `js/config/field.js`, `js/utils/iso.js`, `js/ui/{farmView,plotLayers,plotClick,plotLabel,plotInspector,pumpPanel,growthMeter,statusLine}.js` | Hisham | Kafi |
| Wiring and page boot | `js/main.js`, `js/farmActions.js` | Shabab | Hisham |
| Weather services and API config | `js/services/{weatherApi,geocodeApi,timeApi}.js`, `js/config/api.js` | Afif | Hisham |
| Weather → farm, and the warnings | `js/domain/{weather,notifications}.js`, `js/config/{weatherEvents,cropWeatherMatrix}.js` | Afif | Hisham |
| Weather UI | `js/ui/{weatherPanel,weatherGlyph,locationBar}.js`, `css/weather.css` | Afif | Kafi |
| Bug reporting | `js/ui/reportBug.js`, `js/services/reportApi.js`, `js/config/feedback.js`, `css/report-bug.css` | Afif | Shabab |
| Every stylesheet and every asset | `css/` (except the three above), `assets/` | Kafi | Shabab |
| Chrome — navbar, menu, avatars, sign-in views, season card, icons | `js/ui/{navbar,menuPanel,signBoard,authViews,avatarArt,avatarSetup,profileView,seasonCard,icon,icons,backdropDismiss}.js` | Kafi | Shabab |
| Balance constants, the asset registry, loading tips | `js/config/{game,assets,avatars,tips}.js` | Hisham | Shabab |
| Tooling and the suite | `scripts/`, `package.json`, `tests/` | Hisham | everyone |

**Not owned, because they do not exist:** `js/debug/` (never built, T-06), `js/state/types.js`,
`js/domain/inventory.js` and `js/domain/wallet.js` (the plan named them; the rules went elsewhere —
see ISS-098). `js/domain/simulator.js` is 0 bytes and nothing imports it.

## Shared files

These are touched by more than one person. Say so in the PR, and keep changes small.

| File | Touched by | Note |
| :--- | :--- | :--- |
| `index.html` | Kafi, Hisham, Afif | Kafi owns the grid, Hisham the mount points, Afif added the weather board |
| `js/main.js` | everyone | Wiring only. If logic is creeping in, it belongs in a domain module |
| `js/ui/*` panel shells | Kafi, then whoever fills it | First commit is structure, second is content |
| `README.md` | Shabab | Everyone reports changes |
| `docs/architecture.md` | Hisham | Its file tree must change with the code |
| `package.json` | Hisham | Scripts only |
| `js/config/crops.js` | Shabab, Hisham | Shabab owns balance; Hisham owns shape |

## Changing hands

1. Say so in `#team` or `docs/team/progress-log.md` before you start.
2. Update this file in the same commit as your first change.
3. Note open work in `tasks.md` — a task that is not `done` needs a named owner.

## Working in someone else's folder

Allowed for small fixes, with two conditions:

1. Tell the owner in the PR description.
2. Do not reformat, rename or restructure their files. Fix the bug, leave the style alone.

Large changes to another owner's area need their agreement first. If you need a change across three
areas, that is usually a sign the boundary is wrong — raise it rather than routing around it. That
is what happened to `js/domain/{weather,notifications}.js`: the plan gave them to Afif, most of the
editing landed with Hisham and Shabab, and the honest answer is that nobody was blocked by it.
