/**
 * The last step of creating an account: choose one of the four preset avatars.
 *
 * Shown only after sign-up has produced a session, before the game page opens. It
 * is a fifth view on the wooden sign rather than a field on the sign-up form: the
 * account already exists by this point, and a form that would need a Back button
 * to undo the account is not a form.
 *
 * The choice is not written here. `js/ui/authViews.js` passes it to
 * `js/auth-main.js`, which hands it to the game in the URL; `js/main.js` builds the
 * first farm with it. That keeps `state/store.js` the only writer of game state.
 *
 *   mountAvatarSetup(root, actions) → { unmount() }
 *
 * actions:
 *   onConfirm(avatar) → leave the step with this preset id
 */

import { AVATARS } from '../config/avatars.js';
import { clear, el, setClass, setText } from '../utils/dom.js';
import { createLog } from '../utils/log.js';
import { avatarArt } from './avatarArt.js';
import { signBoard } from './signBoard.js';

const log = createLog('avatarSetup');

/** The first preset is the starting picture; nobody reaches this screen with none. */
const DEFAULT_AVATAR = AVATARS[0].id;

export function mountAvatarSetup(root, actions) {
  clear(root);

  let current = DEFAULT_AVATAR;

  const preview = el('div', {
    class: 'sign-avatar__preview',
    'aria-hidden': 'true',
  });
  const caption = el('p', {
    class: 'sign-avatar__caption',
    'aria-live': 'polite',
  });
  const options = el('div', {
    class: 'sign-avatar__options',
    role: 'group',
    'aria-label': 'Choose your avatar',
  });
  const buttons = new Map();

  function face(id, className) {
    return el('span', {
      class: className,
      html: avatarArt(id),
      'aria-hidden': 'true',
    });
  }

  function labelOf(id) {
    return AVATARS.find((preset) => preset.id === id)?.label ?? 'Farmer';
  }

  function choose(id) {
    current = id;
    paint();
    buttons.get(id)?.focus();
  }

  for (const preset of AVATARS) {
    const button = el('button', {
      type: 'button',
      class: 'sign-avatar__option',
      'aria-label': preset.label,
      title: preset.label,
      on: { click: () => choose(preset.id) },
    }, [face(preset.id, 'sign-avatar__option-art')]);

    buttons.set(preset.id, button);
    options.append(button);
  }

  function paint() {
    preview.replaceChildren(face(current, 'sign-avatar__art'));
    setText(caption, labelOf(current));

    for (const [id, button] of buttons) {
      const selected = id === current;
      setClass(button, 'sign-avatar__option--selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function confirm() {
    log.info('avatar chosen -', current);
    actions.onConfirm(current);
  }

  paint();

  root.append(signBoard({
    title: 'Choose your avatar',
    children: [
      el('p', {
        class: 'field__hint sign-avatar__intro',
        text: 'Your account is ready. Pick the farmer you want to play as.',
      }),
      el('div', { class: 'sign-avatar' }, [
        preview,
        caption,
        options,
        el('button', {
          type: 'button',
          class: 'btn btn--go sign-avatar__start',
          text: 'Start farming',
          on: { click: confirm },
        }),
      ]),
      el('p', {
        class: 'field__hint sign-avatar__later',
        text: 'You can change this later on your profile.',
      }),
    ],
  }));

  // The choice is the point of the screen. Focus the preselected picture, so a
  // keyboard player can press Enter and go without tabbing through the sign.
  buttons.get(current)?.focus();

  return { unmount() { clear(root); } };
}
