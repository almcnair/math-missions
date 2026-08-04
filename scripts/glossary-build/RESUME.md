# Glossary Expanded-Card Build — Resume Notes

**Status:** ✅ **SHIPPED** — 2026-07-02 21:35 CDT
**Live at:** <https://policydebate101.com/glossary>

---

## What's live now

- **71 terms** in `src/app/glossary/terms.json` (structured JSON, imported by `page.tsx`).
- Each term has: `id`, `term`, `short?`, `category`, `emoji`, `def` (5th-grade one-liner), `plain` (2–4 sentence expansion), `example` (concrete round scenario), `where` (which speech/moment), `watch` (common novice mistake), `related` (2–3 term ids), `sources` (labeled by kind: curriculum / external / drafted).
- Cards on `/glossary` are now buttons. Tapping any card opens a **modal** with the full breakdown.
- Related-term chips inside the modal are clickable — they swap the modal to that term.
- **Hash routing:** `/glossary#kritik` opens the Kritik modal directly. Hash stays in sync with modal open/close (via `replaceState`, so no history spam).
- Search now matches the plain-English expansion too, not just the one-liner.
- Type-check clean (`npx tsc --noEmit`), lint clean (`npm run lint`), production build clean (`npm run build`).
- Manual `vercel deploy --prod --yes` after push (auto-webhook is flaky per MEMORY).

---

## Source authorship in the shipped data

Each term ships a `sources` array. Kinds:

- **`curriculum`** — adapted from CDSI 2026 materials (33 core terms + Turn/Link Turn/Impact Turn/Impact Calculus language quoted from the curriculum's own words).
- **`external`** — Kritik is the only one drawing from DebateUS/Wikipedia; the definition is intentionally simplified.
- **`drafted`** — written fresh at 5th-grade level for this site. Ships with a ✍️ icon in the modal's Sources section. Austin should skim these on a future pass and rewrite anything that lands wrong.

**Bael's name does NOT appear anywhere in `terms.json` or in shipped UI.** (Per MEMORY hard rule.)

---

## Files that matter now

```
src/app/glossary/terms.json     ← THE DATA. Edit this to fix/add terms.
src/app/glossary/page.tsx       ← Rendering + modal + hash routing.
```

Everything else in this `scripts/glossary-build/` folder is scaffolding from Pass 1 and can stay put as reference:

```
scripts/glossary-build/RESUME.md              (this file)
scripts/glossary-build/term_scan.json         (raw scan output, 76 pre-trim entries)
scripts/glossary-build/emoji_assignments.json (71 final emojis)
scripts/glossary-build/COVERAGE_REPORT.md     (Austin-reviewed, approved)
scripts/glossary-build/extract_text.py
scripts/glossary-build/fetch_external.py
scripts/glossary-build/match_terms.py
scripts/glossary-build/make_report.py
```

---

## Known followups / open work

- [ ] Skim every `drafted`-sourced term on the live site and rewrite anything that lands wrong. (~40 of the 71 terms use `drafted` content.)
- [ ] Consider adding a "copy link to this term" button inside the modal (uses the existing hash mechanism).
- [ ] Consider linking specific glossary hash-anchors from mission slides (e.g., when the "AFF Basics" mission mentions "solvency", link to `/glossary#solvency`).
- [ ] If Austin adds more terms later, the workflow is: edit `terms.json` → add an emoji → make sure `related` refs resolve → build → deploy. No other file touches needed.

---

## Recovery notes

- **Removed terms from the pre-trim list** (do NOT re-add without confirming): `squad`, `qualifications`/`quals`, `cutting cards`, `decorum`, `speed`/`spreading`. Austin cut these 2026-07-02 morning.
- **Vercel auto-deploy is flaky.** After `git push origin main`, always run `vercel deploy --prod --yes` from `~/dev/policydebate101-app` to force a build. Empty-commit trick also works as fallback.
