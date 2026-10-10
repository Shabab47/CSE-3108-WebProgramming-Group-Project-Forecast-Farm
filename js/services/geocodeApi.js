import { GEOCODE_URL } from '../config/api.js';

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    count: '1',
    language: 'en',
    format: 'json',
  });

  let res;
  try {
    res = await fetch(`${GEOCODE_URL}?${params}`);
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }

  const place = data.results?.[0];
  if (!place) return { ok: false, reason: 'not_found' };

  return {
    ok: true,
    name: place.name,
    country: place.country || '',
    admin: place.admin1 || '',
  };
}

export async function searchPlaces(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  });

  let res;
  try {
    res = await fetch(`${GEOCODE_URL}?${params}`);
  } catch {
    return { ok: false, reason: 'network' };
  }

  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: 'bad_json' };
  }

  const results = (data.results || []).map((p) => ({
    name: p.name,
    country: p.country || '',
    admin: p.admin1 || '',
    lat: p.latitude,
    lon: p.longitude,
    tz: p.timezone || 'auto',
  }));

  return { ok: true, results };
}
