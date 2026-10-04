# Crops

Source of truth for crop numbers is `js/config/crops.js`. This document explains what the
numbers mean and why they are what they are.

## Crop table

| id | Name | Grow hours | Seed price | Sell / unit | Yield units | Water need | Available |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :--- |
| `rice` | Rice | 6 | 10 | 4 | 10 | Very high (0.9) | **yes** |
| `wheat` | Wheat | 5 | 8 | 3 | 10 | Medium (0.5) | no |
| `potato` | Potato | 4 | 6 | 3 | 10 | Medium (0.5) | no |
| `corn` | Corn | 8 | 14 | 5 | 10 | High (0.7) | no |
| `tomato` | Tomato | 6 | 12 | 5 | 10 | Medium (0.5) | no |

All balance values are placeholders for a first playable build. Tune them in
`js/config/crops.js`; nothing else needs to change.

Rice is the only playable crop because it is the only crop with art. A crop becomes playable
when its five stage images exist: `assets/images/crops/<id>/<id>_1.png` through
`<id>_5.png`. Each crop gets its own folder, so the folder name and the file prefix always agree
and a missing crop is an empty folder rather than a scattering of loose files.
Flip `available: true` and it appears in the picker and the shop. No code changes should be
needed. If one is, that is an architecture bug — log it in `docs/team/issues.md`.

## Likes and hates

From the README crop guidelines. `likes` and `hates` are descriptive strings for the picker
tooltip. The mechanical effect of weather on a crop lives in
`js/config/cropWeatherMatrix.js`, not here.

| Crop | Likes | Hates | Best season |
| :--- | :--- | :--- | :--- |
| Rice | Rain, heat, flood | Drought, frost | Rainy |
| Wheat | Cool, mild, light rain | Heat, drought, heavy rain | Cool / Dry |
| Potato | Cool, moist | Frost, heat, waterlogging | Cool / Moist |
| Corn | Warm, sun, moderate rain | Drought, strong wind | Warm / Sunny |
| Tomato | Warm, sun, steady water | Frost, extreme heat, heavy rain | Warm / Mild |

## Water need

`waterNeed` is a 0–1 multiplier on evaporation. An empty plot counts as `1`, so bare soil dries
out fastest.

```
water lost per hour = WATER.baseDecayPerHour * waterNeed * event.evaporation
```

- Sunny: `8 * 1 * 1.5` = 12/h on bare soil.
- Drought: `8 * 1 * 3` = 24/h on bare soil, the worst case in the game.
- Heavy rain: evaporation is 0, and rain adds water instead.

## Growth stages

Five stages, and **the stage is never stored**. It is computed from `plantedAt` every time the
field renders, so growth keeps running while the tab is closed and nothing has to be migrated
when the formula changes.

```
progress = (now - plantedAt) / 3_600_000 / crop.growHours
stage    = progress >= 1 ? 5 : 1 + floor(progress * 4)
```

`now = Date.now() + state.clock.timeOffsetMs`, so the debug time-skip buttons move growth too.

| Stage | Progress | Art |
| ---: | :--- | :--- |
| 1 | 0 – 25% | `rice_1.png` sprouted |
| 2 | 25 – 50% | `rice_2.png` |
| 3 | 50 – 75% | `rice_3.png` |
| 4 | 75 – 100% | `rice_4.png` mature, still green |
| 5 | 100% | `rice_5.png` golden, ready |

An **empty plot is the ground tile itself** (`ground_unwatered.png` or `ground_watered.png`).
`rice_1` is the first growth stage, not the empty state. This is the single most common
misreading of the art, so it is worth stating twice.

Ready to harvest requires `progress >= 1` **and** `not dead`. A dead crop never becomes ready,
which is why `farm.clearPlot()` exists — see `docs/team/issues.md` ISS-006.

## Harvest and quality

```
units  = crop.yield
quality = plot.health / 100          // 0..1
gold    = units * crop.sellPrice * qualityAvg
```

A plot harvested at full health sells for `10 * 4 * 1.0` = 40 gold on rice, against a 10 gold
seed. Quality is averaged into the existing stack when harvest is added, so selling part of a
stack and then adding more does not distort the average.

## Crop artwork

Crop sprites are drawn slightly taller than the ground tile (h/w 0.589 against 0.538). That is
intentional: plants should stand proud of the soil. Do not "fix" it by scaling crop layers to
match the ground, or the tops will be clipped.
