# Math Missions — Platform App

Real Next.js + Supabase build of the platform behind **policydebate101.com**.
The static mockup lives at `~/Desktop/debate-spaceship-mockup/` and is the
canonical design reference. This repo is the working application.

## Status

- ✅ Mission schema TypeScript types (`src/lib/mission-schema.ts`)
- ✅ Inline markup parser (`src/lib/inline-markup.tsx`)
- ✅ Real Inherency mission JSON imported and rendering
- ✅ Supabase SQL schema with RLS (`supabase/schema.sql`)
- ✅ Design tokens + Starfield component
- ✅ Mission Player with all 8 CFU types (mcq, multi, sort, order, match, fill, label, highlight)
- ✅ `/` mission index, `/play/[id]` runs any mission JSON
- ✅ Supabase client/server wrappers + auth middleware + Google SSO login page + OAuth callback (scaffolded — Austin still needs to provision the Supabase project per `SUPABASE_SETUP.md`)
- ⏳ Wire MissionPlayer to write `attempts` + `completions` rows
- ⏳ Debater Bridge (sector map, next mission CTA) — replaces `/` once auth lands
- ⏳ Teacher dashboard (roster, assignments, item analysis)
- ⏳ Squadron, Codex, Quartermaster, Fleet Roster screens
- ⏳ Rename `middleware.ts` → `proxy.ts` (Next 16 deprecation, non-urgent)

## Run locally

```bash
cd ~/Desktop/policydebate101-app
npm install --cache /tmp/npm-cache-pd101    # see note about npm cache permissions below
cp .env.example .env.local                  # then fill in Supabase creds
npx next dev --port 4101
```

Open <http://localhost:4101>.

**npm cache note:** Austin's global npm cache (`~/.npm/_cacache`) has
permission issues. Always install with `--cache /tmp/npm-cache-pd101`
until that's resolved (`sudo chown -R $(whoami) ~/.npm`).

## Supabase setup

1. Create project at <https://supabase.com>.
2. SQL editor → paste `supabase/schema.sql` → run.
3. Authentication → Providers → enable **Google**, paste OAuth client.
4. Authentication → URL Configuration → add `http://localhost:4101` and the
   production URL.
5. Copy `Project URL` and `anon public` key into `.env.local`.

## Layout

```
src/
  app/                    Next.js App Router pages
    page.tsx              Smoke test: loads inherency.json, renders slide 1
  lib/
    mission-schema.ts     TypeScript types for mission JSON
    inline-markup.tsx     The {{cyan: ...}} **bold** `term` parser
  content/
    MISSION_SCHEMA.md     Canonical spec (mirror of mockup/schema/)
    missions/
      inherency-v1.json   Real mission, ported 1:1 from the mockup
      cfu-types-demo.json Reference exercising every CFU type
supabase/
  schema.sql              DB tables + Row Level Security policies
```

## Curriculum source material

Lives outside this repo (binary content folder):

- `~/Desktop/policydebate101/Policy Debate Curriculum 2026/` — 2-week camp curriculum (DOCX/PDF)
- `~/Desktop/policydebate101/Explainers Policy Debate/` — IntroPolicy slides, Argument Engine, Glossary, etc.
- `~/Desktop/policydebate101/Brand Guidelines PolicyDebate101 2026/` — voice + tone + accessibility manifesto

Use these as content sources when writing missions beyond Inherency.

## Next step (when picked up again)

1. Austin provisions Supabase per `SUPABASE_SETUP.md`.
2. Verify Google SSO end-to-end (`/login` → callback → session).
3. Wire `MissionPlayer` to write `attempts` (per CFU) + `completions` (per mission) on submit/finish.
4. Build **Debater Bridge** — replaces `/` once auth lands. Sector map, next mission CTA, shields/streak HUD.
5. Build **teacher dashboard** — class roster, assign missions, per-student / per-item analytics.
