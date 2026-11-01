# Team Docs

Everything the team needs to work on this without asking in chat. Read this page first.

**The build is finished and shipped.** These pages are now the record of how it went, not a live
planning board — `goals.md` shows which goals were met and which were not, `tasks.md` is closed out
row by row, and `progress-log.md` ends with the final docs pass.

## What is here

| File | What it is | Update it when |
| :--- | :--- | :--- |
| `goals.md` | The 5-week plan. Eight goals with checkboxes, and an honest `- [~]` for the ones that shipped without their whole scope. | Mark `- [x]` when a goal's **Done when** is fully met |
| `tasks.md` | Task board, seeded from the implementation plan, with a final status on every row | When you start or finish a task |
| `ownership.md` | Area → primary owner, as the split actually ended. **Not a gate.** | When someone wants to swap an area |
| `issues.md` | Every bug and problem, found before it is fixed, plus a **Final triage** section for the shipped build | The moment you find one |
| `decisions.md` | Short records of choices made, and why | When a choice is made that others would question |
| `progress-log.md` | One entry per work session, newest on top | End of every session |
| `members/` | One final contribution record per person | When someone's scope changes |

Project docs live one level up, in `docs/`:

| File | What it is |
| :--- | :--- |
| `architecture.md` | **Start here.** Layering, data flow, the annotated file tree, and the "where do I find X" table |
| `crops.md` | Crop numbers, growth stages, land prices, harvest maths |
| `asset-checklist.md` | Every asset the game needs, and the nineteen still missing |
| `weather-events.md` | The nine events, classification, effects on crops |
| `notifications.md` | Crop alert strings and dedupe rules |
| `crop-choice-guide.md` | Season → crop, and using the forecast |
| `setup.md` | Run it, run the six migrations, and check each one worked |
| `game-design/implementation-plan.md` | The original build plan, and how the build compared to it |
| `reference/` | Field render, layout wireframe, style mockup |

## Rules

These applied while the build was running, and they are still how a change should be made.

1. **Read `docs/architecture.md` before you change anything.** Layering rules, data flow, and the
   "where do I find X?" table.
2. **Update `tasks.md` when you start and finish something.** `todo → doing → done`. A task
   sitting in `doing` for a week is a conversation, not a status.
3. **One entry in `progress-log.md` per work session.** Did, files, problems, next. Newest on top.
4. **Every bug goes in `issues.md` before you fix it.** Write it down, then fix it. A bug fixed
   without a record leaves the next person to rediscover it.
5. **Branch per person:** `name/feature`, PR into `main`. Never commit to `main`.
6. **Only edit files in your owned area** without telling the owner first. See `ownership.md`.
7. **Commits:** `type(scope): message`, where type is
   `feat fix refactor docs chore test` and scope is the folder or feature name.
   Example: `feat(field): render 16 tiles`. **No `Co-Authored-By` trailer, ever.**
8. **Run `npm run check` and `npm test` before every commit.** `check` must report no new
   violations; `test` must be at least as green as it was.
9. **One commit per step.** Do not bundle a refactor with a feature.

## Marking a goal done

Goals live in `goals.md` as `- [ ]` / `- [x]`. That checkbox is the only definition of done.

- Tick a goal only when **every** box under its **Done when** is satisfied.
- Tick it in the same commit as the final piece of work, so the history shows when.
- If a goal is partly done, leave it `- [ ]` and tick the individual sub-boxes instead. The
  sub-boxes are the progress; the goal box is the verdict.
- Un-ticking is allowed and normal — if something regresses, un-tick it and log why in
  `progress-log.md`.

## Finding things

- **"Where does this live?"** → `docs/architecture.md`
- **"What are the rules for X?"** → `docs/crops.md`, `docs/weather-events.md`,
  `docs/notifications.md`
- **"What are we building and in what order?"** → `docs/game-design/implementation-plan.md`
- **"Is this mine to change?"** → `ownership.md`
- **"Has this been broken before?"** → `issues.md`
- **"Why is it done this way?"** → `decisions.md`
- **"Who wrote this?"** → `members/`, and the *Who Built What* section of the README

## Running it

```
npm run dev     # serve the folder, open the printed URL
npm test        # node --test tests/ — 800 tests
npm run check   # layering rules: imports, fetch, DOM access
```

ES modules do not work from `file://`. The page must be served over HTTP.

**There is no `?debug=1` panel** — that was planned as T-06 and never built, so `js/debug/` does not
exist. The one debug flag that shipped is **`?fast=N`**, which divides every grow time by N:
`?fast=60` turns a six-hour rice cycle into six minutes and changes no prices. `?guest=1` marks a
guest session on the shop, almanac and inventory pages.
