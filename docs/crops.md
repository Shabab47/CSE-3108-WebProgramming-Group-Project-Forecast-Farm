# Crops

Source of truth for crop numbers is `js/config/crops.js`. This document explains what the
numbers mean and why they are what they are.

## Crop table

| id | Name | Grow hours | Seed price | Sell / unit | Yield units | Water need | Available |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- | :--- |
| `rice` | Rice | 6 | 100 | 20 | 10 | Very high (0.9) | **yes** |
| `potato` | Potato | 4 | 200 | 40 | 10 | Medium (0.5) | no |
| `tomato` | Tomato | 6 | 300 | 60 | 10 | Medium (0.5) | no |
| `wheat` | Wheat | 5 | 400 | 80 | 10 | Medium (0.5) | no |
| `corn` | Corn | 8 | 500 | 100 | 10 | High (0.7) | no |

All balance values are placeholders for a first playable build. Tune them in
`js/config/crops.js`; nothing else needs to change.

### Seed prices

100 / 200 / 300 / 400 / 500 gold, in the order the shop lists them, cheapest
first (`SHOP_ORDER`). The ladder is the shop's whole economy for now, so it is
worth saying why it starts where it does:

- A new farm has `START_GOLD` (200). That buys two rice packets, or one potato
  packet, and nothing else — the first purchase is a choice, not a formality.
- Rice at 100 is deliberately the cheapest, because rice is the only crop with art
  and therefore the only one a new player can actually plant. The cheapest thing
  in the shop has to be the thing that works.
- Ten rice seeds is a full farm's worth of planting (16 plots), so `×10` is a real
  target rather than a rounding error, and corn at 500 is a mid-game goal.

The old placeholder prices (10 / 8 / 6 / 14 / 12) were from before the shop
existed and are not reachable in any sensible play pattern. Change the numbers in
`config/crops.js`, not here.

### A harvest returns twice the seed

`sellPrice` is not an independent knob: `yield * sellPrice` is **exactly twice**
`seedPrice`, for every crop. So one packet of rice costs 100 and a full-health
harvest of it is worth 200, and the same ratio holds for corn at 500 and 1,000.

That ratio is the game's risk model. Quality comes from `plot.health`, so a
plot that dried out or took a beating in bad weather sells below 100% of its
value, and below 50% health a harvest no longer pays for the seed that produced
it. A farm that ignores the forecast stops growing; one that reads it compounds.
Tune `seedPrice` and `sellPrice` together — a crop that sells for less than its
seed makes the sixteen-plot goal unreachable.

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

## Land prices

Source of truth is `PLOT_PRICES` in `js/config/field.js`. The price of the *n*-th plot the player
buys is `PLOT_PRICES[ownedCount]` — the price depends on **how many plots they already own**, not
on which plot it is. That keeps the opening affordable wherever the player clicks, and gives the
land shop a single "next price" instead of sixteen.

**Every plot costs exactly twice the previous one.** There is no ceiling on the curve.

| Plot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cost (gold) | Free | 100 | 200 | 400 | 800 | 1,600 | 3,200 | 6,400 |

| Plot | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cost (gold) | 12,800 | 25,600 | 51,200 | 102,400 | 204,800 | 409,600 | 819,200 | 1,638,400 |

Cumulative totals, which are what actually matters for pacing:

| Milestone | Total gold | Reachable by |
| :--- | ---: | :--- |
| Plots 1–4 | 700 | first session |
| Plots 1–6 | 3,100 | early game |
| Plots 1–8 | 12,700 | first weeks of play |
| Plots 1–12 | 204,700 | long term |
| **All 16** | **3,276,700** | **the end goal** |

### The end goal

**Unlocking all sixteen plots is the objective of the game.** Every other system exists to serve
it: crops convert into gold, the pump spends gold to keep those crops alive, and land is what gold
buys. A player holding all sixteen plots has finished version 1 — there is deliberately nothing
past that yet.

The doubling curve is what makes the goal feel like a goal rather than a checklist. A flat price
list would be exhausted in an afternoon; a curve that multiplies by two every purchase turns the
farm into something a player returns to over months. The first plot being free means a new player
can plant within a minute of starting, and the freebie plus 200 starting gold is enough to buy the
second plot and ten rice seeds outright.

### A note on pacing

Rice earns about 100 gold per planting after seed cost — 200 in, 200 out — and takes six hours to
grow. Buying all sixteen plots is therefore a very long haul at that rate — deliberately so, but
worth revisiting if playtesting shows the mid-game going quiet. The debug panel's *unlock all
plots* button exists so a full farm can be demonstrated without grinding. Reachable-by estimates
in the table above assume a full farm earning at that rate, so a small farm is slower, not faster.

## Harvest and quality

```
units  = crop.yield
quality = plot.health / 100          // 0..1
gold    = units * crop.sellPrice * qualityAvg
```

A plot harvested at full health sells for `10 * 20 * 1.0` = 200 gold on rice, against a 100 gold
seed — the 2× ratio described above. Quality is averaged into the existing stack when harvest is
added, so selling part of a stack and then adding more does not distort the average.

## Crop artwork

Crop sprites are drawn slightly taller than the ground tile (h/w 0.589 against 0.538). That is
intentional: plants should stand proud of the soil. Do not "fix" it by scaling crop layers to
match the ground, or the tops will be clipped.

### Growth stages and failure states

Seven sprites per crop: five growth stages, then two failure states.

```
assets/images/crops/<cropId>/<cropId>_<stage>.png          stages 1 to 5
assets/images/crops/<cropId>/<cropId>_rain_damaged.png    heavy rain, waterlogging
assets/images/crops/<cropId>/<cropId>_drought_killed.png  drought, frost, hail, or health 0
```

`rice_1.png` through `rice_5.png` exist. **Rice still needs both failure states**, as does every
other crop. Track them in [`asset-checklist.md`](asset-checklist.md).

Until a failure sprite exists the game falls back to a CSS filter, so the state is still readable:

```css
/* dead crop, until <cropId>_drought_killed.png exists */
filter: grayscale(1) brightness(.6);
```

**The fallback stays even once sprites land.** If an image fails to load, or a crop's art is late,
the player still sees that something is wrong. Prefer the sprite, fall back to the filter.
