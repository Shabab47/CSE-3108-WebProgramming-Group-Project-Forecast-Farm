# Decisions

Short records of choices that were made, so nobody re-litigates them or accidentally reverses
them. Newest first.

Format: who decided, the choice, why, and what was rejected.

---

> ## ⚠️ Three ids are duplicated — ISS-100
>
> **DEC-039, DEC-040 and DEC-041 each name two unrelated decisions.** They were allocated
> independently on two branches on the same day, 17 October, and neither could see the other's
> numbering. All six entries are real and all six are in force; only the ids collide.
>
> | Id | Land and economy (Shabab) | Weather and water (Hisham) |
> | :--- | :--- | :--- |
> | DEC-039 | One file per crop and per land segment | Weather is judged once, at sowing, over six hours |
> | DEC-040 | The player starts owning one plot | The pump waters one plot |
> | DEC-041 | One seed unlocks every four land segments | The optimal band, and damage as a latch |
>
> **Do not follow a bare `DEC-040` reference until this is fixed.** About twenty-eight references
> exist across `js/`, `tests/` and `docs/`, and each has to be read in context to know which of the
> two it means. The renumber was not done here because touching that many files — code comments,
> test names and docs — on the last day before a demo is a poor trade for a numbering tidy.
>
> The fix is mechanical and belongs to whoever picks up ISS-100: keep the land trio as
> 039/040/041 (it is the older commit, `29c8eb4`), move the weather trio to 043/044/045 after
> DEC-042, and update every reference to match. Nothing else changes.

---

### DEC-062 The farm page is painted, and the phone is not
**Decided by:** Kafi · 2026-10-31

**Choice:** `assets/images/farm_bg.png` sits behind the whole game page — every panel, the
forecast board and the field — on viewports **wider than 900px**. Below that the layer is
`display: none` and the page keeps `--bg`. The path lives in `js/config/assets.js` (`FARM_BG`)
and is applied by `paintFarmScene()` in `js/main.js`, the same way the login page applies
`MENU_BG`.

**Why:** the painting is a farm yard with an empty dirt centre, which is exactly the space the
isometric field needs around it, and a flat `#f4f6f3` behind a painted slab looked unfinished on
a monitor. `900px` is not a new number: it is the breakpoint the phone layout already uses, so the
backdrop appears precisely when the desktop grid does and never on the reflowed single column.

**Why `display: none` rather than `background-image: none`:** a box that is never generated never
fetches its background. The file is 2.2MB, so hiding the layer with a media query is what keeps a
phone from paying for art it cannot see — and it is why the URL is set on the element by JS rather
than written into a `@media (min-width: 901px)` rule, which cannot live in `assets.js`.

**Rejected:** painting it behind `#farm-view` only. The image is a wide scene with fence, yard,
well and house; cropped to the field's 1000:596 frame it loses the edges that make it read as a
place, and the panels stay flat anyway.

**Also rejected:** any player or debug control over it. The backdrop is scenery and follows the
same rule as the weather: nothing the player does changes the sky behind the farm.

---

### DEC-063 The environment card is a timber plaque, and its sentences are behind an (i)
**Decided by:** Kafi · 2026-10-31

**Choice:** the card is a 20px-radius timber frame with a 7px grain rim and a parchment panel
inside, built from the same CSS recipe as `css/farm-dialog.css` and `css/sign.css`. Each meter
keeps its label, reading, fill and tone colour; the note — and a one-line explanation of what the
meter measures — moves into a strip that opens under the row, one at a time, from an (i) on the
row. The rules live in `css/env-card.css`, out of `css/scene.css`.

**Why:** the card is the only thing on the rail that is *about the farm* rather than about the
account, and the rail's glass cards made it read as one more piece of chrome. The wood puts it in
the family the inspector, the seed picker and the board already belong to.

**This supersedes the reasoning in `js/ui/envMetrics.js` that the note is always printed.** That
argument — "colour alone is not an instruction" — was about a card where the note was the only
instruction. It is still right about *urgency*, which is why the tone colours stay on the row, but
three sentences on a rail that also holds the purse is text nobody rereads. The (i) is the same
trade the seed picker already makes (DEC-059).

**Rejected:** a floating popover anchored to the (i). `.env__pill` is `overflow: hidden` so its
radius can clip the meter fill, so a popover inside the row would be cut off, and one positioned
outside it needs viewport maths and a resize story for a sentence. The in-flow strip needs
neither and works unchanged on the phone.

**Also rejected:** keeping the notes visible on the phone. Two layouts of the same card, one of
which says more, is the drift this project has spent three weeks removing.

---

### DEC-061 A recovery link carries a token hash to our own page, and the page verifies it
**Decided by:** Shabab · 2026-10-27

**Choice:** The Supabase **Recovery** email template links to
`login.html?token_hash={{ .TokenHash }}&type=recovery`, and `js/auth-main.js` exchanges that hash
with `verifyOtp` (`POST /auth/v1/verify`) before mounting anything. `{{ .ConfirmationURL }}` is no
longer used. The old shapes are still read — `#access_token=…` and `#error=…` — because links
already sitting in inboxes cannot be recalled, and because a broken link must be *explained*, not
swallowed.

**Why:** every failure in ISS-031 came from one property of the old link: GoTrue exchanged a
one-time token on a plain `GET` and then `303`-ed the browser through `redirect_to`, the Site URL
and the redirect allow list, handing the result over in a URL fragment. Four things then had to be
right at once, and each of them went wrong in practice:

- `redirect_to` was silently replaced with the Site URL, so the token landed on `/`;
- `js/main.js` bounced the anonymous visitor with `location.replace('login.html')`, which **drops
  the fragment** — the token was destroyed by our own code on the way to the page that reads it;
- the same link produced two `/verify` calls, so the token was often spent before the player's
  navigation arrived;
- and when it failed, `#error=otp_expired` reached the page unread and the player saw the menu.

A token hash fixes all four at the root: there is no redirect, so no Site URL and no allow list; no
fragment, so nothing can be dropped; and the token is spent by an explicit JS call, so a mail
scanner or link preview that fetches the URL consumes nothing.

**Rejected:** keeping the implicit flow and fixing the configuration. It was tried for several
hours — Site URL set to `login.html`, the exact URL and `/**` both allow-listed, probes confirming
both were honoured — and a brand-new email still arrived with `redirect_to=http://127.0.0.1:5173/`.
Even had that been solved, the prefetch problem and the fragment-dropping bounce would have
remained.

**Also rejected:** persisting the session from `verifyOtp`. The refresh token is deliberately
dropped: the player is about to choose a password and sign in with it, and a session kept alive
across an abandoned reset is a credential nobody asked for.

---

### DEC-060 Tomato is playable, and holds stage 4 from hour 3 to hour 5
**Decided by:** Shabab · 2026-10-25

**Choice:** Tomato is `available: true`. All five growth sprites are square 1024×1024, the
registry records their real sizes, and the two damage sprites are registered and mapped in
`CUSTOM_FAILURE_NAMES`. Tomato also carries its own stage schedule, `stageHours: [0, 1, 2, 3, 5]`:
stages 1–3 change hourly, **stage 4 is held for hours 3–5**, and `tomato_5.png` arrives at hour 5
for the final hour before harvest. `growthStage()` in `js/config/crops.js` reads `stageHours`
when a crop declares it and otherwise keeps using the shared `stageAt()` formula, so rice, potato,
wheat and corn are untouched.

**Why:** tomato takes six hours and has five sprites, so exactly one stage must cover two hours.
`stageAt()` would repeat stage 5, which puts the ripe picture on the field from hour 4 — two hours
before the crop can be harvested. Repeating stage 4 instead means the "finished" look appears only
one hour early. Keeping the schedule in the crop's own file means the next unusual cadence is
still a data change, and having both the crop's `stageFor()` and the field's `growthStage()` read
the same array stops the picture and the readiness rule from drifting apart.

**Rejected:** holding stage 5 for two hours (`stageAt()`'s default, consistent with rice but
promises a harvest that is not there); shortening `growHours` to 5 (would change the economy and
make tomato faster than rice); commissioning a sixth sprite (no art yet, and `STAGE_COUNT` stays
five until every crop has six); a special case for tomato inside `growthStage()` (would put crop
data in the index).

**Consequence:** `js/crops_logics/stageMath.js` gains `stageFromHours()`; `tomato.js` gains
`stageHours`; `tests/farm.test.js` pins the whole hour table and checks that `growthStage()` and
tomato's own `stageFor()` agree. `.plot__damage` keeps the crop's box (`93% / 6.5% / 50.5%`), and
`tests/assets.test.js` now measures text assets with LF so a Windows checkout's CRLF does not read
as a stale registry. ISS-093, ISS-121 and ISS-123 are closed by this.

---

### DEC-059 The seed picker shows small separable cards, with details behind an info icon
**Decided by:** Jim · 2026-10-23

**Choice:** The picker frame (`182:129`) shows one small separable row per seed type — sprite
(44×50 in a 56×56 box), name, and "×count · hours" — with an info icon (16×16) at the right of
each row. Clicking a row plants that seed. The info icon opens the seed-details frame (`188:23`)
in the same host: full sprite (66×74 in an 80×88 box), name, quantity, grow time, sell value,
growing advice, and a weather-outlook box, with a "Back to seed choices" button to return.
The footer keeps "Open the shop" (empty bag) / "Plant {crop}" / "Never mind".

**Why:** The previous design made the whole detail card the plant button, which packed the
grow note and weather verdict onto every row and made it hard to tell where to click when
multiple seeds are available. Small separable cards make each seed its own clear target, and
the info icon defers the secondary information (advice, outlook, sell value) to a details
dialog rather than crowding the picker. One row per seed type keeps the list scannable, and
the disabled attribute (styled with opacity) honestly reflects "no forecast" without hiding
the seed.

**Rejected:** the whole-card-is-the-button design from T-78 (two targets for one action,
crowded rows); showing the grow note and weather on every small card; a separate "Plant"
footer button beside each card.

**Consequence:** `css/crop-picker.css` now carries both the small card styles and the
details-dialog styles. `.crop-picker__weather` moved from the picker row into the details
outlook box. The harvest value ("sells for Xg") moved from the picker row into the details
dialog. `tests/cropPicker.test.js` was updated to check the details dialog for the weather
line and sell value, and to check disabled state rather than a "waiting" message for no
forecast.

---

### DEC-058 The plot inspector and seed picker share one timber dialog
**Decided by:** Jim · 2026-10-23

**Choice:** The three Figma frames — plot inspector `182:81`, seed picker with no seeds
`182:109`, seed picker with rice `182:129` — are built as one shared `.farm-dialog` chrome in
`css/farm-dialog.css`: a 402px timber frame, a 384px parchment panel, a 68px heading with a close
tile or leaf ornament, a 1px rule and a 140px stacked action column. The inspector is the 463px
variant with a horizontal 18px water gauge, a `2×24px` green target notch that overhangs the
track, and a pill that carries only the live water state; the permanent damage word lives in the
status sentence. The picker is the 305px no-seed variant or the 477px seeded variant, with one
scrollable detail card per seed type. **The seed card itself is the plant button.** The footer
keeps the Figma labels *"Open the shop"* and *"Never mind"*.

**Why:** The two dialogs are the same object at two heights. Sharing the frame, heading, rule,
buttons and close/leaf slots means the next tweak cannot land in one and miss the other. The seed
card has no separate *Plant* button in the Figma frame, and adding one would create two targets
for a single action — exactly the ambiguity the click-to-inspect change removed. The horizontal
gauge reads at a glance, and the overhanging notch is how the frame marks the target without
painting a band over the water level.

**Rejected:** a separate inspector stylesheet (the pre-T-78 duplication); the old vertical gauge;
a footer *Plant* button beside the card; an extra `.inspector__scrim` inside the shared host
(ISS-118); the Figma *Original Rice illustration* raster, which is a crop of the old dialog
screenshot rather than a usable asset — the real seed-packet art is used instead.

**Consequence:** The panel, button and water-card strokes are **inset box-shadows**, not CSS
borders. A `1.5px` border would take 3px out of the measured 344px content column and the
`48px` button label area; the inset shadow paints the same stroke without consuming layout space.
Do not convert them to borders without re-measuring. `#farm-picker` stays in
`css/crop-picker.css`: it is the picker's viewport host (reused by the inspector), and
`tests/mainPageBoot.test.js` reads that file for its fixed/inset/`:empty` contract.

**Revised 2026-10-28 (three ways out).** Each dialog now closes from the dimmed background and
from Escape as well as from its × / *Never mind*, and all three run the dialog's one `onClose`, so
they cannot disagree about what closing means. The rule is `event.target === #farm-picker`: the
host is the overlay, so a click on its margin is a dismissal and a click on the card — even a
button inside it — is not. Escape listens on the `document`, because neither card takes focus
when it opens, so a keydown aimed at the overlay would only arrive after the player had already
clicked inside it. `js/ui/backdropDismiss.js` owns both listeners, one registration per host,
and the panels detach it on `unmount`; a handler left behind would let an Escape on the farm run
a closed card's `onClose`. The host stays `display: none` while empty, so there is no invisible
surface eating clicks.

---

### DEC-058 The pump has five levels, and every outlet waters one plot
**Decided by:** Hisham · 2026-10-23

**Choice:** `state.pump` is `{ on, level, targets: [] }`. Five levels, bought in the shop's own
**Pump** section, each adding outlets at the same per-outlet rate:

| level | plots watered | land gate | price | field drawing |
| ---: | ---: | ---: | ---: | :--- |
| 1 | 2 | none — free starter | 0 | `pump_1.png` |
| 2 | 4 | 4 owned | 1,000 | `pump_2.png` |
| 3 | 8 | 8 owned | 5,000 | `pump_3.png` |
| 4 | 12 | 12 owned | 25,000 | `pump_4.png` |
| 5 | 16 | 16 owned | 100,000 | `pump_5.png` |

