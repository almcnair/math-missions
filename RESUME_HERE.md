# RESUME_HERE — Math Missions

_Last touched: 2026-08-05 18:32 CDT_

Read this file FIRST when Austin comes back to Math Missions.

**Origin:** Math Missions is a **fork of PD101**. This repo is mid-strip. Debate content, `DebaterNav`, "Debater Login," the debate mission JSONs, `policydebate101` identifiers, and "policy debate training" copy are all **inherited crud from the clone — not content to preserve**. PD101 lives in its own repo/deployment. Default action on PD101 leftovers here is **remove**.

---

## Where we are right now

- **Repo:** `~/dev/math-missions/` — Next.js + Supabase, deployed on Vercel eventually.
- **Dev server:** `cd ~/dev/math-missions && npm run dev` → http://localhost:3000
- **Test student login (created 2026-08-05):**
  - Email: `test-student-1@gmail.com`
  - Password: `mathmissions123`
  - Supabase user id: `95e0da94-04ea-42a5-91f2-349153d944c9`
  - Created via `supabase.auth.admin.createUser` with `email_confirm: true`, so it can sign in immediately without a confirmation email.
- **Student post-login page:** `/bridge` (source: `src/app/bridge/page.tsx`). Nav component is still called `DebaterNav`.
- **Mission authoring editor:** `/author` (`src/app/author/page.tsx` → `AuthorWorkspace` component). Currently NOT auth-gated. Fine for dev; gate before real students see it.

---

## What was done this session (2026-08-05 evening — landing-page copy Pass 3, partial)

**New source of truth for site copy:** `/Users/ausitnmcnair/Desktop/Math Missions v2/Math Missions Copy v2.pdf`. Hero copy, taglines, terminology matrix (Debater→Math Cadet, Argument Sandwich→Solution Sandwich, Flowing→Math HUD), three feature-card headers/bodies, and a Built-In Accommodations callout.

### Landing page — `public/landing/index.html` (UNCOMMITTED)

All changes are working-tree only; nothing committed yet.

