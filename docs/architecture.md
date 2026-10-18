# Architecture

How Forecast Farm is put together, and where to change things.

Stack: vanilla JS ES modules, plain CSS, DOM `<img>` layers. No framework, no bundler,
no runtime dependencies. `package.json` exists only for scripts.

---

## Layers

| Folder | May import from | Never contains |
| :--- | :--- | :--- |
| `js/crops_logics/` | nothing | DOM, fetch, other crops |
| `js/land_squares/` | `config` | DOM, fetch, mutable state |
| `js/config/` | `crops_logics` | logic, DOM, fetch |
| `js/utils/` | `config` | DOM (except `utils/dom.js`), fetch |
| `js/state/` | `config`, `utils`, `land_squares` | DOM, fetch, game rules |
| `js/domain/` | `config`, `utils`, `land_squares`, `state/types` | DOM, fetch, `store.js` internals |
| `js/services/` | `config`, `utils` | DOM |
| `js/ui/` | `config`, `utils`, `domain`, `state`, `land_squares` | `fetch`, game rules, service calls |
| `js/debug/` | anything | — |
| `js/*.js` top level | anything | — |

`crops_logics/` and `land_squares/` sit **below** `config` (DEC-039): one file per crop, one per
land segment, each holding data and pure arithmetic. `config/crops.js` is the aggregator and
restates no number.

Three rules the layering depends on:

1. **Only `js/services/` calls `fetch`.** Includes reading `data/sample-forecast.json`.
2. **Only `js/ui/`, `js/debug/` and `js/*.js` top level touch the DOM.** `utils/dom.js` is the one
   exception, and `scripts/check-imports.mjs` whitelists it explicitly.
3. **Entry scripts are the only modules that import `js/services/`.** UI modules never import
   a service. Callbacks come in through `mountX(root, actions)`.

**`land_squares/` holds identity, never live state.** Each `sN.js` exports an immutable descriptor
and a `createPlotN()` **factory**. A module-level mutable plot would be the same object for every
player, in every tab, forever — unsaveable, and two players on one machine would overwrite each
other. `state.plots` stays an ordinary serialisable array, which is what makes `transfer.js` and
the whole export/import path work without knowing this folder exists.

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
   It answers `{ok, session|reason}`, **not** `session | null` — see below.
1. `store.init(session)` — loads `forecastFarm.save.v1:<userId>`, or builds
   `initialState(session)`. Either way the live session goes into state.
2. Preload images (rice stages + both ground tiles + base + pump).
3. Mount UI: navbar, sidebar, seasonCard, weatherPanel, farmView, hud, buttonBar,
   meters, envMetrics, toastStack, syncIndicator.
4. Fetch weather for `state.location`, or the sample fallback. Repeat every `REFRESH_MS`.
5. Start the simulator interval (`TICK_MS`) and the autosave interval (`AUTOSAVE_MS`).

   The `TICK_MS` tick calls `repaintFarm()`, never `renderPanels()` — a repaint is not a
   state change, and routing it through the full render rebuilt the forecast board sixty
   times a minute (ISS-085). The tick is naive about *when* and not naive about *what*:
   `mountFarmView` compares `fieldSignature(state)` against the last painted one and
   returns without touching the DOM when nothing visible moved, which on an idle farm is
   almost every tick. That guard is not an optimisation — it is the difference between
   re-decoding ~16.4 MB of PNG every second and not, since rebuilding a tile recreates its
   `<img>` elements and a fresh `<img>` re-decodes a 313–712 KB PNG even when the bitmap
   is already in memory (ISS-088). Tiles that *did* move are swapped individually with
   `replaceWith`, which preserves append order, because append order is the field's z-order.
6. If `?debug=1`, mount the debug panel.

Step 0 is new, added with login. It is why `login.html` is a separate page rather
than an overlay: the shell must not render before auth. `js/auth-main.js` is the
mirror image — it redirects *to* the game when a session already exists, so
neither page can bounce the visitor back and forth.

### Step 0 branches on the reason, not on truthiness

`resolveSession()` used to answer `session | null`, and `null` meant three
unrelated things at once — an invalid token, an unreachable server, and our own
outage. Every caller treated it as the first, so a dropped connection became a
redirect to the login page and the refresh token was destroyed on the way out.
That is **ISS-048**, and it is what logged players out at random on the hosted
build.

| `resolveSession()` answers | The page does |
| :--- | :--- |
| `{ok: true, session}` | mount the game |
| `{ok: false, reason: 'invalid_token'}` | `location.replace('login.html')` — a real logout |
| `{ok: false, reason: 'offline'}` | `ui/blockedScreen.js`, with a retry |
| `{ok: false, reason: 'server_error'}` | the same screen, worded as our fault not theirs |

`restoreSession()` only clears the stored refresh token for a `400`/`401`. A
timeout, a 5xx and a dropped connection all keep it, so the next load can still
restore silently. A guest never needs the network, so `?guest=1` wins over both.

### Losing the connection mid-session

A connection that drops while the farm is open **does not stop play**. The farm
keeps saving to localStorage and syncs when the connection returns. What changes
is that the game now says so:

- `ui/syncIndicator.js` — a fixed chip in the bottom-left corner: two dots that
  wave while a save is in flight, sit static and dim when synced, and turn amber
  with a persistent `No connection` label when a write is queued. The full text,
  the ageing line and both buttons live in a popover behind the dots.

  It is **`position: fixed` on purpose**, and it used to be a full-width banner in
  normal flow above `.app` — which is `height: 100dvh`. That made every appearance
  a layout change: the document grew past the viewport and the whole shell lurched
  down and back. Because `copyFor('saving')` returned copy too and `AUTOSAVE_MS` is
  10 s, a *successful* save did it, on a timer, with no player action involved. See
  ISS-076 and DEC-037.

  The amber label is still persistent rather than a toast, because "your farm is
  only on this device" is a fact to act on. What shrank is the *fixture*, not the
  obligation to be honest, so the first failed write of an outage also raises one
  toast — transient and impossible to scroll past — and then the label holds the
  floor. The `.farm` export is one click away in the popover, which is the
  mechanism that already existed (DEC-021).
- `ui/weatherPanel.js` — the last forecast stays on screen marked
  *"Live weather paused — last read N minutes ago"*, rather than a timestamp that
  reads as live.
- `store.js` tracks `synced` / `saving` / `pending` and emits `sync`; a failed
  write is queued and flushed on `window.online` rather than retried every 10 s.

`js/connection.js` wires all of this for all four entry points, so the farm, shop,
settings and login share one copy instead of four that drift — the boot and save
wiring was already copy-pasted three times.

**Only the `pending` transition re-renders the shell.** `main.js` used to call
`renderPanels()` on every `sync` event, which meant rebuilding the whole shell twice
per autosave — the second, independent source of the flicker in ISS-076. `saving`
and `synced` render identically to each other, so only `pending` — the one that makes
the weather panel say it is paused — is worth a re-render.

**`advanceAnnouncement(announced, next)` is pure and exported** so the toast's
one-per-outage rule can be tested without a store, a DOM or a module mock. It is the
thing standing between a small chip and a regression of ISS-050, so it has a test of
its own.

**`pagehide` cannot complete a server save.** It needs an `Authorization` header
and `navigator.sendBeacon` cannot send one. The synchronous localStorage write
inside `saveNow()` is what actually persists on exit, and it does.

### What is on screen while boot happens

Steps 0 and 1 are network, and the panels are empty until they finish. Every
request in the project now carries a deadline — `AUTH_TIMEOUT_MS` (10 s), with
`RESTORE_HARD_LIMIT_MS` (15 s) as a backstop on session restore — so a bad
connection fails in bounded time instead of hanging (ISS-049). So a veil covers
the gap.

`mountBootLoader()` is the **first statement of `start()` on all four pages**, before
any `await`, and `done()` is called once the real UI is mounted:

```
start() → mountBootLoader() → await loadProvider() → await resolveSession()
        → await init(...)   → mount*() → loader.done()
```

