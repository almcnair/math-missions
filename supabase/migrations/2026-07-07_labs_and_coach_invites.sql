-- ============================================================================
-- 2026-07-07 — Labs (multi-coach classes) + Coach invite tokens
-- ----------------------------------------------------------------------------
-- Reshapes `classes` so it can represent CDSI-style labs:
--
--   • division (ms|hs) and level (novice|jv|varsity) as typed columns
--   • many coaches per lab via a `class_coaches` join table
--   • magic-link invite tokens (`coach_invite_tokens`) that promote a signed-in
--     Google account to teacher AND attach them to a specific lab
--
-- Keeps `classes.teacher_id` for backward-compat: the row's original owner
-- remains "the class teacher" for existing RLS + downstream code paths. The
-- new join table adds ADDITIONAL coaches with equal permissions via an
-- updated `is_class_teacher()` helper.
--
-- Nothing is renamed. UI copy calls these "labs"; the schema still says
-- `classes`. Full rename is a future project if the drift ever hurts.
-- ============================================================================

-- ── 1. Typed division + level on `classes` ─────────────────────────────
alter table public.classes
  add column if not exists division text
    check (division is null or division in ('ms','hs'));

alter table public.classes
  add column if not exists level text
    check (level is null or level in ('novice','jv','varsity'));

-- Both are nullable so existing rows without a division/level survive.
-- Rows seeded for CDSI 2026 (below) set them explicitly.

-- ── 2. class_coaches: many-to-many between classes and coaches ─────────
-- Membership grants full teacher-level access to a class (see the updated
-- is_class_teacher() below). Equal status; no head/assistant distinction.
create table if not exists public.class_coaches (
  class_id  uuid not null references public.classes(id)   on delete cascade,
  coach_id  uuid not null references public.profiles(id) on delete cascade,
  added_at  timestamptz not null default now(),
  added_by  uuid references public.profiles(id) on delete set null,
  primary key (class_id, coach_id)
);

create index if not exists idx_class_coaches_coach on public.class_coaches(coach_id);

alter table public.class_coaches enable row level security;

-- A coach can see their own class_coaches rows. Simple; no cross-coach
-- visibility to keep the surface small. If we ever want "list co-coaches
-- on my lab", we'll add a targeted policy then.
create policy "coach reads own class_coaches"
  on public.class_coaches for select
  using (coach_id = auth.uid());

-- Writes: admin-only for now. The invite-claim flow uses the service-role
-- admin client, which bypasses RLS, so it doesn't need an insert policy.
create policy "admin writes class_coaches"
  on public.class_coaches for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Backfill: existing classes should have their owner listed as a coach so
-- multi-coach access is symmetric from day one. `on conflict do nothing`
-- keeps it idempotent if the migration is replayed.
insert into public.class_coaches (class_id, coach_id, added_by)
select id, teacher_id, teacher_id
from public.classes
on conflict do nothing;

-- ── 3. Update is_class_teacher() to honour class_coaches membership ────
-- Every downstream policy that uses is_class_teacher() (assignments,
-- attempts, completions, enrollments, roster) picks up multi-coach for free.
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  )
  or exists (
    select 1 from public.class_coaches
    where class_id = p_class_id and coach_id = auth.uid()
  );
$$;

-- ── 4. coach_invite_tokens: magic-link onboarding for coaches ──────────
-- One row per generated invite. The token itself is a long random string
-- generated in application code (32 URL-safe bytes ≈ 43 chars). We store
-- it plaintext for now; if that ever bothers us we can move to hashing.
--
-- A token is CLAIMED when a coach signs in via the magic link. On claim:
--   • profile.role → 'teacher' (if not already teacher/admin)
--   • class_coaches gets a new row for (class_id, new coach)
--   • used_at + used_by are stamped
create table if not exists public.coach_invite_tokens (
  token       text primary key,
  class_id    uuid not null references public.classes(id) on delete cascade,
  email       text,                                     -- optional: bind to a specific address
  note        text,                                     -- e.g. "Coach Stringer, MS Novice"
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references public.profiles(id) on delete set null
);

create index if not exists idx_coach_invite_tokens_class on public.coach_invite_tokens(class_id);
create index if not exists idx_coach_invite_tokens_open
  on public.coach_invite_tokens(expires_at)
  where used_at is null;

alter table public.coach_invite_tokens enable row level security;

-- Reads: only admins should be able to LIST invites (the /coach/invites page
-- runs as an admin-checked server component using the admin client, so this
-- is defense in depth). The claim flow reads tokens via the admin client,
-- also bypassing RLS.
create policy "admin reads coach_invite_tokens"
  on public.coach_invite_tokens for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin writes coach_invite_tokens"
  on public.coach_invite_tokens for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── 5. Seed the 6 CDSI 2026 labs ───────────────────────────────────────
-- teacher_id is Austin (looked up by email so this migration is portable
-- across environments). Uses the existing generate_join_code() RPC so
-- each seeded lab has a real 6-char shareable code.
--
-- Idempotent: the `where not exists` clause skips seeding if a lab with the
-- same (division, level) already exists.
do $$
declare
  austin_id uuid;
  lab record;
begin
  select id into austin_id from public.profiles
   where email = 'austin@policydebate101.com'    -- adjust if the admin email differs
      or role = 'admin'
   order by (role = 'admin') desc, created_at asc
   limit 1;

  if austin_id is null then
    raise notice 'No admin profile found; skipping lab seed. Insert manually.';
    return;
  end if;

  for lab in
    select * from (values
      ('ms','novice',  'MS Novice'),
      ('ms','jv',      'MS JV'),
      ('ms','varsity', 'MS Varsity'),
      ('hs','novice',  'HS Novice'),
      ('hs','jv',      'HS JV'),
      ('hs','varsity', 'HS Varsity')
    ) as t(division, level, name)
  loop
    if not exists (
      select 1 from public.classes
      where division = lab.division and level = lab.level
    ) then
      insert into public.classes (teacher_id, name, join_code, division, level)
      values (
        austin_id,
        lab.name,
        public.generate_join_code(),
        lab.division,
        lab.level
      );
    end if;
  end loop;

  -- Ensure Austin is in class_coaches for every lab he owns (the backfill
  -- above handles pre-existing rows; this covers the freshly-seeded ones).
  insert into public.class_coaches (class_id, coach_id, added_by)
  select id, teacher_id, teacher_id
  from public.classes
  where teacher_id = austin_id
  on conflict do nothing;
end $$;
