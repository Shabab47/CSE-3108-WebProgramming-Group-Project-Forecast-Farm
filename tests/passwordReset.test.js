/**
 * The reset flow as a player experiences it, rendered for real.
 *
 * `mountPasswordReset` is the flow owner and imports no provider, so this needs no
 * stubbing beyond the callbacks. It is also the only place where the three bugs
 * found on 2026-10-27 are observable at once:
 *
 *   - a refused send used to report *"a reset link is on its way"*
 *   - a broken link used to open the menu, saying nothing
 *   - a dead token used to announce its sentence and then wipe it
 *
 * Assertions are on what a player can read, not on internal state — the harness has
 * no layout, so anything about size or visibility beyond `hidden` would be fiction.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { installDom, uninstallDom, visibleText } from './helpers/fakeDom.js';
import { mountPasswordReset } from '../js/ui/passwordReset.js';

let root;
let calls;

beforeEach(() => {
  root = installDom();
  calls = { back: [], announced: [] };
});

afterEach(() => {
  uninstallDom();
});

function mount(overrides = {}) {
  mountPasswordReset(root, {
    requestPasswordReset: async () => ({ ok: true }),
    updatePassword: async () => ({ ok: true }),
    recoveryToken: () => null,
    onBack: (notice) => calls.back.push(notice),
    ...overrides,
  });
}

const title = () => root.querySelector('.sign__title')?.textContent ?? '';
const emailInput = () => root.querySelector('#reset-email');
const text = () => visibleText(root).join(' ');

async function submit() {
  await root.querySelector('form').dispatch('submit');
}

/** Both password fields, filled with something that passes the rules. */
function fillPasswords(value = 'rice2026') {
  root.querySelector('#reset-new').value = value;
  root.querySelector('#reset-confirm').value = value;
}

test('opening the flow asks for an address, and only an address', () => {
  mount();

  assert.equal(title(), 'Reset password');
  assert.ok(emailInput(), 'the address form is what a player who forgot sees first');
  assert.equal(root.querySelector('#reset-new'), null, 'no password field before a link');
});

test('a mailer that refused is reported, not dressed up as success', async () => {
  // `RESET_SWALLOWED` used to include `auth_unknown`, so this arrived as `ok:true`
  // and the player was told to check an inbox that would never receive anything.
  mount({ requestPasswordReset: async () => ({ ok: false, reason: 'email_not_authorized' }) });

  emailInput().value = 'farmer@rice.bd';
  await submit();

  assert.equal(title(), 'Reset password', 'never "Check your inbox" for a send that failed');
  assert.match(text(), /We could not send that email/);
});

test('a real success moves to the inbox step', async () => {
  mount();

  emailInput().value = 'farmer@rice.bd';
  await submit();

  assert.equal(title(), 'Check your inbox');
});

test('a broken link opens the address form and says why', () => {
  // The old behaviour was the main menu, with the reason never read. A player holding
  // an expired link had nothing to go on and no way forward.
  mount({ notice: 'That reset link has expired or was already used. Ask for a new one.' });

  assert.match(text(), /expired or was already used/);
  assert.ok(emailInput(), 'the only useful next step is asking for another link');
});

test('a token GoTrue no longer accepts returns the player to the address form', async () => {
  // The link looked fine on arrival — it was valid when it was emailed — so the panel
  // opened on the password step and only learned otherwise on submit.
  mount({
    recoveryToken: () => 'stale-token',
    updatePassword: async () => ({ ok: false, reason: 'no_recovery_session' }),
  });

  assert.equal(title(), 'New password');

  fillPasswords();
  await submit();

  assert.equal(title(), 'Reset password', 'back to the form that can actually help');
  assert.match(text(), /no longer valid/, 'and the reason survives the step change');
  assert.ok(emailInput());
});

test('a changed password hands the sentence back to the sign-in form', async () => {
  mount({ recoveryToken: () => 'good-token' });

  fillPasswords();
  await submit();

  assert.deepEqual(calls.back, ['Password changed. Sign in with your new password.']);
});
