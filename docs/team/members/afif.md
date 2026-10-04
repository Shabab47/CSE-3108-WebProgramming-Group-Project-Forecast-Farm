# Afif — Mutasim Afif (ID 13)

Game developer and game tester.

**Owns:** `js/services/`, `js/domain/weather.js`, `js/domain/notifications.js`,
`js/ui/weatherPanel.js`, `js/ui/envMetrics.js`
**Goals:** G-06 lead, G-07 lead

**Week 1 contribution:** added the base APIs — weather, time and place lookup. Reverse geocoding
is the one still outstanding.

---

## Week 1

- [x] Base weather API added
- [x] Base time API added — fallback clock only
- [x] Base place lookup (geocoding) added
- [ ] **Reverse geocoding not added** — turning the player's coordinates into a place name is
      still outstanding, carried to week 2
- [ ] Rewrite `weatherApi` and `timeApi` to return plain data instead of writing to the DOM
- [ ] Delete `js/services/map.js` — broken Leaflet code, references an undefined `map` global and
      calls `alert()`. The decision to remove it is already logged as DEC-012
- [ ] Save one real response to `data/sample-forecast.json`

## Verified API behaviour — use this, do not re-derive it

Checked live against `api.open-meteo.com` and `geocoding-api.open-meteo.com`.

**Weather** response keys: `latitude`, `longitude`, `generationtime_ms`, `utc_offset_seconds`,
`timezone`, `timezone_abbreviation`, `elevation`, `current_units`, `current`, `hourly_units`,
`hourly`. `current` carries `time`, `interval`, `temperature_2m`, `relative_humidity_2m`,
`weather_code`, `wind_speed_10m`, `wind_direction_10m` — no rain probability and no UV, so both
come from the matching hourly entry.

**`hourly.time[0]` is local midnight, not now.** A response fetched at 12:15 had
`current.time` at 12:15 and `hourly.time[0]` at 00:00, 48 entries for `forecast_days=2`.
`classify()` must compute a `startIndex` and slice 24 from there. This is ISS-009 and it is the
easiest mistake in the whole project to make.

**Geocoding** result keys: `id`, `name`, `latitude`, `longitude`, `elevation`, `feature_code`,
`country_code`, `timezone`, `population`, `country`, `admin1`…`admin4`. Use `admin1` to
disambiguate the result list — "Rajshahi, Rajshahi Division, Bangladesh" beats two identical
rows.

**An empty geocoding result omits the `results` key entirely** — the response is just
`{"generationtime_ms":0.44}`. So `data.results` is `undefined`, not `[]`, and
`if (!data.results.length)` throws. Guard with `Array.isArray`. This is ISS-012.

`utctime.app/api/now/{tz}` is still live and returns `datetime`, `timezone` and `abbreviation`.
The fallback is real.

**Geocoding is search-only.** It turns a place name into coordinates, not the other way round.
Resolving the player's own coordinates to a place name needs a separate reverse-geocoding
service. That is the outstanding item above.

## Week 2

- [ ] Rewrite the services to return plain data; add reverse geocoding
- [ ] `domain/weather.js` `classify()` with the `startIndex` rule and its WMO tests
- [ ] `ratingFor(plot, eventId)` with the drought `waterLevel < 30` conditional (ISS-015)

## Week 4

- [ ] Weather panel wired into the running game — `topBar` search, `weatherPanel`, `envMetrics`
- [ ] Sample fallback badge, and a saved response in `data/sample-forecast.json`
- [ ] Simulator effects: matrix, dry drain, death, rain water and evaporation
- [ ] `domain/notifications.js` `forProjection()` plus `state.notified` dedupe (ISS-013)
- [ ] Test both live and offline paths — pull the network cable, not just trust the branch

## Notes

- Testing is your side of the split this sprint. The five test files in the plan are the real
  deliverable for G-07, not a nice-to-have.
- If a real response ever disagrees with `docs/weather-events.md`, log it in `issues.md` and
  update the doc. Do not patch around it in the parser.