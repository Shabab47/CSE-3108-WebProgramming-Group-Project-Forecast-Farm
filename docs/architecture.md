# Architecture

How Forecast Farm is put together, and where to change things.

Stack: vanilla JS ES modules, plain CSS, DOM `<img>` layers. No framework, no bundler,
no runtime dependencies. `package.json` exists only for scripts.

---

## Layers

| Folder | May import from | Never contains |
| :--- | :--- | :--- |
| `js/config/` | nothing | logic, DOM, fetch |
| `js/utils/` | `config` | DOM (except `utils/dom.js`), fetch |
| `js/state/` | `config`, `utils` | DOM, fetch, game rules |
| `js/domain/` | `config`, `utils`, `state/types` | DOM, fetch, `store.js` internals |
| `js/services/` | `config`, `utils` | DOM |
| `js/ui/` | `config`, `utils`, `domain`, `state` | `fetch`, game rules, service calls |
| `js/debug/` | anything | — |
| `js/main.js` | anything | — |

Three rules the layering depends on:

1. **Only `js/services/` calls `fetch`.** Includes reading `data/sample-forecast.json`.
2. **Only `js/ui/`, `js/debug/` and `js/main.js` touch the DOM.** `utils/dom.js` is the one
   exception, and `scripts/check-imports.mjs` whitelists it explicitly.
3. **`js/main.js` is the only module that imports `js/services/`.** UI modules never import
   a service. `main.js` passes callbacks in through `mountX(root, actions)`.

## Data flow

```
services (fetch)  →  main.js  →  store.apply  →  domain (pure rules)  →  store  →  ui (render)
```

- Services return plain parsed data. They never classify, never store.
- `main.js` owns wiring: it decides when to fetch, and passes results into the store.
- Domain functions are pure: `(state, ...args) => { ok: true, state } | { ok: false, reason }`.
  They never mutate the state they receive.
- `store.apply(fn, ...args)` is the only thing that writes state. On `ok: false` it emits a
  `toast` event carrying `reason`.
- UI subscribes to the store and re-renders its own subtree only.

## Boot order

`js/main.js`, in this order:

0. **Resolve the session.** `resolveSession()` asks the provider for a stored
   session, then falls back to a guest session when the URL carries `?guest=1`.
   No session at all → `location.replace('login.html')` and **return**. The game
   is never mounted for a signed-out visitor, so there is no flash of farm UI.
1. `store.init(session)` — loads `forecastFarm.save.v1:<userId>`, or builds
   `initialState(session)`. Either way the live session goes into state.
2. Preload images (rice stages + both ground tiles + base + pump).
3. Mount UI: topBar, sidebar, seasonCard, weatherPanel, farmView, hud, buttonBar,
   meters, envMetrics, toastStack.
4. Fetch weather for `state.location`, or the sample fallback. Repeat every `REFRESH_MS`.
5. Start the simulator interval (`TICK_MS`) and the autosave interval (`AUTOSAVE_MS`).
6. If `?debug=1`, mount the debug panel.

Step 0 is new, added with login. It is why `login.html` is a separate page rather
than an overlay: the shell must not render before auth. `js/auth-main.js` is the
mirror image — it redirects *to* the game when a session already exists, so
neither page can bounce the visitor back and forth.

---

## Accounts

Two pages, and login comes first.

```
login.html ──► js/auth-main.js ──► js/ui/loginPanel.js ──┐
                   │  injects signIn/signUp/signOut    │
                   │  as actions                       ▼
                   └────────────────────────► js/services/authApi.js   (Supabase REST, fetch)

index.html ──► js/main.js ──► boot 0: resolveSession()
                              │ no session → login.html, game never mounts
                              ▼
                        js/state/store.js ──► forecastFarm.save.v1:<userId>
```

### The panel contract

`js/ui/loginPanel.js` never imports a service and never names a provider. Every
outside call arrives through `actions`:

