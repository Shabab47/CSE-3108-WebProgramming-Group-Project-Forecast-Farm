# Crop Choice Guide

Which crop to plant, given the season and the forecast.

Config lives in `js/config/seasons.js`, and the date maths in `js/utils/season.js`.

---

## Quick guide

| Season | Plant |
| :--- | :--- |
| Rainy | Rice |
| Cool + Dry | Wheat |
| Cool + Moist | Potato |
| Warm + Sunny | Corn |
| Warm + Steady Water | Tomato |

The season tells you what will grow well. The forecast tells you what will survive. Both matter:
the best seasonal crop planted into a frost is still a dead crop.

## Seasons by latitude

The model is approximate and config-driven, because a full climate model is out of scope.

**Tropical** — `|lat| < 23.5`:

| Months | Season |
| :--- | :--- |
| Mar – May | Hot |
| Jun – Oct | Rainy |
| Nov – Feb | Cool / Dry |

Dhaka, the default location, falls in this band.

**Otherwise** — four seasons by month, flipped for the southern hemisphere:

| Months | Northern | Southern |
| :--- | :--- | :--- |
| Dec – Feb | Cool | Summer |
| Mar – May | Warm | Autumn |
| Jun – Aug | Hot | Winter |
| Sep – Nov | Mild | Spring |

## Season details

| Season | Best crops | Watch out for |
| :--- | :--- | :--- |
| Rainy | Rice | Waterlogging; heavy rain damages everything except rice |
| Cool / Dry | Wheat | Frost is survivable; drought is not |
| Cool / Moist | Potato | Frost does real damage |
| Hot | Corn, Tomato | Drought; frost is not a risk |
| Warm / Sunny | Corn, Tomato | Strong wind lodging corn |
| Warm / Steady Water | Tomato | Heavy rain splits fruit |
| Mild | Wheat, Potato | Few risks; a safe planting window |

Each season carries a `bestCrops` hint rendered on the season card. It is advice, not a lock —
the player can plant anything they have seed for.

## How thirsty each crop is

The advice above says *"drought is not survivable"* and *"waterlogging; heavy rain damages
everything except rice"*. Since week 3 both of those are **numbers you can read off a plot**, which
is more use than a warning.

Each crop aims at a **target** derived from its water need, and is watered properly inside a band
at that target's bottom quarter. Two hours below the floor, or two hours above the target, and the
crop **latches damage** that never comes off.

| Crop | Target water | Playable | Cost to water from bone dry, full sun |
| :--- | ---: | :--- | ---: |
| Rice | **85** | yes | 17 gold · 51 min |
| Corn | **70** | no | 14 gold · 42 min |
| Wheat | **55** | no | 11 gold · 33 min |
| Potato | 55 | yes — 4-plot land gate | — |
| Tomato | 55 | yes — 8-plot land gate | — |

Measured from `minutesToOptimal(plot, 'clearSky')` on a plot at zero water, not scaled by hand.
Full sun is the worst case: the pump fills while the sun empties, so shade is cheaper and quicker.

**The line that changes a decision.** Rice wants 85 and wheat wants 55, so in the same weather a
rice plot can be reading *dry* while a wheat plot beside it is reading *optimal*. "It has not rained"
is not the same as "my crops are thirsty", and the per-plot gauge is how you tell them apart.

**Rain counts.** A storm fills every plot at `RAIN_WATER_PER_HOUR` for free, so a plot can climb
past its target and latch waterlogging damage without the pump running at all. Over-watering is
reachable without spending anything — which is what makes the pump's target worth knowing.

See `docs/crops.md` for the full band and `docs/weather-events.md` for the rates.

## Using the forecast

**A planting is judged once, by the next six hours, and the seed picker shows you the verdict
before you spend the seed.** Each row reads like `Next 6h: heavy rain · thrives · 100%`, and the
rating is spelled out in words rather than given as a number.

The season card answers "what usually works here". The picker line answers "what is about to happen
to this seed".

| If the next 6 h show... | Plant | Because |
| :--- | :--- | :--- |
| Rain | Rice | `heavyRain` is `content` for rice and `harmed` for wheat |
| Heat ≥ 38 °C with no rain | Wheat | `drought` is `harmed` for rice, `unhappy` for potato |
| Anything ≤ 2 °C, or snow | Wheat | the only crop that is not `harmed` by `frost` |
| Sustained wind ≥ 40 km/h | Potato, rice | corn and tomato take real damage |
| Humidity ≥ 85% | Rice, corn | blight hits potato and tomato |

A worked example. It is Autumn in Dhaka and the next six hours read `sunny`, `sunny`, `drought`,
`drought`, `drought`, `drought`. Rice suits the season and hates drought; the picker shows it
`harmed · 50%`, and a rice harvest on that plot pays 100 gold instead of 200. Wheat is out of its
own season by only 10 health and is merely `unhappy` in drought, so it shows `90%` and pays 180.
The seasonal advice says rice; the forecast says wheat. **The forecast wins**, because it is about
this planting rather than this year.

Note the window is **six hours, not twenty-four**, and it is the most severe hour that counts — one
frost hour among six ordinary ones still shows `frost`, because averaging it away would hide the
one fact the player is deciding on.

## Water

**This section describes what is planned, not what exists.** `plot.waterLevel` is set to 0 when a
plot is created and **nothing in the running game changes it** — there is no evaporation, no rain
watering, and no pump. That is T-09, still to do.

So the honest summary today is: weather affects a crop exactly once, at the moment of sowing, by
setting `plot.health` — and health is what the harvest is multiplied by. Rain is **not** yet free
water; a rainy forecast raises rice's rating but does not wet the field.

Once T-09 lands, the design below is what it is meant to satisfy: a crop's `waterNeed` scales
evaporation, dryness is a damage multiplier as well as a water source, and drought damage only
lands below 30 water — so a thirsty crop punishes you twice. See `docs/weather-events.md`.
