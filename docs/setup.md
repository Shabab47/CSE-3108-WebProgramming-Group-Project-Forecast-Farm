# Setup

Everything needed to get this running and to tell whether it is working. Start here;
the [README](../README.md) is the overview and links back to this.

---

## Run it

ES modules do not load from `file://`, so the project has to be served. There is no
build step and no runtime dependency — `npm install` installs nothing, on purpose
(DEC-002).

```bash
npm run dev      # serve on http://127.0.0.1:5173
npm test         # 264 tests
npm run check    # layering rules; fails the build on a forbidden import
```

| Page | Entry script | What it is |
| :--- | :--- | :--- |
| `login.html` | `js/auth-main.js` | Sign in or create an account. |
| `index.html` | `js/main.js` | The farm. |
| `shop.html` | `js/shop-main.js` | Seed shop. |
| `settings.html` | `js/settings-main.js` | Account details, erase progress, delete account. |
| `almanac.html` | — | Placeholder, empty. |

`index.html`, `shop.html` and `settings.html` all redirect to `login.html` when there is
no session, so start at the login page.

---

## The database

Five migrations, run **by hand** in the Supabase dashboard: **SQL Editor → New query →
paste → Run**. They cannot be run from the browser — creating a table or a function
needs either that editor or a `service_role` key, and a `service_role` key must never
live in this repository because it bypasses Row Level Security entirely (DEC-018).

Every file is written to be re-runnable: `if not exists`, `drop policy if exists`,
`create or replace`. **Run them in numeric order.**

| # | File | What it gives you | Without it |
| :-- | :--- | :--- | :--- |
| 001 | `001_farm_saves.sql` | `public.farm_saves` — the server-side save | Saves stay in the browser only |
| 002 | `002_usernames.sql` | `public.usernames` + `email_for_username()` | **Username sign-in fails silently** |
| 003 | `003_account_deletion.sql` | *Superseded by 005 — do not run it.* A 7-day deletion countdown that `005` drops. Kept so the countdown is one re-run away if it is ever wanted. | Nothing |
| 004 | `004_clear_all_accounts.sql` | Deletes every account. A tool, not a setup step. | Nothing |
| 005 | `005_immediate_account_deletion.sql` | `delete_my_account(password)` + installs `pgcrypto` | **Account deletion fails** |
| 006 | `006_password_gated_erase.sql` | `erase_progress(password)` - erases farm progress, behind the same password check | **Erasing progress fails** |

### 002 and 005 need a second run after their first

Both were changed after they were first applied. Re-run them; the fixes are additive and
safe to re-run.

- **002** — an owner SELECT policy on `usernames` was added. Without it a player cannot
  update or release their own username, so renaming one strands the old name as
  permanently claimed. Username *sign-in* does not need this; only the rename path does.
- **005** — now installs `pgcrypto` itself rather than assuming it is there. The earlier
  version failed on projects without it, leaving the function absent.

---

## Check it worked

Do these rather than assuming. Each has caught a real bug in this project that every
automated test passed straight through.

### 1. The tables and functions exist

```sql
select proname from pg_proc
 where proname in ('email_for_username', 'delete_my_account', 'erase_progress');
-- expect 3 rows
```

### 2. The security is what it should be

This is the one worth reading rather than skimming. The three functions have **different**
answers, and every one of them is correct:

| Function | `anon_can` | Why |
| :--- | :--- | :--- |
| `email_for_username` | **true** | It resolves a username to an email *before* sign-in, so an anonymous visitor has to be able to call it. It returns one address for one name, which is the narrowest thing that can do the job. |
| `delete_my_account` | **false** | It deletes an account. `anon` is the key that ships in the browser, so if `anon` can call this, anyone can. |
| `erase_progress` | **false** | Same reason. It erases a farm, and takes a password — but the password check is only worth something if the caller cannot skip it, and `anon` has no session to be checked against. |

Check all three:

```sql
select p.proname,
       has_function_privilege('anon',           p.oid, 'execute') as anon_can,
       has_function_privilege('authenticated',  p.oid, 'execute') as player_can
  from pg_proc p
 where p.proname in ('email_for_username', 'delete_my_account', 'erase_progress');
-- email_for_username : anon_can = true,  player_can = true
-- delete_my_account  : anon_can = false, player_can = true
-- erase_progress     : anon_can = false, player_can = true
```

