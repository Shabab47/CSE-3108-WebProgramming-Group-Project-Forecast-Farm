# Ownership

One primary owner per folder, so two people rarely edit the same file and merge conflicts stay
small.

> **Proposed, not confirmed.** Nobody has signed off on this split yet. Raise it at the first
> team meeting and change anything that does not match how work actually falls. See ISS-025.

## Folders

| Folder / file | Primary owner | Backup |
| :--- | :--- | :--- |
| `docs/team/` | Shabab | Hisham |
| `js/config/crops.js`, `js/config/seasons.js` | Shabab | Afif |
| `js/services/` | Afif | Hisham |
| `js/domain/weather.js`, `js/domain/notifications.js` | Afif | Hisham |
| `js/ui/weatherPanel.js`, `js/ui/envMetrics.js` | Afif | Kafi |
| `js/ui/loadingTips.js`, `js/config/tips.js` | Hisham | Kafi |
| `css/` | Kafi | Shabab |
| `css/auth.css` | Kafi | Hisham |
| `js/ui/savePanel.js` | Hisham | Kafi |
| `js/state/transfer.js`, `utils/checksum.js` | Hisham | Shabab |
| `js/ui/topBar.js`, `sidebar.js`, `seasonCard.js`, `shopPanel.js`, `inventoryPanel.js`, `hud.js`, `buttonBar.js`, `meters.js` | Kafi | Shabab |
| `js/ui/loginPanel.js`, `loginFields.js`, `passwordReset.js` | Hisham | Kafi |
| `js/services/authApi.js`, `localAuth.js` | Shabab | Hisham |
| `js/config/supabase.js`, the Supabase project itself | Shabab | Hisham |
| `assets/` | Kafi | — |
| `js/state/` | Hisham | Afif |
| `js/domain/authRules.js` | Hisham | Shabab |
| `js/ui/authErrors.js` | Hisham | Shabab |
| `js/domain/farm.js`, `plots.js`, `pump.js`, `wallet.js`, `inventory.js`, `simulator.js` | Hisham | Shabab |
| `js/utils/iso.js` | Hisham | Kafi |
| `js/ui/farmView.js`, `plotTile.js`, `pumpView.js`, `cropPicker.js` | Hisham | Kafi |
| `js/debug/` | Hisham | — |
| `js/config/field.js`, `game.js`, `assets.js` | Hisham | Kafi |

## Why this split

- **Kafi** owns anything where the answer is judged by eye: CSS, panels, assets. That is the
  bulk of `ui/`, and it keeps the visual work unblocked by gameplay work.
- **Hisham** owns the model: state, game rules, field geometry, the debug panel. These files are
  the ones with tests, and they are the ones where a stray edit is hardest to spot.
- **Afif** owns everything that touches the network, plus the two domains that consume it —
  weather classification and notifications. Those are the files most likely to need a quick
  change when a real API response turns out to differ from the plan.
- **Shabab** owns docs, crop balance and seasons. Small, self-contained files that the project
  lead needs to keep consistent with the README.

## Shared files

These are touched by more than one person. Say so in the PR, and keep changes small.

| File | Touched by | Note |
| :--- | :--- | :--- |
| `index.html` | Kafi, Hisham | Kafi owns the grid; Hisham adds mount points |
| `js/main.js` | everyone | Wiring only. If logic is creeping in, it belongs in a domain module |
| `js/ui/*` panel shells | Kafi, then whoever fills it | First commit is structure, second is content |
| `README.md`, `docs/` | Shabab | Everyone reports changes |
| `package.json` | Hisham | Scripts only |
| `js/config/crops.js` | Shabab, Hisham | Shabab owns balance; Hisham owns shape |

## Changing hands

1. Say so in `#team` or `docs/team/progress-log.md` before you start.
2. Update this file in the same commit as your first change.
3. Note open work in `tasks.md` — a folder with a `doing` task needs a named owner.

## Working in someone else's folder

Allowed for small fixes, with two conditions:

1. Tell the owner in the PR description.
2. Do not reformat, rename or restructure their files. Fix the bug, leave the style alone.

Large changes to another owner's folder need their agreement first. If you need a change across
three folders, that is usually a sign the boundary is wrong — raise it rather than routing
around it.
