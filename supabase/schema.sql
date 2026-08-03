-- ============================================================================
-- MATH MISSIONS — DATABASE SCHEMA (source of truth)
-- ----------------------------------------------------------------------------
-- This file mirrors what production should look like once every migration in
-- supabase/migrations/ has been applied. Do NOT run this file directly to set
-- up a fresh database — run the migrations in order. This file exists so a
-- reader (or a future Bael) can see the current shape in one place.
--
-- Migrations applied here:
--   • 2026-08-03_profiles.sql
--   • 2026-08-03_fix_profiles_rls_recursion.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- profiles (mirrors auth.users) -----------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('student','teacher','admin')) default 'student',
  username      text,                                    -- login handle for PIN-auth students; NULL for email accounts
  display_name  text not null,
  email         text unique,                             -- may be null for PIN-auth students
  avatar_config jsonb not null default '{}'::jsonb,
  coins         integer not null default 0 check (coins >= 0),
  created_at    timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

-- SECURITY DEFINER helper (avoids RLS recursion when profiles policies need
-- to consult profiles for the current user's role):
--   public.is_teacher_or_admin() -> boolean
-- See migration 2026-08-03_fix_profiles_rls_recursion.sql.

-- Policies:
--   • own profile read       — a user reads their own row
--   • teacher/admin read all — teachers and admins read every row (via is_teacher_or_admin())
--   • own profile update     — a user updates their own row
--   • teacher/admin update   — teachers and admins update any row (via is_teacher_or_admin())
--   • own profile insert     — belt-and-suspenders alongside the trigger
-- See migrations 2026-08-03_profiles.sql and 2026-08-03_fix_profiles_rls_recursion.sql.

-- Trigger public.handle_new_user() on auth.users insert auto-creates the
-- matching profile row. Runs SECURITY DEFINER so RLS does not block it.
-- See migration 2026-08-03_profiles.sql for the full function body.
