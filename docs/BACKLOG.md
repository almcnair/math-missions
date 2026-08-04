# BACKLOG.md — Deferred Work & v2 Ideas

> Things worth building later, tied to features that are already live.
> Each entry: **what it is**, **why it's not shipped**, **effort estimate**, and **the decision that would trigger building it**.
>
> Add new items at the top of each section. Prune ruthlessly — if something's been sitting here for 6 months untouched, delete it.

---

## Round Playbook (`/games/speech-timeline.html`)

Shipped 2026-07-09 as standalone HTML. Registered in `tools.json` under both `debater` and `lab-leader` hubs.

### ▶ "Play the Round" auto-stepping mode
A ▶ button that walks through every speech in order with a live countdown timer, auto-expanding each detail panel, and ticking down the prep-budget segments in real time.
- **Why deferred:** feature creep risk. The static Playbook is already useful; Play mode adds meaningful complexity (timer state, pause/resume, speed control, cleanup on nav) and needs testing.
- **Effort:** ~1 focused session. Mock design was scoped in 2026-07-09 conversation — has default speeds (10×), prep tick-down between speeches, and a "NOW PLAYING" header. See daily memory 2026-07-09 for the full spec draft.
- **Ship trigger:** a lab leader asks for it, OR the static Playbook is clearly working well enough that this becomes the next natural polish step.

### Port to React at `/resources/round-playbook`
Right now the Playbook is standalone HTML in `public/games/` — opens in a new tab, doesn't share the site's header / mascot / nav chrome (same pattern as `jeopardy-day1.html`).
- **Why deferred:** ship-fast beat integrate-perfectly on 2026-07-09. Standalone worked; React port would have delayed launch.
- **Effort:** ~2 focused sessions. Data model already clean — `SPEECHES` and `PREP_PLAN` arrays lift cleanly into TypeScript; glossary tooltip becomes a `<Term id="solvency" />` component that imports from `src/app/glossary/terms.json` directly instead of the inlined `GLOSSARY = {…}` constant.
- **Ship trigger:** when the tool has proven its value and warrants first-class UI treatment (nav breadcrumb, back-to-hub, share buttons, etc.).

### Real illustrations for the hook tiles
The "Real-World Hook" section on each speech currently shows an emoji glyph on a glowing tile (📄 for 1AC, 🥅 for 2AC goalie, 🚒 for 1AR firefighter, etc.).
- **Why deferred:** image generation is the biggest polish jump on the whole tool; wanted layout locked before spending on assets.
- **Effort:** ~1 session generating 9 hero illustrations at 4:3 aspect in house style (holographic sci-fi, cyan/amber glow, ~98% POC, ~75% girls per `docs/AI_STYLE_GUIDE.md` representation mandate). Then swap the emoji tile HTML for `<img>` tags.
- **Ship trigger:** first classroom use where a student asks "what does 'goalie' mean here?" Illustrations are the fastest fix for that.

### Personal "I'm on Aff/Neg" prep-sheet toggle
A small `AFF | NEG` toggle at the top that highlights only the speeches on your side, dimming the opposing team's. Turns the Playbook into a personal prep sheet a student can bring to a round.
- **Why deferred:** unclear whether students will actually use it; existing highlight buttons already partly cover this.
- **Effort:** ~30 min. Small state addition.
- **Ship trigger:** a coach asks "how do I get my kids to focus on just their side?"

### Standalone glossary entries for Magnitude / Probability / Timeframe
These three terms are protected vocab (from the Gemini rules file) but currently only defined *inside* the `impact-calc` glossary entry — so they don't get their own tooltips on the Playbook.
- **Why deferred:** debatable whether they should be first-class terms (they're really sub-parts of Impact Calculus, not independent concepts).
- **Effort:** ~15 min. Three new entries in `src/app/glossary/terms.json` following the existing schema.
- **Ship trigger:** a student asks for a definition of one of them individually, OR you decide Impact Calc pedagogy at your school treats them as three separate lessons.

### Compressed / "real-time" toggle for lab-leader projection use
Only relevant if "Play the Round" ships. Real-time mode (~32 min for a full round) is useless for a student browsing, but valuable for a lab leader projecting the Playbook during a live-round demonstration.
- **Ship trigger:** ships alongside Play mode as an option.

---

## General site

_(no deferred items yet — add here as they come up)_

---

## How this file works

- **Not a wishlist.** Only items with a real "what would make me build this" trigger.
- **Not a promise.** Items can be deleted without notice if the underlying feature is dropped or reworked.
- **Not exhaustive.** Small polish (typo fixes, tweaks, one-off bug fixes) doesn't belong here — just do those inline.
- **Not sacred.** If something has sat here more than 6 months untouched, delete it. If it were worth building, someone would have asked by now.
