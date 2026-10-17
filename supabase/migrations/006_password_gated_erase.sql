-- Password-gated erase of farm progress (issue: the account-deletion password gate,
-- which was added to "delete my account" first and then to "erase all progress").
--
-- Why this is a function and not a UI concern:
--
-- The Settings page has two irreversible buttons. "Delete my account" already checks the
-- password in the database (`delete_my_account`, 005). "Erase all progress" did not, so a
-- stolen access token was enough to destroy a farm. Typing a password into the form would
-- not have fixed that -- the browser can be asked to skip anything it is the one sending.
--
-- So: one function that verifies the password and deletes the row in the same statement.
-- There is no "verify" endpoint to call separately, and therefore nothing for an attacker
-- to probe with a stolen token -- a guessed password that is wrong deletes nothing and
-- returns false. The cost of a guess is one bcrypt comparison, which is the same bound
-- `delete_my_account` already has.
--
-- What this deliberately does NOT do: touch auth.users, auth.identities, public.usernames
-- or public.farmers. Erasing progress must leave the player signed in with their identity
-- intact. That is the difference between this and 005, and it is why this is a separate
-- function rather than a flag on that one.
--
-- Re-runnable: create or replace, drop policy if exists, revoke before grant.

-- pgcrypto must exist because this compares a bcrypt hash. Installed by 005, but this
-- file is also usable on its own.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.erase_progress(wanted_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  stored text;
begin
  -- Caller's own farm only. Without a session there is no caller, so there is nothing
  -- to erase and nothing that could be erased by accident.
  if auth.uid() is null then
    raise exception 'no session';
  end if;

  if wanted_password is null or wanted_password = '' then
    raise exception 'password required';
  end if;

  select u.encrypted_password into stored
  from auth.users u
  where u.id = auth.uid();

  if stored is null then
    raise exception 'account not found';
  end if;

  -- A password hash that is not bcrypt cannot be compared with crypt(). Matches the
  -- wording in delete_my_account so the two functions fail identically.
  if stored not like '$2%' then
    raise exception 'unsupported password hash format for this account';
  end if;

  -- Wrong password: return false and delete nothing. A false here means "your farm is
  -- untouched", so the caller must not tell the player otherwise.
  if extensions.crypt(wanted_password, stored) <> stored then
    return false;
  end if;

  -- Past the password check. This is the only delete in the function, and it is
  -- constrained to auth.uid() rather than to anything the caller supplied -- the
  -- function takes no id, so there is nothing to mistype and nothing to forge.
  delete from public.farm_saves
  where user_id = auth.uid();

  return true;
end;
$fn$;

revoke all on function public.erase_progress(text) from public;
revoke all on function public.erase_progress(text) from anon;
grant execute on function public.erase_progress(text) to authenticated;

comment on function public.erase_progress(text) is
  'Verify the caller''s password and delete only their farm_saves row, in one statement. '
  'Returns false and deletes nothing on a wrong password. Leaves auth.users, identities, '
  'usernames and farmers untouched -- the player stays signed in. Call as '
  '{ "wanted_password": "..." }; PostgREST needs the argument named, and PGRST202 means '
  'this migration has not been run.';
