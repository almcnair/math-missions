-- ===========================================================================
-- XP System — schema additions
-- ===========================================================================
-- Two new tables on top of the v0.1 schema:
--   mission_progress  — best-only per-student per-mission record
--   cfu_attempts      — every CFU answer ever made (item analysis backbone)
--
-- Design notes (locked w/ Austin 2026-06-22):
--   - Best-only replays: completeMission() server action upserts and only
--     increases credits/xp/perfect/best_score; it never downgrades.
--   - Streak bonus: +5 credits per CFU while running streak >= 3 (computed
--     client-side during play, persisted as part of mission_progress.bonus_credits).
--   - Perfect-run bonus: +25% of base credits if EVERY CFU was correct on
--     the FIRST attempt of THIS run (also computed client-side).
--   - cfu_attempts logs every attempt (first or replay) so the teacher
--     dashboard can do item analysis later.
-- ===========================================================================

-- mission_progress: one row per (student, mission). Best-only.
create table if not exists public.mission_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  -- Best-of-all-time figures across all attempts.
  best_score numeric(4,3) not null default 0,             -- 0.000 .. 1.000
  best_credits integer not null default 0,                -- total credits awarded for best run
  best_bonus_credits integer not null default 0,          -- streak + perfect bonus portion
  best_rank_xp integer not null default 0,                -- rank XP awarded (= mission.rewards.rankXp on completion)
  ever_perfect boolean not null default false,            -- true if any run was a perfect first-try
  attempts integer not null default 0,                    -- total attempts (completions) of this mission
  first_completed_at timestamptz,
  last_completed_at timestamptz,
  primary key (student_id, mission_id)
);

-- cfu_attempts: every single CFU answer event.
create table if not exists public.cfu_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null,
  cfu_id text not null,
  cfu_type text not null,                                 -- "cfu-mcq" | "cfu-multi" | ...
  is_correct boolean not null,
  partial_score numeric(4,3),                             -- 0..1 for partial-credit CFUs
  credits_earned integer not null default 0,
  attempt_number integer not null default 1,              -- 1 = first time student saw this CFU
  raw_response jsonb,                                     -- {choice:"b"} or {placements:{...}} — useful later
  created_at timestamptz not null default now()
);

create index if not exists cfu_attempts_student_mission_idx
  on public.cfu_attempts (student_id, mission_id, created_at);
create index if not exists cfu_attempts_mission_cfu_idx
  on public.cfu_attempts (mission_id, cfu_id);

-- ---------- RLS ------------------------------------------------------------

alter table public.mission_progress enable row level security;
alter table public.cfu_attempts     enable row level security;

-- Students see/insert/update only their own rows.
drop policy if exists "own progress read"   on public.mission_progress;
drop policy if exists "own progress write"  on public.mission_progress;
drop policy if exists "own progress update" on public.mission_progress;
create policy "own progress read"   on public.mission_progress for select using (auth.uid() = student_id);
create policy "own progress write"  on public.mission_progress for insert with check (auth.uid() = student_id);
create policy "own progress update" on public.mission_progress for update using (auth.uid() = student_id);

drop policy if exists "own attempts read"  on public.cfu_attempts;
drop policy if exists "own attempts write" on public.cfu_attempts;
create policy "own attempts read"  on public.cfu_attempts for select using (auth.uid() = student_id);
create policy "own attempts write" on public.cfu_attempts for insert with check (auth.uid() = student_id);

-- Teachers see progress + attempts for students in their classes (future-proof,
-- matches the pattern already used on profiles).
drop policy if exists "teacher reads class progress" on public.mission_progress;
create policy "teacher reads class progress"
  on public.mission_progress for select using (
    exists (
      select 1
        from public.enrollments e
        join public.classes c on c.id = e.class_id
       where e.student_id = mission_progress.student_id
         and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "teacher reads class attempts" on public.cfu_attempts;
create policy "teacher reads class attempts"
  on public.cfu_attempts for select using (
    exists (
      select 1
        from public.enrollments e
        join public.classes c on c.id = e.class_id
       where e.student_id = cfu_attempts.student_id
         and c.teacher_id = auth.uid()
    )
  );
