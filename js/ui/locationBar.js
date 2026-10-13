import { el, clear } from '../utils/dom.js';
import { icon } from './icon.js';

/**
 * Place search, one row, sitting on the wooden board.
 *
 * The device-location control is the pin inside the field rather than a separate
 * button beside it: it is an action on the search box, not a third control
 * competing with it, and as a standalone button the row wrapped onto two lines
 * (ISS-046).
 *
 * The input carries `aria-label` rather than a visually-hidden `<label>` because
 * the row is now a pill with two icon buttons in it — a hidden label would read
 * as a third unlabelled control.
 */
export function mountLocationBar(root, actions) {
  clear(root);

  const { onSearch, onUseDeviceLocation } = actions;

  const form = el('form', { class: 'location-bar', role: 'search' }, [
    el('button', {
      class: 'location-bar-locate',
      type: 'button',
      title: 'Use my current location',
      'aria-label': 'Use my current location',
      on: {
        click: () => onUseDeviceLocation(),
      },
    }, [icon('map-pin', 'location-bar-locate-icon')]),

    el('input', {
      class: 'location-bar-input',
      id: 'location-input',
      type: 'search',
      placeholder: 'Search your city or zip code',
      autocomplete: 'off',
      'aria-label': 'Search for a place',
    }),

    el('button', {
      class: 'location-bar-go',
      type: 'submit',
      title: 'Search',
      'aria-label': 'Search',
    }, [icon('search', 'location-bar-go-icon')]),
  ]);

  root.append(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = form.querySelector('.location-bar-input').value.trim();
    if (query) onSearch(query);
  });

  return {
    unmount() {
      clear(root);
    },
  };
}