`js/ui/loadingTips.js` owns it, the facts and the three thresholds are in
`js/config/tips.js`, and the rules are in `.boot-loader` (css/components.css).
It appends to `<body>` itself rather than being declared in markup — see DEC-026
for why it is allowed to paint before auth is resolved, and why the veil holds no
state. It shows **nothing at all** for a load faster than `SHOW_AFTER_MS`, so the
common case is unchanged.

**`done()` waits for the shell, not for the weather.** Since T-11 the forecast is
a fire-and-forget `refreshWeather()` that runs *after* the panels are mounted,
and it can be slow or can fail. Holding the veil until it settled would mean a
weather timeout keeps a perfectly playable farm hidden, so the veil is dismissed
as soon as `mountShell()` + `renderPanels()` have run and the forecast panel
fills itself in behind it.

---

## Accounts

Two pages, and login comes first.

```
login.html ──► js/auth-main.js ──► mountAuthViews(root, actions)
                   │  boot: provider, entry view, callbacks
                   ▼
             js/ui/authViews.js ──► show(view)
                   ├─► js/ui/menuPanel.js      menu, sign in, create account
                   ├─► js/ui/loginPanel.js     one form, on js/ui/signBoard.js
                   └─► js/ui/passwordReset.js  request, sent, set
                   │
                   ▼
             js/services/authApi.js   (Supabase REST, fetch)

index.html ──► js/main.js ──► boot 0: resolveSession()
                              │ no session → login.html, game never mounts
                              │ offline/server_error → ui/blockedScreen.js
                              ▼
                        js/state/store.js ──► forecastFarm.save.v1:<userId>
```

### Views on the login page

One page, four faces, and `show(view)` in `js/ui/authViews.js` is the only place
a view changes:

```
menu ──Sign in─────► signIn ──Create account──► signUp
     ──Register────► signUp ──Sign in instead──► signIn
     ──Play as guest► onGuest()

signIn ──Back────────► menu
signIn ──Forgot──────► reset ──Back──► signIn
```

Each view is mounted alone and the previous one unmounted, so only what the
player is looking at is in the DOM. That replaced an earlier tabbed panel that
built both forms and hid one — a form that exists only to be hidden is a form a
screen reader and a test both have to reason around.

Two entries override the default view, both because the alternative buries the
reason the player arrived. `chooseStartView()` in `js/auth-main.js` decides, from
what was read out of the URL at boot:

| Arriving | Lands on | Why |
| :--- | :--- | :--- |
| with a recovery token in the URL fragment | `reset` | they followed a link from their inbox to choose a password, nothing else |
| with `?deleted=1` | `signIn`, with a notice | the sentence is about an account they had; the menu would hide it under three buttons |

Focus moves with the view: onto the first field for a form, onto the first
button when returning to the menu from a form, and **not at all** on first load,
where the browser has already opened on the right view.

### The panel contract

`js/ui/loginPanel.js` never imports a service and never names a provider. Every
outside call arrives through `actions`:

| Action | Returns | The panel handles |
| :--- | :--- | :--- |
| `signIn({identifier, password})` | `Promise<{ok:true, session} \| {ok:false, reason}>` | busy state, then route on |
| `signUp({email, password, farmerName, username})` | same, or `{ok:true, session:null}` | busy state, then route on |
| `signOut()` | `Promise<{ok:true}>` | — |
| `onAuthenticated(session \| null)` | — | routing; **`null` means awaiting email confirmation** |
| `onBack()` | — | return to the menu |
| `onSwitch(mode)` | — | sign in ⇄ create account |
| `onGuest()` | — | guest play |
| `onForgotPassword()` | — | opens the reset flow |
| `notice` | `string \| undefined` | a sentence to show on arrival, styled as info |

`currentSession()` is not in the list any more: the panel is mounted *after*
boot has already decided there is no session, so asking again could only
contradict it.

### The login page is painted art

The menu and the two forms are the one surface in the project that is illustration
rather than app chrome: a full-bleed background, a wooden sign, chunky outlined
buttons, and two display faces.

- **Three stylesheets draw it, one per component.** `css/auth.css` is the page
  backdrop and stage, `css/menu.css` is the opening menu and its buttons,
  `css/sign.css` is the wooden board, its form overrides and its buttons. It does
  not use the app grid, so `css/layout.css` is untouched. One file per component
  is the direction the rest of `css/` is heading — see DEC-029.
- **It does not follow `data-theme`, and it carries its colours literally rather
  than as tokens.** A wooden sign is brown in a dark theme too, so a token would
  have nothing to switch. Every other page is unaffected and still reads
  `variables.css`.
- **The faces are self-hosted** (`css/fonts.css`, `assets/fonts/`), not linked
  from a font CDN — the game has no build step and no third-party runtime. Only
  `login.html` links that file, so `--font-display` and `--font-ui` fall through
  to `--font-sans` everywhere else. Those two stay tokens even here, because the
  faces they name are declared in another file.
- **The sign is two stacked layers sharing one `clip-path` polygon** — an outer
  dark border and an inner wood panel. A single element with a CSS border could
  not do it: `clip-path` cuts a border away rather than shaping it. The polygon is
  declared on `.sign` and inherited by `.sign__inner`, which is always its child,
  so the two layers cannot drift apart. Because the polygon's percentages are
  relative to each layer's own box, the board's height changes with the number of
  fields, and the inner padding has to be generous enough that content clears the
  taper at every height.
- **Every text pairing clears WCAG AA,** including the ones the mockup draws
  light. Where a mockup colour failed, the text colour changed rather than the
  fill. Three deviations are worth naming, because none is obvious from the code:
  the wordmark is `#1a8f16` and not the mockup's `#35c419`, which is 2.32:1 on
  white where this is 4.7:1 and still the same green; field labels on the board
  are `#1e0f04` and not `#3b2412`, which is 3.56:1 and they are 14px text needing
  4.5; and error text sits on its own pale chip, because no shade of red clears
  4.5:1 against the board's brown.

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

### One entry script per page

Four pages, four entry scripts, each of which repeats the same two steps before any UI
exists: resolve the session, load the save.

| Page | Entry | Module that owns its boot |
| :--- | :--- | :--- |
| `login.html` | `auth-main.js` | `loadProvider()`, also used by the others |
| `index.html` | `main.js` | `resolveSession()`, `init()`, `mountShell()` |
| `shop.html` | `shop-main.js` | imports `resolveSession` from `main.js` |
| `settings.html` | `settings-main.js` | imports `resolveSession` from `main.js` |

They all ask `resolveSession(provider)` rather than each reading storage, because the
first version disagreed and produced a redirect loop (ISS-033). Importing `main.js` from
another entry point is safe because its `start()` is guarded on `#top-bar`, which only
`index.html` has — the same trick `settings-main.js` uses with `#settings-root`.

A guest's session is deliberately never written to storage, so the other pages cannot
rediscover it. `?guest=1` across the link is what carries it, and `shopHref` /
`farmHref` / `settingsHref` in `js/main.js` are the only places that URL is built.

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

`js/services/localAuth.js` was a **stopgap** while `authApi.js` did not exist. It
still ships, but no longer for signed-in play — it is the **guest** provider, the
only implementation of `signInAsGuest`. It keeps writing its own
`forecastFarm.accounts.v1` / `.session.v1` keys, which violates the one-writer
storage rule; ISS-027's fix is now "narrow it to guests", not "delete it".

### Which provider runs

`js/auth-main.js` holds `const USE_LOCAL_PROVIDER = false`. Set it to `true` and
the local provider loads; leave it and the Supabase one loads by dynamic `import()`
(DEC-020). It is `false` because `js/config/supabase.js` has a project URL and anon
key (ISS-028, T-29). Switching providers is therefore one line.

`loadProvider` is exported from `auth-main.js` because **`js/main.js` boots against
the same provider**. It used to import `localAuth.js` directly, so with the flag
flipped only on the login page, the login page issued a real Supabase session and the
game page then read localStorage, found nothing, and redirected back to login — a
loop. Both entry scripts now call `loadProvider()` (ISS-033). Both also
`await provider.restoreSession?.()`, because the Supabase access token is
memory-only and without it every page navigation would look like a sign-out.

Guest play is the deliberate exception: `signInAsGuest` stays on `localAuth.js`,
since a guest has no account to sign into.

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

Four separate things, easy to confuse:

