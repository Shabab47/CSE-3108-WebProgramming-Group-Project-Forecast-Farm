# Weather Events

The nine game events, how real weather data maps onto them, and what each one does to a crop.

Config lives in `js/config/weatherEvents.js` (events, thresholds, WMO groups) and
`js/config/cropWeatherMatrix.js` (ratings). The rules that read them live in
`js/domain/weather.js` (classification) and `js/domain/simulator.js` (per-tick effects).

---

## The nine events

| id | Label | Evaporation | Rain water / hour |
| :--- | :--- | ---: | ---: |
| `sunny` | Sunny | 1.5 | 0 |
| `cloudy` | Cloudy | 0.8 | 0 |
| `light-rain` | Light rain | 0 | 20 |
| `heavy-rain` | Heavy rain | 0 | 50 |
| `drought` | Drought | 3 | 0 |
| `frost` | Frost | 0.5 | 0 |
| `hail` | Hail | 0.8 | 5 |
| `strong-wind` | Strong wind | 1.5 | 0 |
| `high-humidity` | High humidity | 0.5 | 0 |

Evaporation is a multiplier on `WATER.baseDecayPerHour`. Rain water is added directly to every
owned plot. These two columns are the whole water economy — see the balance note at the bottom.

Icons live at `assets/icons/weather/<id>.svg`. All nine files are currently 0 bytes, so icons
render broken until art lands. The label text carries the meaning in the meantime.

## Classification

`domain/weather.js classify()` walks this list and **the first match wins**. Thresholds live in
`config/weatherEvents.js`, not in `weather.js`.

| # | Condition | Event |
| ---: | :--- | :--- |
| 1 | WMO code 96 or 99 | `hail` |
| 2 | temp ≤ 2 °C, or code in 66, 67, 71–77, 85, 86 | `frost` |
| 3 | temp ≥ 38 °C and rain probability < 20 | `drought` |
| 4 | wind ≥ 40 km/h | `strong-wind` |
| 5 | code in 63, 65, 81, 82, 95 | `heavy-rain` |
| 6 | code in 51, 53, 55, 56, 57, 61, 80 | `light-rain` |
| 7 | code in 45, 48, or humidity ≥ 85 | `high-humidity` |
| 8 | code 0, 1 → `sunny`; code 2, 3 → `cloudy` | `sunny` / `cloudy` |

Order matters and is not arbitrary. Hail beats frost because thunderstorm hail often carries a
cold reading. Frost beats drought because a freezing night and a heatwave never overlap, and
frost is the more dangerous of the two. `high-humidity` sits below the rain checks on purpose:
a foggy 90%-humidity morning should read as humidity, not as rain.

Unmatched codes fall through to `cloudy`. That is the safe default — it neither waters crops nor
damages them.

### Finding the current hour

`hourly.time[0]` in a raw Open-Meteo response is **local midnight**, not the current hour. A
response fetched at 12:15 has `current.time = "2026-10-04T12:15"` and
`hourly.time[0] = "2026-10-04T00:00"`. So `classify()` must compute a `startIndex` by comparing
`current.time` against the hourly timestamps, then slice 24 entries from there.

Everything downstream assumes this: `state.weather.hourly[0]` is the current hour, which is what
`simulator.tick` reads and what the forecast strip renders first. See ISS-009.

## Effects on crops

Per-hour health change comes from a rating:

| Rating | Health / hour |
| :--- | ---: |
| `thrives` | +1 |
| `good` | 0 |
| `ok` | 0 |
| `risk` | −3 |
| `damage` | −8 |
| `severe` | −30 |

### The matrix

| Event | Rice | Wheat | Potato | Corn | Tomato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sunny` | ok | good | ok | thrives | thrives |
| `cloudy` | ok | good | good | ok | ok |
| `light-rain` | thrives | good | good | good | good |
| `heavy-rain` | ok | damage | damage | damage | damage |
| `drought` * | severe | risk | risk | damage | risk |
| `frost` | severe | ok | damage | severe | severe |
| `hail` | risk | risk | risk | severe | severe |
| `strong-wind` | ok | risk | ok | damage | risk |
| `high-humidity` | ok | risk | damage | risk | damage |

\* **The drought row is conditional.** It only applies when the plot's `waterLevel < 30`.
At 30 or above, treat it as `ok`. This is the one rule in the game that makes the pump worth
gold, and it is the reason the pump exists at all.

Because a matrix cell can only hold one rating, this conditional cannot live in
`cropWeatherMatrix.js`. It goes in an exported `ratingFor(plot, eventId)` helper in
`domain/`, which `simulator.tick` and the tests both call. See ISS-015.

### Dry drain and death

- Any plot at `waterLevel == 0` loses a further `HEALTH.dryDrainPerHour` (5) on top of the
  matrix rating, whether or not a crop is planted.
- Health 0 marks the crop `dead`. Dead crops render with `filter: grayscale(1) brightness(.6)`
  until failure sprites exist.
- A dead crop can be neither harvested nor replanted. `farm.clearPlot()` clears it for free.
  Without that action a dead crop bricks its plot permanently — see ISS-006.

### Frost is a drain, not an instant kill

The README says frost *kills* warm-season crops. In the MVP there is no frost-cover action, so
`severe` frost is implemented as −30 health per hour instead: about 3.3 hours from full health
to dead. This is a deliberate softening so an unattended farm is not wiped out by one cold
night. When the cover mechanic lands, revisit the `severe` value.

## Worked examples

Rice, full health, 6-hour grow time:

| Situation | Health / hour | Time to dead |
| :--- | ---: | ---: |
| `sunny`, soil at 60 water | 0 | never |
| `drought`, soil at 40 water | 0 (conditional → `ok`) | never |
| `drought`, soil at 20 water | −30 − 5 dry | ~2.9 h |
| `frost` | −30 | ~3.3 h |
| `light-rain` | +1 | never |

Wheat is the hardier option: `frost` is `ok` and `heavy-rain` is `damage`, not `severe`.

---

## Data source

`js/services/weatherApi.js` calls Open-Meteo (no API key):

```
current = temperature_2m, relative_humidity_2m, weather_code, wind_speed_10m, wind_direction_10m
hourly  = temperature_2m, relative_humidity_2m, precipitation_probability, weather_code,
          wind_speed_10m, wind_direction_10m, uv_index
forecast_days = 2, timezone = auto
```

Response times are already local to the place, and the response carries `timezone` and
`utc_offset_seconds` for the local clock. `js/services/timeApi.js` is used only when those are
missing.

`classify()` returns the game-facing shape:

```js
{
  current: { temp, humidity, wind, windDir, rainProb, uv, event },
  hourly:  [ { time, temp, rainProb, event }, ... ]   // 24 entries from the current hour
}
```

Current rain probability and UV come from the hourly entry matching the current hour, since
`current` does not carry them.

## Balance note — unresolved

`WATER.pumpPerSecond` is 0.5, so the pump fills a plot from 0 to 100 in 200 seconds for about
10 gold across the field. Heavy rain adds 50/h, so rain needs 2 hours to do the same job, for
free. The pump is roughly 36× stronger than the weather it exists to compensate for, which
flattens most of the decisions in this document: `waterLevel` pins at 100, the `wateredThreshold`
of 40 is always met, and the drought conditional at 30 never fires while the pump runs.

This is placeholder balance (README assumption 4), not a design intent, but it should be settled
before the water meter in Phase 2 step 9 is built on top of it. Lowering `pumpPerSecond` to
around 0.05 turns the pump into a top-up tool and lets forecast-driven watering matter. Tracked
as ISS-008.
