create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  display_name text unique not null,
  base_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  display_name text not null,
  time_ms integer not null,
  total_kills integer not null default 0,
  savage_kills integer not null default 0,
  created_at timestamptz not null default now()
);

alter table players add column if not exists user_id uuid references auth.users(id);

alter table players enable row level security;
alter table runs enable row level security;

drop policy if exists "players_public_select" on players;
create policy "players_public_select" on players for select using (true);

drop policy if exists "players_public_insert" on players;
create policy "players_public_insert" on players for insert with check (true);

-- Lets a signed-in user claim an unclaimed name, or re-affirm a name they
-- already claimed. auth.uid() is null for the anon key, so this policy is a
-- no-op for anonymous requests (the with-check can only be satisfied by
-- setting user_id back to null, never to a real id) — only a genuinely
-- authenticated client can lock a name to their account.
drop policy if exists "players_claim_own" on players;
create policy "players_claim_own" on players
  for update
  using (auth.uid() is not null and (user_id is null or user_id = auth.uid()))
  with check (user_id = auth.uid());

drop policy if exists "runs_public_select" on runs;
create policy "runs_public_select" on runs for select using (true);

drop policy if exists "runs_public_insert" on runs;
create policy "runs_public_insert" on runs for insert with check (true);

create or replace view leaderboard as
select
  display_name,
  min(time_ms) as best_time_ms,
  max(savage_kills) as best_savage_kills,
  count(*) as runs
from runs
group by display_name
order by best_time_ms asc;
