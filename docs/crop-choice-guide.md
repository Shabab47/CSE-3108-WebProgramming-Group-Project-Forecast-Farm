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

## Using the forecast

The season card answers "what usually works here". The forecast strip answers "what is happening
in the next 24 hours". Read both before planting.

| If the forecast shows... | Plant | Because |
| :--- | :--- | :--- |
| Rain within 24 h | Rice | thrives, and rain is free water |
| Rain, then heat | Rice, then wheat | rice now, wheat after the rain window |
| Heat ≥ 38 °C, no rain | Wheat | `drought` is only `risk` for wheat, `severe` for rice |
| Cold snap ≤ 2 °C | Wheat | the only crop that is `ok` in frost |
| Sustained wind ≥ 40 km/h | Potato, rice | corn and tomato take real damage |
| Humidity ≥ 85% | Rice, corn | blight hits potato and tomato |

A worked example. It is a Hot season in Dhaka and the next 24 h read `sunny`, `sunny`,
`drought`, `drought`. Rice is the season's best crop and takes `severe` damage in drought,
which at −30/h plus dry drain kills a full-health plant in under three hours. Wheat is only
`risk` in drought and is `ok` in sun. The seasonal advice says rice; the forecast says wheat.
The forecast wins, because it is about this week rather than this season.

## Water

A crop's `waterNeed` scales evaporation, so a thirsty crop in a dry spell needs the pump more
often. Rice at 0.9 loses 21.6/h under `drought` evaporation; wheat at 0.5 loses 12/h.

Dryness is also a damage multiplier, not just a water source: any plot at `waterLevel == 0`
takes an extra `HEALTH.dryDrainPerHour`, and drought damage only lands below 30 water. A
thirsty crop punishes you twice — see `docs/weather-events.md`.