**Revised 2026-10-28 (capacities only).** The first version of this table watered
1 / 2 / 4 / 8 / 16 plots. The starter pump now waters two plots, and from level 2 up a pump
waters exactly as many plots as the land that unlocks it (4, 8, 12, 16). The art is unchanged
and one-to-one: level **N** wears `pump_N.png`, so the five drawings serve the five levels in
order and nothing is retired. The mapping is the one table `PUMP_DRAWING` in
`js/config/assets.js`, so retiring or adding a drawing is a one-line change. Gates and prices
are unchanged. Level numbers are unchanged too, so no save needs migrating: an existing farm
keeps its level and simply reaches further.

The player adds or removes targets by clicking plots; the inspector's button carries the intent
(`add`, `remove`, `resume`, or a disabled `full`). `aimPump()` refuses past capacity and
`pumpRuns()` caps the job list again, because the tick is the path that actually spends gold.
Every target is billed only for the water that lands, in target order; gold runs out on the
last target that can be paid for. The pump stops itself only when **every** target has reached
its target, or the purse is empty. A legacy `{ on, target }` save is repaired to
`{ on, level: 1, targets: [target] }` by `ensurePump()` on load and import, without a
`STATE_VERSION` bump. The shop card shows exactly one image — the **next** level's art, or
level 5 at max — and exactly one button, `UPGRADE`; at max the button is replaced by “Fully
upgraded”. The card always states the gate and the owned count: *“Requires 4 owned plots —
you own 2.”*, appending *“Ready.”* when met.

**Why:** The old one-plot rule made the bill scale with thirst instead of land, which was the
right instinct, but it also made a sixteen-plot farm unable to answer a drought without the
player moving the pump by hand. Keeping the **per-litre** price and adding outlets solves both:
capacity buys reach, not cheaper water, so a bigger machine does not erase the decision to run
it. The land gates reuse the same progression counter seed unlocks already read, and the prices
are steep enough that level 5 is a late-game convenience rather than a purchase that competes
with the next seed packet. The art changes on the field immediately because the pump's level is
part of the field signature.

**Supersedes:** the pump entry of **DEC-040** (the weather/water one — see ISS-100) from “one
plot at a time” to “one plot per outlet, with capacity bought”. It also supersedes the
*“Buying it is later”* sentence of **DEC-008**; the machine is still pre-owned at level 1, so
DEC-008's reason — do not gate the drought answer behind 250 gold — survives intact.

**Rejected:** watering the whole farm at level 1 (makes the bill scale with land, the thing
DEC-040 was avoiding); reducing each outlet's rate as capacity grows (makes “2× rain” a lie);
bumping `STATE_VERSION` for a field that `ensurePump()` can repair in place; and making the
pump a sixth seed card (it is one machine bought in steps, not a repeat purchase).

---

### DEC-056 The phone screen is the same game DOM reflowed, not a second view
**Decided by:** Jim · 2026-10-21

**Choice:** At `max-width: 900px` the game page reflows its existing mount points into a two-column
phone layout capped at 480px and centred, with the 430 × 1232 Figma frame as the 1:1 target.
`css/phone.css` owns the shell, 68px header, season/purse row and full-width field;
`css/phone-panels.css` owns the environment card and bottom menu; `css/phone-weather.css` owns the
board, search and current note; `css/phone-forecast.css` owns the meters and six-hour strip. A new
`.app__menu` wrapper is `display: contents` on desktop and a real three-card grid on the phone.
`.app__sidebar`, `.app__centre` and `.app__rail` also become `display: contents`, so their children
become grid items of `.app` without moving any mount point in `main.js`.

**Why:** A second markup tree, a static screenshot or a separate demo would drift from the real
weather, pump, field clicks and save immediately. `display: contents` keeps every existing owner and
all of `main.js`'s wiring while the phone composes the same nodes in one column. It also means the
desktop page needs no duplicated slot and no JavaScript viewport branch.

**Rejected:** duplicating the board/field into a phone-only DOM; using the Figma artwork as a static
field; branching on viewport width in JavaScript; changing the desktop grid or card dimensions.

**Consequence:** `.app__menu` is the only new wrapper. The environment card keeps its emoji on
desktop and shows Lucide `droplets` / `snowflake` / `flame` on the phone, selected by CSS from markup
that carries both. The 900px breakpoint is shared with the existing stacked shell, and 901px and up is
the unchanged desktop layout. At 360px the first screen scrolls vertically, but there is no horizontal
overflow; the field remains interactive at every size.

---

### DEC-057 Phone typography unified with PC game scene, and gold labels removed
**Decided by:** Jim · 2026-10-21

**Choice:** The phone layout now uses the same font stacks as the PC game page:
- **Luckiest Guy** — gold amount (both game scene and shop purse), big current temperature value.
- **System UI** — temperature unit, search, note labels, location, foot, feels-like, board meters, hour notes, environment card title/labels/values/notes.
- **Irish Grover** — season name/date, navbar wordmark (unchanged).

Redundant labels were removed from the DOM: "Gold" from the game scene's purse, "Purse" from the shop purse.

**Why:** The Figma frame used placeholder fonts; the PC game scene already had a consistent typographic language. Keeping two different font stacks across breakpoints created a visual disconnect. The labels were noise — the coin icon already signals currency.

**Rejected:** keeping the Figma fonts on phone; keeping the labels for "clarity" (the icon + Luckiest Guy number is unmistakable).

**Consequence:** phone CSS overrides removed; JS mount points no longer emit the label spans; shop purse inherits Luckiest Guy from its container. Layout sizes/colors/weights stay per Figma where they fit; only font families change.

---

### DEC-055 A new account chooses an avatar before its first farm, and hands it over in the URL
**Decided by:** Jim · 2026-10-20

**Choice:** A successful create-account with a session opens a fifth login-page view,
`avatar`, on the same wooden sign. It offers the four presets, preselects `farmer1`, and has
no Back or Skip. **Start farming** calls `onAuthenticated(session, { avatar })`;
`js/auth-main.js` redirects to `index.html?avatar=farmerN`. `js/main.js` validates the value,
passes it to `buildInitialState(session, { avatar })` when there is no save, then removes it
from the address bar with `history.replaceState`.

**Why:** The account exists but the farm does not, so this is the only moment the picture can
be the first thing the player chooses rather than a setting they have to discover afterwards.
The sign-up form would become longer for a cosmetic choice, and a profile-only picker leaves
the first farm on the gray default.

**Why the URL:** `state/store.js` is the only writer of game state, and `login.html` has no
store. Writing a pending avatar into localStorage would make the login page a second writer
and leave a value to clean up if the player abandoned the step. The URL is a one-load handoff
that is validated before it reaches the save, and the first save already carries the avatar,
so there is no null-avatar save to race.

**Confirmation-on:** if sign-up returns no session, no farm exists. The current "check your
inbox" notice is kept, and the avatar is chosen on the Profile page after the first sign-in.
Email confirmation is off today (`docs/setup.md`), so the normal path is the new step.

**Rejected:** a pending-avatar key in localStorage; putting the choice in Supabase user
metadata (an extra API round trip and a second source of truth); adding another field to the
create-account form.

---

### DEC-054 A timestamp-less damage latch is cleared once, not guessed at
**Decided by:** Jim · 2026-10-20

**Choice:** `applyDamage()` stamps `plot.damageAt` in game time and refuses a latch before the
crop has lived its hold — one hour for `dry`, two for `waterlogged`. On load and import,
`ensurePlausibleDamage()` clears any latch with no timestamp, a timestamp earlier than
`plantedAt + hold`, or no crop at all.

**Why:** Before ISS-114 a save recorded **that** damage had latched, never **when**. A badge
inherited from the previous crop and one earned by the current crop were therefore identical,
and a 33-minute-old rice crop could show drought art that needs an hour below the floor.
Clearing is the only repair that works however long the save sits before it is loaded; leaving
it would keep the sprite until harvest.

**Consequence:** A legitimate pre-ISS-114 latch also loses its badge once. Health already spent
is not refunded. From this build on, `damageAt` is the record, so the repair only touches saves
that predate it. The UI still offers `clear` only for a dead crop: a living crop heals by
repair, not by making damage removable.

**Rejected:** Adding a `clear` action for a living crop. That would make every latch optional,
the opposite of the permanence the game is built on. The bad state was the missing timestamp,
not the absence of a clear button.

---

### DEC-053 The seed bag is a page, and it is read-only
**Decided by:** Kafi · 2026-10-20

**Choice:** `inventory.html` with its own entry (`js/inventory-main.js`), reached from the crate
button under the almanac button. It resolves the session and loads the save like `shop-main.js`
does, then lists every crop with how many seeds are in the bag. It has no buy or sell buttons.

**Why:** The bag is a view of the save, so it needs the session and the save the same way the shop
does — the almanac could be static, this cannot. But it is not the shop: the shop is where a seed is
bought or sold, and this page is where a player checks what they hold, so giving it buttons would be
a second place to spend gold and a second thing that can disagree with the shop.

**Consequence:** The bag reads `state.inventory.seeds` only. The shop stays the single writer of
that field, so a count on this page can never drift from a count in the shop.

---

### DEC-052 The almanac is a static reference page, not a gated one
**Decided by:** Kafi · 2026-10-20

**Choice:** `almanac.html` is its own page with its own entry (`js/almanac-main.js`), guarded on
`#almanac-root`. It resolves no session, reads no save and fetches nothing — the crop numbers come
from `js/config/`, which is already on the page. It is reached from the book button on the farm
sidebar (`js/ui/almanacLauncher.js`, renamed from `inventoryLauncher.js`).

**Why:** ISS-019 asked for an entry script because `js/main.js` boots the whole game — session,
simulator, weather — for a page that only wants reference text. A static page is the honest
version: the almanac has nothing to be signed in for.

**Consequence:** The "Back to farm" link cannot read `session.status`, because there is no session.
A guest session lives in the URL (`?guest=1`), so the entry forwards that flag from its own query
string. The button's href is built by `almanacHref(session)` in `js/main.js`, which is where the
flag is set.

**Rejected:** Resolving the session like `shop-main.js` does. It would bounce a bookmarked,
signed-out visitor to the login page — the opposite of a tutorial — and boot the auth provider for
a page that needs none.

---

### DEC-051 Profile avatars are presets stored as an id, not uploaded files
**Decided by:** Jim · 2026-10-20

**Choice:** the profile page offers the default gray person plus seven inline-SVG presets:
`farmer1` (Farmer 1), `farmer2` (Farmer 2), `farmer3` (Painter), `farmer4` (Party Guy),
`farmer5` (Neta Yahoo), `farmer6` (Boltu) and `farmer7` (Apa). `state.profile.avatar` holds
one of those ids, or `null` for the default.
`js/config/avatars.js` owns the list the store validates, `js/ui/avatarArt.js` owns the drawings,
and `accountCard.js` renders the picker. The choice is saved through `setAvatar()` like any other
state change, so it syncs on an authed farm and stays local for a guest. Erasing progress keeps the
avatar — it is a profile choice, not farm progress. Deleting the account removes it with the save.

**Revised 2026-10-28 (more presets, same rules).** The first version offered four presets. Three
more were added with their own artwork and names; the storage rule is unchanged, and an id this
build does not know still reads as the default. `avatarArt()` returns `null` for that default and
suffixes its internal SVG ids per render, because the profile page shows the selected preset twice
(main circle and picker option).

**Why presets.** An upload needs a file picker, image decoding, canvas resizing, compression, a size
and MIME check, data-URL or object-storage handling, and browser-only tests to get one picture onto
a circle. A fixed set of ids delivers the actual request — "choose a picture" — with none of that
surface, and they cannot produce a broken image. Inline SVG also avoids adding more files to the
asset registry and the 0-byte-art problem (DEC-014).

**Why the state field is only an id.** It keeps the save small and provider-neutral: no Supabase
migration, no binary in the JSON, and a save file that stays readable. An unknown or missing id is
treated as the default by `ensureProfile()`; no `STATE_VERSION` bump is needed for one cosmetic key.

**Rejected:** file upload; a separate avatar table or storage bucket; storing a data URL in the
save; adding PNGs to `assets/images/`. Also rejected: keeping initials, which read as a generated
name badge rather than the empty state.

**Amended 2026-10-20:** `farmer3` joined the list under the same rule. The state shape, store
validation and fallback are unchanged; only the list, the drawing and the tests grew. The farm
navbar's profile tile also mirrors the choice: it renders `avatarArt(state.profile.avatar)`, or
the same gray person as the account card for `null` and unknown ids, and still links to
`profile.html`. It is a second view of the choice, not a second state field.

**Amended 2026-10-20 (fourth preset):** `farmer4` joined the list with its supplied drawing. The
picker row wraps rather than overflowing if the panel is narrower than five options. This drawing
carries `<clipPath>` ids, so `avatarArt()` suffixes them per render; the same preset is painted in
the main circle and in the picker, and the two copies must not repeat an id in the document.

---

### DEC-050 Account pages are painted art, and do not follow the theme
**Decided by:** Jim · 2026-10-20

**Choice:** `profile.html` and `settings.html` wear the shop's painted frame — grass, log posts, a
beam, a hanging wooden sign, a dark wall and a stone base — with cream cards inside it, and neither
page reads `data-theme`. The frame is shared: `js/ui/pageFrame.js`, `css/page-frame.css`,
`css/page-header.css` (the sign and the board), `css/page-card.css` (the cards) and
`css/page-form.css` (the settings fields). The shop keeps its own copy in `css/shop.css` /
`css/shop-card.css`; it was not refactored onto the shared frame.

**Amended 2026-10-20.** The two full-height edge posts and the stone base were removed from the
account pages: the beam, leaf garland, hanging sign and dark wall remain, and the wall now runs to
the bottom edge so a scrolling board never disappears behind a fixed plinth. Erase progress and
Delete account share one row. The shop keeps its own posts and stone base — this is a deliberate
divergence, not a refactor.