| Action | Returns | The panel handles |
| :--- | :--- | :--- |
| `currentSession()` | `session \| null` | whether to render the form at all |
| `signIn({email, password})` | `Promise<{ok:true, session} \| {ok:false, reason}>` | spinner, then route on |
| `signUp({email, password, farmerName})` | same, or `{ok:true, session:null, needsConfirmation:true}` | spinner, then route on |
| `signOut()` | `Promise<{ok:true}>` | — |
| `onAuthenticated(session \| null)` | — | routing; **`null` means awaiting email confirmation** |
| `onGuest()` | — | guest play |
| `onForgotPassword()` | — | opens the reset flow |
| `notice` | `string \| undefined` | a sentence to show on arrival, styled as info |

**`onAuthenticated(null)` is not an error.** Sign-up can succeed without issuing
a session, because GoTrue emails a confirmation link first. The panel clears the
password fields and hands over `null`; `auth-main.js` shows the confirmation
sentence and stays on the form. See `CONFIRM_EMAIL` in `ui/authErrors.js`.

Swapping the provider changes `auth-main.js` and one import. No file in `js/ui/`
moves. That is the whole reason for the split. In practice the switch is the
`USE_LOCAL_PROVIDER` constant in `js/auth-main.js` — see DEC-020.

### Password reset

A three-step flow in `js/ui/passwordReset.js`, because a reset is inherently a
round trip through the player's inbox:

```
request  enter an address ─► POST /auth/v1/recover ─► email a link
sent     told to check the inbox, no address field any more
set      back from the link ─► PUT /auth/v1/user ─► new password, then back to sign-in
```

The recovery link returns to `login.html#access_token=…`. The fragment is read
**once**, in `auth-main.js`, and then cleared from the address bar with
`history.replaceState` so the token cannot be copied from a screenshot. Fragments
never reach a server, which is why it is safe to read there at all.

`requestPasswordReset` **always reports success**, even for an address with no
account, and the panel shows the same confirmation either way. A reset form that
says "no such account" is the same enumeration oracle as the sign-in form
(DEC-019). Rate-limit failures are the one thing it does surface, because those
say nothing about whether the address is registered.

This flow cannot complete without a configured project and an allowed redirect
URL — see ISS-031 and ISS-032.

### Two panels that never talk

`js/ui/authErrors.js` is a pure function, `authErrorToMessage(reason, context)`.
It is the only place provider error codes become sentences, and it is the only
place that decides **which** sentence. Keeping it out of the panel means:

- it is unit-testable with no DOM (`tests/authErrors.test.js`), which is most of
  what makes `npm test` useful here;
- provider codes never reach render code;
- **account enumeration is prevented in one place.** Every reason that would
  reveal whether an email is registered — wrong password, no such account, not
  confirmed — collapses to one neutral sentence on the sign-in path. The same
  reason on the sign-up path may be specific, because the player just typed that
  address. `ENUMERATION_SENSITIVE` lists them, and a test asserts every entry is
  neutralised, so adding a new provider code cannot quietly widen the oracle.

### Session shape and the state field

```js
session = { status: 'authed' | 'guest', userId, email, farmerName } | null
```

`state.session` is part of the game state, so `store.js` persists it with
everything else. Two decisions worth knowing:

- **A resumed save takes the live session, not the one it was saved with.** A save
  can be days old; its session may be a guest session, or a user who has since
  signed out. The live session is authoritative, or signing out and back in
  resurrects the old identity.
- **`normaliseSession()`** drops anything unrecognisable to `null`. The boot gate
  reads this field, so a hand-edited or pre-auth save must not be able to put junk
  in front of it.

A guest session is deliberately **not** written to storage. It arrives as
`?guest=1` and the guest's save is keyed `…:guest`, so a guest farm cannot be
resumed by anyone else on the machine, and reload without the query returns to
login.

### Storage keys

