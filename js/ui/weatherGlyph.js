import { el } from '../utils/dom.js';

const SUN = '<circle cx="46" cy="46" r="15" fill="#f7b733"/><circle cx="46" cy="46" r="11" fill="#ffd166"/>';
const CLOUD = '<path d="M27 74a14 14 0 0 1-1.6-27.9 20 20 0 0 1 38.2 2.6A13 13 0 0 1 63 74z" fill="#c3ccd6"/>';

const ICONS = {
  sun: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${SUN}
    <g stroke="#f7b733" stroke-width="5" stroke-linecap="round">
      <path d="M46 12v10M46 70v10M12 46h10M70 46h10M22 22l7 7M63 63l7 7M70 22l-7 7M29 63l-7 7"/>
    </g></svg>`,

  'cloud-sun': `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(6 -8) scale(0.8)">${SUN}
      <g stroke="#f7b733" stroke-width="6" stroke-linecap="round">
        <path d="M46 12v10M12 46h10M22 22l7 7"/>
      </g></g>
    ${CLOUD}</svg>`,

  cloud: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${CLOUD}</svg>`,

  fog: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    ${CLOUD}
    <g stroke="#aab4c0" stroke-width="6" stroke-linecap="round">
      <path d="M22 84h52M30 94h36"/>
    </g></svg>`,

  drizzle: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    ${CLOUD}
    <g stroke="#6fb3e0" stroke-width="5" stroke-linecap="round">
      <path d="M34 84v6M48 84v6M62 84v6"/>
    </g></svg>`,

  rain: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    ${CLOUD}
    <g stroke="#4a9ede" stroke-width="5" stroke-linecap="round">
      <path d="M32 82l-5 12M50 82l-5 12M68 82l-5 12"/>
    </g></svg>`,

  snow: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    ${CLOUD}
    <g stroke="#7ec8e3" stroke-width="4" stroke-linecap="round">
      <path d="M34 84v10M29 87l10 4M39 87l-10 4M52 84v10M47 87l10 4M57 87l-10 4"/>
    </g></svg>`,

  storm: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    ${CLOUD}
    <path d="M50 78l-14 20h11l-4 16 20-24H52l10-12z" fill="#f5a623"/></svg>`,

  night: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 14a30 30 0 1 0 22 46 34 34 0 0 1-22-46z" fill="#ffd166"/>
    <circle cx="30" cy="26" r="3" fill="#f7b733"/>
    <circle cx="20" cy="46" r="2.4" fill="#f7b733"/>
    <circle cx="44" cy="16" r="2" fill="#f7b733"/></svg>`,
};

export function weatherGlyph(name, extraClass = '') {
  const wrapper = el('span', {
    class: `weather-icon ${extraClass}`.trim(),
    role: 'img',
    'aria-hidden': 'true',
  });
  wrapper.innerHTML = ICONS[name] ?? ICONS.cloud;
  return wrapper;
}