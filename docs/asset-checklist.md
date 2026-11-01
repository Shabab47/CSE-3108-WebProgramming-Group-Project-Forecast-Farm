# Asset Checklist

Every image and sound the game needs, who owns it, and what is still missing.
Owner: **Kafi**. Art direction: **Hisham**.

> **The canonical asset registry with byte sizes is [`js/config/assets.js`](../js/config/assets.js).**
> A test (`tests/assets.test.js`) scans the `assets/` directory and fails if any file is missing
> from the registry, any registry entry points to a missing file, or any size does not match.

Last reviewed **1 November 2026**, on the shipped build, by counting the registry and the directory
rather than by memory. Tick a box when the file exists **and** has content — an empty placeholder
file does not count.

**Naming rules.** One folder per crop. The folder name and the file prefix always match, so a
misfiled sprite is obvious at a glance.

```
assets/images/crops/<cropId>/<cropId>_<stage>.png
assets/images/crops/<cropId>/<cropId> seed.png
assets/images/crops/<cropId>/<cropId>_<damage>.png
```

All crop art is square with transparent corners — rice is 1000×1000, the newer potato, tomato, wheat,
corn and damage sprites are 1024×1024. Match the existing rice sprites for line weight, palette and
perspective — the diamond is 0.538 h/w for ground tiles and 0.589 for crops, because plants stand
proud of the soil. See `docs/architecture.md` for the geometry.

---

## Summary

`js/config/assets.js` is the **record** — what is on disk. This page is the **plan** plus that
record. They agree except for the five dead-crop sprites, which no crop has drawn and which are
therefore not in the registry at all.

**The registry holds 119 entries and 59,317,205 bytes:** 97 `done`, 17 `empty` (14 in scope,
3 out of scope), 4 `.gitkeep` placeholders, and 1 retired duplicate. **Five files are planned and
not registered**: one `_dead` sprite per crop.

| Group | Needed | Done | Remaining |
| :--- | ---: | ---: | ---: |
| Growth stages — 5 per crop, 5 crops | 25 | 25 | 0 |
| Seed packets — 1 per crop | 5 | 5 | 0 |
| Damage — dry and waterlogged, 5 crops | 10 | 10 | 0 |
| Damage — dead, 5 crops | 5 | 0 | **5** |
| Weather icons | 9 | 0 | **9** |
| Crop icons | 5 | 0 | **5** |
| Pump level art | 5 | 5 | 0 |
| Slab, phone slab, ground, lock pins | 6 | 6 | 0 |
| Menu background, logo, farm backdrop | 3 | 3 | 0 |
| Shop, settings, book, inventory, seasons, UI icons, favicon | 21 | 21 | 0 |
| Fonts | 6 | 6 | 0 |
| Sound effects | 16 | 16 | 0 |
| **Total in scope** | **116** | **97** | **19** |
| Ambient sounds — *out of scope* | 3 | 0 | — |
| Retired duplicate (`pump.png`) | 1 | — | — |

---

## Crop sprites

**Eight per crop**: five growth stages, then three damage states. It was seven until ISS-092 split
water damage away from drought death — a crop can now be dry-damaged, waterlogged, or dead, and the
three are different pictures with different rules behind them.

`js/domain/damage.js` resolves the priority, so exactly one is ever drawn: **dead wins**, because a
dead crop is dead whatever else was wrong with it.

**All five crops are playable.** A crop is playable when its five stages are on disk; the dead
sprite is the only piece still missing, and a crop without it is drawn with the damage word instead
of a picture.

