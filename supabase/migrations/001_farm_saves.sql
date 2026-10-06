-- Forecast Farm — server-side save storage
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Or with the Supabase CLI:  supabase db push
--
-- It cannot be run from the browser. Creating a table needs either this SQL
-- editor or a `service_role` key, and a `service_role` key bypasses Row Level
-- Security entirely, so it must never live in this repo (DEC-018).
--
-- What it creates: one row per account, holding that account's farm as JSONB.
-- Nothing else is stored. The email and password are Supabase's business, in
-- its own `auth.users` table, which this does not touch.
--
-- Safe to re-run: every statement is `if not exists`.

-- ---------------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------------

create table if not exists public.farm_saves (
  -- The account this farm belongs to. References auth.users so deleting an
  -- account deletes its farm, rather than leaving orphans behind.
  user_id    uuid primary key references auth.users(id) on delete cascade,

  -- The whole game state as one JSON document. `jsonb` rather than `json` so
  -- Postgres can index into it later, and so it is stored parsed rather than as
  -- a string. The shape is owned by js/state/initialState.js, not by this
  -- table, so the game can change it without a migration.
  state      jsonb not null,

  updated_at timestamptz not null default now()
);

comment on table public.farm_saves is
  'One farm per account. See supabase/migrations/ for the full story.';

-- ---------------------------------------------------------------------------
-- 2. Row Level Security — the part that matters
-- ---------------------------------------------------------------------------
--
-- Without this, every player could read and write every other player's farm by
-- changing one value in a request. Turning RLS on and then writing no policy
-- would be worse: it denies everything, including the owner.
--
-- RLS is enforced by Postgres. A player holding the anon key cannot turn it off,
-- which is exactly why the anon key is safe to ship in the browser (DEC-018).

alter table public.farm_saves enable row level security;

-- A player may select, insert, update and delete their own row, and nothing else.
--
--   using      — which existing rows they can read, update or delete
--   with check — which rows they are allowed to insert or turn a row into
--
-- `auth.uid()` is the signed-in account's id, taken from the access token. It
-- cannot be forged: it is signed by Supabase and the signature is checked
-- before the policy runs. A guest with no token gets null, which matches no
-- row, so a guest simply cannot reach this table — which is correct, because a
-- guest farm is local-only (see js/state/transfer.js, `owner`).

drop policy if exists "own row only" on public.farm_saves;
create policy "own row only" on public.farm_saves
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. After running this
-- ---------------------------------------------------------------------------
--
--   a. Dashboard is enough. No further setup.
--
--   b. Confirm it took:
--
--        select count(*) from public.farm_saves;   -- expect 0
--
--   c. Confirm the policy exists:
--
--        select policyname, cmd from pg_policies
--        where tablename = 'farm_saves';
--
--   d. The anon key needs no change. It already reaches PostgREST at
--      /rest/v1, and RLS is what keeps it honest.
--
-- To undo:  drop table public.farm_saves;
