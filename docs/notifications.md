# Notifications

Forecast-driven, crop-tied alerts. This is the mechanic that turns the forecast strip from
decoration into a decision tool: the player reads ahead and chooses what to do about it.

Implementation: `js/domain/notifications.js`, rendered by `js/ui/toastStack.js`.

> **Status: built (T-13, 2026-10-17).** Everything below was written as a specification and
> sat unimplemented against a **0-byte** `domain/notifications.js` — including this file's own
> closing note that "section 7 of the implementation plan does not provide" the dedupe field.
> `state.notified` existed; nothing read it. All of it is now in code, with the one place the
> shipped behaviour differs from the original spec called out in **Toasts** below.

---

## Alert strings

From the README. Two per crop, covering the two situations each crop actually cares about.

| Crop | Situation 1 | Situation 2 |
| :--- | :--- | :--- |
| Rice | *"Rain incoming — skip irrigation."* | *"Drought in 3h — start water pump?"* |
| Wheat | *"Heatwave coming — wheat yield may drop."* | *"Heavy rain warning — rot risk."* |
| Potato | *"Frost tonight — cover potatoes?"* | *"Waterlogging risk — drain field?"* |
| Corn | *"Strong wind warning — stake corn?"* | *"Drought — irrigate now?"* |
| Tomato | *"Heavy rain — protect tomatoes from splitting?"* | *"Frost — cover or lose crop."* |

## When they fire

`notifications.forProjection(state)` looks at the next 6 to 24 hours of classified events in
`state.weather.hourly` and compares them against the crops currently planted. It returns an
array of alert objects; it does not decide when to show them.

```js
{ cropId, event, hoursAway, message }
```

An alert fires when all of these hold:

1. A crop is planted on at least one owned, non-dead plot.
2. A relevant event for that crop appears within the next 6–24 hours.
3. That `cropId + event` pair has not already fired for this event window.

## Relevance

A crop is "interested" in an event when its matrix rating is worse than `ok` — that is `risk`,
`damage` or `severe`. `thrives`, `good` and `ok` produce no alert. This keeps the toast stack
quiet during settled weather, which is what makes an alert worth reading.

Drought is the exception that proves the rule: it is interesting to a crop regardless of the
current water level, because the alert is about what is *coming*. The `< 30` conditional in
`ratingFor()` governs damage that has already landed, not whether to warn about future drought.

## Dedupe

Fire at most once per event window, keyed on `cropId + event`.

The "event window" is the current run of that event in the hourly forecast. If `heavy-rain` runs
from 14:00 to 20:00, the alert fires once, at 14:00, and does not repeat hourly for six hours.

This needs somewhere to live, and section 7 of the implementation plan does not provide it. The
State shape carries no field for it. Add:

```js
notified: { [cropId + ':' + eventId]: <iso timestamp of window start> }
```

A new window with a later start timestamp clears the key and lets the alert fire again. The
field must be in both `js/state/types.js` and `js/state/initialState.js`, and it is persisted,
otherwise a page reload would re-fire every alert. Tracked as ISS-013.

## Example

State: rice planted on plot 3, `hourly` shows `sunny` for 3 h then `heavy-rain` for 5 h.

- `sunny` → rating `ok` for rice → not interesting → no alert.
- `heavy-rain` at 3 h away → rating `ok` for rice → not interesting → no alert.

Rice genuinely does not mind heavy rain, so silence is correct here. Now swap the planted crop
to wheat on the same forecast:

- `heavy-rain` → `damage` for wheat → alert fires once: *"Heavy rain warning — rot risk."*

The same forecast produces a completely different conversation depending on what is in the
ground. That is the whole design.

## Toasts

`js/ui/toastStack.js` renders them. Constraints:

- Stack from the bottom-right, newest on top, max 3 visible.
- Auto-dismiss after about 6 seconds.
- Never use `alert()`. Errors and warnings go through the same stack.
- `store.apply` emits a `toast` event with a `reason` whenever a domain function returns
  `ok: false`, so most toasts need no explicit call.

### The lost-connection toast

`js/connection.js` raises one: **"No connection — your farm is safe on this device."** It fires on the
**first** `sync` transition to `pending` and not again until the state returns to `synced`.

The rule is in `advanceAnnouncement(announced, next)`, pure and exported so it can be tested without a
store or a DOM. `synced` clears the flag rather than setting it, so one outage announces once and the
next outage is a new outage that gets to be heard again. `saving` never announces — it is the state the
game passes through twice every `AUTOSAVE_MS`, and a toast on every healthy autosave is a firehose.

