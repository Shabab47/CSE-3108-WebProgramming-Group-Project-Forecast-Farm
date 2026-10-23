# Crops

Source of truth for crop numbers is **`js/crops_logics/<cropId>.js`** — one file per crop, each
holding its prices, grow time, water need, yield and likes/hates. `js/config/crops.js` assembles
those into the table everything else imports and restates no number. This document explains what
the numbers mean and why they are what they are.

Land is described the same way: one file per segment in `js/land_squares/`, assembled by
`index.js`.

## Crop table

| id | Name | Grow hours | Seed price | Sell / unit | Yield units | Water need | Available |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- | :--- |
| `rice` | Rice | 6 | 100 | 20 | 10 | Very high (0.9) | **yes** |
| `potato` | Potato | 4 | 200 | 40 | 10 | Medium (0.5) | no |
| `tomato` | Tomato | 6 | 300 | 60 | 10 | Medium (0.5) | no |
| `wheat` | Wheat | 5 | 400 | 80 | 10 | Medium (0.5) | no |
| `corn` | Corn | 8 | 500 | 100 | 10 | High (0.7) | no |

Each crop also carries `shopUnit` — the short label shown in the shop card's top-left pill
("5 SEEDS", "1 TOOL", etc.). It is display copy, not balance, and lives in `js/config/crops.js`
next to `seedPrice`.

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

## The optimal band

Each crop has a **target** it is aiming for, and a **band** around it that counts as good
enough. The target is derived from `waterNeed`, so the thirsty crop wants more and the
hardy one wants less:

```
target = OPTIMAL.base + OPTIMAL.perNeed * waterNeed      →  rice 85, corn 70, wheat 55
band   = [target × (1 - OPTIMAL.slack), target]          →  a quarter below target
```

| Crop | `waterNeed` | Target | Band | From empty | Cost |
| :--- | ---: | ---: | :--- | ---: | ---: |
| Rice | 0.9 | **85** | 64–85 | 58 min | 17 gold |
| Corn | 0.7 | 70 | 53–70 | 46 min | 14 gold |
| Wheat | 0.5 | **55** | 41–55 | 36 min | 11 gold |
| Potato | 0.5 | 55 | 41–55 | 36 min | 11 gold |
| Tomato | 0.5 | 55 | 41–55 | 36 min | 11 gold |
| Bare soil | — | 60 | 45–60 | — | — |

**`slack` is a fraction of the target, not a flat number.** Rice has 21 units of room to be
a bit low; wheat only 14. That is the right shape — a thirsty crop can afford to sag, a
hardy one cannot — and a single flat line would put wheat at "damaged" while it was still
comfortably optimal.

This is the payoff for `waterNeed` being a number rather than a word. Before this it only
scaled how fast a crop dried; now it also decides what "done" looks like, which is the
thing the meter, the pump and the warning all read from.

**The pump stops each target at its own target**, not at `WATER.max`. Filling past the point of any
use costs gold and buys nothing, so "water this plot for 30–60 minutes" is a promise the game
can keep. The estimate counts the evaporation happening while the pump runs, which is why
rice takes 58 minutes rather than the 51 a naive `needed ÷ rate` would claim. Levels 2–5 can do this
for several plots at once, but every outlet still follows the same rule independently (DEC-058).

### Four states, and the middle one is the point

| State | Range | What it means |
| :--- | :--- | :--- |
| `dry` | `0` | dying, or nearly |
| `low` | floor → band floor | **not in trouble yet, and about to be** |
| `optimal` | floor → target | fine |
| `saturated` | above target | past the point of any use |

`low` is the state the meter exists for. `dry` is the state the notification exists for.
A bar that only showed good/bad would be too late to act on and too noisy to read.

## Water need

`waterNeed` is a 0–1 multiplier on evaporation. An empty plot counts as `1`, so bare soil dries
out fastest.

```
water lost per hour = WATER.baseDecayPerHour * waterNeed * event.evaporation
```

- Sunny: `8 * 1 * 1.5` = 12/h on bare soil.
- Drought: `8 * 1 * 3` = 24/h on bare soil, the worst case in the game.
- Heavy rain: evaporation is 0, and rain adds water instead.

