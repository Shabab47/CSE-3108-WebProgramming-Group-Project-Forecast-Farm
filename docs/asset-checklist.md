# Asset Checklist

Every image and sound the game needs, who owns it, and what is still missing.
Owner: **Kafi**. Art direction: **Hisham**.

> **The canonical asset registry with byte sizes is [`js/config/assets.js`](../js/config/assets.js).**
> A test (`tests/assets.test.js`) scans the `assets/` directory and fails if any file is missing
> from the registry, any registry entry points to a missing file, or any size does not match.

Last reviewed 2026-10-20, after potato's five stages, both pin sprites and the book/almanac art
landed. Tick a box when the file exists **and** has content — an empty placeholder file does not
count.

**Naming rules.** One folder per crop. The folder name and the file prefix always match, so a
misfiled sprite is obvious at a glance.

```
assets/images/crops/<cropId>/<cropId>_<stage>.png
```

All crop art is square with transparent corners — rice is 1000×1000, the newer potato, tomato and
damage sprites are 1024×1024 (`tomato_5.png` is 1024×807, ISS-093). Match the existing rice sprites
for line weight, palette and perspective — the diamond is 0.538 h/w for ground tiles and 0.589 for
crops, because plants stand proud of the soil. See `docs/architecture.md` for the geometry.

---

## Summary

This file is the **plan** — what the game needs. `js/config/assets.js` is the **record** — what is
on disk. The two answer different questions and will not have the same total: the checklist counts
sprites nobody has drawn yet, which are by definition not in the registry. Where they overlap they
agree, and `tests/assets.test.js` fails if the registry drifts from the filesystem.

**Eighty-one files are registered: 55 finished, 26 outstanding.** Of those 26, five are unused
duplicate copies of the rice sprites, four are `.gitkeep` placeholders, three are the out-of-scope
sounds and fourteen are the 0-byte icon SVGs — so **17 registered files are still empty or unwritten**,
none of them a crop sprite. The crop art still owed is *planned* rather than registered: eleven damage
sprites (five crops × three states, less the four that exist) and ten growth stages (wheat and corn).

| Group | Needed | Done | Remaining |
| :--- | ---: | ---: | ---: |
| Growth stages — 5 per crop, 5 crops | 25 | 15 | **10** |
| Damage sprites — dry / waterlogged / dead, 5 crops | 15 | 4 | **11** |
| Weather icons | 9 | 0 | **9** |
| Crop icons | 5 | 0 | **5** |
| Metadata placeholders | 4 | 0 | **4** |
| Pump animation frames | 3 | 1 | **2** |
| Environment tiles and pins | 6 | 6 | 0 |
| Menu background + logo | 2 | 2 | 0 |
| Display fonts | 6 | 6 | 0 |
| Shop art, buttons, season art | 14 | 14 | 0 |
| Book / almanac art | 7 | 7 | 0 |
| Inventory art | 1 | 1 | 0 |
| **Total in scope** | **96** | **55** | **41** |
| Sounds — *out of scope* | 3 | 0 | — |

**Rice, potato and tomato each have all five growth stages.** Wheat and corn have none yet. Rice and
potato have two of their three damage sprites each, under custom filenames (`rice_drought_killed`,
`rice_rain_damaged`, `potato_drought_killed`, `potato_rain_damaged`); tomato has none, and no crop
has its `_dead` sprite.

---

## Crop sprites

**Eight per crop**: five growth stages, then three damage states. It was seven until ISS-092 split
water damage away from drought death — a crop can now be dry-damaged, waterlogged, or dead, and the
three are different pictures with different rules behind them.

`js/domain/damage.js` resolves the priority, so exactly one is ever drawn: **dead wins**, because
a dead crop is dead whatever else was wrong with it.

### Rice — the first playable crop

| File | State | Status |
| :--- | :--- | :--- |
| `rice_1.png` | Sprouted | ✅ done |
| `rice_2.png` | Young foliage | ✅ done |
| `rice_3.png` | Mid-sized | ✅ done |
| `rice_4.png` | Mature, still green | ✅ done |
| `rice_5.png` | Golden, ready to harvest | ✅ done |
| `rice_drought_killed.png` | Dry damage — the patch, dead | ✅ done — custom name, see `CUSTOM_FAILURE_NAMES` |
| `rice_rain_damaged.png` | Waterlogged damage | ✅ done — custom name |
| `rice_dead.png` | Dead, collapsed | ⬜ **missing** — no file, no entry |

**Why `rice_6.png` is wanted.** Rice takes six hours and there are five sprites, so
`stageMath.js` holds stage 5 for the whole of hours five and six. That is a deliberate
placeholder, not the design: the `min(..., STAGE_COUNT)` in `stageMath.js` is what stops
`cropStageImg(cropId, 6)` requesting a file that does not exist, and widening that one number is
all it takes to make hour six use a sixth sprite. No crop file, UI change or formula edit is
involved. A sixth sprite would let all six hours show distinct art, and would be the first crop
to need it.