**Why.** Extends DEC-027: a wooden beam and a cream card are what they are in every theme, so
forcing them through theme tokens buys nothing and risks breaking the look the account pages were
mocked up to. The cost is one more visual system, kept to `profile.html` and `settings.html`.

**Rejected:** refactoring the shop onto the shared frame in the same commit — it works and ships
as-is; a refactor is a separate task with its own visual review.
---

### DEC-049 The field fit is retuned by eye: `0.2320 / 0.502 / 0.466 / 0.2`
**Decided by:** Jim, on the running page · 2026-10-19

**Choice:** `tileScale: 0.2320`, `originX: 0.502`, `originY: 0.466`, `pumpScale: 0.2`.

This supersedes DEC-034's **numbers**, not its reasoning: an even rim is still geometrically
impossible — the solve is still `t ≈ 0.243`, `r ≈ -0.015` (ISS-071) — and the target changed.
`0.2296` filled the top face front-to-back, exact on paper, and on the page it left the back rows
reading low against the face's top edge. `0.2320` stands the front and back rows about 0.003 of the
frame (~2 px at a 720 px stage) proud of the face and takes the side border to ~0.008; the origin
moved to `(0.502, 0.466)` — a pixel left of, and 0.004 below, the face centre `(0.503, 0.462)` —
which is what sits the cluster level **on the slab rather than on its solve**.

`pumpScale` dropped `0.25 → 0.2`: `pump.png`'s art is 27.9% of its canvas, so the visible pump was
~30% of a plot's width and is now ~24%, which stops it competing with the plots it stands between.
The box is still ~3.6× wider than the art — that ratio is fixed by the canvas — which is why the
pump layer carries `pointer-events: none` (ISS-007).

**Why not re-solve.** The solver's values are exact against the art and were the wrong picture on
the page, and the debug slider panel that would make retuning arithmetic rather than judgment does
not exist yet. When it does, these are the values it should open at.

---

### DEC-048 Crop sprites are scaled and lifted onto the soil, and the damage sprite shares their box
**Decided by:** Jim, from a user report · 2026-10-19; retuned on the running page in `c3f93d0` · 2026-10-20

**Choice:** `.plot__crop` sits at `width: 93%; bottom: 6.5%; left: 50.5%` in `css/scene.css`, and
`.plot__damage` repeats **the same three numbers**, so the pair cannot drift apart.

**Why the layer is scaled and lifted.** The canvases are matched — crop and ground are both
1000×1000, art to the same edge — but each crop sprite is a whole soil diamond of its own, and a
taller one: h/w 0.589 against the tile's 0.538. Canvas-aligned, the patch covers the tile and the
taller stages hang over its front vertex (stage 3's art reaches y 792 of 1000 and stage 4's y 801,
against the tile's 757). Drawn at 93% and lifted 6.5%, the patch seats inside the diamond. The scale
is uniform, so the plant keeps its proportions — fitting a crop to the tile's *height* is what
ISS-084 removed.

**Why 50.5% and not 50%.** The alpha boxes alone read under 1 px apart at stage sizes, so the
horizontal shift is sub-pixel and was called by eye against the running page.

**Why the damage layer takes the box, not a transform offset.** The damage files are 1024 canvases
against the crop's 1000, and they are whole replacement patches, not overlay fragments. A fixed
`translate` — the first attempt was `translate(-0.5%, -1.5%)` — stops matching the crop the moment
either value is retuned, and the 6.5% lift did exactly that: the crop moved and the damage sprite
stayed on the old 100% box, so it drew larger than the crop and lower on the tile. A shared box
survives retuning, and `object-fit: contain` maps either canvas into it. `tests/farmView.test.js`
asserts that the two rules carry the same `bottom`, `left` and `width`.

**A correction to the first write-up.** It said the crop art's centre sits "~15 px of canvas lower"
than the ground's. Re-measured from the alpha bounding boxes at threshold 8, the rice centres sit
3.5–5 canvas px left of the ground's and 7–9.5 px lower — about half the claimed drop, and to the
*left*, which is why the sub-pixel horizontal nudge points right. The overhang was real; a large
centring error was not the cause. What the numbers fix is the patch's *size* against the tile's
diamond.

**Rejected:**
- **ISS-072's suggested `width: 99%; bottom: 21%`.** It re-solved the whole layer against a reading
  of the CSS that ISS-084 had already fixed, and it would have shrunk the plant — exactly what
  ISS-084 removed.
- **`object-position` on the `<img>`.** Same picture today, but the *box* would stay mis-sized for
  `.plot__damage`, which has to match it.
- **Per-stage offsets (`data-stage`).** The stages' art bottoms differ by 34 canvas px (767…801), so
  no single lift seats all five exactly. A per-stage patch would jump about 6 px at each growth step,
  which reads as a glitch; one lift is the compromise.

---

### DEC-047 A locked plot's pin says which lock it is by colour
**Decided by:** Jim · 2026-10-19

**Choice:** one pin sprite in two colours. `lock_pin_green.png` marks the locked plot the next
purchase unlocks; `lock_pin_red.png` marks every other locked plot. Both are 141×229, registered in
`js/config/assets.js` (`environment`, `page: 'field'`), and rendered by `plotLayers.js`'s
`lockPin(isNext)` inside `.plot__lock`, centred on the tile.

**Why colour on one sprite.** The field's land states were already three (`owned` / `next` /
`locked`), and the pin is the marker that survives at tile scale. Colour is the fastest way to split
"buy this one" from "not yet", and it is one artwork rather than two.

**Why the pin replaces the "Buy" caption, not joins it.** The caption sat in the lower half of the
diamond — the half the plot in front paints over — so it read `BU..` or `..UY` depending on the row.
The pin replaces it and survives every row. The price tag stays for the number.

**Why a locked plot dims only its ground.** `.plot--locked` filters `.plot__ground`, not the tile:
a filter on the whole tile would grey the red pin into a second, muddier "off" state and the two
pins would stop being distinguishable at a glance. `plot--next` needs no rule of its own — the green
pin is simply drawn at full colour.

**Sizing:** `.plot__lock-icon` is `40cqi` tall — a percentage of the plot's own width, via
`container-type: inline-size` — because the art is taller than it is wide: the height is the number
and the width follows the aspect ratio. At 1440×900 the pin is ~78 px in a 196 px box, and its
point clears the plots in front and behind.

---

### DEC-046 The environment card is three meters — water, frost, heat — and each bar's fill is the domain's
**Decided by:** Jim + user · 2026-10-19

**Choice:** `environmentFacts()` returns exactly three readings, always all three, most urgent
first — **Water** (`drying`): how fast the ground is losing water this hour; **Frost**: the coldest
hour of the next twelve; **Heat** (`uv`): the UV peak. Each renders as a meter: label and value on
the left, the note through the middle, the emoji at the right end, and a bar whose fill comes from
the fact itself.

**Why these three.** The card used to republish rain, wind and humidity, which the weather board
already prints — the same number twice, once with a sentence attached. What is left is the half of
the API response the board *cannot* show.

**Why the fill is computed in `domain/environment.js`.** A UI that divides by its own maximum is a
second rule, one bug away from a bar that disagrees with the number printed beside it. The scales
are the game's own constants, none invented here: the water bar is `dry / 24`, where 24/h is the
fastest bare soil can dry (`baseDecayPerHour` × the top of `EVAPORATION_PER_HOUR`); the heat bar is
`peak / 11`, the top of the UV index; the frost bar is `(10 − coldest) / 10`, inverted, so a full
frost meter is a warning. Frost at 2 °C is the same line `classifyHour()` uses, so the card can
never call a night frost-free while the simulator is charging for frost.

**Why every row is always shown.** The first version dropped calm rows, and on an ordinary day that
left a single row, which read as broken rather than quiet. The **tone** is what changes; the note
says what to do and is printed even when calm. A red bar that says nothing is a bar the player has
to work out. A missing API field keeps its row too — the card's shape does not reflow.

**Rejected:**
- **Six readings, all shown.** The card's first shape; three of the six were the board's numbers.
- **Dropping calm rows.** See above — "nothing to flag" must be visible.
- **Dividing in the UI (`value / max`).** A second source of truth for the same reading.

---

### DEC-042 Difficulty: Normal and Easy, and Easy protects only a ripe crop
**Decided by:** requested by the team · 2026-10-18

**Choice:** Settings has a Difficulty card with two modes, each described on the card
itself. `state.difficulty` is `'normal'` (the default) or `'easy'`
(`DIFFICULTY` in `js/config/game.js`).

- **Normal:** a ripe crop keeps drying, takes damage, loses value and can die. The pump
  costs gold. This is how the game has always behaved.
- **Easy:** once a crop is ripe, nothing can harm it. `isProtected()` in `domain/water.js`
  makes `tick` return a ripe plot untouched, so no dryness, damage, health loss or death.
  The pump is free (`domain/pump.js`).

**Why Easy is narrow:** a crop still *growing* is exactly as vulnerable in Easy as in
Normal, so watering still matters. Easy removes the pressure on a player who has already
done the waiting. The card says this in its own sentence rather than leaving it to be
discovered.

**Also decided:** Normal is what an old save reads as (`ensureDifficulty`), with no
`STATE_VERSION` bump. Changing mode is arm-then-confirm, like the danger actions. Switching
to Easy does **not** repair a crop that is already damaged.

**Rejected:** protecting every crop in Easy (a different game from the one described), and
a plain radio group that writes on click.

---

### DEC-041 One crop seed unlocks every four land segments owned
**Decided by:** Jim · 2026-10-17 · **decided and built, fixed same day**

**Choice:** Seeds unlock on owned-plot count in shop order: rice at 1 (every new
farm), potato at 4, tomato at 8, wheat at 12, corn at 16. `CROP_UNLOCK_PLOTS`
in `js/config/crops.js` owns the thresholds; `js/utils/seedUnlocks.js` owns the
count (`ownedPlots`) and the gate (`isSeedUnlocked`); `domain/shop.js` refuses
a too-early purchase with the plot count, `domain/farm.js` refuses sowing one,
the shop card says `Unlocks at N plots — you own M`, and the picker hides a
locked seed it is still carrying in the bag.

**Fix (same day, after a 4-plot farm still could not buy potato): land is the
*only* gate — `available` (art) is not read by the shop, the picker, or the
plant rule.** Only rice has field sprites; potato→corn have seed packets,
prices, numbers, icons — everything except `*_1..5.png`. Gating on art as well
meant a farm that earned its unlock was told "not available yet" with nothing
to do about it. Now a land-unlocked crop without art is buyable, plantable,
and pays out with its own numbers; the field draws the rice sprite at the same
stage tinted by `plot__crop--fallback` (`js/ui/plotLayers.js:fieldSpriteFor`,
a hue shift no rice ever wears) until the real sprites land. Flipping
`available: true` when art arrives deletes the fallback branch and nothing
else — the economy and the tests do not move.

**Why.** The user's words: *"after owing each 4 land segments, one crop seed
is unlocked to be bought in the shop."* Five seeds across sixteen plots land on
exactly four thresholds, so progression, shop order and field size agree with
nothing left over — 1→4→8→12→16. Gating buying *and* sowing (not just the
button) because a hand-edited bag or a stale picker must not plant what the
shop would not sell.

**Where it lives and why:** the helper is in `utils/`, not in either domain
module, because the layer rules forbid one domain module from importing another
and three callers (shop rule, plant rule, two UI panels) need the same answer.
`config` owns the numbers, `utils` the counting, `domain` the refusals, `ui`
the words — one direction, no cycles.

**Rejected:**
- **Art gate alone (status quo).** Four priced packets the shop refuses with no
  path to earning them reads as broken, not as progression.
- **Land gate alone, ignoring `available`.** Would sell potato the moment 4
  plots are owned and plant a 404 into the field — the field art does not exist
  yet. Both gates stay until the sprites land.
- **Hiding locked seeds from the shop.** A shop that silently omits four of its
  five seeds looks broken (the standing rule from the shop's own header
  comment). Locked cards stay listed, priced, dimmed, and explicit about N/M.
- **Unlocking on plots *bought* (1/5/9/13) instead of *owned* (1/4/8/12/16).**
  Same five unlocks one step earlier, but thresholds that are not multiples of
  four do not say "every 4 segments" on the card — and the user said four.

---

### DEC-040 The player starts owning one plot, and it is never for sale
**Decided by:** Jim · 2026-10-17 · **decided and built — this is T-07**

**Choice:** Every farm opens owning exactly one plot — `STARTER_PLOT_ID` = 0, the back corner — and that
plot is never locked, never greyed, and never has a price. The other fifteen start locked and are bought
one at a time. `PLOT_PRICES[0]` is never charged, so buying begins at 100.

**Why.** The user's words: *"the top land segment shouldn't be locked, ever. player have it when he starts
the game for the first time, then use it to gain money to buy more lands."* Before this, `buildPlots()`
set `owned: false` on all sixteen, so a new player opened the game staring at sixteen padlocks with 200
gold and nothing to do with either. The opening move of a farming game has to be *farming*.

The back corner specifically, because `z = col + row` makes `(0,0)` the furthest diamond from the camera
and nothing paints over it — and this is the plot a player looks at most, for the whole first session.

It also makes the economy legible in one glance: 200 starting gold buys one rice packet at 100, six hours
later that harvest pays 200, which is the second plot at 100 *and* another packet. The free plot is not a
discount, it is the tutorial.

**Where it did not need to change anything:** `PLOT_PRICES` already had sixteen entries and DEC-036
already indexed both it and the unlock order by `ownedCount`. One plot owned means `ownedCount` starts at
1, so index 0 falls away on its own. No price table was invented and no existing economics test broke.