| Crop | Stages 1–5 | Seed packet | Dry / waterlogged | Dead | Plots needed | Playable |
| :--- | :--- | :--- | :--- | :--- | ---: | :--- |
| Rice | ✅ 5 of 5 | ✅ | ✅ 2 of 2 | ⬜ missing | 1 | **yes** |
| Potato | ✅ 5 of 5 | ✅ | ✅ 2 of 2 | ⬜ missing | 4 | **yes** |
| Tomato | ✅ 5 of 5 | ✅ | ✅ 2 of 2 | ⬜ missing | 8 | **yes** |
| Wheat | ✅ 5 of 5 | ✅ | ✅ 2 of 2 | ⬜ missing | 12 | **yes** |
| Corn | ✅ 5 of 5 | ✅ | ✅ 2 of 2 | ⬜ missing | 16 | **yes** |

The gates are `CROP_UNLOCK_PLOTS` in `js/config/crops.js`: one seed unlocks every four plots owned,
so a full sixteen-plot farm has every crop. The order is the shop order — rice, potato, tomato,
wheat, corn.

**Every crop's damage sprites land under custom filenames** — `<crop>_drought_killed.png` and
`<crop>_rain_damaged.png` — not the generic `_dry`/`_waterlogged` the plan named. `CUSTOM_FAILURE_NAMES`
in `js/config/assets.js` maps them, so a new crop can use either the pattern or its own names, but
the map has to know about it.

**Why `rice_6.png` is wanted.** Rice takes three real months of growth (`growHours` from
`hoursForMonths(3)`) and there are five sprites, so `stageMath.js` holds stage 5 to maturity. That is
a deliberate placeholder, not the design: the `min(..., STAGE_COUNT)` in `stageMath.js` is what stops
`cropStageImg(cropId, 6)` requesting a file that does not exist, and widening that one number is all
it takes to make the last stretch use a sixth sprite. No crop file, UI change or formula edit is
involved.

---

## Damage states

These are the *"Special Failure States"* from the original brief, plus the third state the water
model needed. **They are in scope**, because a crop that dies with no visual change gives the player
nothing to read.

| File | Shows | Replaces |
| :--- | :--- | :--- |
| `<crop>_drought_killed.png` | A crop left dry past the damage floor — scorched, wilted | The standing crop, overlaid |
| `<crop>_rain_damaged.png` | A crop left above its target — split fruit, drowned roots | The standing crop, overlaid |
| `<crop>_dead.png` | A crop whose health reached 0 | The standing crop |

**Until a sprite exists the state is carried by a word, not an image.** `plotLayers.js` draws the
`damageWord()` text beside the sprite and the sprite is a hole until the art lands. That is
[DEC-014](team/decisions.md)'s rule and it is deliberate: **do not add a fallback layer.** An earlier
draft of this file described a CSS `filter: grayscale(1) brightness(.6)` fallback and said it should
stay permanently. That was never built, and the plan to build it was withdrawn — a second way of
showing the same thing is a second thing that can be wrong.

### Which state shows when

| Cause | Sprite | Latches after |
| :--- | :--- | :--- |
| Water below the crop's damage floor | `_drought_killed` | `DAMAGE.hoursBelowFloorToLatch` — 1 h |
| Water above the crop's target | `_rain_damaged` | `DAMAGE.hoursAboveTargetToLatch` — 2 h |
| Health reaching 0 | `_dead` | immediately, and is not reversible |

**Damage is a latch, not a reading.** It is recorded on the plot the moment the line is crossed and
never decreases — a crop that has been through a real drought does not un-sunburn because you watered
it afterwards. Water itself is a live reading and is drawn as one. See ISS-092 for why the two had to
be split.

---

## Environment

