# Shabab — Tawfik Rahman Shabab (ID 25)

Team leader and project manager.

**Owns:** `docs/team/`, `js/config/crops.js`, `js/config/seasons.js`
**Goals:** G-01 support, G-04 support, G-08 lead

**Week 1 contribution:** started the initial project, wrote the implementation plan, designed the
crops and the seasons, and set up the team workflow.

---

## Week 1

- [x] Started the project and wrote the implementation plan — `docs/game-design/implementation-plan.md`
- [x] Designed the crops — `docs/crops.md`
- [x] Designed the seasons — `docs/crop-choice-guide.md`, `docs/weather-events.md`
- [x] Set up the team workflow — goals, ownership, tasks, issue log, decision log
- [x] Decide the `LICENSE` question (ISS-002) — MIT, © 2026 Tawfik Rahman Shabab
- [x] `git pull` — was behind `origin/main` (ISS-021)
- [ ] Confirm the ownership split in `docs/team/ownership.md` (ISS-025)
- [ ] Fill `js/config/crops.js` — numbers are placeholders, but they must be internally
      consistent and match `docs/crops.md`
- [ ] Fill `js/config/seasons.js` and `js/utils/season.js` with the tropical and four-season
      rules from `docs/crop-choice-guide.md`
- [ ] Chase T-14 art tracking for the remaining four crops

## Notes

- Project concept, task distribution and the README are settled. Week 1 went on planning rather
  than code, which is why the build now runs four weeks from week 2.
- Decision needed on pump balance (ISS-008) before Hisham starts T-09 in week 4. It changes how
  the game feels, so it is a design call, not just a numbers call.
- Land prices are settled: every plot costs twice the last, and unlocking all sixteen is the end
  goal. See `docs/crops.md`.
