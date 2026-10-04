# Notifications

Forecast-driven, crop-tied alerts. This is the mechanic that turns the forecast strip from
decoration into a decision tool: the player reads ahead and chooses what to do about it.

Implementation: `js/domain/notifications.js`, rendered by `js/ui/toastStack.js`.

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