| Key | Written by | Holds |
| :--- | :--- | :--- |
| `forecastFarm.save.v1:<userId>` | `state/store.js` | that user's game save, session included |
| `forecastFarm.debug` | read only | `1` turns on verbose logging |
| *(provider-owned)* | `services/authApi.js` | Supabase session and refresh token |

`js/services/localAuth.js` is a **stopgap**, not the real provider. It exists so
the panel has something to run against before `authApi.js` lands, implements the
identical contract, and writes its own `forecastFarm.accounts.v1` /
`.session.v1` keys. Delete it and change one import when the real one is ready.
Its second-writer violation of the storage rule is logged as ISS-027.

### Which provider runs

`js/auth-main.js` holds `const USE_LOCAL_PROVIDER = true`. Set it to `false` and
the Supabase provider loads by dynamic `import()`; leave it and the local one runs
(DEC-020). It is currently `true` because `js/config/supabase.js` has an empty URL
and anon key, and `authApi.js` refuses to call out rather than posting credentials
at a URL that does not exist. So switching providers is **one line each** in two
files, once Shabab has created the project (ISS-028, ISS-032).

The Supabase provider is split so each part has one job:

| Module | Job |
| :--- | :--- |
| `services/authApi.js` | the game's view of an account: shapes sessions, decides which failures may differ |
| `services/gotrue.js` | the HTTP transport and GoTrue error → reason mapping. Knows nothing about farms or passwords |
| `services/tokenStore.js` | the only place a token is written to storage |

The **access token is never persisted** — it lives in memory only. Just the refresh
token is stored, so a reload can restore silently, and a token in `localStorage` is
readable by any script on the origin.

---

<a id="saving-a-farm"></a>

## Saving a farm, and moving it

Three separate things, easy to confuse:

| | Where it lives | What it is for |
| :--- | :--- | :--- |
| **Autosave** | `localStorage`, every 10 s | the game remembering itself between visits |
| **Export** | a `.farm` file the player keeps | backup, and moving to another computer |
| **Import** | reads that file back | restoring, or starting over from someone else's farm |

`state/transfer.js` owns the file format and is **pure** — no storage, no DOM, and
`Date.now()` is passed in. `ui/savePanel.js` owns the browser half (`Blob`,
`createObjectURL`, `<input type="file">`), because those are DOM APIs and the
layering rules keep them in `js/ui/`. `main.js` is the only module that joins them,
through `mountSavePanel(root, actions)`.

### The file

```
forecast-farm-2026-10-06.farm
FFARM/1
{ "format": …, "version": 1, "exportedAt": …, "owner": {…}, "checksum": "…", "state": {…} }
```

- **The header is what identifies the file, not the extension.** `.farm` is a common
  extension for other farming games, so the importer never trusts the name. Double-clicking
  a `.farm` does nothing, by design — there is no installed app to handle it.
- **No player name in the filename.** Filenames leak into cloud-sync listings, backup catalogues
  and screenshots. The name is inside the file, in `owner.farmerName`.
- **The file is not encrypted and not signed.** The checksum catches corruption and
  catches a hand-edited file — but anyone who reads `js/utils/checksum.js` can
  recompute it. `verifySignature()` is the seam where a server-held key goes, once
  there is a server. Full analysis at the bottom of `state/transfer.js`, plus a test
  that performs the whole attack and asserts it succeeds, so nobody later believes
  the file is tamper-proof. See DEC-021.

### Import asks before it overwrites

`store.readImport()` parses and checks; `store.adoptState()` writes. They are
separate on purpose. The panel shows whose farm the file holds and how old it is,
and only writes on confirm — someone opening this panel has usually already had
something go wrong, so replacing a farm unasked is the worst available outcome.