### Damage, and why it is a latch

**Water is a live reading. Damage is a committed fact.**

`waterLevel` changes every second, so it crosses any threshold repeatedly. Anything drawn
straight from it strobes — and `farmView.js` diffs tiles per frame, so the image `src`
would swap over and over. So damage is recorded on the plot the first time a line is
crossed, and never decreases:

| Damage | Latches when | Costs | Sprite |
| :--- | :--- | :--- | :--- |
| `dry` | **below the crop's floor** for 1 h | 12 health | `<crop>_dry.png` |
| `waterlogged` | **above the target** for 2 h | 12 health | `<crop>_waterlogged.png` |
| `dead` | health reaches 0 | — | `<crop>_dead.png` |

**Rice and potato shipped under different names** for the first two states —
`rice_drought_killed.png`, `rice_rain_damaged.png`, `potato_drought_killed.png`,
`potato_rain_damaged.png`. `CUSTOM_FAILURE_NAMES` in `js/config/assets.js` is the one place that
knows, and the generic names above are what every other crop will be asked for (ISS-106).

Two thresholds on purpose. The floor asks *how the crop is faring*; zero asks *whether it
is dying*, and only the second drains health per hour. A plot can be badly faring and
still perfectly alive.

**The latch belongs to the crop, not the plot.** `harvest()`, `clearPlot()` and `plant()` all
reset `plot.damage` to `null`, so a new seed never inherits its predecessor's damage sprite.
Before ISS-112 the latch outlived the crop, and replanting showed "Dry" over a healthy stage-1
plant.

**A latch records when it happened.** `applyDamage()` writes `plot.damageAt` in game time and
refuses to write a latch before the crop has lived the hold — one hour for `dry`, two for
`waterlogged`. A save from before `damageAt` existed cannot distinguish a real latch from an
inherited one, so `ensurePlausibleDamage()` clears every timestamp-less latch on load and import.
That is a one-time amnesty (DEC-054); health already spent is not refunded. `plant`, `harvest`
and `clearPlot` reset `damageAt` with `damage`, and an imported save rebases both together.

**Waterlogging needs a two-hour hold.** One shower must not cost a field — that is exactly
what the one-time verdict at sowing exists to prevent, and an instant threshold would undo
that decision on every rain shower for the rest of the crop's life.

**Damage cuts the payout and never blocks the harvest.** The crop still picks, and is
permanently worth less. Blocking the harvest would rebuild the ISS-006 trap: a plot with
nothing to do until it is cleared by hand, and no second failure state available at that
point.

**The sprites are Zim's**, named in `cropFailureImg()`. Rice and potato's drought and rain sprites
have landed (under the custom names above); **no crop has a `dead` sprite yet** — the file does not
exist, and the state shows as a hole plus the word beside it. `plotLayers.js` draws that word for
every crop still waiting on art: a missing picture rather than a missing fact.

> **This is implemented (T-09).** Until then `plot.waterLevel` was `0` on every plot from
> creation and nothing ever wrote it again, so the formula above described a system that was
> not running. It is now `ratesFor(plot, event)` in `js/domain/water.js`.
>
> **The Evaporation column is a multiplier on `baseDecayPerHour`, not an absolute rate.**
> Reading it as absolute gives bare soil 1.5/h instead of 12/h — a plot that takes 133 hours
> to dry, longer than a save, which would make the pump and the drought warnings both
> pointless. There is a test pinning this.
>
> **Measured pacing**, which is the reason to trust the formula rather than admire it:

| Crop | `waterNeed` | Sun | Drought | Hours from full to the dry line |
| :--- | ---: | ---: | ---: | ---: |
| Rice | 0.9 | 10.8/h | 21.6/h | **6.5 h** in sun, 3.2 h in drought |
| Corn | 0.7 | 8.4/h | 16.8/h | 8.3 h in sun, 4.2 h in drought |
| Wheat | 0.5 | 6/h | 12/h | 11.7 h in sun, 5.8 h in drought |
| Potato | 0.5 | 6/h | 12/h | 11.7 h in sun, 5.8 h in drought |
| Tomato | 0.5 | 6/h | 12/h | 11.7 h in sun, 5.8 h in drought |

