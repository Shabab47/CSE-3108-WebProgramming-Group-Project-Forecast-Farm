# Team Docs

Everything the team needs to work on this without asking in chat. Read this page first.

## What is here

| File | What it is | Update it when |
| :--- | :--- | :--- |
| `goals.md` | The 4-week sprint. Eight goals with checkboxes. | Mark `- [x]` when a goal's **Done when** is fully met |
| `tasks.md` | Task board, seeded from the implementation plan | When you start or finish a task |
| `ownership.md` | Folder → primary owner | When someone wants to swap a folder |
| `issues.md` | Every bug and problem, found before it is fixed | The moment you find one |
| `decisions.md` | Short records of choices made, and why | When a choice is made that others would question |
| `progress-log.md` | One entry per work session, newest on top | End of every session |
| `members/` | Per-person weekly notes | Weekly |

Project docs live one level up, in `docs/`:

| File | What it is |
| :--- | :--- |
| `architecture.md` | **Start here.** Layering, data flow, and the "where do I find X" table |
| `crops.md` | Crop numbers, growth stages, harvest maths |
| `weather-events.md` | The nine events, classification, effects on crops |
| `notifications.md` | Crop alert strings and dedupe rules |
| `crop-choice-guide.md` | Season → crop, and using the forecast |
| `game-design/implementation-plan.md` | The full build plan |
| `reference/` | Field render, layout wireframe, style mockup |

## Rules

These apply to every member of the team working on this repo.

1. **Read `docs/architecture.md` before you change anything.** Layering rules, data flow, and the
   "where do I find X?" table.
2. **Update `tasks.md` when you start and finish something.** `todo → doing → done`. A task
   sitting in `doing` for a week is a conversation, not a status.
3. **One entry in `progress-log.md` per work session.** Did, files, problems, next. Newest on top.
4. **Every bug goes in `issues.md` before you fix it.** Write it down, then fix it. A bug fixed
   without a record leaves the next person to rediscover it.
5. **Branch per person:** `name/feature`, PR into `main`. Never commit to `main`.
6. **Only edit files in your owned folders** without telling the owner first. See `ownership.md`.
7. **Commits:** `type(scope): message`, where type is
   `feat fix refactor docs chore test` and scope is the folder or feature name.
   Example: `feat(field): render 16 tiles`.
8. **Run `npm run check` and `npm test` before every commit.** Both must pass.
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

## Running it

```
npm run dev     # serve the folder, open the printed URL
npm test        # node --test tests/
npm run check   # layering rules: imports, fetch, DOM access
```

ES modules do not work from `file://`. The page must be served over HTTP.

Debug mode: append `?debug=1` to the URL for the floating panel — geometry sliders, gold and
time cheats, forced weather, plot ids.
