-- ============================================================================
-- 2026-10-24 — mission_runs: mid-mission save/resume
-- ----------------------------------------------------------------------------
-- Before this migration, mid-mission state (which slide you're on, which
-- CFUs you've answered, shields remaining, credits earned so far) lived
-- only in React state. Close the tab → everything is lost → next time you
-- open the mission you start from slide 1.
--
-- This table persists an in-progress run per (student_id, mission_id) so a
-- kid can close their Chromebook and come back to the exact same slide
-- tomorrow with their shields, credits, streak, and prior answers intact.
--
-- Design notes:
--   • Primary key is (student_id, mission_id). One in-progress run per
--     student per mission; starting a mission upserts, completing deletes.
--   • cfu_outcomes/hints_used/cfu_order are jsonb because the shapes are
--     already stable in the client reducer and we don't query inside them.
--   • The row is DELETED when the student reaches the completion slide
--     (see completeMission flow in src/app/play/[id]/actions.ts) — the
--     best-score bookkeeping lives in mission_progress, not here.
--   • RLS: students own their rows; teachers do NOT read these (not useful
--     for grading — mid-run state is noisy). Add a teacher policy later if
--     real-time "who's where" dashboards become a thing.
-- ============================================================================

begin;

create table if not exists public.mission_runs (
  student_id    uuid        not null references auth.users(id) on delete cascade,
  mission_id    text        not null,
  current_index integer     not null default 0,
  credits       integer     not null default 0,
  shields       integer     not null default 3,
  streak        integer     not null default 0,
  cfu_outcomes  jsonb       not null default '{}'::jsonb,
  hints_used    jsonb       not null default '{}'::jsonb,
  cfu_order     jsonb       not null default '[]'::jsonb,
  started_at    timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  primary key (student_id, mission_id)
);

create index if not exists mission_runs_student_idx
  on public.mission_runs (student_id);

create index if not exists mission_runs_last_saved_idx
  on public.mission_runs (last_saved_at desc);

alter table public.mission_runs enable row level security;

drop policy if exists "own runs read"   on public.mission_runs;
drop policy if exists "own runs write"  on public.mission_runs;
drop policy if exists "own runs update" on public.mission_runs;
drop policy if exists "own runs delete" on public.mission_runs;

create policy "own runs read"   on public.mission_runs for select using (auth.uid() = student_id);
create policy "own runs write"  on public.mission_runs for insert with check (auth.uid() = student_id);
create policy "own runs update" on public.mission_runs for update using (auth.uid() = student_id);
create policy "own runs delete" on public.mission_runs for delete using (auth.uid() = student_id);

commit;