| | Where it lives | What it is for |
| :--- | :--- | :--- |
| **Autosave** | `localStorage`, every 10 s | the game remembering itself between visits |
| **Server save** | a `farm_saves` row in Supabase | the farm following the player across devices |
| **Export** | a `.farm` file the player keeps | backup, and moving to another computer |
| **Import** | reads that file back | restoring, or starting over from someone else's farm |

### The server save

One row per account in `public.farm_saves`, created by
`supabase/migrations/001_farm_saves.sql`. **That migration is run by hand in the
Supabase dashboard** — it is the one thing in this section a browser cannot do.
Until it has been run, every read returns "table not found" and the game plays
exactly as before, from localStorage.

**The server is the authority; localStorage is the offline cache underneath it.**
`store.init()` asks the server first and falls back to the local copy. Every save
writes the local copy first — synchronously, so it is durable even if the tab is
closing — and then tries the server. A player whose connection drops mid-session
keeps playing instead of losing the farm. A **404 is deliberately not treated as
"no farm"**, only a 406 is: a missing table must not start a new farm that then
overwrites the real one.

`store.js` may not import a service, so the adapter is assembled in
`js/remoteSave.js`, beside the entry points. It captures the access token **once**,
so an autosave firing after sign-out cannot post a farm under a session that no
longer exists. Guests get no server save at all: without a token `auth.uid()` is
null, the RLS policy matches no row, and every request would 401.

**`init`, `saveNow` and `clearSave` are async.** A breaking change to the store's
contract, and deliberate — a synchronous `init` would write a fresh farm over the
server's copy before reading it.

### The export file

`state/transfer.js` owns the file format and is **pure** — no storage, no DOM, and
`Date.now()` is passed in. `ui/savePanel.js` owns the browser half (`Blob`,
`createObjectURL`, `<input type="file">`), because those are DOM APIs and the
layering rules keep them in `js/ui/`. `settings-main.js` is the only module that joins
them, through `mountSavePanel(root, actions)`, and it hands the panel a set of callbacks
so the panel never imports `store.js`.

**The panel is mounted by the settings page, not by an entry point of its own.** There is
no save page: it is a card at the bottom of `settings.html`, below the two destructive
actions.

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

### Username sign-in

GoTrue's password grant accepts an email and nothing else, so a username has to become
an email before it can be sent anywhere. `public.usernames` maps one to the other, with
`username` as the **primary key** — that is what makes it unique, enforced by the database
rather than by a read-then-write a client could race.

The lookup happens **before** sign-in, so it is the one thing an anonymous visitor can
call. It goes through `email_for_username(text)` rather than a table read, because RLS
governs *rows*, not *queries*: an earlier `using (true)` SELECT policy let
`GET /rest/v1/usernames?select=*` return every username and email to anyone holding the
committed anon key. The function returns one address for one name, which is the narrowest
thing that can do the job. A player can also read their **own** row, which is what lets
them rename a username and release the old one.

The row is written when a session is **adopted**, not at sign-up — with email confirmation
on, sign-up returns no user id to attach a row to yet. That also means an account created
before the table existed heals itself on first sign-in.

### Deleting an account

Two clicks **and** the password, then the account, its farm, its username and its farmer
name all go together.

**The password is checked in the database**, by `delete_my_account(password)` in
`005_immediate_account_deletion.sql`, which compares it with `pgcrypto`'s `crypt()`
against the bcrypt hash GoTrue stored and deletes only on a match. This is the part worth
understanding before changing anything:

- Deleting a row from `auth.users` needs privileges no browser request holds. The usual
  route is GoTrue's admin API with a `service_role` key, which must never enter this
  repository because it bypasses RLS entirely (DEC-018). Comparing the hash is the only
  route to a server-side check without one.
- The check **cannot** be done in the browser. A client-side check is skipped by calling
  the delete endpoint directly, which once meant any valid access token could destroy an
  account with no password at all (ISS-040). Both providers now verify in the same call
  that deletes, so neither exposes that.
- It **fails closed**. If `crypt()` is unavailable, pgcrypto lacks bcrypt, or the stored
  hash is not bcrypt, the function raises and deletes nothing. A project in that state
  cannot delete an account at all, which is the right failure: an unverifiable password is
  never treated as a correct one.

Three properties keep the function narrow, and removing any one of them turns it into a
way to delete anyone's account:

1. **It takes no parameter.** It acts on `auth.uid()` only, so a caller can never name
   another account. `tests/mainBoot.test.js` asserts the browser-side check stays gone.
2. **`set search_path = ''`.** No schema hijack.
3. **EXECUTE is revoked from `PUBLIC`** — which Postgres grants by default and `anon`
   inherits — then granted only to `authenticated`.

One `delete from auth.users` is the whole deletion. `auth.identities`,
`public.farm_saves` and `public.usernames` all declare
`references auth.users(id) on delete cascade`, so there is no half-deleted state to
reconcile and no second code path that can forget a table.

### Erasing progress

Two clicks **and** the password, then the farm goes and a brand new one is built under the
same session. The account, username, email and farmer name all survive.

This is the second of the two destructive actions, and it was originally *not* behind a
password — the reasoning was that a farm is the player's own and one click away from being
rebuilt. That is not the right test. A farm is the accumulated product of real play, and
"easy to replace" is not "protected": a stolen session token could destroy weeks of work.

So it uses the same mechanism, one function over in `006_password_gated_erase.sql`:

```sql
erase_progress(password) -> boolean
```

Every property of `delete_my_account` is kept, deliberately:

| | |
| :--- | :--- |
| Takes no account id | acts on `auth.uid()` only, so a caller cannot name another farm |
| `set search_path = ''` | no schema hijack |
| `EXECUTE` revoked from `PUBLIC`, granted to `authenticated` | the anon key in this repo grants nothing |
| bcrypt hash compared with `pgcrypto`'s `crypt()` | fails closed if the hash is not bcrypt |
| Deletes only `public.farm_saves` | leaves `auth.users`, identities, usernames and farmers alone |

The one difference is the return: `false` means wrong password, and **nothing was deleted**.
`delete_my_account` returns `false` too, so both refusals arrive at the panel as the same
shape and the same sentence.

**Why the check and the delete are one statement, not two calls.** A separate "verify
password" endpoint would be one the browser could simply not call. `js/mainBoot.test.js`
asserts `authApi.verifyPassword` stays `undefined` for exactly that reason. The cost is one
bcrypt comparison per guess, the same bound `delete_my_account` has always had.

The entry point is `makeDeleteProgress()` in `js/settings-main.js`, and its order is the
whole feature:

1. `eraseProgress({ token, password })` — verifies and deletes the **server** row. Nothing
   has been touched yet, so a refusal needs no cleanup.
2. `clearLocalSave()` — drops the localStorage copy. Not `clearSave()`: the server half is
   already done, and a second request at a deleted row could fail and be reported as a real
   failure (ISS-041).
3. `adoptState(buildInitialState(session))` then `saveNow()` — the new farm, written at once
   rather than waiting for the debounce, because the page is likely to be reloaded next.

The old order cleared **first** and asked afterwards, which is how a wrong password wiped the
farm and still reported that nothing had changed.

---

## Where do I find...?