Rice grows in 6 h, so **the thirsty crop needs exactly one watering per crop** and the
thirsty ones need one every one or two. That cadence is the whole point of `waterNeed` being
a number: wheat can be left alone in sun, rice cannot, and a player learns which is which by
watching the water bar rather than by reading a table.

Rain is **not** scaled by `waterNeed` — it falls on the plot, not on the crop.

## Growth stages

Five stages, and **the stage is never stored**. It is computed from `plantedAt` every time the
field renders, so growth keeps running while the tab is closed and nothing has to be migrated
when the formula changes.

```
hoursElapsed = (now - plantedAt) / 3_600_000      clamped to [0, growHours]
progress     = hoursElapsed / crop.growHours     clamped to [0, 1]
stage        = min(floor(hoursElapsed) + 1, 5)
```

`now = Date.now() + state.clock.timeOffsetMs`, so the debug time-skip buttons move growth too.

**The stage advances on the hour and is stable in between.** The field re-renders every
`TICK_MS`, but the sprite only changes when a whole hour has passed, so the art does not flicker
and the number means something a player can hold on to.

### Rice, which takes six hours and has five sprites

This is the whole table for the only playable crop, and it is not a general rule — it is what
falls out of `min(floor(hours) + 1, 5)` when `growHours` is 6:

| Elapsed | Stage | Art | Ready? |
| ---: | ---: | :--- | :--- |
| 0 – 1h | 1 | `rice_1.png` sprouted | no |
| 1 – 2h | 2 | `rice_2.png` | no |
| 2 – 3h | 3 | `rice_3.png` | no |
| 3 – 4h | 4 | `rice_4.png` | no |
| 4 – 6h | 5 | `rice_5.png` golden | **at 6h** |
| 6h + | 5 | `rice_5.png` | yes |

**The last sprite is held for two hours, and that is deliberate.** Five stages spread evenly
over six hours would give every stage an arbitrary, uneven slice of time and still land on the
same five files. When `rice_6.png` is drawn, widen the `5` in `stageMath.js` and hour six picks
up the new sprite on its own — no crop file, no UI, no formula changes. Until then it is what
stops `cropStageImg(cropId, 6)` building a URL that 404s and leaving a blank diamond at the
exact moment the player most wants to see the payoff.

### Readiness is not the sprite

> **Ready to harvest requires `progress >= 1` and `not dead`. It is deliberately *not*
> `stage === 5`.**

Stage 5 is drawn from four hours, so a rice crop at 5h05m already looks finished and is not
harvestable for another 55 minutes. Judging readiness by the picture would let a player pull a
crop an hour early, and would put the money and the artwork on two different clocks.

A dead crop never becomes ready, which is why `farm.clearPlot()` exists — see
`docs/team/issues.md` ISS-006.

### Seeing it grow without waiting six hours

`?fast=N` in the URL divides every grow time by N, so `?fast=60` turns 30 real minutes into 30
hours of crop growth and a full rice cycle takes six minutes. It reads the URL and nothing
else: off unless asked for, never part of the save file, and it changes no prices — a sped-up
farm earns exactly what a real one would. See `growthSpeed()` in `js/config/game.js`.

### The empty state

An **empty plot is the ground tile itself** (`ground_unwatered.png` or `ground_watered.png`).
`rice_1` is the first growth stage, not the empty state. This is the single most common
misreading of the art, so it is worth stating twice.

## Land prices

Source of truth is `PLOT_PRICES` in `js/config/field.js`. The price of the *n*-th plot the player
buys is `PLOT_PRICES[ownedCount]` — the price depends on **how many plots they already own**, not
on which plot it is. That keeps the opening affordable wherever the player clicks, and gives the
land shop a single "next price" instead of sixteen.

**Every plot costs exactly twice the previous one.** There is no ceiling on the curve.

| Plot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cost (gold) | **Free** | 100 | 200 | 400 | 800 | 1,600 | 3,200 | 6,400 |

| Plot | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cost (gold) | 12,800 | 25,600 | 51,200 | 102,400 | 204,800 | 409,600 | 819,200 | 1,638,400 |