**Still open:** DEC-036 also lists a **confirm popover** before a purchase. Not built. A misclick spends
gold that took an hour to earn and the plot on offer is always the one under the player's hand, so this is
a real gap — `docs/team/issues.md`.

**Rejected:**
- **The whole top 2×2 zone (four free plots).** Reads better on screen, but it needs its own four-step
  price ladder and it rewrites DEC-036's granularity. The user said "segment", singular.
- **Bump `STATE_VERSION` and wipe every save.** Cheapest possible migration and it throws away every farm
  in the world to deliver one plot. `ensureStarterPlot()` repairs on load instead, and only for a save with
  *zero* owned plots — a player who bought land is never touched. See ISS-078.
- **Charge for the first plot as today (`PLOT_PRICES[0] === 0` already means free).** No change needed;
  recorded here so the zero is not later "corrected" into a charge.

---

### DEC-041 The optimal band, and damage as a latch
**Decided by:** Hisham · 2026-10-18 · **fixes ISS-091 and ISS-092** — T-09 follow-up

**Choice.** Four linked decisions, because they only mean anything together.

**1. `waterNeed` decides the target, not just the drying rate.**
`target = 17.5 + 75 × waterNeed`, so rice 85, corn 70, wheat 55, and the band is the bottom
quarter of it. `waterNeed` had been a number that only scaled evaporation, which made it a
modifier rather than a rule. Now it decides what the player is aiming at, and every surface
— meter, pump, warning, damage latch — reads from that one number.

**Why the band scales with the target** rather than being a flat tolerance: rice gets 21
units of room to be a bit low, wheat only 14. A thirsty crop can afford to sag; a hardy one
cannot. A single flat line would have put wheat at "damaged" while it was still comfortably
optimal — the kind of number that looks reasonable in a table and lies on the field.

**2. `WATER.max` 100 → 120.** At 100 the pump stopped *at* the same number that meant
"perfectly watered", so full and optimal were the same thing, there was nothing to aim at,
and waterlogging was unreachable — rain and the pump both clamped to the same value.

**3. Damage is a latch; water is a reading.** `plot.waterLevel` changes every second, so it
crosses any threshold repeatedly. Anything drawn straight from it strobes, and `farmView.js`
diffs tiles per frame, so the `src` would swap over and over. Damage is recorded on the plot
and never decreases.

**4. Damage cuts the payout and never blocks the harvest.** Latching subtracts 12 health, and
`harvest()` pays on `health`. The crop still picks; it is just worth less, permanently.

**Consequences worth stating:**

- **The pump stops at the target, not at max.** Filling past the point of any use costs gold
  and buys nothing, so "water this for 30–60 minutes" is a promise the game can keep — 58 min
  rice, 46 corn, 36 wheat, counting the evaporation that happens while it fills.
- **`pumpPerSecond` 0.05 → 0.028** (100.8/h, 2× heavy rain, where it was 36×) and
  `upkeepPerSecond` 0.01 → 0.0056, holding 5 water per gold. The rate is set by the 30–60
  minute window, not by feel, and only holds because `minutesToOptimal()` counts evaporation.
- **A pumped plot never takes dryness damage**, and that falls out of the rate model rather
  than being special-cased: 100.8/h beats the worst-case 24/h, so the net is always positive.
- **The sprites are Zim's**, named in `cropFailureImg()`: `<crop>_dry.png`,
  `<crop>_waterlogged.png`, `<crop>_dead.png`. All three are 0 bytes, so `plotLayers.js`
  draws the word beside them — a missing picture rather than a missing fact, per AGENTS.md
  fact 4.
- **`damage.js` is its own module** because it decides a *fact* while `water.js` computes a
  *number*, and those want different shapes. `plotWater.js` split out of `water.js` for the
  same reason: questions about one plot are not questions about a whole farm.

**Also rejected: a flat "under 50% = damaged" threshold.** It was suggested, and it is the
wrong shape — see (1). The band floor is the same idea derived from the crop rather than
typed in, and it is 64 for rice rather than 50, which is *more* forgiving for the thirsty
crop and *stricter* for the hardy one.

**Supersedes part of DEC-040**: the rate and upkeep numbers below, and "the pump stops at
`WATER.max`". The one-plot decision stands — a per-second bill across sixteen plots prices
water by how much land you own rather than by how thirsty you are.

---

### DEC-040 The pump waters one plot, at 0.05/s, billed at 0.01/s
**Decided by:** Hisham · 2026-10-17 · **applies ISS-008 and ISS-090** — T-09

**Choice.** Three linked decisions, asked and answered together because any one of them alone
leaves the pump incoherent.

**1. The pump waters ONE plot, aimed by clicking it.** Not the whole farm.

**Superseded in part by DEC-058 (2026-10-23, revised 2026-10-28).** A level-1 pump now waters
two plots, and every outlet still waters one plot. Levels 2–5 add outlets, so the rule is
“one plot per outlet” rather than “one plot for the machine”. The per-litre price is untouched.

**Why:** a per-second gold bill that scaled with the number of plots would price water by
**how much land you own** rather than **how thirsty you are**. A player with sixteen plots
pays sixteen times as much to keep one rice field alive, which is the wrong incentive and
would make buying land a decision about pump bills instead of about crops. Clicking the
plot is also a better way to choose one square of dirt than a dropdown of sixteen.

**2. `WATER.pumpPerSecond: 0.5 → 0.05`.** ISS-008's own recommendation, applied.

**Why:** ISS-008 said the pump was ~36× stronger than rain and left the call to the team. The
36 is not a guess — it is `0.5 × 3600 = 1800` water/hour against heavy rain's `50/hour`, from
the table in `docs/weather-events.md`. **At 0.05 the pump delivers 180/hour and is 3.6× rain.**
That is the number the issue wanted to exist, and ISS-008 can now be *measured* rather than
estimated, because rain-as-water exists as of this change — which is what made the decision
possible at all.

**3. `PUMP.upkeepPerSecond: 0.05 → 0.01`, scaled with the rate rather than left behind.**

**Why:** cutting the water rate 10× while holding the price would have made a full plot cost
**100 gold** — the entire profit margin on rice, which is 100 in and 200 out. Scaling the
upkeep keeps the *old* economics at the *new* speed: one full plot costs **20 gold**, a fifth
of the margin. Water stays a real decision without being ruinous. The pump now delivers
**5 water per gold**.

**Consequences worth stating:**

- **ISS-008 is now measurable, so re-open it and check the 3.6× rather than reading the 36×.**
- **`ground_watered.png` (318 KB) can be seen for the first time.** It is a registered asset
  that no code path could reach, because `waterLevel` was 0 on every plot from creation.
- **The `rain-is-free` loading tip stopped lying.** `config/tips.js` told every player on a
  slow load that *"Rain waters your crops at no charge. The pump bills you gold every second
  it runs."* Both halves were false. They are now both true.
- **`HEALTH.dryDrainPerHour` (5) has its first reader.** Nothing had ever drained a plot's
  health between sowing and harvest, so the `health / 100` payout multiplier always paid at
  full quality. Dryness now drains it, below 30 water.
- **`PUMP.price: 250` is still dead**, deliberately. Buying the pump is out of scope (DEC-008);
  the pump is pre-owned.

**Also rejected: a `setInterval` that adds a fixed step.** Everything is derived from
`lastTickAt` on the state — which already existed — so a tab closed for six hours catches up
in one call. A fixed step silently under-applies after a sleep, and a farm that stops
evaporating while you are asleep is a bug with good PR.

**File layout.** `js/domain/water.js` is the **medium** (evaporation, rain, the dry drain);
`js/domain/pump.js` is the **machine** (`pumpRun`, `costOf`, `setPump`, `aimPump`). They were
one file first and it ran to 285 lines, over the ~200 convention. The split also removed a
naming conflict: `ownership.md` had been listing `js/domain/pump.js` as a planned file for
this exact work all along, so the file the ownership table promised now exists.

---

### DEC-039 One file per crop and per land segment, below `config/`
**Decided by:** Jim · 2026-10-17 · **decided and built — this is T-07**

**Choice:** `js/crops_logics/<cropId>.js` (five files, plus a shared `stageMath.js`) and
`js/land_squares/s1.js` … `s16.js` (plus an `index.js`). Both folders sit **below** `config` in the
layering table and import nothing / only config respectively. `config/crops.js` stays and becomes the
aggregator: it imports the five crops and keeps exporting `CROPS`, `SHOP_ORDER`, `cropOf`, `shopCrops`
and `harvestValue` with unchanged signatures.

**Why.** The user asked for it by name, and the reasons hold up. `config/crops.js` was 118 lines of a
single object literal with five near-identical blocks; adding a sixth crop meant threading a block through
one big file and hoping nothing else hard-coded a name. Now it is a file to add. And with T-07 landing,
`domain/farm.js` wanted `growHours`, `sellPrice`, `waterNeed`, `likes` and `hates` from five different
places in one file — the per-crop folder is what made that readable rather than a grep.

**The land segments hold identity, not state.** Each `sN.js` exports an immutable descriptor (`id`, `col`,
`row`, `zone`, `zoneLabel`, `isStarter`) and a `createPlotN()` **factory**. The factory is the load-bearing
part: a module-level mutable plot would be the same object for every player, in every tab, forever. It could
not be saved, two players on one machine would overwrite each other, and a save restored twice would share
memory with the farm it came from. `state.plots` stays an ordinary serialisable array.

**Also rejected, and worth recording:**
- **Storing `timeLeft` on the plot, as the user's description suggested.** `docs/crops.md` has said since
  the beginning that the stage is never stored, so a crop keeps growing while the tab is closed. A stored
  countdown goes stale the moment the tab is backgrounded and needs migrating every time the formula
  changes. `harvestsIn(plot, now)` derives it instead — including the debug speed, so the sprite on screen
  and the readiness that pays out cannot disagree.
- **A per-plot `state: 'next' | 'locked' | 'owned'`.** Already rejected in DEC-036, and still right: `owned`
  is the only field the data needs, and `next` is `UNLOCK_ORDER[ownedCount]`. One source of truth.
- **Putting crop numbers in `config/crops.js` *and* the new files.** Briefly true during the work, which is
  exactly the drift the split exists to prevent. `config/crops.js` copies the objects wholesale and
  restates no number, so the two cannot disagree.

---

### DEC-038 Coordinates are named by BigDataCloud, and `locality` is not a place name
**Decided by:** Hisham · 2026-10-17 · **decided and built — this is T-59**

The reverse direction of geocoding — "these coordinates, what place is this?" — moves off Open-Meteo
onto BigDataCloud's `reverse-geocode-client` endpoint, as `REVERSE_GEOCODE_URL` in `js/config/api.js`.
It is keyless and CORS-open. Forward search stays on Open-Meteo. This adds a third-party service to a
project that deliberately had two.

**Why a new service at all.** Open-Meteo's geocoding API is **forward-search only** — it takes `name=`
and has no reverse mode. `reverseGeocode()` was posting `latitude`/`longitude` at `/v1/search`, which
returns `400` for every coordinate on earth. Verified live, not inferred. So this is not an
optimisation; there is no way to get a place name out of the existing stack.

**Measured, not assumed.** All three candidates were called live before choosing:

| Service | Result | Verdict |
| :--- | :--- | :--- |
| **BigDataCloud** | `200`, `Access-Control-Allow-Origin: *`, no key, `city`/`countryName`/`principalSubdivision` | chosen |
| Photon (`photon.komoot.io`) | `200`, but returned a **bank** at `housenumber 123`, locality in Bengali | rejected |
| Nominatim | `200`, but returned a **playground**; usage policy needs a `User-Agent` a browser cannot set | rejected |

The reason the two OSM-based services lose is not licensing, it is **what they answer**. Both are
reverse geocoders in the "what is at these coordinates" sense, so they return the nearest addressable
feature — a specific bank, a specific playground — which is useless as a place label. BigDataCloud
returns the containing settlement. Nominatim is additionally what DEC-012 already removed.

**`locality` was on the ladder and a test removed it.** The name ladder is
`city → principalSubdivision → countryName → coordinates`, and `locality` is deliberately absent. It
looks like the natural second rung but it is populated with *regions*, not settlements: `"City of
Westminster"` for London, and `"Polynesian Triangle"` for a point in open ocean. A farm in the Atlantic
labelled "Polynesian Triangle" is worse than no label, because it reads as authoritative. `city` was
populated for every land coordinate probed — Dhaka, London, rural Iceland — so dropping `locality` costs
nothing on land and only changes the no-place case, which is the one case the coordinate rung exists to
handle honestly.

**The ladder always terminates.** There is no placeholder string anywhere in the path: a farm that
cannot be named for any reason, including the reverse service being down, is labelled with its own
coordinates (`23.81° N, 90.41° E`). That is also the mitigation for this decision's main risk — a
third-party service with no SLA. If BigDataCloud disappears tomorrow the game still tells the player
where their farm is, which is strictly better than the "Current location" string it replaced.

**Rejected:**

- *Keep Open-Meteo and render coordinates only.* No new dependency, but it throws away real place names
  the player wants — a farm is in a *place*, and the whole premise is that the game knows where you are.
- *Put a reverse-geocoding proxy behind Supabase.* Cleaner dependency story, but it adds a server to a
  client-only project for one GET request.
- *Use `locality` as a fallback rung.* Rejected by test; see above.

**Consequence:** `reverseGeocode()` now depends on a service outside the project's two. Anyone changing
`js/config/api.js` should re-read this entry, and the coordinates fallback in `main.js` is load-bearing
rather than decorative.

### DEC-037 The sync notice leaves the flow and becomes a corner chip with a one-time toast
**Decided by:** Hisham · 2026-10-17 · **decided and built — this is T-58**

The full-width connection banner is replaced by a small `position: fixed` chip in the bottom-left
corner: two dots that wave while a save is in flight, sit static when synced, and turn amber with a
persistent `No connection` label when a write is queued. The banner's full text, its ageing "last
reached your account" line, and its Export and Retry buttons move into a popover behind the dots.
Separately, the first failed write of an outage still raises one toast.