An import **rebases the clocks forward** by the age of the file, because growth is
computed from `plantedAt` and keeps running while the tab is closed. Importing a
three-week-old file without that would arrive with every crop finished or dead.
`lastTickAt`, `plantedAt`, `createdAt` and `weather.fetchedAt` all move;
`notified` deliberately does not, because its windows have expired and re-firing the
alerts once is correct (ISS-013).

**Adopting a state is not `apply()`.** `apply()` takes a pure domain function, and
an imported file is not one. `adoptState()` is its own path, and it re-stamps the
**live** session — a file carries the session it was exported with, and adopting that
verbatim would let a file put a stale identity into state.

---

## Where do I find...?

| I want to change... | Open |
| :--- | :--- |
| plot prices, grid size, spacing | `js/config/field.js` |
| crop times, prices, water need | `js/config/crops.js` |
| an image path | `js/config/assets.js` |
| password rules, hashing cost, storage keys | `js/config/auth.js` |
| Supabase project URL and anon key | `js/config/supabase.js` — **anon key only, never `service_role`** |
| which provider the login page runs | `USE_LOCAL_PROVIDER` in `js/auth-main.js` |
| how weather maps to game events | `js/config/weatherEvents.js`, `js/domain/weather.js` |
| what weather does to crops | `js/config/cropWeatherMatrix.js`, `js/domain/simulator.js` |
| pump cost / water speed | `js/config/game.js` |
| plant / harvest / clear rules | `js/domain/farm.js` |
| buying land | `js/domain/plots.js` |
| seeds, harvest, selling | `js/domain/inventory.js` |
| gold maths | `js/domain/wallet.js` |
| forecast → alert strings | `js/domain/notifications.js` |
| what counts as a valid email or password | `js/domain/authRules.js` |
| provider error code → player-facing sentence | `js/ui/authErrors.js` |
| which sign-in failures must look identical | `js/ui/authErrors.js` (`ENUMERATION_SENSITIVE`) |
| the sign-in / sign-up form and its states | `js/ui/loginPanel.js` |
| the labelled inputs the form is built from | `js/ui/loginFields.js` |
| the forgot-password flow | `js/ui/passwordReset.js` |
| the auth provider call (Supabase) | `js/services/authApi.js` |
| the temporary local provider | `js/services/localAuth.js` |
| boot step 0, the session gate | `js/main.js` (`resolveSession`) |
| field drawing / click bugs | `js/ui/farmView.js`, `js/ui/plotTile.js`, `js/utils/iso.js`, `css/field.css` |
| page layout | `css/layout.css`, `index.html` |
| login page layout | `css/auth.css`, `login.html` |
| colours, radii, spacing | `css/variables.css` |
| card and button styling | `css/components.css` |
| top bar buttons | `js/config/ui.js` |
| API calls | `js/services/*` |
| save / load | `js/state/store.js`, `js/state/saveFile.js` |
| the export file format, checksum, rebase | `js/state/transfer.js` |
| the export / import buttons | `js/ui/savePanel.js` |
| which provider the login page runs | `USE_LOCAL_PROVIDER` in `js/auth-main.js` |
| the state shape | `js/state/types.js`, `js/state/initialState.js` |
| debug sliders and cheat buttons | `js/debug/debug.js` |


---

## Project structure

This is the repo **as it stands**, not the finished shape. It moves, so treat it as a snapshot.

