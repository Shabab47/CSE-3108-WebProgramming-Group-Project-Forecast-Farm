-- Username ↔ account mapping, so a player can sign in with a username instead of
-- an email address.
--
-- **Why a table at all.** GoTrue's password grant accepts only `email` +
-- `password`, so a username sign-in has to be resolved to an email before it can
-- be sent anywhere. The username also cannot live in `auth.users` alone: GoTrue
-- owns that table's schema, and nothing in it is unique or queryable by an
-- anonymous caller. `raw_user_meta_data` cannot be searched from the client either.
--
-- The row is written *after* the account exists, by `services/authApi.js` when a
-- session is adopted — not during `POST /auth/v1/signup`. With email confirmation
-- on, signup returns no session and no user id, so there is nothing to attach a
-- row to yet. Writing it on session adoption also covers the case where an account
-- predates this migration.
--
-- `username` is the primary key, which is what makes it unique: the uniqueness is
-- enforced by the database rather than by a read-then-write in the client, so two
-- players racing for the same name cannot both win.

create table if not exists public.usernames (
  username text primary key,
  email text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One username per account, enforced here rather than in the client. This index is
-- unique, so it also serves as the lookup index for the re-record path below —
-- there is deliberately no second, non-unique index on the same column.
create unique index if not exists usernames_user_id_key
  on public.usernames(user_id);

alter table public.usernames enable row level security;

-- **There is deliberately no SELECT policy for `anon`.** An earlier version of this
-- migration had `using (true)`, on the reasoning that resolving a username to an email
-- happens before there is a session. That reasoning was wrong about the shape of the
-- endpoint: RLS governs *rows*, not *queries*. With the policy in place,
-- `GET /rest/v1/usernames?select=*` returned the whole table — every username and its
-- email — to anyone holding the anon key, which is committed to this repo. Verified
-- against the live project: the unfiltered query answered HTTP 200, and would have
-- returned one row per registered account.
--
-- The fix is the function below. It resolves exactly one name, so the worst case
-- becomes "someone can ask whether one username exists" rather than "anyone can
-- download the address book". See `email_for_username` for why that residual is
-- accepted.
drop policy if exists "usernames_readable_by_anyone" on public.usernames;

-- Resolve one username to its email, for the password grant.
--
-- `security definer` because the caller has no session yet, and no SELECT policy
-- because we do not want them to have one. It takes exactly one name and returns
-- exactly one value, which is the narrowest thing that can still do the job.
--
-- `security definer` on a function reading a table is a privilege escalation, so the
-- usual two guards apply and neither is optional: `search_path` is pinned to nothing
-- (no schema hijack), and EXECUTE is revoked from `PUBLIC` below and granted only to
-- `anon` and `authenticated`.
--
-- **The residual trade-off, stated plainly:** this function is an account-existence
-- oracle for usernames. `authApi.js` answers `invalid_credentials` for both an unknown
-- name and a wrong password, so the *reason code* is uniform — but a caller who can
-- tell `null` from an email learns whether a given username is taken. That is inherent
-- to username sign-in: resolving the name has to happen before the password does.
-- Username login cannot be built without it; a directory of every account cannot be
-- built around it. If this ever needs to be closed, username sign-in is what has to go.
create or replace function public.email_for_username(wanted text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email from public.usernames where username = lower(btrim(wanted));
$$;

-- The owner may read their own row, and nobody else's.
--
-- This is **not** the anon policy that was removed above. That one was `using (true)`
-- and served the whole table to anyone; this one is scoped to the caller's own row, and
-- it exists because an owner with no SELECT policy cannot UPDATE or DELETE their row
-- either — verified against the live project, where both returned 204 with an empty
-- result set, silently doing nothing while looking like success. Without it a player
-- could never change or release a username, which is ISS-042.
--
-- What it exposes is the player's own username and their own email address, to
-- themselves. `email_for_username()` remains the only route to somebody else's, and
-- only one name at a time.
drop policy if exists "usernames_readable_by_owner" on public.usernames;
create policy "usernames_readable_by_owner"
  on public.usernames for select
  using (auth.uid() = user_id);

-- A row may only ever be written for the account that owns it. Without the
-- `auth.uid()` check on the insert, any signed-in player could claim any username.
--
-- Every policy is dropped before it is created. `create policy` is **not**
-- idempotent — it fails with `42710 policy ... already exists` — so a migration that
-- only wraps the table and the function in `if not exists` is not re-runnable once a
-- policy is in the way. That is exactly the mistake the first re-run of this file hit.
drop policy if exists "usernames_insertable_by_owner" on public.usernames;
create policy "usernames_insertable_by_owner"
  on public.usernames for insert
  with check (auth.uid() = user_id);

-- Same, for the re-record path: a session adopted twice updates the row it owns
-- rather than failing on a second insert.
drop policy if exists "usernames_updatable_by_owner" on public.usernames;
create policy "usernames_updatable_by_owner"
  on public.usernames for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usernames_deletable_by_owner" on public.usernames;
create policy "usernames_deletable_by_owner"
  on public.usernames for delete
  using (auth.uid() = user_id);

-- EXECUTE defaults to PUBLIC in Postgres, which `anon` inherits. `anon` is granted
-- here on purpose and only here: this is the one table access a signed-out visitor
-- legitimately needs, and it returns one address for one name.
revoke execute on function public.email_for_username(text) from public;

grant execute on function public.email_for_username(text) to anon;
grant execute on function public.email_for_username(text) to authenticated;
