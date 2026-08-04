-- ============================================================================
-- 2026-07-03 — Google-only auth
-- ----------------------------------------------------------------------------
-- Rip out the synthetic-email/PIN student auth added on 2026-06-24.
-- Everyone (students + teachers) signs in with Google OAuth. Teachers are
-- promoted from student -> teacher manually (SQL bootstrap, then the UI at
-- /teacher/roster).
--
-- Safe to run more than once (idempotent on schema changes; the data wipe is
-- guarded by role='student').
-- ============================================================================

begin;

-- ---------- 1. Wipe existing student rows -----------------------------------
-- Order matters because of FK cascades. Enrollments first, then profiles.
-- auth.users then gets cleaned up so re-signing in with the same Google email
-- doesn't collide with an orphaned auth row.

-- Capture the student ids we're about to nuke.
create temporary table _wiped_students as
  select id from public.profiles where role = 'student';

-- Enrollments for those students.
delete from public.enrollments
  where student_id in (select id from _wiped_students);

-- Profile rows (this cascades through most of the schema via FK ON DELETE
-- CASCADE, so attempts/completions/mission_progress etc. go with them).
delete from public.profiles
  where id in (select id from _wiped_students);

-- The matching auth.users rows. Doing this last so nothing left over.
delete from auth.users
  where id in (select id from _wiped_students);

drop table _wiped_students;

-- ---------- 2. Drop PIN columns from profiles -------------------------------

alter table public.profiles
  drop column if exists pin_set,
  drop column if exists pin_failed_attempts,
  drop column if exists pin_locked_at,
  drop column if exists primary_class_id;

-- ---------- 3. Enforce unique email on profiles -----------------------------
-- Google gives us a stable email per account; enforcing uniqueness prevents
-- accidental duplicate profiles if the callback logic ever glitches.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_email_unique'
  ) then
    alter table public.profiles
      add constraint profiles_email_unique unique (email);
  end if;
end
$$;

-- ---------- 4. Drop the generate_join_code function's PIN dependency --------
-- The function itself is fine; it doesn't reference the PIN columns. Kept as-is.

commit;