```
.
├── index.html                  the game page — app shell, 3 grid columns
├── login.html                  the sign-in / sign-up page
├── almanac.html                empty — placeholder page
├── LICENSE                     MIT
├── README.md
├── package.json                scripts only, no dependencies
│
├── css/
│   ├── reset.css               baseline
│   ├── layout.css              the 3-area CSS grid, plus the top bar
│   ├── variables.css           all colours, radii, spacing
│   ├── themes.css              dark and high-contrast token overrides
│   ├── components.css          cards, buttons, inputs, meters, toasts
│   ├── auth.css                the login card
│   └── field.css               planned — isometric stage and plot layers
│
├── data/
│   └── sample-forecast.json    empty — one real Open-Meteo response, for offline dev
│
├── js/
│   ├── main.js                 boot order, boot 0 is the session gate
│   ├── auth-main.js            the login page entry, wires panel to provider
│   ├── config/                 pure data, imports nothing
│   │   ├── auth.js             storage keys, password policy, PBKDF2 cost
│   │   ├── supabase.js         project URL + anon key (EMPTY until ISS-032)
│   │   ├── api.js              URLs, default location, refresh interval
│   │   ├── field.js            FIELD geometry, ZONES, PLOT_PRICES
│   │   ├── game.js             START_GOLD, PUMP, WATER, HEALTH, timings
│   │   ├── crops.js            empty
│   │   ├── cropWeatherMatrix.js empty
│   │   ├── seasons.js          empty
│   │   └── weatherEvents.js    empty
│   ├── domain/                 game rules — no DOM, no fetch
│   │   ├── authRules.js        what counts as a valid email or password
│   │   ├── farm.js             empty
│   │   ├── notifications.js    empty
│   │   ├── simulator.js        empty
│   │   └── weather.js          empty
│   ├── services/               the only place that calls fetch
│   │   ├── authApi.js          Supabase REST provider — written, but refuses to
│   │   │                       call out until the project URL and key exist
│   │   ├── gotrue.js           the GoTrue transport and error mapping
│   │   ├── tokenStore.js       the only place a token is written to storage
│   │   ├── localAuth.js        TEMPORARY local provider, same contract
│   │   ├── map.js              DELETE — Nominatim + Leaflet, references an
│   │   │                       undefined `map` global and calls alert()
│   │   ├── timeApi.js          rewrites — writes straight into the DOM
│   │   └── weatherApi.js       rewrites — OpenWeatherMap placeholder key
│   ├── ui/                     render only, reads the store
│   │   ├── almanac.js          empty
│   │   ├── authErrors.js       provider code → sentence, enumeration guard
│   │   ├── cropPicker.js       empty
│   │   ├── farmView.js         empty
│   │   ├── loginFields.js      labelled input builders
│   │   ├── loginPanel.js       the sign-in / sign-up form and its states
│   │   ├── passwordReset.js    forgot-password: request, sent, set
│   │   ├── toastStack.js       transient messages
│   │   ├── topBar.js           logo, farmer name, sign-out
│   │   └── weatherPanel.js     empty
│   ├── utils/
│   │   ├── dom.js              the only whitelisted DOM access
│   │   ├── log.js              scoped logger, `[scope] message`
│   │   ├── normalize.js        email and display-name normalisation
│   │   ├── date.js             empty
│   │   └── season.js           empty
│   ├── state/
│   │   ├── initialState.js     builds a fresh farm: 200 gold, 16 plots
│   │   ├── store.js            getState, apply, subscribe, bus, save/load
│   │   └── types.js            planned — JSDoc @typedef for State
│   └── debug/                  planned — the ?debug=1 panel
│
├── assets/
│   ├── icons/
│   │   ├── favicon.svg
│   │   ├── crops/              5 SVGs — all 0 bytes, art pending
│   │   └── weather/            9 SVGs — all 0 bytes, art pending
│   ├── images/
│   │   ├── base.png            the slab under the field
│   │   ├── pump.png            moves to pump/pump.png
│   │   ├── crops/
│   │   │   ├── rice/           rice_1.png … rice_5.png — the only playable crop
│   │   │   ├── wheat/          empty — awaiting art
│   │   │   ├── potato/         empty — awaiting art
│   │   │   ├── corn/           empty — awaiting art
│   │   │   └── tomato/         empty — awaiting art
│   │   └── ground/
│   │       ├── ground_watered.png
│   │       └── ground_unwatered.png
│   └── sounds/                 3 MP3s, all 0 bytes — out of scope
│
├── scripts/
│   ├── dev-server.mjs          static server for npm run dev
│   └── check-imports.mjs       layering rules for npm run check
│
├── tests/                      node:test, pure code only
│   ├── authApi.test.js         Supabase provider, fetch stubbed, no credentials
│   ├── authErrors.test.js      error mapping, account enumeration
│   ├── authRules.test.js       validation rules
│   ├── initialState.test.js    fresh farm, zones, session coercion
│   ├── localAuth.test.js       the stopgap provider's contract
│   └── store.test.js           persistence, save migration, corruption
│
└── docs/
    ├── architecture.md         layers, data flow, boot order, accounts
    ├── crops.md                crop numbers, stages, harvest maths
    ├── weather-events.md       the 9 events, classification, effects
    ├── notifications.md        crop alerts and dedupe
    ├── crop-choice-guide.md    season → crop, using the forecast
    ├── game-design/
    │   └── implementation-plan.md
    ├── reference/              field render, layout wireframe, style mockup
    └── team/                   goals, tasks, ownership, issues, decisions, members
```

