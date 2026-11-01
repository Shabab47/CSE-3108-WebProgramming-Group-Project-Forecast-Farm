# Afif — Mutasim Afif (ID 13)

Game developer and game tester. **8 non-merge commits**, almost all of them at the network edge of
the game — which is exactly where the interesting failures were.

**Owns:** the weather, time and geocoding services, the weather domain, the weather UI, and the
bug-report form.
**Goals:** G-06 lead, G-07 lead.

## What he shipped

**Week 1 — the base services.**
Added the first `getWeather` and current-time fetches: `js/services/weatherApi.js`,
`js/services/timeApi.js`, the geocoding call, and the endpoints and refresh timings in
`js/config/api.js`. `js/services/map.js`, a broken Leaflet leftover from the first sketch, was his and
was deleted rather than repaired (DEC-012).

**Week 2 — live weather on screen (T-11).**
Connected the forecast to the player's own location instead of a hardcoded city. That is the change
the whole premise rests on: the farm belongs to the place the player is standing in, and the
weather panel reads from it.

**Week 3 — place search (T-88, T-59).**
Made the location bar suggest places as the player types, and named the farm from its saved
coordinates instead of leaving the panel blank when the reverse lookup had no answer. Empty results
are handled as an empty list, not a crash — the `results` key is absent, not empty, when nothing
matches (ISS-012).

**Week 5 — bug reporting.**
Added the Web3Forms report form to the navbar: `js/ui/reportBug.js`, `js/services/reportApi.js`,
`js/config/feedback.js` and `css/report-bug.css`, with the access key kept as the public client key
Web3Forms expects.

**Testing.** Wrote the geocoding, location-bar, report-service and boot tests, and helped build the
fake-DOM helper the UI tests use. The API behaviours worth remembering are written down in
`docs/weather-events.md` and `docs/team/issues.md`: the Open-Meteo field keys, the
`hourly[0]`-is-local-midnight rule that forced `classify()` to compute a `startIndex` (ISS-009), and
the missing `results` key above.

## Open at ship

- **ISS-015** — the drought rating ignores how wet the plot already is, so a drought drains a
  waterlogged plot as if it were dry. The conditional is understood and located; it never landed.

## Where to look

`js/services/{weatherApi,geocodeApi,timeApi,reportApi}.js`, `js/config/{api,feedback,weatherEvents,cropWeatherMatrix}.js`,
`js/domain/weather.js`, `js/ui/{locationBar,weatherGlyph}.js`, `css/weather.css`,
`tests/{geocodeApi,locationBar,reportApi}*.test.js`.
