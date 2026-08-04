-- Fix: profile rows were not being created on sign-in.
-- Root cause: RLS had SELECT and UPDATE policies for own profile, but no
-- INSERT policy, so the OAuth callback's insert was silently denied.
--
-- Belt-and-suspenders fix:
--   1) Add INSERT policy so the app-level callback CAN write its own row.
--   2) Add a database trigger that auto-creates the profile row whenever
--      a new auth.users row is created, so we don't depend on the callback.
--      Trigger runs as SECURITY DEFINER (postgres role), bypassing RLS.
-- Both layers are idempotent — safe to run more than once.

-- 1) Self-insert policy for own profile row.
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 2) Trigger function: on new auth.users row, create matching profiles row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Debater'
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-bind the trigger so re-running is safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Backfill: create profile rows for any existing auth.users that
--    don't yet have one (i.e., users who signed in before this migration).
insert into public.profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1),
    'Debater'
  ),
  'student'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
