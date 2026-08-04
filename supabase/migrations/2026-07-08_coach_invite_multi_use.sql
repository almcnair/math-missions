-- ============================================================================
-- 2026-07-08 — Multi-use coach invite tokens
-- ----------------------------------------------------------------------------
-- Lets a single invite link be claimed by up to `max_uses` coaches. Default
-- is 2 so an admin can generate ONE link per lab and hand it to both lab
-- leaders (the CDSI-style pairing).
--
-- Design:
--   • max_uses (int, default 2, must be >= 1)
--   • uses    (int, default 0, incremented on each successful claim)
--   • used_at is now "fully consumed" — set only when uses >= max_uses.
--     Existing single-use rows continue to work because their max_uses
--     backfills to 1.
--
-- The claim-order audit trail lives in a new `coach_invite_claims` table
-- (one row per (token, coach) claim). We keep coach_invite_tokens.used_by
-- as "the last claimant" for backward compatibility with the current UI,
-- but coach_invite_claims is the source of truth for "who claimed what".
-- ============================================================================

-- ── 1. Add max_uses + uses to the existing token table ─────────────────
alter table public.coach_invite_tokens
  add column if not exists max_uses int not null default 2
    check (max_uses >= 1);

alter table public.coach_invite_tokens
  add column if not exists uses int not null default 0
    check (uses >= 0);

-- Backfill: any pre-existing invite that was already claimed under the old
-- single-use model should be treated as max_uses = 1, uses = 1 so it stays
-- "fully claimed" and doesn't accidentally reopen a seat.
update public.coach_invite_tokens
   set max_uses = 1,
       uses     = 1
 where used_at is not null
   and uses = 0;                    -- only touch rows we haven't already fixed

-- Pending pre-existing invites also stay single-use so we don't retroactively
-- widen a link the admin already shared. New invites default to 2 (column
-- default). Admins can override per invite going forward.
update public.coach_invite_tokens
   set max_uses = 1
 where used_at is null
   and max_uses = 2                 -- came in via the new default...
   and created_at < now();          -- ...but was created before this migration

-- ── 2. coach_invite_claims: per-claim audit trail ──────────────────────
-- One row per (token, coach) claim. Composite PK prevents the same coach
-- from consuming two seats on the same link.
create table if not exists public.coach_invite_claims (
  token       text not null references public.coach_invite_tokens(token) on delete cascade,
  coach_id    uuid not null references public.profiles(id)                on delete cascade,
  claimed_at  timestamptz not null default now(),
  primary key (token, coach_id)
);

create index if not exists idx_coach_invite_claims_token on public.coach_invite_claims(token);
create index if not exists idx_coach_invite_claims_coach on public.coach_invite_claims(coach_id);

alter table public.coach_invite_claims enable row level security;

-- Admins can read the whole claim log; the claim flow itself uses the
-- service-role admin client, which bypasses RLS.
create policy "admin reads coach_invite_claims"
  on public.coach_invite_claims for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin writes coach_invite_claims"
  on public.coach_invite_claims for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── 3. Backfill claim rows for previously-claimed single-use invites ───
-- Keeps the audit trail contiguous for existing data.
insert into public.coach_invite_claims (token, coach_id, claimed_at)
select token, used_by, coalesce(used_at, now())
from public.coach_invite_tokens
where used_by is not null
on conflict do nothing;