**Why.** ISS-076, and it was not a styling problem. `#connection-banner` was an in-flow sibling
*above* `.app`, which is `height: 100dvh` — so showing the banner claimed vertical space above a
full-viewport box, grew the document past the viewport, and shoved the entire shell down before
letting it snap back. Worse, `copyFor('saving')` returned copy as well as `copyFor('pending')`, and
`AUTOSAVE_MS` is 10 s, so a **routine successful autosave** triggered the lurch on a timer. Players
saw an interface that jumped every ten seconds for no reason they could identify. No restyle of an
in-flow element fixes that; the notice has to leave the flow entirely.

**What this deliberately gives up.** DEC-030 and ISS-050 both argue the opposite of what a corner
chip looks like: that "your farm is only on this device" is a fact to act on, and that a failed save
must not be able to pass unnoticed. A small permanent fixture is exactly what players learn to
ignore. That is why the pairing is not optional:

- the amber label is **persistent**, not a toast — the condition itself never self-dismisses;
- the **first** failure of an outage raises a toast, which is transient, loud and impossible to
  scroll past, and does not repeat (a notification firing every 30 s for the length of an outage is
  how people learn to ignore notifications);
- the export stays one click away, because it is the only mechanism that gets the farm off the
  device at all (DEC-021).

`copyFor('synced')` still returns `null`, so the healthy case prints nothing. That is the one part of
the original rationale being kept intact.

**Rejected:**

- *Keep the banner but make it `fixed`.* A full-width fixed bar still covers the top of the farm, and
  a save in flight would still flash a large element twice every 10 seconds. The frequency is the
  problem, not only the position.
- *Show the label on `saving` too.* That is precisely the defect. `saving` is a moment, not a
  condition.
- *Full dots-and-nothing, no words.* Rejected: it regresses ISS-050 outright. Status without a word is
  invisible to a screen reader and invisible to a player who did not notice the colour change.
- *A single dot.* Two, because one dot reads as a rendering artefact rather than as a signal.

---

### DEC-039 Weather is judged once, at sowing, over six hours — and there is no simulator
**Decided by:** Hisham · 2026-10-17 · **decided and built — this is T-12**

The weather's effect on a crop is computed **once**, when the seed goes into the ground,
against the **next six hours** of forecast, and stored on the plot. There is no per-hour
tick, and `js/domain/simulator.js` stays empty on purpose.

**Why six hours, and why once.** Every crop takes 4–8 hours to grow — `rice` and `tomato`
6, `wheat` 5, `potato` 4, `corn` 8 — so a six-hour window covers the whole life of the crop
line, and `corn` is the only one that outlives it. The window is therefore sized to the crop,
not to the clock. Judging once also means the consequence is **visible before the player
commits**, which is the only version of this system that can be previewed in the seed picker
at all, and a previewable mechanic is worth more than a surprise one.

**This reverses the per-hour model** that `docs/weather-events.md` was written around, and
that reversal is why this entry exists — the per-hour drains are still in the document, still
correct as *rates*, and someone will otherwise read them as a simulator spec. They are now
multiplied by how many of the window's hours the event held and applied in one step.

**Weather wounds; it does not kill.** Health is `100 − drain`, floored at **25**. The
document calls frost *a drain, not an instant kill*, and its own figure is −30/h — six of
those applied at once is −180, which is an instant kill. The floor keeps the promise the
spec already made, and keeps death the pump's fault, which is the only way "your crop died"
has something a player can act on behind it.

**The season is soft, and separate.** Off-season costs a flat 10 health, not a second
rating, so "planted rice in winter" stays one legible number rather than compounding with a
forecast rating the player cannot compare against. It is **never a gate**: a January player
with only rice unlocked must still have something to plant, or a weather feature becomes a
dead end for the player least able to avoid it.

**The most severe hour wins, never an average.** Averaging lets one frost hour disappear
into five ordinary ones, and "one of the next six hours is below freezing" is exactly the fact
being decided on.

**Seasons come from the player's latitude.** The previous `getSeason(date, hemisphere)`
rotated a six-element list by `HEMISPHERE_OFFSET = 6`, and `(index + 6) % 6` is the identity —
both hemispheres returned the same season for all twelve months, with no test. Each latitude
band now carries its own calendar with the southern months **written out**, because a
rotation is what produced the bug. The tropical band is the South Asian six-season year, and
its boundary is **27.5°, not the Tropic of Cancer's 23.44°**: Dhaka is at 23.81°, so a
textbook tropic line put the game's own home location in the temperate band.

**Planting requires a forecast.** With nothing to judge by, `verdictFor()` answers
`{ok: false}`, the picker disables its rows and says why, and `plot.forecast` is `null` rather
than a clean bill. The premise is that weather is real and never player-controlled, so a
planting the weather was never asked about is a coin toss wearing a crop's name.

**Rejected:**

- *A per-hour simulator.* The documented shape, and it needs `simulator.js`, a tick, offline
  catch-up across a sleep, and a way to tell a player their crop died while they were away
  (ISS-014). It also makes the effect unseeable before it happens.
- *Averaging the window.* Hides the one hour that matters.
- *Gating planting on season.* Soft-lock risk, above.
- *Rain as free water.* Still unimplemented — `plot.waterLevel` is set to 0 at plot creation
  and nothing in the running game changes it. That is T-09, and it is why ISS-008 (the pump
  being ~36× stronger than rain) cannot be measured yet: there is no rain to compare against.

---

### DEC-036 Land unlocks one plot at a time, in a fixed order, and "greyed" means "not yet"
**Decided by:** Jim · 2026-10-16 · **decided, not built — this is T-56**

**Choice:** Sixteen plots unlock one at a time in a fixed order, and at every moment exactly one is
buyable. Three visual states: `owned` (plain ground), `next` (plain ground, padlock, clickable), and
`locked` (greyed ground, dim padlock, `disabled`). The order is a literal array of plot ids in
`js/config/field.js`: zone **A → B → C → D**, and within a zone col-then-row, so the farm fills from the
back edge to the front and each new plot touches the ones already bought.

**Why.** The user's words: "only the next portion is unlockable and the rest are unclickable (greyed),
after unlocking that the next portion will be available for unlock." A portion had to be defined, and the
field's four 2×2 zones are the obvious unit — but at 4×4 sixteen individual plots is the smaller,
honest granularity, and it keeps the price model intact: `PLOT_PRICES[ownedCount]` survives, and
**DEC-009 is superseded only in its "whichever plot you click" clause**, never in its economics. No price
table has to be invented and no existing test breaks.

**Rejected:**
- **Unlock a whole 2×2 zone at a time (4 steps).** Closer to "a portion" as written, and it would make
  the field fill in four obvious blocks. It also needs a four-entry price table — or a sum over four plot
  prices — and the "next" state would cover four plots at once, so the greyed field would jump from 15
  grey to 11. Fewer, bigger unlocks read better on screen; this is the one place the user's wording and
  the implementation cost disagreed, and the wording won on cost.
- **Store the state per plot (`state: 'next' | 'locked' | 'owned'`).** One field per plot, no derivation,
  and it makes a wrong order a save-migration problem. `owned` is already there and is the only thing the
  data needs: next is `UNLOCK_ORDER[ownedCount]`, locked is everything else that is unowned. **No save
  migration, and no second source of truth.**
- **Keep the current model (any plot buyable).** DEC-009 as written. There is nothing to grey out, so the
  far plots would look identical to the next one for the whole game.

**Still open when this is built:** the visual split between `next` and `locked` — proposal is the full
padlock on `next`, a ~0.35 opacity padlock on `locked`, ground greyed by reusing `css/shop.css`'s
`--locked` language (dashed, dim) rather than inventing one. And ISS-006's `clearPlot` + the fifth click
case land in this same handler, which is the argument for doing both in one pass.

---

### DEC-035 The shop and inventory keep their own headers; the navbar is the game page's
**Decided by:** Jim · 2026-10-16

**Choice:** `shop.html`, and a future inventory page, keep the headers they already render —
`← Back to the farm`, the page title, the purse — and do **not** carry the game page's `#top-bar`
navbar. No change was needed: nothing was ever added.

**Why.** The navbar's own stylesheet calls it "the game page's top bar", and `main.js`'s `start()` is
guarded on `#top-bar`, which only `index.html` has. On the shop page its logo link and `shopView.js`'s
"back to the farm" link point at the same place, so mounting the navbar buys a duplicate header and loses
the purse. Getting it there also costs `navbar.css` **and** `fonts.css` on `shop.html`, a second mount in
`shop-main.js`, and either a third guard or a copied `#top-bar` — and `fonts.css` is needed only because
of the font fallthrough already recorded in `docs/architecture.md`.

**Rejected:**
- **The full navbar on every page.** The most familiar option, and it is two stylesheets, a second mount
  and a header the shop does not need, for a logo link the shop already has. The shop's header shows the
  purse, which the navbar does not show at all.
- **No navigation at all from the shop.** Cheapest, and it leaves the player with no route to settings or
  the profile except through the farm. Not taken — but those two icon tiles are a one-line change to
  `shop-top`, and they are the only two things the navbar would add. Raised again later, that is the fix.
- **Inventory as its own page, like the shop.** It would inherit this. It is a launcher only today
  (`js/ui/inventoryLauncher.js`), so wherever it lands, this applies to it.

---

### DEC-034 The field fills the slab's top face front-to-back, since an even rim is impossible
**Decided by:** Jim · 2026-10-16

**Choice:** `tileScale: 0.2296`. The 4×4 cluster fills `base.png`'s top face front-to-back and keeps a
border of about 1.3% of the frame at the left and right. ISS-071, and the close of ISS-005.

**Why.** There is no even rim to aim at, so it had to be a choice rather than a solve. `base.png` is
an extruded slab whose top face is 992 × 520; the cluster is 4.21 × 2.265 tile-widths at the default
`gap`/`crossGap`. Solving for one border `r` on all four sides:

```
4.21t  + 2r = 0.992        t = 0.243
2.265t + 2r = 0.520        r = -0.015
```

Negative, which is not a rim. The cluster is 2.7% too tall for the surface, because `ground_*.png`'s
diamond is h/w 0.538 and the top face is 0.524 — four rows of those tiles cannot tile that face at any
width. Before T-54 the same solve ran against the slab's whole bounding box instead: 596 rather than
520 in the second equation, which folded 76px of skirt into it and hid the mismatch. That is ISS-069,
and it is why a "solved" `tileScale` was never the value on screen.

So the decision is which way to be out. Filling the height puts the back and front rows exactly on the
face's edges and absorbs the remainder at the sides, where at 1440×900 it reads as ~11px of bare slab
left and right and 0 front-to-back. Against `docs/reference/field-reference.jpeg`, a side border is
the one the reference has.

**Rejected:**
- **Fill the width (`t = 0.2356`).** Plots touch the left and right tips of the face, and the front and
  back rows overhang by 0.7% each — a row of diamond tips sitting on the skirt's bevel. An overhang
  reads as a bug where a border reads as design, so this was the worse error to make.
- **Inset as far as it will go, flush at the sides and short front-to-back (`t ≈ 0.2286`).** The same
  picture with the border moved to the front and back, where it is more visible rather than less: the
  skirt's edge is directly below the front row.
- **Rescale `tileAspect` to 0.524 so the tiles match the face and an even rim becomes solvable.** The
  one change that fixes the mismatch at its source, and it squashes every ground diamond by 2.7% —
  visible distortion of art that AGENTS.md section 5 records as measured. Wrong end of the problem:
  the art is the input and the fit is the output.

**Superseded in part by DEC-049 (2026-10-19).** The values moved — `tileScale 0.2296 → 0.2320`,
origin `(0.503, 0.462) → (0.502, 0.466)`, `pumpScale 0.25 → 0.2`. The reasoning above stands
unchanged: there is no even rim, the solve is still `r = -0.015`, and the fit is still a choice —
DEC-049 records the choice made against the running page rather than the solver.

---

### DEC-033 The big note is a two-column grid, and the place name sits in the right column
**Decided by:** Jim · 2026-10-16

**Choice:** `.note-current` is a grid. The condition spans both columns, the temperature takes the
left, and the place name takes `minmax(0, 1fr)` on the right, right-aligned and wrapping instead of
ellipsising. The day and time keep their own row under both columns, the red pin stays centred, and
the note's other lines span the full width. ISS-062.

**Why.** The measured dead space was the whole argument: the temperature row is the note's widest
content and it stops about 84px short of the right edge at the board's 450px floor, 127px at its
520px ceiling. That space was unused at *every* window size, because the widest row is the thing that
sets the note's content width — nothing else could ever grow into it. Meanwhile the place name had
one line at the top, `nowrap` and ellipsised, so the one string that changes most often between
players — the town — was the one string that got cut. Moving it into the dead space fixes both at
once and needs no new element.

**Why `auto minmax(0, 1fr)` and not `42% / 58%`.** The first draft split the note by percentage.
That is a collision waiting to happen: `.note-temp-value` is 44px type, and a 42% right column at the
450px floor measured 93px against a temperature row of roughly 137px, so the place name would have
overlapped the number it describes on the narrowest board. With `auto` the temperature asks for what
it needs and the place gets the remainder, so no window size can overlap them — and no media query
needs a second copy of the split, which is the cost this file pays at every other breakpoint.

**Why the condition keeps a full-width row.** At 15px with 0.1em of letter-spacing, "Freezing drizzle"
is about 168px — wider than one column at the floor (~128px). Putting it beside the place name would
have clipped the single word that says what the weather is doing, so `label` spans both columns and
the place sits beside the temperature instead.

**Rejected:**
- **`position: absolute` in the note's top-right corner.** Three lines of CSS instead of a grid, but
  ISS-058 was exactly this: an absolutely positioned line that stopped reserving space and drew over
  its neighbours. It also needs `top`/`right` restated in both media blocks, which are kept in step by
  hand (DEC-031).