If either deletion function reads `anon_can = true`, **stop and fix it before anything
else.** Anyone could destroy any account or farm with no password at all.

`erase_progress` returning `anon_can = false` is also what makes the guest case honest: a
guest has no account and so no password, which is why the settings page shows no password
field for one rather than showing a field it could not check.

### 3. No table is readable by a signed-out visitor

```sql
select tablename, policyname, cmd from pg_policies
 where tablename in ('usernames', 'farm_saves', 'account_deletion_requests')
 order by tablename, cmd;
```

`usernames` should show four policies and **no SELECT policy open to `anon`** — the
lookup goes through the function in step 2 instead. The `usernames_readable_by_owner`
SELECT policy is expected: it is scoped to the caller's own row, which is what lets a
player rename or release their own username.

`account_deletion_requests` only exists if `003` has been run; `005` drops it.

### 4. In the browser

1. **Register.** Note the **email** — username sign-in depends on `002` being applied.
2. Sign out, sign in **by username**. This is the real test of `002`.
3. `select username, email from public.usernames;` — expect one row for you.
4. Settings → **Delete my account** → a **wrong** password first. Nothing should change.
5. Then the right password. You are signed out and the account, farm and username are gone.

Step 5 is irreversible. Do it on a throwaway account.

### Reading a failure

The browser console names the real cause. The UI deliberately does not guess — a missing
migration and a dropped connection are different problems and get different sentences.

| Console line | Means |
| :--- | :--- |
| `[accountApi] account deletion refused, status 404` | `005` has not been run — no such function |
| `[accountApi] progress erase refused, status 404` | `006` has not been run — no such function |
| `[accountApi] account deletion refused, status 401` | Access token expired; sign in again |
| `[accountApi] account deletion call failed - timeout` | No answer from the server |
| `[accountApi] account deletion refused, wrong password` | Correct refusal; nothing was deleted |
| `[authApi] username not recorded - 403` | An RLS policy refused the username write |
| `[settings-main] account deletion threw - <message>` | A bug in the code, not the server |
| `[settings-main] account not deleted - <reason>` | The reason the delete was refused |

---

## Configuration

`js/config/supabase.js` holds the project URL and the **`anon` key only**. The `anon`
key is publishable and safe to commit; Supabase describes it as a low-priority key that
is only useful alongside Row Level Security. `tests/mainBoot.test.js` decodes its JWT
and asserts `role: "anon"`, so pasting a `service_role` key fails the suite rather than
shipping.

| Setting | Where | Notes |
| :--- | :--- | :--- |
| Project URL + anon key | `js/config/supabase.js` | Committed. |
| Which provider runs | `USE_LOCAL_PROVIDER` in `js/auth-main.js` | `false` = Supabase. Both entry points must agree, or login loops (ISS-033). |
| Redirect URLs / Site URL | Supabase → Authentication → URL Configuration | Needed for "forgot password" to deliver anything (ISS-031). |
| Email confirmation | Supabase → Authentication → Providers | Currently **off**, so a new account signs in immediately. |

---

## Known-open items

Live state as of this writing. Each is in [`team/issues.md`](team/issues.md) with more
detail.

| Issue | State |
| :--- | :--- |
| 002 owner SELECT policy | Applied in code, **needs re-running** for the rename path |
| Farm screen, weather, economy | Not built yet. `almanac.html` is an empty placeholder. |
| Exported save files | Integrity-checked but **unsigned** (DEC-021). |
| Guest farms | Browser-only, cannot be exported, lost if site data is cleared. |

---

## Conventions worth knowing before changing anything

- **Layering is enforced, not documented.** `npm run check` fails on a forbidden import,
  `fetch()` outside `js/services/`, `document.` outside `js/ui/`, and a declaration that
  shadows one of its own imports. Read `scripts/check-imports.mjs` before adding a file.
- **A page needs its own entry script.** Each one resolves the session before mounting
  anything, so a signed-out player never sees a flash of the game.
- **`services/` may not import another service.** That is why the access token is passed
  per call, and why `js/remoteSave.js` sits at the top of `js/` — it is the join.