---

## Conventions

- Max ~200 lines per file. Past that, split by responsibility.
- Every module logs through `utils/log.js` with its own scope name.
  Error messages start with `[scope]`.
- Existing source files use CRLF. Do not mass-convert. New files may use LF.
- Event handlers are attached in JS. No inline handlers in HTML.
- Plot elements carry `data-plot-id`.
- Only `store.js` writes game saves, always inside try/catch.
- Save key: `forecastFarm.save.v1:<userId>` — per user, not one global key.
- Session lives in `state.session`; `store.js` persists it with the save.
- Auth provider calls live in `js/services/authApi.js`. Never in `js/ui/`.

## Module contracts

| Module | Exports | Notes |
| :--- | :--- | :--- |
| `state/store.js` | `getState`, `apply`, `subscribe`, `on`, `emit`, `save`, `saveNow`, `load`, `init`, `reset`, `clearSave`, `adoptState`, `exportPayload`, `readImport` | `subscribe` returns an unsubscribe fn |
| `state/saveFile.js` | `saveKey`, `writeSave`, `readSave`, `deleteSave` | the only writer of game saves |
| `state/transfer.js` | `exportToText`, `exportFilename`, `readExport`, `rebaseState`, `importFromText`, `verifySignature`, `SAVE_EXTENSION` | pure; the caller passes `now` |
| `utils/checksum.js` | `checksum`, `checksumsMatch` | FNV-1a. Detects damage, **not** tampering |
| `services/authApi.js` | `signIn`, `signUp`, `signOut`, `currentSession`, `requestPasswordReset`, `updatePassword`, `restoreSession` | same contract as `localAuth.js` |
| `services/gotrue.js` | `post`, `postAuthed`, `bestEffort`, `reasonFor` | transport only; never throws |
| `services/tokenStore.js` | `readRefreshToken`, `writeRefreshToken` | the only writer of a token |
| `utils/log.js` | `createLog(scope)` | returns `{ info, warn, error }` |
| `utils/iso.js` | `plotToScreen`, `diamondClipPath` | all sizes are fractions of the stage |
| `ui/*` | `mountX(rootEl, actions)` | returns `unmount()` |
| `domain/*` | pure `(state, ...args)` functions | return `{ ok, state }` or `{ ok: false, reason }` |

`farm.stageOf` and `farm.isReady` are pure selectors, so UI calls them directly.
Everything that mutates goes through `store.apply` — **except** adopting an imported
save, which is not a domain function and gets its own `adoptState`.

---

## Field geometry

The stage is `.field-stage { position: relative; aspect-ratio: 1; width: min(100%, 720px) }`.
Every layer inside it is absolutely positioned and sized in `%` of the stage, so the whole
field scales with the container and needs no resize handling.