- `<title>` → "Math Missions — Master 6th-Grade Math on the Bridge of Your Own Space Station"
- Hero H1 → **MATH MISSIONS** (was "LEARN POLICY DEBATE. ONE MISSION AT A TIME.")
- Hero subtitle → v2 subtitle + compressed hero body
- Primary CTA button → ▸ **Launch Mission 1** + "Same button for new and returning **Math Cadets**"
- Scroll cue → "Scroll for your first mission"
- "YOUR FIRST MISSION" section-sub → Math Cadet / Math HUD framing
- Mission 01 card → **Dividing Fractions** using Solution Sandwich vocabulary (was "Welcome Aboard / Commander K / order of speeches")
- Footer tagline → "Command your math power, one mission at a time."
- Footer legal → "All content is for educational purposes." (dropped "debate")
- **Removed** the Camp Student secondary CTA (`/login/pin` link — Austin's call at 18:29)

### Deliberately NOT touched on the landing page

- HTML comments containing "debater" (invisible — code-cleanup pass later)
- `form action="/auth/debater-signin"` — route, not copy. Pass 2.
- "HOW IT WORKS" section (lines ~940–1005) — currently `hidden style="display:none"`, contains "Short briefings on policy debate…". If we un-hide it, this is where the three v2 feature cards (Solution Sandwich / Math HUD / Co-Op Missions) probably belong.
- `© 2026 PolicyDebate101` footer legal identifier — Pass 2.

### Open copy decisions Austin still needs to make

1. **Three v2 feature cards** (Solution Sandwich / Math HUD / Co-Op Missions) — no natural home yet. Un-hide "HOW IT WORKS" as their slot, or hold?
2. **v2 §4 Built-In Accommodations callout** (Plain-English Word Problems / Scaffolded Sentence Stems / Dyscalculia-Friendly Layout) — teacher/admin-facing. Landing-page section? Coach page? Skip?

### Next surfaces to hit (copy Pass 3 continues)

1. `src/app/login/page.tsx` — `DEBATER LOGIN` → `MATH CADET LOGIN` + other visible swaps.
2. `src/app/bridge/page.tsx` — "home base for policy debate" + glossary CTA rewrites.
3. `src/app/layout.tsx` — `description` metadata (currently "Debate training in space — learn policy debate as a starship debater.").
4. `src/app/camp/page.tsx` — visible debate strings only.

### Commit strategy (nothing pushed yet)

Still uncommitted from earlier today AND this evening:
- Bridge mission list edit (fractions-only)
- All landing-page copy changes above
- Pre-existing working-tree changes (middleware.ts, deleted pilot avatars, `dividing-fractions-v1.json`, `AI_MISSION_AUTHORING_GUIDE.md`)

Ask Austin how he wants to slice the commits before pushing.

---

## What was done earlier in the day (2026-08-05)

### 1. Pass 1 rename — COMMITTED (`f10d5dd`)

Case-preserving swap of the literal brand string across 29 files:

- `POLICY DEBATE 101` → `MATH MISSIONS`
- `Policy Debate 101` → `Math Missions`

43 lines changed. Deliberately untouched (later passes):

- **Pass 2:** `policydebate101` / `PolicyDebate101` identifiers, slugs, domains (47 hits + 4 hits). Domain/URL/Supabase risk — needs an audit, not a grep. Example still-present: `<title>Authoring Console · PolicyDebate101</title>` in `src/app/author/page.tsx`.
- **Pass 3:** The word `debate` / `debater` in product copy (~1,900+ hits). Requires design decisions, not a rename. Examples still-present:
  - Login page headline: `DEBATER LOGIN`
  - Landing `<title>`: `"Math Missions — Learn Policy Debate, One Mission at a Time"`
  - Landing footer tagline: `"Policy debate training, one mission at a time."`
  - `/bridge` welcome copy: `"This is your home base for policy debate."`
  - `/bridge` glossary CTA: `"Look up a debate term in the Glossary"`
  - `DebaterNav` component name

### 2. Mission list on `/bridge` — UNCOMMITTED (working tree)

- Removed all 6 debate missions from the bridge's `missions[]` array.
- Added `dividing-fractions-v1` as the only mission in the list.
- Set `dividing-fractions-v1.json` → `"number": 1` (numbers ≤ 3 are rank-unlocked per `src/lib/xp.ts::rankRequiredFor`).
- The debate mission JSON files still exist in `src/content/missions/` and are still registered in `/play/[id]/page.tsx`'s REGISTRY (so direct URLs like `/play/what-is-debate-v1` still resolve) — they're just not visible on the bridge anymore.

### Pre-existing working-tree changes (NOT MINE, do not clobber)

Austin had these before this session started:

- Deleted 3 pilot avatar `.jpeg` files under `public/avatars/pilots/`
- Modified `src/middleware.ts` (+12 lines — probably auth/role gating work)
- Modified `src/app/play/[id]/page.tsx` (+2 lines — registered `dividing-fractions-v1` in REGISTRY)
- New untracked: `docs/AI_MISSION_AUTHORING_GUIDE.md`
- New untracked: `public/mission-images/dividing-fractions-v1/`
- New untracked: `src/content/missions/dividing-fractions-v1.json` (the mission itself)

---

## Immediate next-step options (Austin's call)

1. **Commit the bridge changes** — the mission-list edit is uncommitted right now. If Austin is happy with fractions-only, wrap it in a commit alongside the new mission JSON, the play/[id] registration, and the new authoring guide. Leave middleware.ts and the avatar deletions for their own commit(s) since they're unrelated.
2. **Pass 2 — identifier rename** (`policydebate101` / `PolicyDebate101`). Break-the-site risk. Needs to audit URL config, Supabase config, redirect URLs, alt text, and possibly external deploy config before touching. **Ask Austin before starting.**
3. **Pass 3 — the word "debate"** in product copy. Design conversation, not a rename. Start with the highest-visibility surfaces (login page, `/bridge` welcome copy, landing page `<title>` and footer tagline, `DebaterNav` component copy).
4. **Auth-gate `/author`** before students can hit it. Middleware tweak.

---

## Hard reminders

- Test student `test-student-1@gmail.com` is a throwaway. Delete it once real testing starts.
- `AGENTS.md` and `CLAUDE.md` in this repo may have their own notes — read them before making structural changes.
- Vercel deploys are auto-on-push-to-main (assumption from PD101 pattern — verify before pushing anything real).
- Never leave `Bael` as a name in student-facing code, comments visible in built HTML, or JSON that ships (locked-in rule from MEMORY.md).