- **Wrapping the note's left-hand content in a new `<div>`.** The DOM order stays as it is and grid
  areas do not care about it; a wrapper would be a JS change to fix a CSS problem.
- **Splitting the place into town and country on two lines by design.** Predictable, and it is what a
  weather app does — but it costs a second element, and the country alone is not what a player scans
  the board for.
- **Moving the day and time into the right column as well.** That is what the design mockup draws, and
  it would balance the note properly — the left column would become one clean block. Held back
  because it is a bigger change than the report asked for, and the footnote row is the one row a
  player reads at a glance.

**The cost, stated plainly:** the place name is now on the same row as the temperature, so at the
450px floor "Dhaka, Bangladesh" wraps to two lines. That is intended, and it is the reason `nowrap`
and the ellipsis are gone — but it means the name is no longer a single line at every size, and a
note that clips (`.note-current` is `overflow: hidden`) drops the name before it drops the
temperature. The pin left at `left: 50%` was checked against the right column's text and clears it by
9–15px at the two board widths; if the name ever grows a third line, that is the first thing to
re-measure.

---

### DEC-032 The board prints its freshness once, and it lives inside the note
**Decided by:** Jim · 2026-10-16

**Choice:** the freshness label is a child of the big sticky note, right-aligned under "Feels like",
and renders **only** while the forecast is paused — `Paused · 3 minutes ago`, full sentence in
`title`. There is no separate "Updated 6:45 PM" line on the board. The wind pill's compass bearing is
no longer part of its value; it is the pill's `title`, and nowhere else.

**Why the label moved.** `.board-updated` printed `Updated 6:45 PM` from `weather.current.time`, and
the note's foot row already printed `FRI 6:45 PM` from the *same* field. The board stated one instant
twice, twenty pixels apart — worse than redundant, because a repeated value reads as two facts being
confirmed. The note already says when the reading is from, so the only thing the line still had to
say was that the reading is **stale**. That is the paused case, and it is now the only case that
renders anything: the element's presence *is* the state, so there is no `data-paused` attribute to
keep in step.

**Why the compass went to `title`.** The pill's value track is `auto`, so it takes what it asks for,
and `5 km/h NNW` left the label track about 19px at the board's width — "Wind" rendered as "W…". Only
one of the three could be shortened, and the number is what the player plants by while the bearing is
a detail. It follows `.note-hour`, which already carries its weather condition in `title` and nowhere
else. ISS-061.

**Rejected:**
- **Keeping "Updated …" and dropping the note's own time.** Throws away the more readable of the two
  to save the less readable one.
- **Printing both.** They are the same value; printing it twice invites the reading that they differ.
- **Carrying the board's warning amber, `#ffd45e`, into the note.** It was chosen against dark wood.
  On cream paper it measures **1.2:1** and is effectively invisible. `#7a4f0a` measures **5.8:1** on
  the paper's mid tone and **5.4:1** on its darkest, and still reads as a warning rather than as a
  failure.
- **Letting the bearing drop to a second line in the pill.** It fixes the width by making the three
  pills different heights, which is exactly what `flex: 1 1 0` is there to prevent (DEC-031).

**The cost, stated plainly:** the bearing is invisible on touch and to keyboard users, and a paused
forecast's full sentence lives in `title` too. If the compass is ever needed as always-visible
information, the answer is a third row in the pill or a wider meters column — not a smaller font.

### DEC-031 The board is plain literals plus one short-window block
**Decided by:** Jim · 2026-10-15

**Choice:** every padding, gap, border, radius, icon size and font size in `css/weather.css` is a
plain px literal written in the rule that uses it. No custom properties. For short windows, **one**
media block — `@media (max-height: 960px) and (min-width: 901px)` — restates the values smaller. The
three structural breakpoints (`1180px`, `900px`, `600px`) carry layout only. The meter pill is
`flex: 1 1 0`: the three pills divide the note's height rather than asking for a height, which is
what makes the stack line up with the sticky note top to bottom at every window size.

**Why:** two failed attempts first, which is the reason this entry is worth having.
1. **A knob block** — 39 custom properties and two scale variables. Tidy as an abstraction, poor as a
   working surface: every size became a lookup, and **a size you cannot read without finding the knob
   block is not a size you can tune.** The board's proportions are meant to be tuned by eye at 1080p
   (AGENTS.md §5), which is precisely what indirection is worst at.
2. **Inline `min(Npx, N*factor*vh)` caps** — the same sizes with no variables, shrinking continuously
   instead of jumping at a breakpoint. Also rejected. Correct, but it replaced a number you could edit
   with a number you had to *derive*: `min(14px, 1.19vh)` tells you nothing directly about 14px, and
   the two factors (`0.085vh` boxes, `0.11vh` text) are implicit in the coefficients where nobody will
   look for them. It reads as clever and tunes worse than either alternative.
3. **Plain literals won** because the failure mode of the media block is mild and its cost is visible.
   The block is a second copy of the sizes, and yes, a value that changes has to change in two places.
   But the copy is *readable*, and when it drifts the symptom is a slightly wrong number at one window
   size — visible in one glance — rather than a whole board that cannot be adjusted at all.

**The one structural change that earned its keep:** the short-window block is scoped
`and (min-width: 901px)`. Below that the layout is stacked and content-sized, so there is no viewport
height to fit and trimming the board is simply wrong. Its breakpoint is **960px**, not the 820px it
started at, because the board's contents grew — the hour strip went 52px → 72px (ISS-057) and the
freshness line moved into the flow (ISS-058) — so the height at which it stops fitting rose with them.
That budget has since come down a little: the freshness line left the board's flow entirely and now
lives inside the note (DEC-032), so `#forecast-card` takes two children rather than three.

**The block restates sizes only.** It does not redraw shapes. It used to override `.board::before`
and `.board::after` as well, giving the two pegs different bodies at short heights so that the left
one stayed a post and the right one became a flat bar — see ISS-059. Any future shape that needs a
second definition belongs in the base rule, not here.

**Also rejected:**
- **Container queries** (`container-type: size` + `cqmin`) would measure the board rather than the
  viewport. Rejected because `container-type: size` implies paint containment, and the board's two
  pegs sit above its top edge — they would be clipped. Taking the pegs out of the board would fix
  that and is a reasonable follow-up if the board is ever rebuilt.
- **Giving the meter pill a settable height** (`flex: 0 1 60px`) was tried and dropped. It reads like
  more control and is less: the pills dividing the note's height is what keeps them aligned with it,
  and a fixed basis fights that on every board size rather than one.

**What was rejected, separately:** the **fill bars** on the humidity and rain-chance meters. Wind never
had a plausible bar — it has no natural ceiling, so a level would need an invented maximum — and
looking at the board with neither, the 4px bar was clutter next to a value already spelled out in
full. ISS-055, closed as `wontfix` in the sense that removing the bar is the answer, not restoring a
rule.

### DEC-030 Losing the network is not the same as losing the session
**Decided by:** Hisham · 2026-10-12

**Choice:** `resolveSession()` and `restoreSession()` answer `{ok, session | reason}` rather than
`session | null`. Only a `400`/`401` from the server destroys the stored refresh token and signs
the player out. A timeout, a 5xx and a dropped connection all keep it. A connection lost
mid-session does not stop play — the farm keeps saving locally, a persistent banner says what is
true, and the queued write flushes on reconnect. With no connection at boot, the farm is not
opened at all: the player sees a blocked screen with a retry, not the login form.

**Why:** `session | null` collapsed three unrelated situations into one, and every caller read
it as "signed out". On the hosted build a slow CDN or a dropped request therefore redirected to
`login.html` **and deleted the refresh token on the way out** — so the logout was permanent and
the player had to retype their password for a session that was never invalid. That is ISS-048,
and it was happening at random to real players.

The deeper problem is that the game was telling people something false. A player who lost
wifi for thirty seconds was told they had been signed out. Once a game says that once, every
later message is suspect.

**What this deliberately loosens:** previously *any* failure signed you out. Now only an
explicit server rejection does. That is correct — a 500 genuinely does not mean a token is
invalid — but it is a rule being relaxed, so it is recorded here rather than shipped as a
silent bugfix. The invariant is one line and is now checked by
`scripts/check-imports.mjs`-style discipline in review: **never treat "could not reach the
server" as "signed out."**

**Why the farm still cannot be opened offline:** Row Level Security means the save row is
unreachable without a verified token, so there is nothing honest to render. Blocking is the
truthful answer; silently showing a stale farm is not. A guest is unaffected — a guest farm is
local-only, so `?guest=1` bypasses the network entirely.

**Rejected:**
- *Cache the session and let offline players play.* Rejected: it does not remove the need for a
  network to save, and it makes "signed in" mean something the server never verified.
- *Keep redirecting to the login page, but add "no internet" to the message.* Rejected: the
  login page is where a player goes when they believe they are signed out. Sending them there is
  the bug, not a copy problem.
- *A toast instead of a banner.* Rejected: toasts dismiss. "Your farm is only on this device" is
  a fact a player can act on — hence the banner, and hence the export button on it.

**Consequence for the player:** `.farm` export is the offline escape hatch, which is exactly what
DEC-021 left in place. The banner points at the button that already exists rather than inventing
a second mechanism.

### DEC-029 The login page is split one component per file, and writes its own values
**Decided by:** Jim · 2026-10-11

`css/auth.css` was one file holding the page backdrop, the opening menu and the wooden sign. It is
now three: `auth.css` keeps the backdrop and the stage, `menu.css` takes the menu and `.btn--menu`,
`sign.css` takes the board, its form overrides, `.btn--go` and `.btn--back`. The 19 `--art-*`
tokens are gone from `variables.css` — those three files write the values directly.

**Why.** Two reasons, and neither is taste. First, a component split means a file owns its element
completely: `.btn--go` now sits next to `.sign` rather than back in a shared `components.css`, so
adding a variant does not mean editing two layers and hoping the load order cooperates. Second, the
`--art-*` tokens bought nothing — DEC-027 established that the login page does not follow
`data-theme`, so nothing ever overrode them. They were 19 names for values only one page ever read.

`--font-display` and `--font-ui` stay tokens, because the faces they name are declared in
`css/fonts.css` and are genuinely cross-file. `--sign-shape` stays a custom property inside
`sign.css`, declared on `.sign` and inherited by `.sign__inner`, which is always its child.

**Verified value-neutral.** Every rule was diffed against the pre-split file with tokens resolved:
47 selectors, no computed value changed. The only intended differences are four
`width: min(100%, Npx)` becoming `width: 100%; max-width: Npx`, and the polygon moving from `.auth`
onto `.sign`.

**Rejected:** keeping the three reads of a shared token (`--surface`, twice — a white input and a
focus outline) because they were less effort. Following through makes the page read identically in
light and dark, which is what the rest of it already does, and stops two surfaces from being the
only thing on the page that answers `prefers-color-scheme`.

**Also decided here, because they were the same argument:** spacing and radii are hardcoded per file
in px, not scaled. Seven space steps (`4 8 12 16 24 32 48`) and three radii (`18px 10px 999px`)
come off `variables.css`. Fifty-two references were converted across `layout`, `navbar`, `reset`,
`scene`, `weather`, `shop` and `settings`, each verified value-identical. The ten definitions stay
as a marked stopgap for the 41 references `components.css` still holds, and come out in the same
commit that converts that file's last one.

**Why.** A scale is only worth indirection if something changes the value. Nothing overrides spacing
or radii — `themes.css` swaps colours and nothing else — so these were indirection with no other end.
`999px` in particular reads as a number at a call site where it means "pill".

**Rejected:** keeping `--radius-chip` as a permanent token. It is the one value where the name
carries meaning the number does not, but a partial scale is worse than none, and there are four
call sites. Revisit if the pill shape spreads.

**Scope, and what is left.** One file per component is now the rule for the two pages that have
their own identity: the login trio (`auth` / `menu` / `sign`; `avatar-setup` joined them in
DEC-055) and the game page's `navbar.css` and `scene.css`. `layout.css` keeps only the grid the
panels sit in, and `farm.css` is gone — it was
`scene.css` under a name nobody remembered, and it also held the one rule `layout.css` duplicated.
Still layered, still to move: `weather.css`, `shop.css` and `settings.css` are already one
component each and only need restyling; `components.css` is the real work, because splitting it
puts `.btn` and its variants together for the first time — and it needs
`tests/settingsDom.test.js` updated, which names that file at lines 361 and 418.

---

### DEC-027 The login page is painted art, and does not follow the theme
**Decided by:** Kafi · 2026-10-11

The menu, sign-in and create-account screens are illustration: a full-bleed background, a wooden
sign, chunky outlined buttons, two display faces. They do **not** read `data-theme`, and since
DEC-029 those colours are no longer tokens at all, so the page looks identical in dark mode. The
farm, shop and settings pages are untouched and keep the existing clean green/white chrome.

**Why.** A wooden sign is brown in a dark theme too. Forcing the menu through the theme tokens would
mean the menu stops looking like the thing the team drew, to buy consistency with a page it is not
on. The cost is two visual systems in the repo — accepted deliberately, and the art style is
confined to `login.html` so it cannot spread by accident.

**Rejected:** restyling the whole app to match. It would collide with the farm, shop and settings
work in progress, for no gain on the menu itself.

**Also decided here, because they were the same argument:**

- **Fonts are self-hosted** (`assets/fonts/*.ttf`, declared in `css/fonts.css`), not linked from a
  font CDN. The project has no build step and no third-party runtime; a CDN link would put another
  party between the player and the login page.
- **Only `login.html` links `css/fonts.css`,** so `--font-display` and `--font-ui` fall through to
  `--font-sans` on every other page and cost nothing there.
