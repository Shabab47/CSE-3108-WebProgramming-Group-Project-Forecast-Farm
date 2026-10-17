-- Account deletion with a 7-day grace period.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Or with the Supabase CLI:  supabase db push
--
-- Safe to re-run: every statement is `if not exists`, and the cron job is
-- unscheduled before it is rescheduled so a second run does not double-register it.
--
-- ---------------------------------------------------------------------------
-- 1. What this is for
-- ---------------------------------------------------------------------------
--
-- A player asks to be forgotten. Rather than deleting their account the moment
-- they click, we record that they asked and start a 7-day countdown. Deleting on
-- the spot is unrecoverable for a misclick, and it is exactly the wrong thing to do
-- for someone who closes the tab halfway through. The countdown is the standard
-- compromise: the account is genuinely on its way out, but there is a week in which
-- signing back in cancels it.
--
-- ## Why a database function rather than an Edge Function
--
-- Deleting a row from `auth.users` needs privileges no browser request holds. The
-- obvious route is GoTrue's admin API with a `service_role` key, and that key must
-- never enter this repository — it bypasses Row Level Security entirely (DEC-018,
-- `js/config/supabase.js`). The other route is a Supabase Edge Function holding that
-- key in Supabase's own secret store, which works but costs a deploy step, an email
-- provider and a token table.
--
-- `SECURITY DEFINER` gets us there without any of that. It is a real privilege
-- escalation, so the two properties below are what keep it narrow. They are not
-- stylistic; changing either one turns this into a way to delete other people's
-- accounts.
--
--   1. **No function takes a parameter.** Every one of them names its target as
--      `auth.uid()`, the signed-in caller's id, taken from the JWT GoTrue already
--      verified. A caller cannot pass a user id, so the only row any of them can
--      reach is the caller's own. This is the whole reason the design is safe, and
--      it is why `tests/` asserts the signatures.
--   2. **`set search_path = ''`.** Without it, a caller who can create objects in a
--      schema earlier in the search path could hijack the unqualified table and
--      function names inside the body. Non-default, and worth keeping on every
--      function here.
--
-- The third line of defence is the grants at the bottom: EXECUTE is granted to
-- PUBLIC by default in Postgres, and `anon` inherits it, so without an explicit
-- revoke every signed-out visitor could call these.
--
-- ## What actually deletes the account
--
-- `purge_expired_account_deletions()`, run hourly by `pg_cron`. It deletes from
-- `auth.users`, which cascades to `auth.identities` (Supabase's own constraint),
-- `public.farm_saves` and `public.usernames` — the latter two already declare
-- `references auth.users(id) on delete cascade` — and to the request row in this
-- migration. So one delete clears everything, and there is no second code path that
-- can forget a table.
--
-- ## Why the space comes back
--
-- Postgres does not return freed pages to the filesystem; it marks the old tuples
-- dead and reuses that space for the next insert. So deleting accounts and creating
-- new ones leaves total storage roughly flat rather than growing. The database size
-- reported by the dashboard will not visibly drop, and does not need to — see the
-- note at the end of this file.
--
-- ---------------------------------------------------------------------------
-- 2. The table
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  -- The account that asked to be deleted. Cascading means the request row cannot
  -- outlive its account, so there is no second orphan to reason about.
  user_id      uuid primary key references auth.users(id) on delete cascade,

  -- When they asked, for display: "you asked on the 8th".
  requested_at timestamptz not null default now(),

  -- When it actually happens. The 7 days are counted from here.
  delete_after timestamptz not null
);

comment on table public.account_deletion_requests is
  'Accounts scheduled for deletion. One row per account; removed when cancelled or purged.';

-- The cron job's only query is "give me the ones that are due", so this index is
-- what turns a full scan into an index lookup. Worth having even at a few dozen rows,
-- because the job runs forever and this table is the one thing that grows silently.
create index if not exists account_deletion_due_idx
  on public.account_deletion_requests(delete_after);

alter table public.account_deletion_requests enable row level security;

-- Read your own row and nothing else. There is deliberately **no insert, update or
-- delete policy**: those only happen through the `security definer` functions below,
-- so there is no client-side path that can write to this table at all.
--
-- `username` in 002_usernames.sql is deliberately the opposite — readable by anyone,
-- because resolving a username to an email has to happen before there is a session.
-- Here the row is about a specific person and a specific countdown, so it stays
-- private.
drop policy if exists "own deletion request only" on public.account_deletion_requests;
create policy "own deletion request only"
  on public.account_deletion_requests for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Ask to be deleted
-- ---------------------------------------------------------------------------

-- The countdown is 7 days, written here rather than passed in, so it cannot be
-- shortened by a caller who edits the request. If the grace period is ever changed
-- it is changed in exactly one place.
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  deadline timestamptz;
begin
  -- Re-requesting restarts the countdown rather than stacking a second row. The
  -- primary key makes a plain insert fail for an account that already has one, and
  -- upserting is friendlier: asking again should mean "give me a fresh week", which
  -- is what someone who has not cancelled is asking for.
  insert into public.account_deletion_requests as r (user_id, requested_at, delete_after)
  values (auth.uid(), now(), now() + interval '7 days')
  on conflict (user_id) do update
    set requested_at = now(),
        delete_after = now() + interval '7 days'
  returning delete_after into deadline;

  return deadline;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Change your mind
-- ---------------------------------------------------------------------------

-- Called on every session adoption, so signing in again cancels the deletion. See
-- the note on `clearPendingDeletion` in `js/services/accountApi.js` for why it is not
-- only wired to an explicit button.
create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.account_deletion_requests where user_id = auth.uid();
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. What the settings page shows
-- ---------------------------------------------------------------------------