It exists because the permanent indicator is small. `ui/syncIndicator.js` is a fixed corner chip whose
amber `No connection` label never self-dismisses, but a small permanent fixture is exactly what players
learn to ignore. The toast is the transient, unmissable half of the pair; the label is the persistent
half. Together they are what keeps ISS-050 fixed. See DEC-037.

**Wording is load-bearing.** It must reassure rather than alarm — nothing is lost, the local copy is
correct, and saying so is what stops someone clearing their browser. The same rule the alert strings
above follow, for the same reason.

---

## What shipped, and where it runs

T-13 built this, and the shipped behaviour differs from the specification in exactly one
way worth recording. Everything else follows what is written above.

### Two clocks, because there are two different facts

| | Forecast warning | Standing warning |
| :--- | :--- | :--- |
| Fact | bad weather is **coming** | this plot is **dry now** |
| Function | `forProjection()` | `currentTrouble()` |
| Checked | the 15-minute weather refresh | the 1 Hz tick |
| Why there | the forecast only changes when it is refetched, so checking every second computes the same answer sixty times a minute | it is a **condition**, not a forecast, and a player who plants into a heatwave should not wait a quarter of an hour to be told |

`main.js` holds both: `announceForecast()` on refresh, and inside `tickFarm()` for the
standing one. Firing the standing warning from the refresh instead would mean a player
could watch a plot dry for up to fifteen minutes while holding the correct information.

### `forProjection()` vs `alertsToRaise()`

The split the spec asked for — candidates, and a separate firing decision — is what shipped,
because the first half is then testable with no store and no DOM. `forProjection(state)`
returns candidates; `alertsToRaise(state)` applies the dedupe map and returns
`{ alerts, notified }`. Both are pure.

### Where the strings live now

The table at the top of this file is the **intent**, and `MESSAGES` in
`domain/notifications.js` is the **implementation**, with a per-crop line for each event the
matrix rates worse than neutral plus a `GENERIC` fallback. Two differences from the table,
both deliberate:

- **Frost is a drain, not an instant kill** (see `weather-events.md`), so the tomato line says
  *"cover them or lose the crop"* — the table's phrasing — while the rice line says *"the
  first crop to suffer"* and does not promise the same stakes for a hardier crop.
- **Every message names an action.** *"Run the pump"*, *"water them"*, *"water it"*. The
  table's question-mark forms (*"start water pump?"*) were a worse fit once there was
  actually a pump to start: a warning with no action attached is just anxiety, and the
  action here is always available.

### Standing-warning dedupe

`currentTrouble()` keys on `'drought_warning'` and stores the **message text** in the same
`notified` map, rather than the window-start stamp the forecast half uses. A standing
condition has no window to key on; the text changes when the plot count or the crop does,
which is exactly when re-warning is correct. It persists, so a reload does not re-toast.

### The watering warning — added after ISS-091

**`wateringAdvice()` is the warning that should have existed before this section was needed.**
ISS-091 arrived as *"2 crops died, watering could have saved them all this time"*, with the
pump running — and the message was in the **past tense**, about a situation that had been
visible on the board for hours. The player was told afterwards, by a game that had been
showing them the answer the whole time.

So the standing warning now has two shapes:

| | function | says |
| :--- | :--- | :--- |
| **the weather sentence** | `currentTrouble()` | *"3 plots are running dry in a drought."* |
| **the actionable list** | `wateringAdvice()` | *"The pump is on plot 3. plot 1, plot 2 need water too — move it onto them or take the loss."* |

**It names the plots by number**, because the pump only reaches the targets the player has added
(DEC-058) and "some crops are dry" is not a decision anyone can make. It also says **where the
pump is pointed**, so "turn the pump on" is never offered to a player whose pump is already on.

It keys on the **set** of thirsty plot ids, so the toast re-fires when the set changes —
one more plot going dry is new information, the same plot still being dry is not.

And `currentTrouble()` moved off the flat `DRY_WATER` line onto each crop's own **band**,
for the same reason the meter reads four states: 40 water is unremarkable for wheat and
alarming for rice, and only `bandFor()` knows the difference.

### Death messages

`deathMessage()` in `main.js` branches on where the pump actually was, because one fixed
string produced ISS-091. Three cases, three genuinely different situations:

| the pump was | says | why |
| :--- | :--- | :--- |
| **off, or on with no targets** | *"Turn the pump on and add that plot."* | advice is fair |
| **on, watering other plots** | *"The pump was watering plot 3 — add that plot, or take the loss."* | a level always has a capacity, so there is always somebody it is not on; the player is not at fault |
| **watering this plot, and it died** | *"That is a bug — please tell us."* + `log.error` | blaming the player for a fault in the code is worse than silence |
