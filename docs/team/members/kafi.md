# Kafi (Jim) — Abdullah Hil Kafi (ID 19)

**Also goes by Jim** — the Git handles are `aa-jim` and `Jim`, the branch is `origin/jim`, and the
email is the same one on both. **One person, not two.** The docs use **Kafi** throughout; the README
team table carries the alias once so nobody reads it as a fifth member. **36 non-merge commits**,
and by files touched the widest footprint in the repository: 79 edits under `assets/images`, 72 in
`js/ui`, and every stylesheet.

UI/UX and frontend developer.

**Owns:** `css/`, `assets/`, and the chrome a player looks at — navbar, menu, avatars, profile,
dialogs and phone layout.
**Goals:** G-02 lead, G-06 support, G-08 support.

## What he shipped

**Week 1 — the first art.**
Drew rice's five growth stages and both ground tiles (watered and unwatered) from the measured
bounding boxes in `docs/architecture.md`, and set up the folder-per-crop structure so a new crop is a
folder rather than a change to the renderer (DEC-016).

**Weeks 2–3 — the screens.**
Built the opening menu and the sign-in board (`menuPanel`, `signBoard`, `authViews`), the game scene
(`css/scene.css`, 22 edits, and the plot layers under it), the navbar, the profile page, the shop
repaint to the Figma reference, and the settings styling. Fixed the location bar, the save card, the
guest seeing "null", and the board's duplicated freshness label.

**Weeks 3–4 — avatars, dialogs, phones.**
Drew the preset avatars and built the avatar step at sign-up. Built the timber dialogs — the plot
inspector and the seed picker — and the small-card picker with its info icon. Wrote the four phone
stylesheets that reflow the farm onto the 430 × 1232 frame, and matched phone typography to the
desktop stacks.

**Week 5 — the rest of the art, and the sound.**
Drew potato, tomato, wheat and corn: five stages and two damage states each, plus a seed packet per
crop. Drew `pump_1.png`–`pump_5.png`, one per level, and `farm_bg.png` behind the page. Added the
sixteen sound-effect files, the book and inventory art, and the UI icons. Styled the almanac and the
timber environment card.

## Open at ship

- **T-26** — 19 files still missing: five `_dead` crop sprites, nine weather SVGs, five crop SVGs.
- **ISS-001** — the weather and crop icons are the empty ones above; text carries the meaning.
- **ISS-122** — Farmer 3's avatar has six black bars, and seven tests fail on that drawing.
- **ISS-023** — sound effects play, but there is no mute toggle; the three ambient files are 0 bytes.
- **T-84** — stopgap spacing and radius tokens still live in `css/variables.css`.

## Where to look

`css/` (every file), `assets/`, `js/ui/{navbar,menuPanel,signBoard,authViews,avatarArt,avatarSetup,profileView,seasonCard,icon,icons,backdropDismiss}.js`,
`js/utils/sound.js`, `js/config/avatars.js`. The asset inventory is
[`docs/asset-checklist.md`](../../asset-checklist.md).
