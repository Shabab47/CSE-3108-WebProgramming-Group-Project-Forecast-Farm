# Asset Checklist

Every image and sound the game needs, who owns it, and what is still missing.
Owner: **Kafi**. Art direction: **Hisham**.

> **The canonical asset registry with byte sizes is [`js/config/assets.js`](../js/config/assets.js).**
> A test (`tests/assets.test.js`) scans the `assets/` directory and fails if any file is missing
> from the registry, any registry entry points to a missing file, or any size does not match.

Last reviewed at the end of week 1, planning phase. Tick a box when the file exists **and** has
content — an empty placeholder file does not count.

**Naming rules.** One folder per crop. The folder name and the file prefix always match, so a
misfiled sprite is obvious at a glance.

```
assets/images/crops/<cropId>/<cropId>_<stage>.png
```

All art is 1000×1000 with transparent corners. Match the existing rice sprites for line weight,
palette and perspective — the diamond is 0.538 h/w for ground tiles and 0.589 for crops, because
plants stand proud of the soil. See `docs/architecture.md` for the geometry.

---

## Summary

| Group | Needed | Done | Remaining |
| :--- | ---: | ---: | ---: |
| Crop sprites, all 5 crops | 35 | 5 | **30** |
| Weather icons | 9 | 0 | **9** |
| Crop icons | 5 | 0 | **5** |
| Environment tiles | 4 | 4 | 0 |
| Menu background + logo | 2 | 2 | 0 |
| Display fonts | 2 | 2 | 0 |
| Pump animation frames | 3 | 1 | **2** |
| Sounds — *out of scope* | 3 | 0 | — |
| **Total in scope** | **60** | **14** | **46** |

Rice is **not** finished. It has its five growth stages but is missing both failure states, which
are per-crop like every other sprite.

---

## Crop sprites

Seven per crop: five growth stages, then two failure states.

### Rice — the only playable crop

| File | State | Status |
| :--- | :--- | :--- |
| `rice_1.png` | Sprouted | ✅ done |
| `rice_2.png` | Young foliage | ✅ done |
| `rice_3.png` | Mid-sized | ✅ done |
| `rice_4.png` | Mature, still green | ✅ done |
| `rice_5.png` | Golden, ready to harvest | ✅ done |
| `rice_6.png` | Sixth hour — **wanted, see below** | ⬜ **missing** |

**Why `rice_6.png` is wanted.** Rice takes six hours and there are five sprites, so
`stageMath.js` holds stage 5 for the whole of hours five and six. That is a deliberate
placeholder, not the design: the `min(..., STAGE_COUNT)` in `stageMath.js` is what stops
`cropStageImg(cropId, 6)` requesting a file that does not exist, and widening that one number is
all it takes to make hour six use a sixth sprite. No crop file, UI change or formula edit is
involved. A sixth sprite would let all six hours show distinct art, and would be the first crop
to need it.
| `rice_rain_damaged.png` | Rain-damaged overlay | ⬜ **missing** |
| `rice_drought_killed.png` | Drought-killed dried texture | ⬜ **missing** |

### Wheat, potato, corn, tomato — not yet playable

Each needs all seven. Until a crop's images exist it stays `available: false` and shows greyed
with "coming soon" in the picker.

| Crop | Stages 1–5 | Rain-damaged | Drought-killed | Folders |
| :--- | :--- | :--- | :--- | :--- |
| Wheat | ⬜ | ⬜ | ⬜ | `wheat/` ready |
| Potato | ⬜ | ⬜ | ⬜ | `potato/` ready |
| Corn | ⬜ | ⬜ | ⬜ | `corn/` ready |
| Tomato | ⬜ | ⬜ | ⬜ | `tomato/` ready |

Empty folders already exist for all four, with a `.gitkeep`, so art can be dropped straight in.

---

## Failure states

These are the two the original brief called *"Special Failure States"*. They were in the art
requirements but had been marked out of scope for version 1 — **they are now in scope**, because a
crop that dies with no visual change gives the player nothing to read.

| File | Shows | Replaces |
| :--- | :--- | :--- |
| `<crop>_rain_damaged.png` | A crop hit by heavy rain — lodging, rot, waterlogged | The standing crop, overlaid |
| `<crop>_drought_killed.png` | A crop killed by drought — dried, brown, collapsed | The standing crop |

Until a sprite exists, the game falls back to a CSS filter so the state is still readable:

```css
/* dead crop, until <crop>_drought_killed.png exists */
filter: grayscale(1) brightness(.6);
```

**The fallback stays in the code even after the sprites land.** If an image fails to load, or a
crop's art is late, the player still sees that something is wrong. Prefer the sprite, fall back to
the filter.

### Which failure shows when

| Cause | Sprite |
| :--- | :--- |
| Heavy rain, or a waterlogged plot | `<crop>_rain_damaged.png` |
| Drought, frost, hail, or health reaching 0 | `<crop>_drought_killed.png` |

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