### Wheat, potato, corn, tomato

| Crop | Stages 1–5 | Damage sprites | Folders | Playable |
| :--- | :--- | :--- | :--- | :--- |
| Rice | ✅ 5 of 5 | ✅ 2 of 3 | `rice/` ready | **yes** |
| Tomato | ✅ 5 of 5 | ⬜ 0 of 3 | `tomato/` ready | no — see ISS-093 |
| Wheat | ⬜ 0 of 5 | ⬜ 0 of 3 | `wheat/` ready | no |
| Potato | ✅ 5 of 5 | ✅ 2 of 3 | `potato/` ready | **yes** — behind the 4-plot land gate (DEC-041) |
| Corn | ⬜ 0 of 5 | ⬜ 0 of 3 | `corn/` ready | no |

**Potato's five stages and two damage sprites landed on 19 October** (`a02a62e`), and it is
`available: true` behind the same land gate as every seed. Its stages 3–5 replaced rice placeholders
in place under the same filenames, which is why the registry's sizes had to be re-measured (ISS-105)
and why `cropFailureImg()` needed a `potato` entry for its custom damage filenames (ISS-106).

**Tomato's art has landed** and all five stages are registered. Two things stand between it and
`available: true` (T-14): its damage sprites, and **ISS-093 — `tomato_5.png` is 1024×807 while
stages 1–4 are 1024×1024**, so the plant visibly shrinks on the step that should be its biggest.
That is Jim's file; the registry records the dimensions the file actually has rather than the ones
the rice pattern suggests.

Until a crop's images exist it stays `available: false` and shows greyed with "coming soon" in
the picker. Empty folders already exist for all of them, with a `.gitkeep`, so art can be dropped
straight in.

---

## Damage states

These are the *"Special Failure States"* from the original brief, plus the third state the water
model needed. **They are in scope**, because a crop that dies with no visual change gives the
player nothing to read.

| File | Shows | Replaces |
| :--- | :--- | :--- |
| `<crop>_dry.png` | A crop left dry past the damage floor — scorched, wilted | The standing crop, overlaid |
| `<crop>_waterlogged.png` | A crop left above its target — split fruit, drowned roots | The standing crop, overlaid |
| `<crop>_dead.png` | A crop whose health reached 0 | The standing crop |

Rice's and potato's two delivered sprites are named `_drought_killed` and `_rain_damaged` rather than
`_dry`/`_waterlogged`. `CUSTOM_FAILURE_NAMES` in `js/config/assets.js` maps those, so a new crop can
use either the generic pattern or its own filenames — but the map has to know about it.

**Until a sprite exists the state is carried by a word, not an image.** `plotLayers.js` draws the
`damageWord()` text beside the sprite and the sprite is a hole until the art lands. That is
[DEC-014](team/decisions.md)'s rule and it is deliberate: **do not add a fallback layer.** An
earlier draft of this file described a CSS `filter: grayscale(1) brightness(.6)` fallback and said
it should stay permanently. That was never built, and the plan to build it was withdrawn — a second
way of showing the same thing is a second thing that can be wrong.

### Which state shows when

| Cause | Sprite | Latches after |
| :--- | :--- | :--- |
| Water below the crop's damage floor | `<crop>_dry.png` | `DAMAGE.hoursBelowFloorToLatch` |
| Water above the crop's target | `<crop>_waterlogged.png` | `DAMAGE.hoursAboveTargetToLatch` |
| Health reaching 0 | `<crop>_dead.png` | immediately, and is not reversible |

**Damage is a latch, not a reading.** It is recorded on the plot the moment the line is crossed and
never decreases — a crop that has been through a real drought does not un-sunburn because you
watered it afterwards. Water itself is a live reading and is drawn as one. See ISS-092 for why the
two had to be split.

---

## Menu and auth screens

| File | What it is | Status |
| :--- | :--- | :--- |
| `assets/images/menu_bg.png` | The opening menu's painted background, 1440×1024 | ✅ done |
| `assets/images/title.png` | The game logo on the opening menu, 1188×373 | ✅ done |
| `assets/fonts/LuckiestGuy-Regular.ttf` | Logo, button and plank face | ✅ done |
| `assets/fonts/IrishGrover-Regular.ttf` | Field labels, body text, small links | ✅ done |

The two fonts are self-hosted and declared in `css/fonts.css`. Both are SIL Open
Font License, so they can be committed and shipped — check the licence file that
came with each download is committed too.

The sign toggle that belongs in the top bar arrives with sounds (ISS-023). The bar
is the wordmark alone until then.

---

## Environment