- **The sign's outline is two stacked layers sharing one `clip-path` polygon,** not a CSS border on
  one element: `clip-path` cuts a border away rather than shaping it.
- **Where a mockup colour failed WCAG AA, the text colour changed, not the fill** — the dark ink the
  mockup already used on the buttons. The one exception is the error text, which got a pale chip
  because no shade of red clears 4.5:1 against the board's brown.
- **The sound toggle is not built.** Sounds are out of scope (ISS-023) and no audio code exists, so
  a mute button that mutes nothing is a lie in a control. It arrives with the sounds commit.

---

### DEC-026 The loading tips may paint before the session is known
**Decided by:** Hisham

**Choice:** a full-page veil with a spinner and a rotating weather/farming fact is mounted as the
first statement of `start()` on all four pages, and is therefore on screen while boot step 0 —
resolving the session — is still in flight.

**Why this needed deciding at all:** `docs/architecture.md` says the shell must not render before
auth, and boot step 0 exists precisely so a signed-out visitor never sees a flash of farm UI. A
loader sitting in that gap looks, to a reader, like a violation of that rule. It is not: the veil
reads no state, holds no farm data, and is destroyed on `location.replace`. What is forbidden is
the *shell* rendering early — a spinner does not tell anyone their gold or their crops.

**Rejected: putting the loader in the HTML.** It would be painted before any JS runs, which is
the one case that would genuinely leak pre-auth, and it needs an empty `<div>` in four markup
files — `almanac.html` is still a zero-byte file and would have needed one too. Appending from
`js/ui/loadingTips.js` keeps the rule "nothing is on screen until JS decides" intact.

**Rejected: showing nothing and shortening the wait instead.** `js/services/gotrue.js` really does
need `AbortController` deadlines; that is a separate fix and should happen regardless. A loading
screen is not a substitute for a request timeout, and this decision does not claim it is.

**The rule that makes it safe:** the veil paints nothing at all until `SHOW_AFTER_MS` (250 ms).
A page that renders faster than that never shows it, so the common case is unchanged and there is
no flash to get used to. See `js/config/tips.js` for the three thresholds and why each exists.

---

### DEC-025 Erasing progress is behind a password too, not just deleting the account
**Decided by:** Shabab47

**Choice:** the settings page's *second* destructive action — "erase all progress" — now takes
the password as well: two clicks and the password, same as deleting the account.
`supabase/migrations/006_password_gated_erase.sql` adds `erase_progress(password)`, which
compares the password with `crypt()` against the same bcrypt hash and deletes **only**
`public.farm_saves`, leaving `auth.users`, identities, usernames and farmers untouched so the
player stays signed in.

**Why it was not already:** the original reasoning was that the farm is entirely the player's
own and one click away from being rebuilt, so it was not "as bad as" deleting an account. That
is the wrong test. A farm is the accumulated product of real play, and *easy to replace is not
protected* — a stolen session token could destroy weeks of work, and after the fact the panel
could not tell the player it had done something irreversible without one. DEC-024 established
the rule for the account; this applies it to the other irreversible thing on the page.

**Same three properties as `delete_my_account`,** and each one is load-bearing: it takes no
account id and acts on `auth.uid()` only; `set search_path = ''`; EXECUTE revoked from
`PUBLIC` and granted only to `authenticated`. It fails closed the same way. `docs/setup.md`
checks all three functions' privileges in one query, because two of them being callable by
`anon` would undo both decisions.

**Also: one statement, not two calls.** The check and the delete are the same SQL, as in
DEC-024. A separate `verify_password` RPC would be one the browser could skip, which is the
exact gap DEC-022 had. `false` comes back on a wrong password and nothing is deleted.

**Also: the order in the entry point is the feature.** `makeDeleteProgress()` verifies and
deletes the server row *first*, then calls `clearLocalSave()` — not `clearSave()`, whose server
half is now a pointless request whose failure could be reported as a real one (ISS-041). The
earlier code cleared both copies first and asked afterwards, so a **wrong password wiped the
farm and still reported that nothing had changed.**

**Both actions now run through `runDestructive()`** (`js/ui/runDestructive.js`), which owns
that ordering and takes its collaborators as arguments so the invariant can be tested without a
DOM — `tests/dangerAction.test.js` asserts it as behaviour with fakes. The two hand-written
handlers had already drifted, and drift between two copies of "check the password, then
destroy" is exactly how the original bug happened.

**Rejected: asking in the browser only.** A password field that the client compares is
decoration; `authApi` would then have needed to expose a delete-without-password entry point,
which is the thing DEC-024 deleted and `tests/mainBoot.test.js` guards against.

**Rejected: one function with a flag,** e.g. `erase_progress(password, also_delete_account)`.
Two rows and two grants are cheaper to reason about than one function whose behaviour depends
on a boolean, and the permissions differ: neither may be callable by `anon`.

---

### DEC-024 Account deletion is immediate, behind a server-side password check
**Decided by:** Shabab47

**Choice:** `supabase/migrations/005_immediate_account_deletion.sql` installs one
`security definer` function, `delete_my_account(password)`. It compares the password
against the bcrypt hash in `auth.users.encrypted_password` using `pgcrypto`'s `crypt()`,
and only on a match deletes the row — which cascades to `auth.identities`,
`public.farm_saves` and `public.usernames`. The settings page takes two clicks and the
password; there is no delay and nothing to cancel.

**Also:** the password is checked **in the database**, not the browser. An earlier
version (DEC-022) scheduled the deletion and checked the password in
`js/services/authApi.js`, which left the RPC callable with any valid access token and no
password at all — ISS-040. Behind a 7-day window that was survivable, because `adopt()`
cancelled it on the next sign-in. Deleting on the spot turns that same request into
permanent loss, so the check had to move to where it cannot be skipped. The browser-side
`verifyPassword` is deleted, and `tests/mainBoot.test.js` asserts it stays gone.

**Also: the local provider verifies in the same call that deletes**, so neither provider
exposes a deletion a token alone can perform. `deletesAccountsInPlace` tells
`js/settings-main.js` which one to call.

**Why `crypt()` and not the admin API:** GoTrue's admin endpoint needs a `service_role`
key, which must never enter this repo (DEC-018). Comparing the hash is the only route to
a server-side check without one. The password is a bind parameter, not a query literal,
so it does not reach the Postgres statement log.

**It fails closed.** If `crypt()` is unavailable, pgcrypto lacks bcrypt, or the stored
hash is not bcrypt, the function raises and deletes nothing. An unverifiable password is
never treated as a correct one — the cost is that a project in that state cannot delete
an account at all, which is why `005` includes a test query for it.

**Rejected: keeping the 7-day window.** Both the delay and the automatic cancellation are
gone, so `003_account_deletion.sql`'s table, functions and `pg_cron` job are dropped rather
than left as dead weight. `003` stays in version control, so the countdown is one re-run away.

### DEC-022 Account deletion is a 7-day countdown cancelled by signing in
**Status:** superseded by DEC-024. Kept for the record — the grace period and the
server-side password check it forced are both explained above.
**Decided by:** Shabab47

**Choice:** `supabase/migrations/003_account_deletion.sql` installs four
`security definer` Postgres functions. A player who asks to be deleted gets a row in
`public.account_deletion_requests` with `delete_after = now() + 7 days`, and is signed
out. `pg_cron` runs `purge_expired_account_deletions()` hourly, which deletes from
`auth.users` and cascades to the farm, the username and `farmer_name`. **Signing in
again cancels it**, wired into `adopt()` in `js/services/authApi.js` rather than to a
button on the settings page.

**Why:** Deleting on the spot is unrecoverable for a misclick, and a sign-out-and-return
is exactly what someone who closed the tab halfway through does. The countdown is the
standard compromise: the account is genuinely on its way out, but there is a week in
which coming back cancels it. Because a returning player restores the session through
`adopt()` on every page load, "signing in cancels" needs no UI at all and cannot be
missed by a player who never finds a cancel button.

**Also:** the settings page asks for the password before scheduling
(`verifyPassword` in `authApi.js`, discarded rather than adopted — a credential check is
not a sign-in). The two-click confirm guards against a misclick; the password guards
against someone else at an unlocked keyboard. GoTrue rate-limits the endpoint, so it
cannot be brute-forced.

**Also: nothing is deleted when the deletion is *scheduled*.** Not the farm, not the
username, not the local save. An earlier version cleared the save at request time, on the
reasoning that the player had asked to be forgotten — which is wrong, and wrong in the
way that matters most here. A grace period exists so that changing your mind costs
nothing; clearing the farm the moment someone expresses doubt turns the countdown into a
countdown to *losing* the data rather than to choosing to lose it, and a player who comes
back to an empty farm has lost something they had not yet agreed to lose. Everything goes
at the end instead, in the purge's single statement, so there is no half-deleted state
either.

**Also:** the grace period means the email is **not** free for those 7 days — GoTrue
still holds the account, so a re-registration gets `email_taken`, whose message already
reads "sign in instead". Inherent to delaying a deletion, not fixable.

**Rejected: an Edge Function.** It works, and holds the `service_role` key in Supabase's
secret store rather than the repo. But it costs a deploy step, an email provider
(Resend or similar) for confirmation, and a token table — all to reach the same
privilege that `SECURITY DEFINER` reaches for free. See ISS-038 for the confirmation
step it would have bought.

**Rejected: `SECURITY DEFINER` over plain table permissions.** GoTrue owns `auth.users`,
so there is no grant available to a player. The function is the only route that needs no
secret anywhere.

**The safety argument, since this is the one place the project grants itself privilege:**
every function takes **no parameter** and acts on `auth.uid()` only, so a caller can
never name another account. Every function sets `search_path = ''` to close the
schema-hijack route. And EXECUTE is revoked from `PUBLIC` — which Postgres grants by
default, and which `anon` inherits — then granted only to `authenticated`. Drop any one
of those three and this becomes a way to delete anyone's account. `003` says so at the
grant.

### DEC-023 The local provider deletes accounts in place, and says so
**Status:** superseded by DEC-024, which keeps the shape and closes the gap. `deletesAccountsImmediately`
became `deletesAccountsInPlace`, and the local provider now verifies the password in the
same call that deletes rather than being exempted from the check.

**Choice:** `localAuth.deleteAccountData({ password })` removes the account at once and sets
`deletesAccountsInPlace = true`, which the settings page reads to choose between this and
the Supabase RPC.

**Why:** A scheduled deletion has nowhere to live on this provider. The moment the
player is signed out, the record of the request goes with the session, so
sign-out-and-return would reset the countdown forever — a countdown that cannot be
trusted is worse than none. The accounts table *is* the account there, so deleting it
is a real deletion rather than the real provider's approximation of one.

**Also:** the divergence is confined to the stopgap provider, which ships only if
`authApi.js` fails to load (ISS-027). Nobody should be on that path.

---

### DEC-020 The provider is chosen by one flag in `auth-main.js`
**Decided by:** Hisham

**Choice:** `js/auth-main.js` holds `const USE_LOCAL_PROVIDER`. When it is false,
the Supabase provider is loaded with a dynamic `import()`; when true, `localAuth.js`
is used. It is currently `false`, since `js/config/supabase.js` has a project URL and
anon key (ISS-028, T-29).

**Why:** DEC-017 and DEC-028 both describe the swap as "one import". A dynamic
import keyed off a named constant makes that literally true, keeps both providers
loadable for comparison, and means the switch is greppable rather than a
commented-out line someone re-enables by accident.

**Also:** the Supabase provider is loaded inside a try/catch. If the module is
missing or throws on import, the page falls back to the local provider and logs
the reason, because a working login beats a blank page.

**Also (T-29):** `loadProvider` is exported so `js/main.js` boots against the same
provider. It used to import `localAuth.js` directly, so with the flag flipped only on
the login page the two disagreed and the player was caught in a redirect loop — ISS-033.
Both entry scripts now call `loadProvider()` and both `await restoreSession?.()`, since
the Supabase access token is memory-only.

**Also (T-29):** guest play stays on `localAuth.js`, because a guest has no account
to sign into. So `localAuth.js` survives as the guest provider rather than being
deleted, which revises ISS-027's original fix.

**Note:** `js/config/supabase.js` exposes `__setForTest()`. An ES module namespace
is frozen, so a test cannot assign to an exported binding; without that hook the
provider suite could only ever exercise the "not configured" branch, leaving the
GoTrue error mapping — the part most likely to be wrong — untested. Now that the
committed URL and key are real, it is also what stops `tests/authApi.test.js` from
calling the live project.

---

### DEC-021 Save export ships unsigned until the backend exists
**Decided by:** Hisham

**Choice:** Export and import are built with a versioned envelope, a magic header,
a custom `.farm` extension, and a checksum for corruption detection — but **no
signature**, and no encryption. The payload stays readable.

**Why:** The signing secret has to live somewhere the browser cannot read, or it
is not a secret — anyone can open devtools and pull it out of the module graph.
Right now there is no server at all (ISS-032), so any client-side signature would
be decorative. Labelling it "encrypted" or "signed" in the UI would be a false
claim; a checksum that honestly detects a truncated or corrupted file is useful
today and costs nothing.

**The extension and header are labels, not protection, and are recorded as such.**
The OS does not enforce extensions — any file can be renamed, and any file can be
opened in an editor whatever it is called. What they buy is real but small: the file
identifies itself when it turns up somewhere unexpected, and an unrelated file fed
to the importer is refused before parsing. Anyone determined reads past the header in
five seconds.

**Double-clicking a `.farm` does nothing, deliberately.** The OS has no handler for
the extension and this project ships no desktop app, so double-clicking opens
whatever the OS guesses. Import is a click in the game that opens the file picker.
Registering an OS association would need an installed application, which is out of
scope.

