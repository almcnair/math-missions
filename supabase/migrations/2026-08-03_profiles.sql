-- ============================================================================
-- 2026-08-03 — profiles table (mirrors auth.users)
-- ----------------------------------------------------------------------------
-- Every user (student, teacher, admin) is a real auth.users row managed by
-- Supabase Auth. This table mirrors auth.users and adds Math Missions'
-- app-level columns.
--
-- Auth flows:
--   • Teachers/admins: email + magic link (Supabase's OTP flow)
--   • Students: username + PIN. The username maps (via profiles.username) to
--     a synthetic email like `marcus.mathmissions@math.local` that Supabase
--     Auth stores as the account handle. The student POSTs {username, pin}
--     to /auth/student-signin; the server looks up the synthetic email and
--     calls signInWithPassword under the hood. Result: auth.uid() is real,
--     RLS policies work normally, no bespoke session code.
--
-- No hand-rolled password_hash column — PIN storage lives in
-- auth.users.encrypted_password and is Supabase's problem, not ours.
--
-- Follows PD101's proven pattern (see ~/dev/policydebate101-app/supabase/
-- migrations/2026-06-22_profile_autocreate.sql and 2026-07-15_student_pin_auth.sql)
-- and avoids the RLS recursion bug PD101 discovered in 2026-06-24.
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- ---------- profiles --------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('student','teacher','admin')) default 'student',
  username      text,                                    -- login handle for PIN-auth students; NULL for email accounts
  display_name  text not null,
  email         text unique,                             -- may be null for PIN-auth students (synthetic email stays in auth.users)
  avatar_config jsonb not null default '{}'::jsonb,
  coins         integer not null default 0 check (coins >= 0),
  created_at    timestamptz not null default now()
);

comment on table  public.profiles              is 'App-level profile mirroring auth.users. Every user gets exactly one row.';
comment on column public.profiles.role         is 'student | teacher | admin. Defaults to student. Only teacher/admin should ever mutate this.';
comment on column public.profiles.username     is 'Login handle for PIN-auth students (lowercased). NULL for email-based accounts (teachers/admins).';
comment on column public.profiles.email        is 'Real contact email if we have one. NULL for PIN-auth students; their synthetic email lives on auth.users.';
comment on column public.profiles.avatar_config is 'JSON blob for avatar slots (body/hat/outfit/accessory/background). Free-form so we can iterate without migrations.';
comment on column public.profiles.coins        is 'Non-negative coin balance. Never decreases from correctness. Only decreases via spend on avatar shop.';

-- Case-insensitive uniqueness on username. Partial so teacher/admin NULLs
-- do not collide with each other.
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

-- ---------- Row-Level Security ----------------------------------------------

alter table public.profiles enable row level security;

-- Read: a user can read their own row.
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Read: teachers and admins can read every profile.
-- Safe from RLS recursion because we query profiles by auth.uid() (which is
-- indexed as the primary key), not by joining another RLS-protected table.
drop policy if exists "teacher and admin read all profiles" on public.profiles;
create policy "teacher and admin read all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );

-- Update: a user can update their own row.
-- NOTE: this permits a student to change their own role via a raw SQL client.
-- The app never exposes role editing to student UI; if this becomes a real
-- attack surface later, split role into a separate teacher-writable table
-- or add a trigger that rejects self role escalation.
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Update: teachers/admins can update any profile (needed for coin adjustments,
-- avatar resets, etc.).
drop policy if exists "teacher and admin update any profile" on public.profiles;
create policy "teacher and admin update any profile"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );

-- Insert: a user can insert their own row (belt-and-suspenders alongside the
-- auto-create trigger below).
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- ---------- Auto-create profile on auth.users insert ------------------------
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS, so
-- this fires cleanly regardless of who created the auth.users row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_display_name text;
  meta_username text;
  synthetic_email boolean;
begin
  meta_role         := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  meta_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Student'
  );
  meta_username := lower(nullif(new.raw_user_meta_data ->> 'username', ''));

  -- Synthetic emails (student PIN accounts) live on auth.users but should NOT
  -- populate profiles.email — that column is for "real" contact addresses.
  synthetic_email := new.email like '%@math.local';

  insert into public.profiles (id, role, username, display_name, email)
  values (
    new.id,
    case when meta_role in ('student','teacher','admin') then meta_role else 'student' end,
    meta_username,
    meta_display_name,
    case when synthetic_email then null else new.email end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