| File | What it is | Status |
| :--- | :--- | :--- |
| `assets/images/base.png` | The slab under the whole field, 991 × 595 content | ✅ done |
| `assets/images/base_phone.png` | The same slab sized for the phone frame | ✅ done |
| `assets/images/ground/ground_unwatered.png` | Dry soil tile | ✅ done |
| `assets/images/ground/ground_watered.png` | Watered soil tile | ✅ done |
| `assets/images/pins/lock_pin_green.png` | Pin on a plot that can be bought | ✅ done |
| `assets/images/pins/lock_pin_red.png` | Pin on a plot that cannot yet | ✅ done |
| `assets/images/pump/pump_1.png` | Pump level 1 — starter, waters 2 plots | ✅ done |
| `assets/images/pump/pump_2.png` | Pump level 2 — waters 4 plots | ✅ done |
| `assets/images/pump/pump_3.png` | Pump level 3 — waters 8 plots | ✅ done |
| `assets/images/pump/pump_4.png` | Pump level 4 — waters 12 plots | ✅ done |
| `assets/images/pump/pump_5.png` | Pump level 5 — waters 16 plots | ✅ done |
| `assets/images/pump.png` | The original pump — a byte-copy of `pump_1.png`, no longer loaded | ✅ retired |

All five level images share a 1000×1000 canvas and a centred drawing, so the field swaps `src`
without moving the machine. One drawing per level, in order: level N wears `pump_N.png`. The shop
shows the next level's art; the field shows the current one (DEC-058). The old `pump.png` is kept on
disk but is not requested by any code path, and `npm test` knows it is a duplicate.

---

## Menu and auth screens

| File | What it is | Status |
| :--- | :--- | :--- |
| `assets/images/menu_bg.png` | The opening menu's painted background, 1440×1024 | ✅ done |
| `assets/images/title.png` | The game logo on the opening menu, 1188×373 | ✅ done |
| `assets/fonts/LuckiestGuy-Regular.ttf` | Logo, button and plank face | ✅ done |
| `assets/fonts/IrishGrover-Regular.ttf` | Field labels, body text, small links | ✅ done |
| `assets/fonts/Nunito-{Regular,SemiBold,ExtraBold,Black}.ttf` | The four UI weights | ✅ done |

The fonts are self-hosted and declared in `css/fonts.css`. All three families are SIL Open Font
License, so they can be committed and shipped.

The navbar's sound tile is drawn but inert — there is no mute toggle yet (ISS-023), and the three
ambient files below are still 0 bytes.

---

## Game page backdrop

| File | What it is | Status |
| :--- | :--- | :--- |
| `assets/images/farm_bg.png` | The painted yard behind the whole farm page, 1920×1080 | ✅ done |

Shown **only above 900px** (DEC-062). The layer is `display: none` below that, so the 2.2MB file is
never fetched on a phone; the field sits on the `base.png` slab, which in turn rests on the painted
yard, so the slab's empty dirt centre is all that shows beside the field. Like `menu_bg.png` it is a
PNG with no caching headers, so a desktop's first visit pays for it — WebP would cut it roughly
tenfold and nobody has done it.

---

## Weather icons

Nine, one per weather event. **All nine files are currently 0 bytes** (ISS-001), so the forecast
strip draws no glyph. Text labels carry the meaning in the meantime, and the team decided not to
build a fallback layer (DEC-014).

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

Five, used in the seed shop and the crop picker. **All five are 0 bytes** (ISS-001).

| File | Crop | Status |
| :--- | :--- | :--- |
| `rice.svg` | Rice | ⬜ 0 bytes |
| `wheat.svg` | Wheat | ⬜ 0 bytes |
| `potato.svg` | Potato | ⬜ 0 bytes |
| `corn.svg` | Corn | ⬜ 0 bytes |
| `tomato.svg` | Tomato | ⬜ 0 bytes |

---

## Book / almanac art

Seven files under `assets/images/book/`. The book button sits on the farm's sidebar, directly under
the shop button (`ui/almanacLauncher.js`). The six illustrations are the almanac's per-crop entries,
loaded by `ui/almanacCard.js` via `bookCropImg()`; the page is `almanac.html`
(`js/almanac-main.js`).