-- Returns the caller's own deadline, or null when nothing is scheduled. Exposed as a
-- function rather than left to a direct table read so the shape is fixed: one row,
-- one timestamp.
create or replace function public.deletion_deadline()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  deadline timestamptz;
begin
  select delete_after into deadline
    from public.account_deletion_requests
   where user_id = auth.uid();

  return deadline;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. The purge
-- ---------------------------------------------------------------------------

-- Deletes every account whose 7 days are up. Runs on the schedule registered below.
--
-- Granted to nobody. `pg_cron` runs each job as the role that scheduled it, which
-- here is the migration runner (`postgres`) — not `authenticated` — so revoking from
-- PUBLIC and from `authenticated` still leaves it able to run.
--
-- The subquery reads the request table directly rather than going through the
-- deadline function, because a function call per row inside a DELETE would need its
-- own search_path and adds nothing.
create or replace function public.purge_expired_account_deletions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from auth.users
   where id in (
     select user_id
       from public.account_deletion_requests
      where delete_after <= now()
   );

  get diagnostics removed = row_count;

  -- Worth logging: this is the one statement in the project that destroys accounts,
  -- and a count is the only evidence it ran. `raise log` lands in the Postgres logs
  -- and in `Supabase → Logs → Postgres`.
  raise log 'purged % expired account deletion(s)', removed;

  return removed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants — the part that must not be skipped
-- ---------------------------------------------------------------------------

-- Postgres grants EXECUTE on a new function to PUBLIC by default. `anon` and
-- `authenticated` both inherit PUBLIC, so without these revokes every visitor to the
-- site — signed in or not — could delete their own account without a password, and
-- could read every deletion deadline.
--
-- The purge function is revoked from PUBLIC only. It is deliberately not granted to
-- `authenticated`: it must only ever be reachable from the cron schedule.
revoke execute on function public.request_account_deletion()   from public;
revoke execute on function public.cancel_account_deletion()    from public;
revoke execute on function public.deletion_deadline()          from public;
revoke execute on function public.purge_expired_account_deletions() from public;

revoke execute on function public.request_account_deletion()   from anon;
revoke execute on function public.cancel_account_deletion()    from anon;
revoke execute on function public.deletion_deadline()          from anon;
revoke execute on function public.purge_expired_account_deletions() from anon;

-- The three a signed-in player needs. Nothing is granted to `anon`.
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion()  to authenticated;
grant execute on function public.deletion_deadline()        to authenticated;

-- ---------------------------------------------------------------------------
-- 8. The schedule
-- ---------------------------------------------------------------------------

-- Hourly is deliberate. The countdown is 7 days; the difference between deleting at
-- 7 days and at 7 days plus an hour is not something a player waits on, and an
-- hourly job is 168 fewer executions over the grace period than one running every
-- minute. The trade is that a deleted account can linger up to an hour past its
-- date, which only matters if someone is counting on the exact minute.
--
-- If `pg_cron` is not enabled the statements below fail. Turn it on first:
-- Dashboard → Database → Extensions → `pg_cron` → Enable. The whole block is wrapped
-- so that enabling it afterwards is one re-run rather than a repair.
do $$
declare
  job_id bigint;
begin
  -- Unschedule first: `cron.schedule` has no "if not exists", so a plain second run
  -- would register a duplicate job and every account would be purged twice — harmless
  -- for correctness, since the second pass finds no rows, but a silent oddity worth
  -- not having.
  for job_id in
    select jobid from cron.job where jobname = 'purge-expired-account-deletions'
  loop
    perform cron.unschedule(job_id);
  end loop;

  perform cron.schedule(
    'purge-expired-account-deletions',
    '5 * * * *',
    'select public.purge_expired_account_deletions();'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. After running this
-- ---------------------------------------------------------------------------

--   a. Confirm the functions exist:
--
--        select proname from pg_proc
--         where proname in ('request_account_deletion','cancel_account_deletion',
--                           'deletion_deadline','purge_expired_account_deletions');
--        -- expect 4 rows
--
--   b. Confirm the schedule:
--
--        select jobname, schedule, active from cron.job;
--        -- expect purge-expired-account-deletions, 5 * * * *, true
--
--   c. Confirm the grants. This is the one worth checking properly, because it is
--      the difference between "a player can delete their own account" and "anyone can
--      delete any account":
--
--        select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_can,
--                      has_function_privilege('authenticated', p.oid, 'execute') as player_can
--          from pg_proc p
--         where p.proname in ('request_account_deletion','cancel_account_deletion',
--                             'deletion_deadline','purge_expired_account_deletions');
--        -- anon_can must be false on all four
--        -- player_can true for the first three, false for the purge
--
--   d. The purge can be tested without waiting a week. Schedule an account an hour
--      out, then force it due:
--
--        update public.account_deletion_requests set delete_after = now() - interval '1 minute'
--         where user_id = '<your uuid>';
--        select public.purge_expired_account_deletions();
--        -- expect 1, and the account to be gone from auth.users
--
-- ---------------------------------------------------------------------------
-- 10. Two things this does not do
-- ---------------------------------------------------------------------------
--
-- **The email is not free during the 7 days.** The account still exists until the
-- purge runs, so GoTrue refuses a new registration with that address — and answers
-- "that email already has an account, sign in instead", which is the right guidance
-- for someone who has simply come back. This is inherent to delaying a deletion
-- rather than something that can be engineered around.
--
-- **The space does not visibly shrink.** Postgres reuses the freed pages for future
-- inserts, so deleting and re-registering leaves total storage flat rather than
-- growing. The dashboard's reported database size will not drop, and does not need
-- to: that would take a `VACUUM FULL`, which Supabase does not permit on `auth.*`
-- and which is pointless at this scale. If the size ever does look like it is
-- climbing, that is a real problem worth investigating — this is not it.
