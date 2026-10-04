# Afif — Mutasim Afif (ID 13)

Game developer and game tester.

**Owns:** `js/services/`, `js/domain/weather.js`, `js/domain/notifications.js`,
`js/ui/weatherPanel.js`, `js/ui/envMetrics.js`
**Goals:** G-06 lead, G-07 lead

---

## Week of 5 Oct 2026

- [ ] Rewrite `js/services/weatherApi.js` to fetch Open-Meteo and return the parsed JSON
- [ ] Rewrite `js/services/timeApi.js` to return data instead of writing to the DOM
- [ ] Add `js/services/geocodeApi.js` — up to 5 results, `name / country / lat / lon / tz`
- [ ] Delete `js/services/map.js` and log the removal in `decisions.md` (already DEC-012)
- [ ] Save one real response to `data/sample-forecast.json`

## Verified API behaviour — use this, do not re-derive it

Checked live on 2026-10-04 against `api.open-meteo.com` and `geocoding-api.open-meteo.com`.

**Weather** response keys: `latitude`, `longitude`, `generationtime_ms`, `utc_offset_seconds`,
`timezone`, `timezone_abbreviation`, `elevation`, `current_units`, `current`, `hourly_units`,
`hourly`. `current` carries `time`, `interval`, `temperature_2m`, `relative_humidity_2m`,
`weather_code`, `wind_speed_10m`, `wind_direction_10m` — no rain probability and no UV, so both
come from the matching hourly entry.

**`hourly.time[0]` is local midnight, not now.** A response fetched at 12:15 had
`current.time = "2026-10-04T12:15"` and `hourly.time[0] = "2026-10-04T00:00"`, 48 entries for
`forecast_days=2`. `classify()` must compute a `startIndex` and slice 24 from there. This is
ISS-009 and it is the easiest mistake in the whole project to make.

**Geocoding** result keys: `id`, `name`, `latitude`, `longitude`, `elevation`, `feature_code`,
`country_code`, `timezone`, `population`, `country`, `admin1`…`admin4`. Use `admin1` to
disambiguate the result list — "Rajshahi, Rajshahi Division, Bangladesh" beats two identical
rows.

**An empty geocoding result omits the `results` key entirely** — the response is just
`{"generationtime_ms":0.44}`. So `data.results` is `undefined`, not `[]`, and
`if (!data.results.length)` throws. Guard with `Array.isArray`. This is ISS-012.

`utctime.app/api/now/{tz}` is still live and returns `datetime`, `timezone`, `abbreviation`,
`utc_offset_seconds`-equivalent fields. The fallback is real.

## Week of 12 Oct 2026

- [ ] `domain/weather.js` `classify()` with the `startIndex` rule and its WMO tests
- [ ] `ratingFor(plot, eventId)` with the drought `waterLevel < 30` conditional (ISS-015)
- [ ] `domain/notifications.js` `forProjection()` plus `state.notified` dedupe (ISS-013)
- [ ] `topBar` search, `weatherPanel`, `envMetrics`, sample fallback badge
- [ ] Test both live and offline paths — pull the network cable, not just trust the branch

## Notes

- Testing is your side of the split this sprint. The five test files in the plan are the real
  deliverable for G-07, not a nice-to-have.
- If a real response ever disagrees with `docs/weather-events.md`, log it in `issues.md` and
  update the doc. Do not patch around it in the parser.
