-- Account deletion, immediately, behind a server-side password check.
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Or with the Supabase CLI:  supabase db push
--
-- Safe to re-run: `create or replace`, and the drops are `if exists`.
--
-- ## If it fails
--
-- The only statement that can fail on its own is section 2, and it fails loudly on
-- purpose: if `pgcrypto` is not installed, it raises rather than creating a function
-- that cannot verify a password. That is the fail-closed behaviour we want, and the
-- message names the fix. The rest of the file is `if exists` throughout.
--
-- ---------------------------------------------------------------------------
-- 1. Why this replaces the 7-day grace period
-- ---------------------------------------------------------------------------
--
-- `003_account_deletion.sql` scheduled a deletion and let a returning player cancel
-- it by signing in. The grace period was doing two jobs, and only one of them was the
-- delay:
--
--   - giving someone time to change their mind, which is the point of a countdown; and
--   - **bounding the damage from a stolen token.**
--
-- The second one was the load-bearing one. `request_account_deletion()` authenticated
-- with `auth.uid()` alone — the password was checked in the browser
-- (`verifyPassword` in `js/services/authApi.js`), so anyone holding a valid access
-- token could call that RPC directly and skip it. With a 7-day window that was
-- survivable: the owner signed back in and cancelled, as `adopt()` did automatically.
-- Deleting on the spot turns the same request into permanent, silent data loss, so
-- ISS-040 stops being a theoretical weakness and becomes the whole risk.
--
-- Hence this file. The password is verified **in the database**, against the same
-- bcrypt hash GoTrue stored, before anything is deleted. A token is no longer enough.
--
-- ## How a browser can be made to check a password
--
-- GoTrue stores the password as a bcrypt hash in `auth.users.encrypted_password`, and
-- `pgcrypto`'s `crypt()` understands bcrypt. Comparing the two is the standard way to
-- do this, and it is the only approach available without a `service_role` key — which
-- must never enter this repository, because it bypasses RLS entirely (DEC-018).
--
-- **The password is a bind parameter, not a query literal.** PostgREST parameterises
-- RPC calls, so it does not appear in Postgres statement logs the way an interpolated
-- literal would. It travels over the same TLS as every other credential in this
-- project.
--
-- ## It fails closed
--
-- If `crypt()` is unavailable, if pgcrypto was built without bcrypt, or if the stored
-- hash is not bcrypt, this raises an exception and **deletes nothing**. That is
-- deliberate: an unverifiable password must never be treated as a correct one. The
-- cost is that a project in that state cannot delete an account through the game at
-- all, which is why section 6 has a test for it.
--
-- ---------------------------------------------------------------------------
-- 2. The function
-- ---------------------------------------------------------------------------
--
-- Built with dynamic SQL, which is the whole reason for the ceremony below.
--
-- PostgreSQL validates a PL/pgSQL body when the function is *created*
-- (`check_function_bodies` is on by default), so a body naming `extensions.crypt(...)`
-- fails outright if pgcrypto is not installed in the `extensions` schema — and it
-- fails at the `create function` line, which means the rest of this migration never
-- runs. That is a confusing way to learn a routine is missing, and it is how the first
-- attempt at this migration failed: the function was absent and the countdown table had
-- been dropped by an earlier partial run.
--
-- So: find where `crypt` actually is, then build the body with that schema qualified in.
-- If it cannot be found, say so in words a person can act on rather than emitting a
-- `does not exist` from three statements deep.
--
-- The lookup is over `pg_proc`, so the schema name cannot come from a request — there
-- is nothing to inject here.

do $$
declare
  crypt_schema text;
  body text;
begin
  -- `identity_arguments` is matched exactly, so `crypt(bytea, text)` or an overload
  -- does not get picked by mistake. `format_type` is not needed for the match: the
  -- canonical signature is (text, text).
  select n.nspname into crypt_schema
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'crypt'
     and pg_get_function_identity_arguments(p.oid) = 'text, text'
   limit 1;

  if crypt_schema is null then
    raise exception
      'pgcrypto (the crypt() function) was not found, so account deletion cannot verify a password. Enable it at Dashboard -> Database -> Extensions -> pgcrypto, then run this migration again.';
  end if;

  -- Built as a string so the only schema-qualified name in it is the one we just
  -- looked up. `%I` quotes the identifier, so an unusual schema name is still valid.
  body := format($fn$
    create or replace function public.delete_my_account(wanted_password text)
    returns boolean
    language plpgsql
    security definer
    set search_path = ''
    as $body$
      declare
        stored text;
      begin
        -- `auth.uid()` is the caller, verified by GoTrue from the JWT. No parameter
        -- names a user, so this can only ever delete the caller's own account.
        if auth.uid() is null then
          raise exception 'no session';
        end if;

        if wanted_password is null or wanted_password = '' then
          raise exception 'password required';
        end if;

        select encrypted_password into stored
          from auth.users
         where id = auth.uid();

        if stored is null then
          raise exception 'account not found';
        end if;

        -- Anything that is not bcrypt (%%2a$, %%2b$, %%2y$) is something ``crypt()``
        -- cannot verify, so refuse rather than guess. Without this a hash format it
        -- does not understand could compare unequal and read as "wrong password",
        -- which would be a confusing lie.
        if stored not like '$2%%' then
          raise exception 'unsupported password hash format for this account';
        end if;

        -- Correct password. This one statement is the whole deletion:
        -- ``auth.identities``, ``public.farm_saves`` and ``public.usernames`` all
        -- declare ``references auth.users(id) on delete cascade``, so the account, its
        -- identities, its farm and its username go together and there is no
        -- half-deleted state to reconcile.
        if %1$I.crypt(wanted_password, stored) <> stored then
          return false;
        end if;

        delete from auth.users where id = auth.uid();

        return true;
      end;
    $body$;
  $fn$, crypt_schema);

  execute body;
