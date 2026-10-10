import { el, clear } from '../utils/dom.js';

export function mountLocationBar(root, actions) {
  clear(root);

  const { onSearch, onUseDeviceLocation } = actions;

  const form = el('form', { class: 'location-bar', role: 'search' }, [
    el('label', { class: 'visually-hidden', for: 'location-input', text: 'Search for a place' }),
    el('input', {
      class: 'input location-bar__input',
      id: 'location-input',
      type: 'search',
      placeholder: 'Search a place…',
      autocomplete: 'off',
    }),
    el('button', {
      class: 'btn btn--primary location-bar__btn',
      type: 'submit',
      text: 'Go',
    }),
    el('button', {
      class: 'btn location-bar__btn location-bar__btn--icon',
      type: 'button',
      title: 'Use my current location',
      'aria-label': 'Use my current location',
      text: '📍',
      on: {
        click: () => onUseDeviceLocation(),
      },
    }),
  ]);

  root.append(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('.location-bar__input');
    const query = input.value.trim();
    if (query) onSearch(query);
  });

  return {
    unmount() {
      clear(root);
    },
  };
}