| I want to change... | Open |
| :--- | :--- |
| plot prices, grid size, spacing | `js/config/field.js` |
| crop times, prices, water need | `js/config/crops.js` |
| an image path | `js/config/assets.js` |
| password rules, hashing cost, storage keys | `js/config/auth.js` |
| Supabase project URL and anon key | `js/config/supabase.js` — **anon key only, never `service_role`** |
| which provider runs | `USE_LOCAL_PROVIDER` in `js/auth-main.js` (used by both entry points) |
| how weather maps to game events | `js/config/weatherEvents.js`, `js/domain/weather.js` |
| what a waiting player reads on the loading veil | `js/config/tips.js` |
| how long the veil waits before painting | `js/config/tips.js` (`SHOW_AFTER_MS`, `FIRST_TIP_AFTER_MS`) |
| what the veil looks like | `js/ui/loadingTips.js`, `.boot-loader` in `css/components.css` |
| what weather does to crops **at sowing** | `js/config/cropWeatherMatrix.js`, `js/domain/weather.js` (`verdictFor`) |
| what weather does to crops **while they stand** | `js/domain/water.js` (`tick`) — evaporation, rain, dryness |
| what a plot is **aiming for** | `js/domain/plotWater.js` (`targetFor`, `bandFor`, `waterState`) |
| what a plot's **drying and filling rates** are | `js/domain/plotWater.js` (`ratesFor`, `flowFor`) |
| how long a pump takes, and what it costs | `js/domain/plotWater.js` (`minutesToOptimal`) |
| what **damage** is, and whether it is permanent | `js/domain/damage.js` |
| pump cost / water speed | `js/config/game.js` (`PUMP`, `WATER`, `OPTIMAL`, `DAMAGE`) |
| the pump's own rules | `js/domain/pump.js` (`pumpRun`, `setPump`, `aimPump`) |
| the pump's control and meter | `js/ui/pumpPanel.js` |
| evaporation / rain-water rates | `js/config/weatherEvents.js` (`EVAPORATION_PER_HOUR`, `RAIN_WATER_PER_HOUR`) |
| plant / harvest / clear rules | `js/domain/farm.js` |
| buying land | `js/domain/plots.js` |
| seeds, harvest, selling | `js/domain/inventory.js` |
| gold maths | `js/domain/wallet.js` |
| forecast → alert strings | `js/domain/notifications.js` |
| what counts as a valid email or password | `js/domain/authRules.js` |
| provider error code → player-facing sentence | `js/ui/authErrors.js` |
| which sign-in failures must look identical | `js/ui/authErrors.js` (`ENUMERATION_SENSITIVE`) |
| the opening menu | `js/ui/menuPanel.js` |
| which view the login page is showing, and how a view changes | `js/ui/authViews.js` (`show`) |
| which view the login page opens on | `js/auth-main.js` (`chooseStartView`) |
| the sign-in / create-account form and its states | `js/ui/loginPanel.js` |
| the labelled inputs the form is built from | `js/ui/loginFields.js` |
| the wooden sign both forms sit on | `js/ui/signBoard.js` |
| the forgot-password flow | `js/ui/passwordReset.js` |
| the menu background and logo paths | `js/config/assets.js` (`MENU_BG`, `TITLE_IMG`) |
| the two display faces | `css/fonts.css`, the `--font-display` / `--font-ui` tokens |
| the auth provider call (Supabase) | `js/services/authApi.js` |
| the temporary local provider | `js/services/localAuth.js` |
| boot step 0, the session gate | `js/main.js` (`resolveSession`) |
| the shop, prices and availability | `js/config/crops.js` |
| the purchase rule | `js/domain/shop.js` (`buySeeds`) |
| the settings page | `js/ui/settingsView.js` |
| the arm-and-confirm control both actions use | `js/ui/dangerAction.js` |
| the password field an armed action reveals | `js/ui/passwordGate.js` |
| the order a destructive action runs in - password first, always | `js/ui/runDestructive.js` (tested in `tests/dangerAction.test.js`) |
| why a failure says what it says | `js/ui/dangerMessages.js` |
| where a page says something to the player | `js/ui/statusLine.js` - one per region, never one shared node |
| shared card, field and status styles | `css/components.css` - the only file every page loads |
| what a username may contain | `js/domain/authRules.js` (`usernameLooksValid`), `js/config/auth.js` |
| how a username becomes an email | `supabase/migrations/002_usernames.sql` (`email_for_username`) |
| how an account is deleted, and why the password is checked in SQL | `supabase/migrations/005_immediate_account_deletion.sql`, then DEC-024 |
| how a farm is erased, and why that is behind a password too | `supabase/migrations/006_password_gated_erase.sql`, then DEC-025 |
| the shop button and the seed list | `js/ui/shopLauncher.js`, `js/ui/shopView.js` — the card markup is built here; the coin and sprout are inline in `js/ui/shopArt.js` |
| shop page layout | `css/shop.css` (the stall: grass, log frame, sign, board) and `css/shop-card.css` (the cards and buy buttons), `shop.html` — painted art, theme-independent, four columns at a 1400px shell |
| field drawing / click bugs | `js/ui/farmView.js`, `js/ui/plotTile.js`, `js/utils/iso.js`, `css/scene.css` |
| page layout | `css/layout.css`, `index.html` |
| the game page's top bar | `css/navbar.css` — fixed `height: 60px`, owns its own padding rather than `.card`'s |
| where the location search lives | `js/ui/locationBar.js`, in the wooden board — not the navbar |
| the forecast board: frame, notes, meters | `js/ui/weatherPanel.js`, `css/weather.css` — the board is `flex: 0 0 33.333%` of `.app__centre` with `min-height: 150px`, the field takes the rest (`css/layout.css`). Its width is `clamp(450px, 38%, 520px)`, centred over the field. Inside, `.board-body` is a two-column grid at `1.6fr / 1fr` with **both children pinned to `grid-row: 1`** (ISS-056); the meters column is three pills at `flex: 1 1 0`, so they divide the note's height rather than asking for a height of their own, and carries a `3px` bottom padding so the last pill's `box-shadow` survives `.board-body`'s `overflow: hidden` (ISS-060); a meter's label track is a bare `1fr`, whose `min-content` floor is what stops "Wind" ellipsising (ISS-061); the big note is **itself a two-column grid** — the condition spans both columns, the temperature takes `minmax(0, auto)`, and the place name takes `minmax(0, 1fr)` beside it, right-aligned and wrapping instead of ellipsising, with the day and time and the two conditional lines on full-width rows of their own (DEC-033, ISS-062); `locationLine()` answers `'Unknown location'` rather than an empty string, so a farm with no place never renders a blank line (ISS-063); the hour strip is a fixed `72px` (ISS-057); the freshness label is **inside the big note**, right-aligned and rendered only while the forecast is paused, so the board prints its reading time once (DEC-032); both hanging pegs are posts at every height (ISS-059). No meter has a fill bar (ISS-055). Sizes are plain literals, with one short-window block at `@media (max-height: 960px) and (min-width: 901px)` that trims them — DEC-031 has the reasoning |
| login page layout — the menu and the wooden sign | `css/auth.css`, `css/menu.css`, `css/sign.css`, `login.html` |
| colours | `css/variables.css` — except the login page, which writes its own (DEC-029) |
| spacing and radii | hardcoded per file, in px. The ten in `variables.css` are a stopgap for `components.css` alone; delete them when that file's 41 references are gone |
| card and button styling | `css/components.css` |
| top bar buttons | `js/config/ui.js` |
| API calls | `js/services/*` |
| save / load | `js/state/store.js`, `js/state/saveFile.js` |
| the export file format, checksum, rebase | `js/state/transfer.js` |
| why a CSS rule exists but nothing looks different | compare the class against the stylesheets **that page** links — `settings.html` loads none of `auth.css`, `menu.css` or `sign.css`, and that is how `.form-message` went unstyled there for a while. Splitting `css/` by component makes this more likely, not less: adding a file means adding a `<link>`. `tests/settingsDom.test.js` asserts it |
| why a rule naming a font has no effect | same cause, and quieter: `login.html` links `fonts.css`, `index.html` inherits it through `navbar.css`'s `@import`, `settings.html` links it directly, and **`shop.html` loads neither**. A `font-family: var(--font-ui)` on the shop page is not an error — the family has no `@font-face` there and it quietly falls through to `--font-sans`. Both faces ship at `font-weight: 400` only, and a weight above 500 with no near match resolves to the nearest face rather than a synthesised one, so `font-weight: 700` renders at 400 without error |
| the export / import buttons | `js/ui/savePanel.js`, mounted as a card by `js/ui/settingsView.js` |
| which provider runs | `USE_LOCAL_PROVIDER` in `js/auth-main.js` (used by both entry points) |
| the state shape | `js/state/types.js`, `js/state/initialState.js` |
| debug sliders and cheat buttons | `js/debug/debug.js` |


---

## Project structure

This is the repo **as it stands**, not the finished shape. It moves, so treat it as a snapshot.

