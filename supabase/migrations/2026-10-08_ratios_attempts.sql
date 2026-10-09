-- ============================================================================
-- RATIOS GAME — Teacher Math Guide telemetry table
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Written for the public, login-free /ratios game (Potion Pantry). Students
-- only enter a first name client-side — no auth.users row, no PII beyond
-- whatever name they type. Writes happen through the service-role admin
-- client in src/app/api/ratios/track/route.ts, so RLS stays locked down
-- (no anon insert/select policy needed).
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.ratios_attempts (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  quest_id integer not null,
  quest_title text not null,
  target_multiplier integer not null,
  wrong_attempts integer not null default 0,
  completed_at timestamptz not null default now()
);

create index if not exists idx_ratios_attempts_player on public.ratios_attempts(player_name);
create index if not exists idx_ratios_attempts_completed_at on public.ratios_attempts(completed_at desc);

alter table public.ratios_attempts enable row level security;
-- No policies added on purpose: anon/authenticated roles get zero access.
-- All reads/writes go through the service-role admin client server-side.