| File | What it is | Status |
| :--- | :--- | :--- |
| `assets/images/base.png` | The slab under the whole field | ✅ done |
| `assets/images/ground/ground_unwatered.png` | Dry soil tile | ✅ done |
| `assets/images/ground/ground_watered.png` | Watered soil tile | ✅ done |
| `assets/images/pump.png` | The pump, idle | ✅ done |
| `assets/images/pump/pump_1.png` | Pump animation frame 1 | ⬜ **missing** |
| `assets/images/pump/pump_2.png` | Pump animation frame 2 | ⬜ **missing** |

The pump is animated by a CSS pulse for now. The three frames replace that when they arrive.

---

## Weather icons

Nine, one per weather event. **All nine files are currently 0 bytes**, so the forecast strip shows
broken images. Text labels carry the meaning in the meantime, and the team decided not to build a
fallback layer (DEC-014).

| File | Event | Status |
| :--- | :--- | :--- |
| `sunny.svg` | Sunny | ⬜ 0 bytes |
| `cloudy.svg` | Cloudy | ⬜ 0 bytes |
| `light-rain.svg` | Light rain | ⬜ 0 bytes |
| `heavy-rain.svg` | Heavy rain | ⬜ 0 bytes |
| `drought.svg` | Drought | ⬜ 0 bytes |
| `frost.svg` | Frost | ⬜ 0 bytes |
| `hail.svg` | Hail | ⬜ 0 bytes |
| `strong-wind.svg` | Strong wind | ⬜ 0 bytes |
| `high-humidity.svg` | High humidity | ⬜ 0 bytes |

## Crop icons

Five, used in the seed shop and the crop picker. **All five are 0 bytes.**

| File | Crop | Status |
| :--- | :--- | :--- |
| `rice.svg` | Rice | ⬜ 0 bytes |
| `wheat.svg` | Wheat | ⬜ 0 bytes |
| `potato.svg` | Potato | ⬜ 0 bytes |
| `corn.svg` | Corn | ⬜ 0 bytes |
| `tomato.svg` | Tomato | ⬜ 0 bytes |

---

## Book / almanac art

Seven files under `assets/images/book/`. The book button replaces the rice seed packet that stood
in for it on the farm sidebar, directly under the shop button (`ui/almanacLauncher.js`). The six
crop illustrations are the almanac's per-crop entries, loaded by `ui/almanacCard.js` via
`bookCropImg()`; the page is `almanac.html` (`js/almanac-main.js`).

| File | What it is | Status |
| :--- | :--- | :--- |
| `book.png` | The book button, 1254×1254 — square, like the shop/settings buttons | ✅ done |
| `rice.png` | Rice almanac entry, 1254×1254 | ✅ done |
| `wheat.png` | Wheat almanac entry, 1254×1254 | ✅ done |
| `potato.png` | Potato almanac entry, 1254×1254 | ✅ done |
| `tomato.png` | Tomato almanac entry, 1254×1254 | ✅ done |
| `corn.png` | Corn almanac entry, 1254×1254 | ✅ done |
| `Golden Rice Harvest Bundle.png` | Golden Rice Harvest Bundle, 1312×1199 | ✅ done |

**`book.png` is square and the button box is square.** `.sidebar-btn__img` is 64×64 with
`object-fit: contain`, so the drawing fills the slot. The first cut was landscape (1470×1070)
and letterboxed to a smaller size than the shop gear; the current art replaces it.

---

## Inventory art

One file: `assets/images/inventory/inventory.png`, a crate of harvested crops, 1254×1254. It is the
button under the almanac button (`ui/inventoryLauncher.js`), which opens the inventory page
(`inventory.html`, `js/inventory-main.js`). The page itself shows the shop's seed packets, not this
crate — the crate is the button, the packets are the bag.

---

## Sounds — out of scope

Listed so the count is honest. **Do not wire these up.** Sounds are not in version 1.

| File | Status |
| :--- | :--- |
| `assets/sounds/rain.mp3` | ⬜ 0 bytes, out of scope |
| `assets/sounds/storm.mp3` | ⬜ 0 bytes, out of scope |
| `assets/sounds/notification.mp3` | ⬜ 0 bytes, out of scope |

## Also out of scope

Not needed for version 1, listed so nobody mistakes them for oversights: the farmer sprite and
seeding animation, rain and wind particle effects, and a background for the page behind the field.

> **A background now exists, but not for the field.** `assets/images/menu_bg.png` is the opening
> menu's, and it does not sit behind the farm — the farm is drawn on the app grid with its own
> art. The line above still means what it says.

---

## Adding art without touching code

Adding a crop's seven sprites is the only step needed to make that crop playable:

1. Drop the seven files into `assets/images/crops/<cropId>/`
2. Flip `available: true` in `js/config/crops.js`
3. Tick the boxes above

No other code change is expected. **If one is needed, that is a bug in the architecture** — log it
in `docs/team/issues.md` rather than patching around it.