```
.
├── index.html                  the game page — app shell, 3 grid columns
├── login.html                  the menu, sign-in and create-account screens
├── shop.html                   the seed shop — its own page, its own entry script
├── settings.html               account details, erase progress, delete account
├── almanac.html                empty — placeholder page
├── LICENSE                     MIT
├── README.md
├── AGENTS.md                   the working agreements, for a newcomer or an agent
├── package.json                scripts only, no dependencies
│
├── css/
│   ├── reset.css               baseline
│   ├── layout.css              the 3-area CSS grid — the shell, and nothing in it
│   ├── variables.css           colours for the game pages; spacing and radii only
│   │                           as a stopgap for components.css
│   ├── themes.css              dark and high-contrast token overrides
│   ├── components.css          cards, buttons, inputs, meters, toasts
│   ├── fonts.css               the two display faces, self-hosted @font-face
│   ├── navbar.css              the game page's top bar
│   ├── weather.css             the wooden forecast board and its sticky notes — plain literals plus one short-window block
│   ├── scene.css               the isometric stage, the plot layers, locked/next/ready
│   ├── crop-picker.css         the seed picker overlay and its rows
│   ├── shop.css                the shop sign and the seed list
│   ├── settings.css            the settings gear and the settings page
│   ├── auth.css                the login backdrop and the stage it sits on
│   ├── menu.css                the opening menu and its buttons
│   └── sign.css                the wooden sign, its forms and its buttons
│
├── data/
│   └── sample-forecast.json    empty — one real Open-Meteo response, for offline dev
│
├── js/
│   ├── main.js                 boot order, boot 0 is the session gate
│   ├── auth-main.js            the login page entry, wires panel to provider
│   ├── shop-main.js            the shop page entry, same gate as main.js
│   ├── settings-main.js        the settings page entry, same gate as main.js
│   ├── farmActions.js          what a click on a plot does — store + rules + picker
│   ├── remoteSave.js           joins the store to the server-save service
│   ├── config/                 pure data, imports nothing
│   │   ├── auth.js             storage keys, password policy, PBKDF2 cost
│   │   ├── supabase.js         project URL + anon key (set, T-29)
│   │   ├── api.js              URLs, default location, refresh interval
│   │   ├── assets.js           every image path, in one place
│   │   ├── field.js            FIELD geometry, ZONES, STARTER_PLOT_ID, UNLOCK_ORDER, PLOT_PRICES
│   │   ├── game.js             START_GOLD, PUMP, WATER, HEALTH, timings, growthSpeed()
│   │   ├── crops.js            the crop table — an aggregator over crops_logics/
│   │   ├── tips.js             loading-screen facts and their timings
│   │   ├── cropWeatherMatrix.js likes/hates as numbers, per crop per event
│   │   ├── seasons.js          SEASON, the three latitude BANDS, bandForLat
│   │   └── weatherEvents.js    the nine events, classifyHour, eventRank, and the
│   │                           evaporation / rain-water tables (T-09)
│   ├── crops_logics/           one file per crop — imports nothing (DEC-039)
│   │   ├── stageMath.js        stageAt, progressAt — the one growth formula
│   │   ├── rice.js             the only playable crop
│   │   ├── potato.js
│   │   ├── tomato.js
│   │   ├── wheat.js
│   │   └── corn.js
│   ├── land_squares/           one file per segment — identity, never live state (DEC-039)
│   │   ├── index.js            buildPlots, starterPlot, nextUnlockable, harvestsIn
│   │   ├── s1.js … s16.js      id, col, row, zone, isStarter + a createPlotN() factory
│   ├── domain/                 game rules — no DOM, no fetch
│   │   ├── authRules.js        what counts as a valid username, email or password
│   │   ├── shop.js             buySeeds, canAfford, the refusal reasons
│   │   ├── farm.js             plant, harvest, clearPlot
│   │   ├── land.js             buyPlot, canBuyPlot
│   │   ├── notifications.js    forProjection, alertsToRaise, currentTrouble, wateringAdvice
│   │   ├── pump.js             the machine: pumpRun, costOf, setPump, aimPump
│   │   ├── damage.js           the latch: what damage is permanent
│   │   ├── plotWater.js        the vocabulary: targetFor, bandFor, waterState, ratesFor
│   │   ├── seasons.js          seasonFor — derived from latitude, not the month
│   │   ├── simulator.js        empty ON PURPOSE, see below
│   │   ├── water.js            the tick: the only writer of water, health, damage, dead
│   │   └── weather.js          forecastWindow, worstEventIn, verdictFor
│   ├── services/               the only place that calls fetch
│   │   ├── authApi.js          Supabase REST provider — live
│   │   ├── accountApi.js       delete_my_account over PostgREST RPC
│   │   ├── geocodeApi.js       place ⇄ coordinates — TWO different services, see below
│   │   ├── gotrue.js           the GoTrue transport and error mapping
│   │   ├── tokenStore.js       the only place a token is written to storage
│   │   ├── saveApi.js          the farm_saves table — read, write, delete
│   │   ├── localAuth.js        the GUEST provider, same contract
│   │   ├── timeApi.js          rewrites — writes straight into the DOM
│   │   └── weatherApi.js       rewrites — OpenWeatherMap placeholder key
│   ├── ui/                     render only, reads the store
│   │   ├── accountCard.js      the account facts card on settings
│   │   ├── almanac.js          empty
│   │   ├── authErrors.js       provider code → sentence, enumeration guard
│   │   ├── authViews.js        the login page's view graph — menu, forms, reset
│   │   ├── cropPicker.js       which seed to sow on a plot
│   │   ├── dangerAction.js     the arm-and-confirm control, with its password gate
│   │   ├── farmView.js         the isometric field — geometry, plus the repaint guard
│   │   ├── plotLayers.js       what is painted inside one plot, back to front
│   │   ├── plotLabel.js        a plot's accessible name — the whole of it
│   │   ├── plotClick.js        plotAction(): what a click on a plot means
│   │   ├── pumpPanel.js        the pump toggle, the time-to-optimal, and the rate readout
│   │   ├── loadingTips.js      the boot veil and its rotating facts
│   │   ├── locationBar.js      the place search in the farm top bar
│   │   ├── loginFields.js      labelled input builders, one form per mode
│   │   ├── loginForm.js        the sign-in / create-account form shells
│   │   ├── loginPanel.js       the sign-in / create-account form and its states
│   │   ├── menuPanel.js        the opening menu: logo and three ways in
│   │   ├── passwordReset.js    forgot-password: the flow, three steps
│   │   ├── resetRequest.js     reset step 1 — ask for the address
│   │   ├── resetSet.js         reset step 3 — choose the new password
│   │   ├── signBoard.js        the wooden sign the auth forms sit on
│   │   ├── savePanel.js        export / import a farm file
│   │   ├── settingsLauncher.js the settings gear in the farm sidebar
│   │   ├── settingsView.js     the settings page: two destructive actions
│   │   ├── syncIndicator.js    the fixed corner chip: dots, label, popover
│   │   ├── shopLauncher.js     the shop sign in the farm sidebar
│   │   ├── shopView.js         the seed list on shop.html
│   │   ├── toastStack.js       transient messages
│   │   ├── navbar.js          logo, farmer name, sign-out
│   │   ├── weatherGlyph.js     the drawn condition, not an icon file
│   │   └── weatherPanel.js     the wooden board: now, three meters, six hours
│   ├── utils/
│   │   ├── dom.js              the only whitelisted DOM access
│   │   ├── log.js              scoped logger, `[scope] message`
│   │   ├── normalize.js        email, username and display-name normalisation
│   │   ├── iso.js              plot and pump placement + `frameY()` — the only reader of FIELD geometry
│   │   ├── date.js             empty
│   │   └── season.js           empty
│   ├── state/
│   │   ├── initialState.js     builds a fresh farm: 200 gold, 16 plots, 1 already owned
│   │   ├── saveFile.js         the per-user localStorage save
│   │   ├── store.js            getState, apply, subscribe, bus, save/load
│   │   └── types.js            planned — JSDoc @typedef for State
│   └── debug/                  planned — the ?debug=1 panel
│
├── assets/
│   ├── icons/
│   │   ├── favicon.svg
│   │   ├── crops/              5 SVGs — all 0 bytes, art pending
│   │   └── weather/            9 SVGs — all 0 bytes, art pending
│   ├── fonts/
│   │   ├── LuckiestGuy-Regular.ttf   the logo and button face
│   │   └── IrishGrover-Regular.ttf   labels, body text, the small links
│   ├── images/
│   │   ├── base.png            the slab under the field
│   │   ├── menu_bg.png         the opening menu's painted background
│   │   ├── title.png           the game logo on the opening menu
│   │   ├── pump.png            moves to pump/pump.png
│   │   ├── Shop/
│   │   │   └── shop.png        the shop sign, used as the shop button
│   │   ├── settings/
│   │   │   └── settings.png    the settings gear, used as the settings button
│   │   ├── crops/
│   │   │   ├── rice/           rice_1.png … rice_5.png + "rice seed.png"
│   │   │   ├── wheat/          "wheat seed.png" — stages awaiting art
│   │   │   ├── potato/         "potato seed.png" — stages awaiting art
│   │   │   ├── corn/           "corn seed.png" — stages awaiting art
│   │   │   └── tomato/         "tomato seed.png" — stages awaiting art
│   │   └── ground/
│   │       ├── ground_watered.png
│   │       └── ground_unwatered.png
│   └── sounds/                 3 MP3s, all 0 bytes — out of scope
│
├── scripts/
│   ├── dev-server.mjs          static server for npm run dev
│   └── check-imports.mjs       layering rules for npm run check
│
├── supabase/
│   └── migrations/             run these by hand — see docs/setup.md
│       ├── 001_farm_saves.sql           the server-side save
│       ├── 002_usernames.sql            username ↔ email, for username sign-in
│       ├── 003_account_deletion.sql     superseded by 005; do not run
│       ├── 004_clear_all_accounts.sql   a tool, not a setup step
│       └── 005_immediate_account_deletion.sql  delete, behind a password check
│
├── tests/                      node:test, pure code only
│   ├── authApi.test.js         Supabase provider, fetch stubbed
│   ├── mainBoot.test.js        boot step 0, the provider switch
│   ├── loadingTips.test.js     the boot veil: no flash, rotation, teardown
│   ├── authErrors.test.js      error mapping, account enumeration
│   ├── authRules.test.js       validation rules
│   ├── initialState.test.js    fresh farm, zones, session coercion
│   ├── shop.test.js            the purchase rule and the crop economy
│   ├── localAuth.test.js       the guest provider's contract
│   ├── saveApi.test.js         the server-save request shape
│   ├── store.test.js           persistence, save migration, corruption
│   └── transfer.test.js        save file format, checksum, import
│
└── docs/
    ├── setup.md                run it: migrations in order, and how to check each
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

## Weather reaches a crop by two paths, and there is no simulator

`js/domain/simulator.js` is **0 bytes and stays that way on purpose.** It was the plan's
answer to "what weather does to crops", and it is empty because the real answer turned out to
be two smaller answers rather than one loop:

| | At **sowing** | While the crop **stands** |
| :--- | :--- | :--- |
| Question | *is this a sensible thing to plant right now?* | *what is happening to it while I am away?* |
| Window | the next **6 hours** | elapsed time, since `lastTickAt` |
| Owner | `domain/weather.js` — `verdictFor()` | `domain/water.js` — `tick()` |
| Writes | `plot.health`, `plot.forecast` | `plot.waterLevel`, `plot.health`, `plot.dead` |

The 6-hour window is sized to the crop line: every crop is 4–8 hours (rice 6, wheat 5, potato
4, corn 8), so it covers a whole crop's life. The most severe hour wins, never an average, so
one frost hour among six cannot be averaged away. Health is floored at 25, so **weather wounds
and never kills** — the second path, dryness, is the only thing that can take a crop to 0, and
`domain/water.js` is therefore the only writer of `plot.dead: true` in the codebase.

A per-hour simulator was rejected for three reasons. It would have to run while the tab is
closed to be fair, which means replaying history rather than simulating. It would need its own
stored state, and `docs/crops.md` has said since the beginning that **the stage is never
stored** — a stored countdown goes stale the moment the tab is backgrounded. And both halves
are already deterministic from `(plantedAt, lastTickAt, forecast)`, so a loop adds a place for
the two to disagree without adding a decision.

See `docs/weather-events.md` for the numbers and DEC-039 for the sowing rule.

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
- **Never treat "could not reach the server" as "signed out".** Only a `400`/`401`
  clears a credential. This is ISS-048 and it is the single rule that most of
  `js/connection.js` exists to enforce.
- Every `fetch` carries an `AbortController` deadline.
- **Painted components carry their colours literally, and their class names flat.**
  `css/weather.css` and the three login stylesheets write `#6b431f` rather than a
  token, because a wooden board is brown in a dark theme too — a token would have
  nothing to switch (DEC-029). They also use `board-meter-value`, not
  `board__meter__value`: the token indirection and the BEM separator cost more than
  they save in files this size. `.card`, `.btn` and `.input` in `components.css` are
  the opposite case and stay tokenised, because they are app chrome that does follow
  `data-theme`.