| File | What it is | Status |
| :--- | :--- | :--- |
| `book.png` | The book button, 1254×1254 — square, like the shop/settings buttons | ✅ done |
| `rice.png` | Rice almanac entry, 1254×1254 | ✅ done |
| `wheat.png` | Wheat almanac entry, 1254×1254 | ✅ done |
| `potato.png` | Potato almanac entry, 1254×1254 | ✅ done |
| `tomato.png` | Tomato almanac entry, 1254×1254 | ✅ done |
| `corn.png` | Corn almanac entry, 1254×1254 | ✅ done |
| `Golden Rice Harvest Bundle.png` | Golden Rice Harvest Bundle, 1312×1199 | ✅ done |

**The artwork is the button.** `.sidebar-btn` is an unframed 152×152 box and `.sidebar-btn__img`
fills it, so the round badge itself is the control — no tile, border or background behind it. The
first cut was landscape (1470×1070) and letterboxed to a smaller size than the shop gear; the current
art replaces it.

---

## Inventory art

One file: `assets/images/inventory/inventory.png`, a crate of harvested crops, 1254×1254. It is the
button under the almanac button (`ui/inventoryLauncher.js`), which opens the inventory page
(`inventory.html`, `js/inventory-main.js`). The page itself shows the shop's seed packets, not this
crate — the crate is the button, the packets are the bag.

---

## Sounds

**Sixteen effects ship and are wired.** `js/utils/sound.js` plays them; `SFX_VOLUMES` in
`js/config/game.js` sets each one's level, and `sfx()` in `js/config/assets.js` builds the path. A
missing or 404ing file is silent rather than fatal.

| File | Fires on |
| :--- | :--- |
| `click.mp3` | Menu and page navigation |
| `click_p.mp3` | A plot click — repeats a lot, so it is quiet |
| `pop.MP3` | The inspector / picker opening and closing |
| `plant.mp3` | Sowing a seed |
| `harvest.mp3` | A harvest |
| `dead_crop_clear.mp3` | Clearing a dead crop |
| `buy.mp3` | Buying a seed packet |
| `sell.mp3` | Selling seeds back |
| `insufficient.mp3` | A purchase the purse cannot pay for |
| `unlock.mp3` | Buying a plot |
| `pump_up.mp3` | Upgrading the pump |
| `pump_running1.mp3` | The pump starting |
| `pump_running_loop.mp3` | The pump running — looped, stopped on off |
| `watering.MP3` | Each plot the pump reaches |
| `crop_ready.mp3` | A crop becoming ready |
| `login.mp3` | Signing in |

**Their volume is a mix decision, not a fixed table.** `click_p`, `pop`, `watering` and `click` carry
overrides because they fire far more often than the rest.

**Three ambient files are registered and out of scope** — `rain.mp3`, `storm.mp3` and
`notification.mp3` are all 0 bytes and nothing requests them. Ambient weather audio is not in v1.

---

## Also out of scope

Not needed for version 1, listed so nobody mistakes them for oversights: the farmer sprite and
seeding animation, rain and wind particle effects, animated backgrounds (rain falling, clouds
drifting, the season changing the art), the pump's three-frame animation, rain/drought failure
animations, and a frost "cover" action.

> **A page background now exists — see "Game page backdrop" above.** `farm_bg.png` sits behind the
> whole farm page above 900px (DEC-062). It is a still painting, not weather-reactive art, so the
> line above still means what it says: nothing on the farm *animates* with the sky.

---

## Adding art without touching code

Adding a crop's sprites is the only step needed to make that crop playable:

1. Drop the files into `assets/images/crops/<cropId>/` — five stages, the seed packet, and the two
   damage sprites. The dead sprite is drawn with a word until it exists.
2. Register them in `js/config/assets.js` with their byte sizes; `npm test` fails until the sizes
   match disk.
3. Flip `available: true` in `js/crops_logics/<cropId>.js` if it is a new crop.
4. Tick the boxes above.

No other code change is expected. **If one is needed, that is a bug in the architecture** — log it
in `docs/team/issues.md` rather than patching around it.
