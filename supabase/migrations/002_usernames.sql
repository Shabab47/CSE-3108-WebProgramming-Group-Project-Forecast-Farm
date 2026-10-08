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

-- Readable by anyone, including a signed-out visitor, because resolving a username
-- to an email happens *before* there is a session. This is the one deliberate
-- trade-off in the feature: it means anyone can confirm whether a username is
-- registered. That is acceptable here and should be kept in mind — the email it
-- resolves to is already entered by the same visitor in the sign-in box, and the
-- alternative (no table) is not username sign-in at all. It is *not* an
-- enumeration oracle on the sign-in path, because `services/authApi.js` answers
-- identically for an unknown username and a wrong password (DEC-019).
create policy "usernames_readable_by_anyone"
  on public.usernames for select
  using (true);

-- A row may only ever be written for the account that owns it. Without the
-- `auth.uid()` check on the insert, any signed-in player could claim any username.
create policy "usernames_insertable_by_owner"
  on public.usernames for insert
  with check (auth.uid() = user_id);

-- Same, for the re-record path: a session adopted twice updates the row it owns
-- rather than failing on a second insert.
create policy "usernames_updatable_by_owner"
  on public.usernames for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "usernames_deletable_by_owner"
  on public.usernames for delete
  using (auth.uid() = user_id);