## Module contracts

| Module | Exports | Notes |
| :--- | :--- | :--- |
| `state/store.js` | `getState`, `apply`, `subscribe`, `on`, `emit`, `save`, `saveNow`, `load`, `init`, `reset`, `clearSave`, `clearLocalSave`, `adoptState`, `exportPayload`, `readImport`, `getSync`, `flushPendingSave` | `subscribe` returns an unsubscribe fn. **`init`, `saveNow` and `clearSave` are async.** Emits `sync` with `synced`/`saving`/`pending` (ISS-050) |
| `state/saveFile.js` | `saveKey`, `writeSave`, `readSave`, `deleteSave` | the local cache writer |
| `services/saveApi.js` | `readRemoteSave`, `writeRemoteSave`, `deleteRemoteSave`, `countRemoteSaves` | the server save; takes the token per call |
| `remoteSave.js` | `buildServerSave` | the join, at the top of `js/` beside the entry points |
| `connection.js` | `mountConnectionStatus`, `advanceAnnouncement`, `wireSaveOnExit` | the chip + retry + one-time-toast wiring for all four pages. Top of `js/` because it needs `ui/`, `state/` and the toast bus at once |
| `services/geocodeApi.js` | `reverseGeocode`, `searchPlaces`, `placeNameFrom`, `formatCoordinates` | **The two directions use two different services and must never share one.** Open-Meteo is forward-search only (`name=`); reverse goes to BigDataCloud (`latitude`/`longitude`). Posting coordinates to `/v1/search` is a guaranteed `400` — ISS-077, and every farm was labelled "Current location" because of it. Both answer `{ok, …}` and never throw. `placeNameFrom` and `formatCoordinates` are pure and exported so the name ladder is testable offline — DEC-038 |
| `config/weatherEvents.js` | `WEATHER_EVENTS`, `classifyHour`, `eventRank`, `eventDrainPerHour` | a WMO code plus a reading → one of the nine events. `classifyHour`'s order is the spec's order, written as early returns on purpose: a `switch` gets it wrong the first time someone reorders the file |
| `config/seasons.js` | `SEASON`, `BANDS`, `bandForLat` | three latitude bands, each with its own calendar **and its own southern one**, written out rather than rotated — the old rotation by `SEASONS.length` was the identity, so both hemispheres answered identically |
| `domain/seasons.js` | `seasonFor`, `bandFor`, `isSuitableFor`, `seasonRating`, `allSeasonNames` | `seasonFor(location, date)` takes latitude, because a month alone does not say what season it is anywhere |
| `domain/weather.js` | `FORECAST_WINDOW_HOURS`, `WEATHER_HEALTH_FLOOR`, `SEASON_MISS_COST`, `forecastWindow`, `indexOfHour`, `worstEventIn`, `verdictFor` | a planting is judged **once, at sowing**, against the next six hours — the window is sized to the crop line, since every crop is 4–8 h. Health is floored so weather wounds but never kills. With no forecast `verdictFor` answers `{ok:false}` and the picker refuses — DEC-039, ISS-089 |
| `domain/farm.js` | `plant` | also writes `plot.health` and `plot.forecast` at sowing, so the health a harvest is paid on comes from weather the player could see before spending the seed |
| `js/main.js` | `needsLocationRefresh` | whether a save's location is looked up again on load: `!saved.pinned`, **or** the name is the one string ISS-077 could write. The second clause is what makes pre-fix saves migrate themselves — without it the repair only reaches farms created after it, because the broken code pinned the coordinates successfully and failed only to name them, so `pinned` was already `true`. A farm that has a real name is never re-resolved |
| `ui/blockedScreen.js` | `mountBlockedScreen`, `messageFor` | replaces the page when there is no session *because there is no connection* |
| `ui/syncIndicator.js` | `mountSyncIndicator`, `chipLabelFor`, `copyFor`, `describeStaleFor`, `SYNCED_NOTE` | the fixed corner chip. Label persistent, notice one-shot — DEC-037, ISS-076 |
| `state/transfer.js` | `exportToText`, `exportFilename`, `readExport`, `rebaseState`, `importFromText`, `verifySignature`, `SAVE_EXTENSION` | pure; the caller passes `now` |
| `utils/checksum.js` | `checksum`, `checksumsMatch` | FNV-1a. Detects damage, **not** tampering |
| `services/authApi.js` | `signIn`, `signUp`, `signOut`, `currentSession`, `requestPasswordReset`, `updatePassword`, `restoreSession`, `accessToken` | same contract as `localAuth.js`, except **`restoreSession()` answers `{ok, session\|reason}`, not `session\|null`** (ISS-048) |
| `services/gotrue.js` | `post`, `postAuthed`, `bestEffort`, `reasonFor` | transport only; never throws. Every call carries `AUTH_TIMEOUT_MS`, and failures carry the HTTP `status` |
| `services/tokenStore.js` | `readRefreshToken`, `writeRefreshToken` | the only writer of a token |
| `utils/log.js` | `createLog(scope)` | returns `{ info, warn, error }` |
| `utils/iso.js` | `plotToScreen`, `pumpBox`, `frameY` | plot and pump placement. Both axes come back as fractions of the **frame's width** and every number is read from `FIELD`; `frameY` is the single conversion to a height fraction, for `top`. `diamondClipPath` is promised by this row and still unwritten (ISS-004) |
| `ui/*` | `mountX(rootEl, actions)` | returns `unmount()`. **A return value is not a node** — see below |