### Plot 1 is free, and always will be

**`STARTER_PLOT_ID` = 0 is owned from the first frame and is never for sale.** Not priced, not
locked, not greyed, at any point in the game — `buyPlot()` on it answers "That is your first
plot. You will never need to buy it." The table's "Free" is not a discount to be spent; it is a
permanent property of that one plot. See DEC-040.

`PLOT_PRICES[0]` is consequently never charged, and buying begins at index 1.

### Which plot is next

`UNLOCK_ORDER` in `js/config/field.js` is the acquisition order: **sixteen entries indexed by
`ownedCount`**, index 0 being the starter's own slot. Exactly one plot is on offer at a time and
the other fourteen are `disabled` — DEC-036.

Zone A → B → C → D, `col` then `row` within each. **Read it against the id formula**, because
`id = row * 4 + col` means a zone is *not* a contiguous run of ids: zone A is `{0, 1, 4, 5}`, not
`{0, 1, 2, 3}`. An early draft got that wrong and offered a zone-B plot as the second purchase,
leaving a hole in the middle of the field.

```
index  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15
plot   0    4    1    5    2    6    3    7    8   12    9   13   10   14   11   15
zone   A    A    A    A    B    B    B    B    C    C    C    C    D    D    D    D
cost   —  100  200  400  800 1600 3200 6400 ...
```

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
farm into something a player returns to over months.

The free first plot is what makes the opening legible in a single move: 200 starting gold buys a
rice packet at 100, and six hours later that harvest pays 200 — which is the second plot at 100
*and* another packet. The freebie is not a discount, it is the tutorial.

### A note on pacing

Rice earns about 100 gold per planting after seed cost — 200 in, 200 out — and takes six hours to
grow. Buying all sixteen plots is therefore a very long haul at that rate — deliberately so, but
worth revisiting if playtesting shows the mid-game going quiet. Use `?fast=60` when you need to
*see* the loop rather than live it: a whole rice cycle in six minutes. Reachable-by estimates in
the table above assume a full farm earning at that rate, so a small farm is slower, not faster.

## Harvest and quality

```
units   = crop.yield
quality = plot.health / HEALTH.max          // 0..1, clamped
gold    = round(units * crop.sellPrice * quality)
```

A plot harvested at full health pays `10 * 20 * 1.0` = 200 gold on rice, against a 100 gold seed —
the 2× ratio described above. Quality is **averaged into the existing stack**, so selling part of a
pile and then harvesting more does not distort the average: `inventory.harvest[cropId]` carries
`units`, `qualitySum` and a derived `quality`.

Health is clamped to `[0, 1]` before it multiplies anything, so a hand-edited save cannot set
`health: 9999` and mint gold.

### The loop, end to end

1. **Buy a seed** in the shop — 100 gold for a rice packet, refused if you cannot pay.
2. **Click your free plot.** It opens the seed picker, listing only what is in your bag. An empty
   bag still opens the picker; it says so and offers the shop, because a click that silently did
   nothing would leave you unsure the plot was yours.
3. **Pick a seed.** It is spent and `plantedAt` is stamped. `rice_1.png` appears.
4. **Wait.** The sprite changes on the hour; a gold rim appears when it is actually ready.
5. **Click it.** Gold is added, the crop goes into the harvest bag, the plot empties, and the
   land is still yours.
6. **Click the plot on offer** — the one carrying a price tag — to buy it. The other fourteen
   are padlocked and `disabled`.

Health now moves, at the moment of sowing. `plant()` judges the crop against the **next six hours**
of forecast and writes the result to `plot.health` and `plot.forecast` — so a crop is born at
whatever quality the weather is about to inflict, and every harvest after that pays on it. See
`docs/weather-events.md` for the whole model.

**`js/domain/simulator.js` is empty and is meant to stay empty.** The judgement happens once rather
than on a timer, which is possible because every crop takes 4–8 hours to grow.

## Seasons

Each crop carries a `seasons` list naming the seasons that suit it. **Off-season is a soft penalty,
never a gate** — a flat 10 health, because a January player with only rice unlocked must still have
something to plant.

