-- ============================================================================
-- 2026-08-03 — Fix infinite RLS recursion on public.profiles
-- ----------------------------------------------------------------------------
-- Bug: the "teacher and admin read all profiles" and "teacher and admin update
-- any profile" policies both subquery public.profiles inline:
--
--   using (
--     exists (
--       select 1 from public.profiles p
--       where p.id = auth.uid() and p.role in ('teacher','admin')
--     )
--   )
--
-- Evaluating that policy re-enters public.profiles, which re-triggers the
-- policy, which re-enters, and so on. Postgres detects the loop and errors
-- with 42P17 "infinite recursion detected in policy for relation profiles".
-- Symptom: every SELECT/UPDATE on profiles fails with a 500 through PostgREST.
--
-- Fix (mirrors PD101's 2026-06-24_fix_rls_recursion.sql): use a SECURITY
-- DEFINER helper. It runs as the function owner (postgres), which bypasses
-- RLS entirely, so the "am I a teacher/admin?" lookup reads the underlying
-- rows directly instead of recursing through the policy machinery.
--
-- This migration is idempotent; safe to re-run.
-- ============================================================================

begin;

-- ---------- SECURITY DEFINER helper ----------------------------------------

create or replace function public.is_teacher_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('teacher','admin')
  );
$$;

grant execute on function public.is_teacher_or_admin() to authenticated;

comment on function public.is_teacher_or_admin() is
  'Returns true if the current auth.uid() maps to a profile row with role in (teacher, admin). SECURITY DEFINER so RLS on profiles does not recurse when the check is used inside a profiles policy.';

-- ---------- Rewrite the recursive policies ---------------------------------

drop policy if exists "teacher and admin read all profiles" on public.profiles;
create policy "teacher and admin read all profiles"
  on public.profiles
  for select
  using (public.is_teacher_or_admin());

drop policy if exists "teacher and admin update any profile" on public.profiles;
create policy "teacher and admin update any profile"
  on public.profiles
  for update
  using (public.is_teacher_or_admin());

commit;