**`mountX` returns `{ unmount }`, not a node, so it cannot be nested inside `el()`.**
`el()` appends `document.createTextNode(String(child))` for anything that is not a `Node`,
so passing a `mountX()` result straight in as a child renders the literal text
`[object Object]` and leaves the panel mounted into a detached element that never reaches
the page. To put a panel inside a card, make the host yourself, mount into it, and embed
the host — which is what `settingsView.js` does for `mountSavePanel`. Every call site in
the repo does this correctly except that one, and nothing in the unit tests could see it:
the settings DOM test now asserts both that the controls are present and that no
`[object Object]` appears on the page (ISS-051).
| `domain/*` | pure `(state, ...args)` functions | return `{ ok, state }` or `{ ok: false, reason }` |

`farm.stageOf` and `farm.isReady` are pure selectors, so UI calls them directly.
Everything that mutates goes through `store.apply` — **except** adopting an imported
save, which is not a domain function and gets its own `adoptState`.

---

## Field geometry

`js/utils/iso.js` is the only module that turns a `(col, row)` into a position, and
`js/config/field.js` holds the only numbers it reads. Nothing else may compute a plot position:
an inline copy in `farmView.js` is what ISS-065 was.

### The frame, and why there are two boxes

`.field-stage` is `{ position: relative; aspect-ratio: 1000 / 596; height: 100%; width: auto;
max-width: 100% }` — sized off the available **height**, so a wide-but-short viewport cannot make a
stage that overflows the screen. Inside it `.field-stage__mount` is `{ width: 100%;
aspect-ratio: 1000 / 596 }`, centred. **Everything that is part of the farm, `base.png` included,
lives inside the mount**, and `farmView.js` positions all of it in `%` of the mount.

Two boxes because `max-width` can clamp the stage in a narrow column: at a 1024px window the centre
column is 480 wide and the stage becomes 480 × 512, taller than it is wide. A plot sized in `%` of
*that* stage would be wider than the base it is standing on. The mount holds the base's shape at
every window size, so the field only ever gets smaller. It cannot end up taller than the stage
either: the stage's width is capped at `1000/596` of its own height, so `width / (1000/596)` always
fits inside the height it has.

`1000 / 596` is `base.png` — a 1000×1000 canvas whose slab occupies the middle 596 rows. A **square**
stage wasted about 40% of its height on the base's empty top and bottom and left 43% of the centre
column unused: at 1440×900 it was 509×509 inside an 896px column. The same height now buys a 68%
wider base, and every plot scales with it. The ratio is written twice — `FIELD.frameAspect` and
`aspect-ratio` in `css/scene.css` — and `tests/iso.test.js` asserts the two agree.

### Units

`iso.js` returns both axes as fractions of the frame's **width**. Not of its height, and not of the
stage.

Width is the natural unit because CSS agrees on it: a plot's `width` and its `padding-top` are both
percentages of the containing block's **width**, so in that unit a plot box is `tileScale` wide and
`tileScale * tileAspect` tall with no aspect term anywhere. `top` is the exception — it resolves
against the height. `iso.js`'s `frameY()` is the one conversion, and `farmView.js` applies it to
`top` and to nothing else.

`frameY(y) = (y - 0.202) / 0.596`. Those are `base.png`'s numbers: `object-fit: cover` on a
`1000/596` frame crops the canvas's middle 596 rows, so the visible band is canvas y `0.202..0.798`.
On a square field a width fraction **was** a height fraction and the conversion did nothing — which
is exactly why it can be left out by accident. Skipping it shears the field 68% vertically: every
plot correct in x, every row too far down.

Under `cover` the base maps to the mount 1:1, so one sentence holds for everything below: **a
fraction of the mount's width is a fraction of `base.png`'s width.**

```
n = FIELD.size
shift(i)  = (i - (n-1)/2) * (1 + gap) + (i >= n/2 ? crossGap/2 : -crossGap/2)
u = shift(col);  v = shift(row)

centerX = originX + (u - v) * tileScale / 2                  (frame-width fractions)
centerY = originY + (u + v) * tileScale * tileAspect / 2

left        = centerX
top         = frameY(centerY)
box width   = tileScale       (a % of the frame's width)
box height  = tileScale       (also a % of the frame's width — written as `padding-top`)
z-index     = col + row
```

The code writes `centerX` into `left` and `frameY(centerY)` into `top`, and lets
`translate(-50%, -50%)` do both subtractions — same result, one fewer place to get the aspect wrong.

**The box is square: `tileScale` on `width` and the same number on `padding-top`.** `ground_*.png`
is a square 1000×1000 canvas whose diamond is only 53.8% of its height, so a box of
`tileScale * tileAspect` tall makes `object-fit: contain` fit the whole canvas to the box's *height*
and draw every plot at half size, spaced as though it were twice as large (ISS-070). That is what
shipped until T-54 and it is why the plots looked too small for the base. `tileAspect` now appears
in exactly one place, the vertical step above, which is what it is for.

`col` increases toward the lower right, `row` toward the lower left, so plot `(0,0)` is the top
vertex and `(n-1, n-1)` the bottom. `base.png` fills the mount at `z-index: 0`.

Both terms in `shift()` earn their place:

- `(i - (n-1)/2)` centres the axis. The indices run `0..n-1`, so their mean is `(n-1)/2`, not
  0. Drop it and the cluster lands up to `(n-1)` steps off centre. The two screen axes are
  **not** interchangeable here: `col - row` averages 0 over a square grid and hides the
  omission, while `col + row` averages `n - 1` and shows it as a field sitting 15.3% of the
  frame too low (ISS-065).
- The `crossGap` term moves the far indices out and the near ones in by the same amount, which
  opens the dirt cross **without** moving the cluster's centre.

