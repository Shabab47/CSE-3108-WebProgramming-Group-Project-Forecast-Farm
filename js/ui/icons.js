import { el } from '../utils/dom.js';

const PATHS = {
  store: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
  package: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  // Two leaves on a stem — the "this way out" sign-off on profile/account cards.
  sprout: 'M12 21v-7M12 14c-3.7 0-6.6-2.5-6.6-6.5 3.7 0 6.6 2.5 6.6 6.5zM12 12.6c0-3.4 2.6-5.9 6-5.9 0 3.4-2.6 5.9-6 5.9z',
  // Farmer badge on account cards.
  session: 'M12 22s8-3.8 8-10V5.4L12 2 4 5.4V12c0 6.2 8 10 8 10zM9 11.6l2.2 2.2L15.4 9.5',
  // Back-to-farm pill on account pages.
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  // Sign out — the sign-off on profile pages.
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  // Decorative echo of a history scroll.
  history: 'M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5M12 7.5V12l3.2 2',
  // The destructive actions' scissors-and-bin identity.
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  check: 'M20 6L9 17l-5-5',
};

export function icon(name, size = 24) {
  const path = PATHS[name] || PATHS.user;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

export function iconEl(name, className = '') {
  const span = el('span', { class: className, 'aria-hidden': 'true' });
  span.innerHTML = icon(name);
  return span;
}