**`.farm` was chosen over `.ffsave`, and it is a known collision risk.** It is a
common extension for unrelated farming games and mod files, so a player's Downloads
folder may hold other `.farm` files. That is tolerable *because* the magic header
(`FFARM/1`) is what actually identifies our files — the importer never trusts the
extension, and an unrelated `.farm` is refused with a clear message rather than
half-loaded. The header is named after the product rather than the extension so the
two cannot drift apart if either is renamed later.

**No client-side cipher was added, on purpose.** Encryption cannot work here: the
key must reach the browser to decrypt, and a key the player can read is not a
secret. XOR or base64 would turn a ten-second attack into a five-minute one and
change nothing about whether it succeeds, while costing the team a hand-rolled
cipher to maintain and audit.

**The tamper analysis lives in the code**, at the bottom of `js/state/transfer.js`,
next to a test that performs the whole attack and asserts it succeeds. It is not
only in this record on purpose: a security claim nobody runs is a security claim
nobody checks.

**Filename carries no player name** — just `forecast-farm-<date>.farm`. Filenames
leak into cloud-sync listings, backup catalogues, directory indexes and
screenshots; the display name is already inside the file, where it belongs.

**Consequence:** the export format carries a `verify` step that is a documented
no-op until the backend lands, so adding the signature later is a change inside
one function rather than a format change. The email or account id goes *inside*
the envelope as an identity claim; it is never used as key material, because
emails are public or guessable and a signature keyed on one is forgeable by
anyone who knows the address.

**Rejected:** client-side encryption of the save file, for the same reason DEC-018
rejected `supabase-js` — it would look like security while providing none, and it
would cost the team a dependency and a hand-rolled cipher.

**Related:** ISS-026 (client-side accounts are not real security), ISS-032 (no
project yet).

---

### DEC-018 Supabase over REST, no supabase-js
**Decided by:** team lead

**Choice:** The auth provider is the **Supabase REST API called with plain `fetch()`**,
in `js/services/authApi.js`. Not the supabase-js SDK. Anon key in
`js/config/supabase.js`; no secret in the client, ever — the export signing
secret stays server-side.

**Why:** DEC-002 and AGENTS.md both say no runtime dependencies, and a university
course project is the worst possible place to hand a judge a dependency tree. The
auth surface we need is seven calls: sign in, sign up, sign out, refresh,
password reset, password update and session restore. REST covers all of them
without a package, and `fetch()` is already allowed inside `js/services/` by the
layering rules.

**Consequence:** we write the request and error mapping ourselves, so
`js/ui/authErrors.js` has to exist and has to be the single place provider codes
become sentences. See DEC-019.

---

### DEC-019 One neutral message for every account-existence leak
**Decided by:** Hisham

**Choice:** On the sign-in path, every reason that reveals whether an email has an
account — wrong password, no such account, email not confirmed — returns the same
sentence: *"Check your email and password and try again."* On the sign-up path the
same reasons may be specific, because the player just typed that address.

The set of sensitive reasons is `ENUMERATION_SENSITIVE` in `js/ui/authErrors.js`,
and a test asserts every entry is neutralised.

**Why:** A login form that says "no account with that email" is an account
enumeration oracle. On a public form it lets anyone confirm whether a given address
is registered, which is the first step of targeted harassment and of credential
stuffing. This is not theoretical for a game anyone might link to.

**Rejected:** per-reason specificity on sign-in, because it is a better developer
experience. It is a worse player experience for the people it puts at risk, and the
developer already has the logs.

**Also:** the provider layer returns one reason for both branches too, not only the
message layer. Two layers is defence in depth, and the provider test asserts the
two reasons are equal so the layers cannot drift apart.

---

### DEC-017 Login ships before the field; local provider until authApi.js lands
**Decided by:** the team lead, on the lead's instruction

**Choice:** Sign-in and registration ship first, ahead of the isometric field.
`js/services/localAuth.js` is a **temporary** local provider implementing the same
contract as `authApi.js`, so the panel can be built and tested before the real
provider exists. It is deleted, and one import in `js/auth-main.js` changed, when
`authApi.js` lands.

**Why:** Login had to come first, but `authApi.js` needs a Supabase project and is
Shabab's file. A mock provider that hard-codes a session would teach nobody
anything; a local provider implementing the real contract lets the panel, the
wiring, the boot gate and the tests all be finished now, and leaves the provider
swap as a one-line change.

**Rejected:** writing `authApi.js` here too. It is Shabab's file and needs a project
URL and anon key I do not have. Two people writing it would be worse than a
documented gap.

**Consequence:** `localAuth.js` writes its own localStorage keys, which breaks the
"only `state/store.js` writes storage" rule. Logged as ISS-027 with an expiry: it
goes away with the real provider and must not survive into a release.

**Reverses:** section 14 of the implementation plan, which listed accounts as out of
scope. The plan is the older document; this record is the current intent.
---

### DEC-016 One folder per crop under `assets/images/crops/`
**Decided by:** team

**Choice:** Crop art lives at `assets/images/crops/<cropId>/<cropId>_<stage>.png`. Rice is
`assets/images/crops/rice/rice_1.png` through `rice_5.png`. Empty folders for wheat, potato, corn
and tomato are committed with a `.gitkeep` so the target is obvious and git tracks them.

```js
export const cropImg = (cropId, stage) =>
  `assets/images/crops/${cropId}/${cropId}_${stage}.png`;
```

**Why:** Five crops times five stages is 25 files, and only rice exists today. Flat, that folder
is already hard to scan and gets worse with every crop added. Per-crop folders make a missing
crop an empty folder instead of a scattering of loose files, and the folder name always matches
the file prefix so a misfiled sprite is obvious.

**Rejected:** keeping it flat. It works right up until it doesn't, and the cost of moving later
is 25 `git mv` calls plus a path change in every doc that mentions a sprite.

**Also applies to:** `assets/icons/crops/`, which still holds 5 loose files. Not moved yet — see
ISS-001, since those files are all empty and will be replaced anyway.

---

### DEC-015 Measured geometry overrides guessed constants
**Decided by:** Hisham

**Choice:** `tileAspect: 0.538`, clip-path `22.4% / 75.6%`, `tileScale` starting at `0.204` —
all measured from the PNG alpha bounding boxes rather than taken from the plan's estimates.

**Why:** The plan's `tileAspect: 0.553` was described as measured from a 1000×553 ground PNG, but
every PNG is 1000×1000 and the diamond sits inside it. The real ratio is 0.538. A 3% error
compounds across three row steps and visibly misaligns the field. `tileScale: 0.22` also leaves
a rim 1.5× thicker at the front and back than at the sides, because `base.png`'s diamond is
h/w 0.600 and cannot nest perfectly around a 0.538 tile cluster.

**Rejected:** keeping the plan's numbers because they were close enough. They are close enough
to look plausible during a first build and not close enough to look right, which is the worst
combination — the bug survives review.

---

### DEC-014 Code icon paths as specified, accept broken images
**Decided by:** team

**Choice:** `config/assets.js` builds icon paths with no existence check and no fallback layer.
All 14 SVGs are 0 bytes and will render broken until art arrives.

**Why:** Keeps config pure and the UI simple. Text labels already carry the meaning in the
forecast strip and crop picker, so the panels stay usable without icons.

**Rejected:** an `existsSync` check with an emoji fallback. It adds a filesystem dependency to
config and a second code path through every icon consumer, for a problem that disappears the
moment the art lands.

**Revisit:** T-15.

---

### DEC-013 Weather is real-data only
**Decided by:** team

**Choice:** Weather always comes from the live API. The player's only levers are their own
actions — pump on/off, what to plant, what to buy. There is no player-facing weather control.

**Why:** It is the premise of the game. A player who can set the weather is not reading a
forecast.

**Consequence:** the force-weather dropdown stays behind `?debug=1` as a test tool, never a
feature. It also means the `hourly[0]` staleness in ISS-024 cannot be corrected by the player,
so it is documented as a deliberate MVP simplification.

---

### DEC-012 Remove `map.js` (Leaflet + Nominatim)
**Decided by:** team

**Choice:** Delete `js/services/map.js`. Location picking is a text search via Open-Meteo
geocoding, with no map popup.

**Why:** The old file called `L.marker`, `L.marker().setView` and `bindPopup` against a global
`map` that was never defined in the repo, and used `alert()` for the not-found case. It would
not run. It also violated every layering rule at once: DOM, `alert`, and a global Leaflet
dependency.

**Rejected:** porting it to a working Leaflet map. Out of scope, and it would add a dependency
to a project that currently has none.

---

### DEC-011 Stage is computed, never stored
**Decided by:** Hisham

**Choice:** `Plot` holds `plantedAt`, never `stage`. `stageOf(plot, now)` derives the stage on
every render.

**Why:** Growth then continues while the tab is closed with no catch-up logic, and changing
`growHours` or the stage formula needs no save migration.

**Rejected:** storing `stage` and advancing it on a timer. It drifts from real time whenever the
tab sleeps and needs reconciling on load.

---

### DEC-010 DOM `<img>` layers, not canvas
**Decided by:** team

**Choice:** The field is absolutely positioned `<img>` elements inside a square stage, sized in
percentages. No `<canvas>`.

**Why:** Plots are `<button>` elements, so they get focus, keyboard activation and accessible
names for free. Hit testing is a `clip-path`, not a hand-written polygon routine. Debugging is
inspect-element rather than a replotted frame.

**Rejected:** canvas, which would have been faster to draw but loses all of the above and makes
the 1 Hz water animation a repaint-everything problem.

---

### DEC-009 Plot price by purchase count, not plot id
**Decided by:** team

**Choice:** The price of the next plot is `PLOT_PRICES[ownedCount]`. The first plot is free
whichever plot you click, and the 100-gold plot is whichever one you click second.

**Why:** It guarantees the opening is always affordable and keeps the UI simple — there is one
"next price" rather than sixteen different ones scattered across the field.

**Rejected:** price per plot id, which needs a per-plot price table and can put the cheap plots
in awkward corners.

**Superseded in part by DEC-036 (2026-10-16).** The price rule is untouched, and so is the doubling. What
changes is *which* plot is on offer: DEC-036 fixes an order over the sixteen, so "whichever plot you click"
becomes "the next one in the order". The 100-gold plot is still the one you buy second, and still one
plot at a time.

---

### DEC-008 Pump is pre-owned in the MVP
**Decided by:** team

**Choice:** The pump exists from the start, toggled with a click. Buying it is later.

**Why:** It is the answer to drought, and drought is the game's main threat. Making it a
purchase first would gate the core mechanic behind 250 gold that a new player cannot earn
without already surviving a drought.

**Rejected:** selling the pump in the shop from the start.

**Superseded in part by DEC-058 (2026-10-23).** The pump is still pre-owned at level 1, so the
drought answer is never gated behind a shop purchase. What is bought later is capacity: levels
2–5.

---

### DEC-007 Empty plot is the ground tile
**Decided by:** Hisham

**Choice:** An empty plot renders `ground_watered.png` or `ground_unwatered.png` and nothing
else. `rice_1` through `rice_5` are the five growth stages of a planted crop.

**Why:** The art only provides one empty state, so this is the only reading that works. It is
also the most common misreading of the assets, which is why it is stated in `docs/crops.md`,
`docs/architecture.md` and `js/config/crops.js`.

---

### DEC-006 4×4 field, four 2×2 zones, dirt cross at the centre
**Decided by:** team

**Choice:** 16 plots in a 4×4 grid, grouped as four 2×2 zones, with the pump at the crossing.
The cross paths are `base.png` showing through `crossGap` — there is no path art.

**Why:** Matches `docs/reference/field-reference.jpeg` closely enough, keeps 16 plots to a
number a player can hold in their head, and the zones make the "check the forecast, pick a
zone" decision legible.

**Rejected:** the larger grid in the style mockup, and drawing cross paths as separate assets.

---

### DEC-005 Open-Meteo geocoding replaces Nominatim + Leaflet
**Decided by:** team

**Choice:** `js/services/geocodeApi.js` calls the Open-Meteo geocoding API and returns up to 5
places. No map library, no tile server, no runtime dependency.

**Why:** One API for both weather and geocoding, no key, and no dependency. The old Nominatim
code also called `alert()`, which the project bans.

**Note:** an empty result omits the `results` key entirely rather than returning `[]` — see
ISS-012.

---

### DEC-004 Open-Meteo replaces the OpenWeatherMap placeholder
**Decided by:** team

**Choice:** `js/services/weatherApi.js` calls `api.open-meteo.com/v1/forecast`. No API key.

**Why:** The placeholder needed a key the team does not have, and Open-Meteo returns
`precipitation_probability` and `uv_index` in the same response the game already needs, so the
forecast strip costs no extra request.

**Note:** response `hourly.time[0]` is local midnight, not the current hour — see ISS-009.

---

### DEC-003 Keep `timeApi.js` as a fallback only
**Decided by:** team

**Choice:** The Open-Meteo response carries `timezone` and `utc_offset_seconds`, so the local
clock comes from there. `timeApi.js` is used only if those are missing.

**Why:** One fewer network call in the normal path. The endpoint is still live, so the fallback
is real rather than theoretical.

---

### DEC-002 Vanilla ES modules, no framework or bundler
**Decided by:** team

**Choice:** Plain ES modules and plain CSS, served as-is. `package.json` holds scripts only.

**Why:** Nothing in the design needs a framework, and the layering rules the project depends on
are much easier to enforce on raw imports. It also means the game runs from any static host
with no build step.

**Consequence:** ES modules do not work from `file://`. The project must be served over HTTP,
which is what `npm run dev` is for.

---

### DEC-001 Layering is enforced by a script, not by convention
**Decided by:** Hisham

**Choice:** `scripts/check-imports.mjs` fails the build on a forbidden import, on `fetch(` outside
`js/services/`, and on `document.` outside `js/ui/`, `js/debug/` and `js/main.js`. It runs in
`npm run check` before every commit.

**Why:** Four people on one repo will drift from a convention within a week. A check that fails
in under a second is the only form of architecture rule that survives contact with a deadline.