At the defaults the cluster is 4.21 × 2.265 tile-widths — 0.9666 × 0.5200 of the frame. Measured
against `base.png`'s top face that **fills it front-to-back** and leaves a 0.013 border at the left
and right, about 1.3% of the frame. An **even** rim does not exist at any `tileScale`: the cluster is
2.7% too tall for the slab, and ISS-071 has the arithmetic.

The pump uses the same centre formula at `u = v = 0`, i.e. `originX, originY`, the middle of
the cross. `pumpBox()` returns that centre plus `pumpScale` as a **box** width; `translate(-50%,
-50%)` in `css/scene.css` anchors it, and `pointer-events: none` keeps the oversized box from
stealing plot clicks (ISS-007). It sits at `z-index: 20`, above every plot, because the four
central plots would otherwise paint over it — and selection and hover stack above *that*,
`.plot--selected` at `100` and `.plot:hover` at `200`, since a plot's own `z-index` runs
`0..2(n-1)` and any smaller number loses to the bottom two rows.

### Measured constants

Every plot PNG is 1000×1000 with transparent corners, so the visible diamond sits inside the
box. These were measured from the alpha bounding boxes, not guessed:

| Asset | Content box | h/w | Centre |
| :--- | :--- | :--- | :--- |
| `ground_unwatered.png` | 991 × 533 | **0.538** | (0.503, 0.490) |
| `ground_watered.png` | 987 × 537 | 0.544 | (0.503, 0.492) |
| `base.png` top face | 992 × 520 | **0.524** | (0.503, 0.462) |
| `base.png` bounding box | 992 × 596 | 0.601 | (0.503, 0.500) |
| `crops/rice/rice_3.png` | 997 × 587 | 0.589 | (0.498, 0.499) |
| `pump.png` | 279 × 237 | — | (0.499, 0.500) |

Consequences, all already applied to `js/config/field.js`:

- `diamondClipPath()` uses `polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)`. The real diamond
  runs 22.4%–75.6% vertically; rounding the bottom tip out to 78% inflates the click target
  past the visible art. **Implemented in T-55 as the `.plot__hit` rule in `css/scene.css`**,
  with the constant `FIELD.DIAMOND_CLIP` and a test asserting the two agree — see Click
  targets below, and ISS-004.
- `tileScale: 0.2296` is a **chosen fit, not a solved value**, and the difference from the old
  `0.204` is the whole story. The cluster is 4.21 × `tileScale` wide and 2.265 × `tileScale` tall
  at the default `gap`/`crossGap`; solving `4.21t + 2r = 0.992` against `2.265t + 2r = 0.520` — the
  top face, not the bounding box — gives `t = 0.243`, **`r = -0.015`**. A negative rim: the cluster
  is 2.7% too tall for the slab, because `ground_*.png`'s `0.538` aspect does not tile a `0.524`
  surface, so an even border does not exist and no constant can produce one. `0.2296` fills the
  face front-to-back instead, which is the fit that reads closest to the reference render. ISS-071,
  DEC-034.
- `tileAspect: 0.538`, not a rounded guess. A 3% error compounds across three row steps and
  visibly pulls the bottom row out of alignment with the top. Re-measured 2026-10-16 at
  991 × **535** → 0.5399 against the 991 × 533 above; that two-row spread is the alpha
  threshold, not a defect, and `0.538` is left alone (ISS-003, now stale).
- `originX: 0.503`, `originY: 0.462` — the centre of `base.png`'s **top face**, the surface the
  plots stand on, and *not* the bounding box centre at y `0.4995`. `base.png` is an extruded slab:
  its row widths plateau over y `462..533`, which is the vertical skirt, and the slab's bounding
  box runs `202..797`. Reading "widest rows at mid-height, therefore flat" is the trap — for an
  extruded slab the plateau centre lands at the bounding box centre too, and the tell is that the
  plateau is 72 rows tall rather than 1. Using the bounding box centre put the field 3.7% of the
  frame too low with the front row hanging onto the bevel. ISS-069.
- `pump.png` art occupies 27.9% of its 1000×1000 canvas, so `pumpScale: 0.25` renders a pump
  about **30%** of a plot's width. See ISS-007 for the consequence: the box is nearly four times
  wider than the pump drawn inside it.

`baseArtTop: 0.202`, `baseArtHeight: 0.596` and `frameAspect: 1/0.596` are the same measurement
taken one level out — where the art sits inside the canvas, which is what `object-fit: cover` crops
to. The stage, the mount and `iso.js`'s `frameY()` all derive from them, so the art is never scaled
and never shifted: the pad is the only thing removed.

Reference renders: `docs/reference/field-reference.jpeg`.

## Click targets

Each plot is a `<button class="plot">`, and the button's box is **not** its hit area. `css/scene.css`
puts `pointer-events: none` on the button — the property inherits, so the whole square canvas box is
inert and every `<img>` layer inside it comes along — and the one thing that answers a pointer is an
empty `.plot__hit` layer, which turns it back on with `pointer-events: auto` and carries the diamond
`clip-path`. Clicks, focus and keyboard activation all land on the button; the diamond layer decides
*where* it can be hit.

```
pointer-events: none  .plot        every child inherits it, square box inert
pointer-events: auto   .plot__hit   the diamond, and only the diamond, is live
clip-path             .plot__hit   polygon(50% 22.4%, 100% 50%, 50% 75.6%, 0 50%)
```

The clip lives on `.plot__hit` and **not** on the button for a reason worth keeping: `clip-path` clips
everything an element paints, including its `outline`. A clipped button would have no visible
`:focus-visible` ring — `reset.css` draws that outside the border box, so outside a diamond clip
entirely — and no visible `.plot--selected::after` ring, which is at `inset: -4px` for the same
reason. Both would stop rendering with nothing to say so. That is ISS-074.

The box is square (see Units above), which is the canvas's shape, and the diamond covers only the middle
53.8% of its height. Nothing got worse by squaring it — the plots drawn in it are more than twice the size
they were — but it does mean a neighbour's box overlaps by a whole half-box vertically, so hit testing
the box answers **66.2%** of each tile's visible surface as a different plot. Measured, not estimated:
60×60 samples per diamond against all sixteen plot boxes. With the clip the same measurement returns
0%, which is exact rather than approximate because the `gap` leaves the diamonds genuinely disjoint.

The layers inside the button are `<span>`s rather than `<div>`s, because a button's content model is
phrasing content. They are absolutely positioned, so the element name is free either way. The images get
`draggable="false"` as well as the inherited `pointer-events: none`: a square PNG is draggable by
default, and a drag started on a plot is a click the player never meant.

Plots are real buttons, so they get keyboard focus and keyboard activation for free. Do not replace them
with divs.

## Known simplifications

- `simulator.tick` reads `state.weather.hourly[0]` as the current event, but weather is only
  re-fetched every 15 minutes while `hourly[0]` is the hour the response was built for. The
  active event can therefore lag real conditions by up to about 1 h 15 m. Weather is real-data
  only, so the player cannot correct this. It is a deliberate MVP simplification, not a bug —
  see `DEC-013`.
- `field-reference.jpeg` shows a farmhouse, pipework and more than 16 plots. Those are mockup
  extras, out of scope. The cross paths in that render are simply `base.png` showing through
  the `crossGap` between the four 2×2 zones, which is why no path art is needed.
- **Guest farms are local.** "Play as guest" writes nothing to the server: clearing site data
  destroys that farm permanently and it cannot be exported. Signed-in play is real, via Supabase.
  ISS-026 stays open because the anon key in the client is only safe while Row Level Security is
  on, and no schema exists yet.
- **Password reset needs a dashboard setting.** It only works if the requesting origin is in
  Supabase's **Redirect URLs**, which cannot be committed — ISS-031. The README says so.
- **An exported `.farm` file is integrity-checked, not authenticated.** A corrupted or
  hand-edited file is refused, but anyone who reads `utils/checksum.js` can recompute the
  checksum and change the numbers. There is a test that does exactly that and asserts it
  succeeds, so the limit is executable rather than a claim. Closing it needs a server-held
  key — DEC-021.
- **`.farm` collides with other farming games**, so the magic header `FFARM/1`, not the
  extension, is what identifies our files. Another game's `.farm` is refused with a clear
  message. Double-clicking one does nothing, by design — there is no installed app.
