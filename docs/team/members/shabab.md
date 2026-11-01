# Shabab — Tawfik Rahman Shabab (ID 25)

Team leader and project manager. **71 non-merge commits**, and the first and last of them are the
project itself: the skeleton in September, the final docs pass in November.

**Owns:** `docs/team/`, crop and land data, the economy, accounts, and the shop, settings, almanac
and inventory pages.
**Goals:** G-01 support, G-04 support, G-08 lead.

## What he shipped

**Week 1 — the plan and the data.**
Started the repository and wrote `docs/game-design/implementation-plan.md`; designed the five crops
and the season calendar; set up the workflow in `docs/team/` — goals, ownership, tasks, the issue log
and the decision log — and decided the licence (MIT, ISS-002).

**Week 2 — accounts.**
Created the Supabase project and the provider switch in `js/config/{supabase,auth}.js`, wrote the
sign-in, registration and session-gated boot, then username sign-in (`002_usernames.sql`), account
deletion behind a database password check (`005`), and erase-progress behind the same check (`006`).
Password recovery was rebuilt around a `token_hash` link after the `ConfirmationURL` redirect chain
lost the token (ISS-031).

**Weeks 3–4 — the economy.**
Built the shop page and its crop cards, then the pump section when the pump gained levels. Added
easy/normal modes, selling seeds back at 75 %, and the fix that stopped the pump billing for water it
threw away. Wrote the land ladder in `js/land_squares/` — a free starter plot, then 100, 200, 400 …
1,638,400 — and the seed unlocks every four plots owned. Gave the seed picker the forecast verdict
that refuses to plant without one.

**Week 5 — crops and ship.**
Split `config/crops.js` into one file per crop, gave tomato its own stage schedule, and switched
wheat and corn on the day their fifth stage landed. Mapped each pump level to its own drawing.
Deployed to Vercel and wired the Brevo SMTP relay. Wrote the README and closed out the team docs.

## Open at ship

- **ISS-080** — buying land spends gold with no confirm step.
- **ISS-099** — no market; harvest pays at pick time. Shared with everyone.
- **ISS-032** — exported `.farm` files are unsigned.
- **T-16** — no `v0.1` tag was cut.

## Where to look

`js/land_squares/`, `js/crops_logics/`, `js/domain/{shop,land,pumpUpgrade,pumpSwap}.js`,
`js/{shop,settings,almanac,inventory}-main.js`, `js/main.js`, `js/farmActions.js`,
`supabase/migrations/`, `docs/team/`.