```
n = FIELD.size
shift(i)  = (i - (n-1)/2) * (1 + gap) + (i >= n/2 ? crossGap/2 : -crossGap/2)
u = shift(col);  v = shift(row)

centerX = originX + (u - v) * tileScale / 2
centerY = originY + (u + v) * tileScale * tileAspect / 2

img left = centerX - tileScale/2      (fractions of stage)
img top  = centerY - tileScale/2
img width = tileScale
z-index  = col + row
```

`col` increases toward the lower right, `row` toward the lower left, so plot `(0,0)` is the
top vertex. `base.png` fills the stage at `z-index: 0`. The pump uses the same centre formula
at `u = v = 0`.

### Measured constants

Every plot PNG is 1000×1000 with transparent corners, so the visible diamond sits inside the
box. These were measured from the alpha bounding boxes, not guessed:

| Asset | Content box | h/w | Centre |
| :--- | :--- | :--- | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` | 991 × 595 | 0.600 | (0.503, 0.499) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

Consequences, all already applied to `js/config/field.js`:

- `tileAspect: 0.538`, not a rounded guess. A 3% error compounds across three row steps and
  visibly pulls the bottom row out of alignment with the top.
- `diamondClipPath()` uses `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`. The real diamond
  runs 22.4%–75.6% vertically; rounding the bottom tip out to 78% inflates the click target
  past the visible art.
- `tileScale: 0.204` is the value that gives an even rim between the 4×4 cluster and
  `base.png`. The cluster's outer diamond is 4.21 × tileScale wide and 2.266 × tileScale tall
  at the default `gap`/`crossGap`; solving `4.21t + 2r = 0.991` against `2.266t + 2r = 0.595`
  gives `t ≈ 0.204`, `r ≈ 0.067`.
- `pump.png` art occupies 27.9% of its 1000×1000 canvas, so `pumpScale: 0.25` renders a pump
  about 32% of a plot's width. See `ui/pumpView.js` for the click-target consequence.

Reference renders: `docs/reference/field-reference.jpeg`.

## Click targets

Plot rectangles overlap, because the PNGs are square with transparent corners. So each plot is
a `<button class="plot">` carrying the diamond `clip-path`, and the `<img>` layers inside it are
`pointer-events: none; draggable: false`. Only the button receives clicks.

Plots are real buttons, so they get keyboard focus and keyboard activation for free. Do not
replace them with divs.

## Known simplifications

- `simulator.tick` reads `state.weather.hourly[0]` as the current event, but weather is only
  re-fetched every 15 minutes while `hourly[0]` is the hour the response was built for. The
  active event can therefore lag real conditions by up to about 1 h 15 m. Weather is real-data
  only, so the player cannot correct this. It is a deliberate MVP simplification, not a bug —
  see `DEC-013`.
- `field-reference.jpeg` shows a farmhouse, pipework and more than 16 plots. Those are mockup
  extras, out of scope. The cross paths in that render are simply `base.png` showing through
  the `crossGap` between the four 2×2 zones, which is why no path art is needed.
- **Accounts are local for now.** `localAuth.js` keeps them in `localStorage`, so there is no
  real authentication, no password-reset email, and no recovery: clearing site data destroys
  the account and the farm. It is fine for a course demo where each person plays their own
  farm, and it **must not be described as secure** anywhere in the UI or the docs. The real
  provider is written and tested but cannot run until a Supabase project exists — ISS-026,
  ISS-032.
- **An exported `.farm` file is integrity-checked, not authenticated.** A corrupted or
  hand-edited file is refused, but anyone who reads `utils/checksum.js` can recompute the
  checksum and change the numbers. There is a test that does exactly that and asserts it
  succeeds, so the limit is executable rather than a claim. Closing it needs a server-held
  key — DEC-021.
- **`.farm` collides with other farming games**, so the magic header `FFARM/1`, not the
  extension, is what identifies our files. Another game's `.farm` is refused with a clear
  message. Double-clicking one does nothing, by design — there is no installed app.