end;
$$;

-- EXECUTE defaults to PUBLIC in Postgres, and `anon` inherits that — which would make
-- an unauthenticated visitor able to delete an account. `authenticated` is the only
-- role that may call this, and `anon` is revoked explicitly rather than relying on it
-- not inheriting.
revoke execute on function public.delete_my_account(text) from public;
revoke execute on function public.delete_my_account(text) from anon;

grant execute on function public.delete_my_account(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Retire the grace period
-- ---------------------------------------------------------------------------
--
-- Gone rather than left in place: an unused function that deletes accounts is a
-- liability, and the table would keep growing with rows nothing ever reads. If the
-- countdown is ever wanted back, `003_account_deletion.sql` is in version control and
-- re-running it restores the whole thing — that is why it is not deleted from the repo.
--
-- The rows currently in `account_deletion_requests` go with the table. On the Supabase
-- provider that is correct regardless of what they said: any row in it represents an
-- account whose owner asked to be deleted and did not come back, and this change
-- deletes accounts immediately, so those accounts should have been deleted already.

do $$
declare
  job_id bigint;
begin
  -- Unsubscribe the hourly purge before dropping what it calls, or it starts failing
  -- every hour and filling the logs.
  for job_id in
    select jobid from cron.job where jobname = 'purge-expired-account-deletions'
  loop
    perform cron.unschedule(job_id);
  end loop;
end;
$$;

drop table if exists public.account_deletion_requests;

drop function if exists public.purge_expired_account_deletions();
drop function if exists public.request_account_deletion();
drop function if exists public.cancel_account_deletion();
drop function if exists public.deletion_deadline();

-- ---------------------------------------------------------------------------
-- 4. What the client does now
-- ---------------------------------------------------------------------------
--
-- One call, with the password as a parameter:
--
--     POST /rest/v1/rpc/delete_my_account   {"wanted_password": "..."}
--
-- → `true`   the account, farm and username are gone
-- → `false`  the password was wrong; nothing was deleted
--
-- Both providers now check the password in the same place as the deletion, so there is
-- no client-side-only gap on either. `js/services/localAuth.js` compares against the
-- PBKDF2 hash it already keeps.
--
-- The panel is two clicks plus the password. There is no longer anything recoverable
-- afterwards, so that is what the wording says — see `js/ui/settingsView.js`.
--
-- ---------------------------------------------------------------------------
-- 5. After running this
-- ---------------------------------------------------------------------------

--   a. Confirm the function exists and the old ones are gone:
--
--        select proname from pg_proc
--         where proname in ('delete_my_account','request_account_deletion',
--                           'cancel_account_deletion','deletion_deadline',
--                           'purge_expired_account_deletions');
--        -- expect exactly one row: delete_my_account
--
--   b. Confirm the cron job is unsubscribed:
--
--        select jobname, active from cron.job;
--        -- purge-expired-account-deletions must be absent
--
--   c. Confirm the grants — the difference between "a player can delete their own
--      account with their password" and "anyone can delete any account":
--
--        select has_function_privilege('anon', 'public.delete_my_account(text)', 'execute')           as anon_can,
--               has_function_privilege('authenticated', 'public.delete_my_account(text)', 'execute') as player_can;
--        -- anon_can = false, player_can = true
--
-- ---------------------------------------------------------------------------
-- 6. Testing it, safely
-- ---------------------------------------------------------------------------
--
-- **Wrong password deletes nothing.** Sign in, open settings, enter a wrong password.
-- The account must still be there afterwards — check with:
--
--     select count(*) from auth.users where email = '<your email>';
--
-- **Right password deletes everything.** Register a throwaway account for this, since
-- it cannot be undone, then delete it through settings. Afterwards:
--
--     select
--       (select count(*) from auth.users)       as accounts,
--       (select count(*) from public.farm_saves) as farms,
--       (select count(*) from public.usernames)  as usernames;
--     -- all 0
--
-- **pgcrypto can actually verify a Supabase bcrypt hash.** This is the one that fails
-- closed, so it is worth confirming before anyone relies on the feature:
--
--     select extensions.crypt('a password', encrypted_password) = encrypted_password as matches
--       from auth.users
--      where email = '<your email>';
--     -- expect true
--
-- If that last query errors with `function extensions.crypt(text, text) does not exist`,
-- pgcrypto is not installed where this function expects it: enable it under
-- Dashboard → Extensions → `pgcrypto`, or adjust the schema qualification in the
-- function body. Until it is available, account deletion is refused rather than
-- permitted without a password.
--
-- ---------------------------------------------------------------------------
-- 7. To undo
-- ---------------------------------------------------------------------------

-- Re-run `003_account_deletion.sql` to restore the countdown, then re-run
-- `005_immediate_account_deletion.sql` if you want to go back to immediate deletion.
-- Both are `if exists` / `create or replace`, so switching back and forth is safe.
