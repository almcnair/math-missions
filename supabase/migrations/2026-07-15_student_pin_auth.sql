-- ============================================================================
-- 2026-07-15 — Student PIN auth (username + shared PIN)
-- ----------------------------------------------------------------------------
-- Camp students can't use Google or personal email. We give each student:
--   • a synthetic email like `annabel.cdsi2026@pd101.local` (never sent to)
--   • a shared 6-digit PIN `123456` stored as their Supabase Auth password
--   • a `username` (their first name, lowercased) used at login
--
-- The login flow (POST /auth/student-signin) looks up the username in
-- public.profiles to find the synthetic email, then calls Supabase
-- signInWithPassword. This keeps auth.uid() working normally so all
-- existing RLS policies apply.
--
-- Shared PIN is a *soft* boundary — anyone who knows a student's first
-- name can impersonate them. For a low-stakes camp site with no sensitive
-- data this is acceptable. Rotate to per-student PINs later if that
-- changes; the schema supports it (just set a different auth.users
-- password per user).
-- ============================================================================

begin;

-- ---------- profiles.username ----------------------------------------------
-- Lowercase, unique-across-all-students. NULL for teachers/admins (they log
-- in via email + magic link). Enforced case-insensitive by storing lower().

alter table public.profiles
  add column if not exists username text;

comment on column public.profiles.username is
  'Login handle for PIN-auth students (lowercased first name or first-last). NULL for email-based accounts.';

-- Case-insensitive uniqueness. Partial index so NULL rows (teachers) do not
-- collide with each other.
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

commit;