| Crop | Seasons it suits | Was, as a tooltip string |
| :--- | :--- | :--- |
| Rice | Monsoon, Summer | `'Rainy'` |
| Potato | Winter, Late Autumn, Autumn | `'Cool / Moist'` |
| Tomato | Summer, Spring | `'Warm / Mild'` |
| Wheat | Winter, Late Autumn, Spring | `'Cool / Dry'` |
| Corn | Summer, Monsoon, Spring | `'Warm / Sunny'` |

Those strings are gone. `"Rainy"` is not a season the game can produce — it is a climate word, and it
is what `cropWeatherMatrix.js` warns about when it keeps `likes` and `hates` apart from the
mechanical table. A second vocabulary claiming to be a season while `getSeason()` answers something
else is the same half-answered question.

**The names are retyped, not referenced.** `crops_logics/` may import nothing (see the
`crops_logics: []` row in `scripts/check-imports.mjs`), so a crop file cannot import the `SEASON`
constants. `tests/weatherPanel.test.js` asserts every name a crop uses is one a band can actually
produce, which is the only thing stopping a stray `'monsoon'` from leaving rice permanently out of
season with nothing to show for it.

**Seasons come from the player's latitude**, not the calendar month — see
`config/seasons.js` for the three bands. Only the tropical band has real suitability; temperate and
polar bands produce correct season *names* and leave crops neutral, rather than marking them with a
table nobody has thought through.

## Crop artwork

Crop sprites are drawn slightly taller than the ground tile (h/w 0.589 against 0.538). That is
intentional: plants stand proud of the soil. Do not stretch a crop layer to the tile's height, or
the plant is squashed and its tops clipped.

They are **scaled and lifted** onto the soil: `.plot__crop` sits at `width: 93%; bottom: 6.5%;
left: 50.5%` in `css/scene.css`, and `.plot__damage` repeats the same three numbers so the pair
cannot drift apart. Each crop sprite carries a whole soil diamond of its own, taller than the
tile's, so at full size the taller stages hang over the tile's front vertex — the lift gives that
back, and 93% is a uniform scale that keeps the plant's proportions. The numbers were tuned on the
running page; `tests/farmView.test.js` pins them and the damage layer's copy of them
(ISS-072, DEC-048).

### Growth stages and damage states

**Eight sprites per crop**: five growth stages, then three damage states. It was seven, and two
failure states, until ISS-092 split water damage away from drought death.

```
assets/images/crops/<cropId>/<cropId>_<stage>.png   stages 1 to 5
assets/images/crops/<cropId>/<cropId>_dry.png        left dry past the damage floor
assets/images/crops/<cropId>/<cropId>_waterlogged.png  left above the crop's target
assets/images/crops/<cropId>/<cropId>_dead.png       health reached 0
```

**`<stage>` is 1–5, not 1–7.** The damage states are named, not numbered — `cropFailureImg()`
builds the path from `damage.js`, which resolves exactly one of the three, with **dead** winning.

**Only one of those eight is ever drawn.** A damage state replaces the growth stage; it is not
layered over it. The damage art is a whole patch with its own soil diamond (DEC-048), so drawing
both leaves the healthy plant visible through the dead one. The damage word and the meters stay:
the crop is still alive and harvestable, just permanently damaged.

`rice_1.png` through `rice_5.png` exist, and so do rice's dry and waterlogged sprites
(`rice_drought_killed.png`, `rice_rain_damaged.png` — custom names, see `CUSTOM_FAILURE_NAMES` in
`js/config/assets.js`). **No crop has its `_dead` sprite yet.** Track the holes in
[`asset-checklist.md`](asset-checklist.md).

**Until a damage sprite exists the state is carried by a word, not an image.** `plotLayers.js`
draws `damageWord()` beside the sprite and the sprite is a hole until the art lands. That is
[DEC-014](team/decisions.md)'s rule and it is deliberate: **do not add a fallback layer.**

> **An earlier draft of this section described a CSS fallback and said it should stay permanently.**
> ```css
> filter: grayscale(1) brightness(.6);
> ```
> **That was never built, and building it was withdrawn.** A second way of showing the same thing
> is a second thing that can be wrong — and it would have contradicted the sprite the moment the
> sprite arrived.
