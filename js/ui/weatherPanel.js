import { el, clear } from '../utils/dom.js';
import { describeWeatherCode, windCompass } from '../domain/weather.js';
import { weatherGlyph } from './weatherGlyph.js';

export function mountWeatherPanel(root, state) {
  clear(root);

  const card = el('div', { class: 'weather' }, [
    el('div', { class: 'weather__top' }),
    el('div', { class: 'weather__stats' }),
    el('div', { class: 'weather__graph' }),
    el('div', { class: 'weather__forecast' }),
    el('p', { class: 'weather__updated' }),
  ]);

  root.append(card);

  const topEl = card.querySelector('.weather__top');
  const statsEl = card.querySelector('.weather__stats');
  const graphEl = card.querySelector('.weather__graph');
  const forecastEl = card.querySelector('.weather__forecast');
  const updatedEl = card.querySelector('.weather__updated');

  renderLocation(state?.location);
  renderTop(state?.weather);
  renderStats(state?.weather);
  renderGraph(state?.weather);
  renderForecast(state?.weather);
  renderUpdated(state?.weather);

  function renderLocation(location) {
    if (!location) return;
    const parts = [location.name, location.country].filter(Boolean).join(', ');
    topEl.append(
      el('span', { class: 'weather__place', text: parts || 'Unknown location' }),
    );
  }

  function renderTop(weather) {
    const current = weather?.current;
    if (!current) {
      topEl.append(
        el('div', { class: 'weather__idle' }, [
          weatherGlyph('cloud'),
          el('p', { class: 'weather__idle-text', text: 'Reading the sky…' }),
        ]),
      );
      return;
    }

    const info = describeWeatherCode(current.weatherCode);
    const iconName = current.isDay === false && info.icon === 'sun' ? 'night' : info.icon;

    const left = el('div', { class: 'weather__now' }, [
      weatherGlyph(iconName, 'weather__now-icon'),
      el('p', { class: 'weather__temp' }, [
        el('span', { class: 'weather__temp-value', text: formatTemp(current.temperature) }),
        el('span', { class: 'weather__temp-unit', text: '°C' }),
      ]),
    ]);

    const right = el('div', { class: 'weather__meta' }, [
      el('span', { class: 'weather__meta-label', text: 'Weather' }),
      el('span', { class: 'weather__meta-time', text: formatDayTime(current.time) }),
      el('span', { class: 'weather__meta-cond', text: info.label }),
    ]);

    topEl.append(left, right);
  }

  function renderStats(weather) {
    const current = weather?.current;
    if (!current) return;

    const compass = windCompass(current.windDirection);

    statsEl.append(
      stat('Precipitation', `${Math.round(weather.hourly?.precipitationProbability?.[0] ?? 0)}%`),
      stat('Humidity', `${Math.round(current.humidity)}%`),
      stat('Wind', `${Math.round(current.windSpeed)} km/h${compass ? ` ${compass}` : ''}`),
    );
  }

  function renderGraph(weather) {
    const hourly = weather?.hourly;
    if (!hourly?.time?.length || !hourly.temperature?.length) return;

    const temps = hourly.temperature;
    const times = hourly.time;
    const n = Math.min(temps.length, 24);

    const min = Math.min(...temps.slice(0, n));
    const max = Math.max(...temps.slice(0, n));
    const range = max - min || 1;

    const W = 600;
    const H = 180;
    const PAD_L = 40;
    const PAD_R = 16;
    const PAD_T = 16;
    const PAD_B = 32;
    const IW = W - PAD_L - PAD_R;
    const IH = H - PAD_T - PAD_B;

    const x = i => PAD_L + (i / (n - 1)) * IW;
    const y = t => PAD_T + IH - ((t - min) / range) * IH;

    const points = temps.slice(0, n).map((t, i) => `${x(i)},${y(t)}`).join(' ');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'weather-graph');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="wg-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f7b733" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#f7b733" stop-opacity="0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    area.setAttribute('points', `${PAD_L},${PAD_T + IH} ${points} ${PAD_L + IW},${PAD_T + IH}`);
    area.setAttribute('fill', 'url(#wg-fill)');
    svg.appendChild(area);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#f7b733');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);

    const yMinLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yMinLabel.setAttribute('x', PAD_L - 8);
    yMinLabel.setAttribute('y', y(min) + 4);
    yMinLabel.setAttribute('text-anchor', 'end');
    yMinLabel.setAttribute('fill', '#8892a0');
    yMinLabel.setAttribute('font-size', '11');
    yMinLabel.textContent = `${Math.round(min)}°`;
    svg.appendChild(yMinLabel);

    const yMaxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yMaxLabel.setAttribute('x', PAD_L - 8);
    yMaxLabel.setAttribute('y', y(max) + 4);
    yMaxLabel.setAttribute('text-anchor', 'end');
    yMaxLabel.setAttribute('fill', '#8892a0');
    yMaxLabel.setAttribute('font-size', '11');
    yMaxLabel.textContent = `${Math.round(max)}°`;
    svg.appendChild(yMaxLabel);

    const labelEvery = Math.ceil(n / 8);
    for (let i = 0; i < n; i++) {
      if (i % labelEvery !== 0 && i !== n - 1) continue;
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x(i));
      label.setAttribute('y', H - 8);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#8892a0');
      label.setAttribute('font-size', '11');
      label.textContent = formatHourShort(times[i]);
      svg.appendChild(label);

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x(i));
      dot.setAttribute('cy', y(temps[i]));
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', '#f7b733');
      svg.appendChild(dot);
    }

    graphEl.append(svg);
  }

  function renderForecast(weather) {
    const hourly = weather?.hourly;
    if (!hourly?.time?.length) return;

    const byDay = new Map();
    for (let i = 0; i < hourly.time.length; i++) {
      const d = new Date(hourly.time[i]);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push({
        temp: hourly.temperature[i],
        code: hourly.weatherCode[i],
      });
    }

    const days = [...byDay.entries()].slice(0, 7);
    if (!days.length) return;

    const row = el('div', { class: 'weather-forecast' });

    for (const [dateStr, entries] of days) {
      const d = new Date(dateStr);
      const temps = entries.map(e => e.temp).filter(t => t != null);
      const tMin = temps.length ? Math.min(...temps) : null;
      const tMax = temps.length ? Math.max(...temps) : null;
      const midCode = entries[Math.floor(entries.length / 2)]?.code ?? 0;
      const info = describeWeatherCode(midCode);

      row.append(
        el('div', { class: 'weather-forecast__day' }, [
          el('span', { class: 'weather-forecast__name', text: formatDayName(d) }),
          weatherGlyph(info.icon, 'weather-forecast__icon'),
          el('span', { class: 'weather-forecast__temps' }, [
            el('span', { class: 'weather-forecast__max', text: tMax != null ? `${Math.round(tMax)}°` : '—' }),
            el('span', { class: 'weather-forecast__min', text: tMin != null ? `${Math.round(tMin)}°` : '—' }),
          ]),
        ]),
      );
    }

    forecastEl.append(row);
  }

  function renderUpdated(weather) {
    const stamp = weather?.current?.time;
    updatedEl.textContent = stamp ? `Updated ${formatClock(stamp)}` : '';
  }

  function stat(label, value) {
    return el('div', { class: 'weather-stat' }, [
      el('span', { class: 'weather-stat__label', text: label }),
      el('span', { class: 'weather-stat__value', text: value }),
    ]);
  }

  return {
    unmount() {
      clear(root);
    },
  };
}

function formatTemp(value) {
  return value == null || Number.isNaN(value) ? '—' : `${Math.round(value)}°`;
}

function formatHourShort(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

function formatDayName(date) {
  return date.toLocaleDateString([], { weekday: 'short' });
}

function formatDayTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { weekday: 'long' }) + ', ' +
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
