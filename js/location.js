// Where the user is, as THEY chose it. There is no built-in default city.
//   mode 'device' = follow the phone's GPS (refreshed each time the app opens)
//   mode 'chosen' = a place they picked by searching or tapping the map
// Stored on the device, and on the account when signed in (profiles.location_*).
import { store } from './store.js';
import { getDevicePosition } from './utils.js';

const KEY = 'medsoft:location';

// Only where the map opens before anything is chosen. Not treated as anyone's location.
export const MAP_START = { lat: -13.25, lng: 34.3, zoom: 6 }; // whole of Malawi

export const hasLocation = () => Boolean(store.position);

// Start point for directions: only a place the user picked. With GPS we leave it out,
// so the maps app routes from where the phone really is right now.
export const routeOrigin = () => (store.positionSource === 'chosen' ? store.position : null);

export function locationSummary() {
  if (!store.position) return 'Not set';
  if (store.positionSource === 'device') return store.positionLabel ? `${store.positionLabel} (GPS)` : 'Your current location';
  return store.positionLabel || 'Chosen place';
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function writeLocal(loc) {
  try {
    if (loc) localStorage.setItem(KEY, JSON.stringify(loc)); else localStorage.removeItem(KEY);
  } catch { /* storage blocked */ }
}

// Put a location into the app state (no saving).
export function applyLocation(loc) {
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    store.position = { lat: loc.lat, lng: loc.lng };
    store.positionSource = loc.mode === 'device' ? 'device' : 'chosen';
    store.positionLabel = loc.label || '';
  } else {
    store.position = null;
    store.positionSource = null;
    store.positionLabel = '';
  }
}

// This phone's saved choice, without changing anything.
export const savedChoice = () => readLocal();

// What we know before asking GPS: this device's saved choice.
export function restoreLocalLocation() {
  applyLocation(readLocal());
  return readLocal();
}

// The account's saved choice, from profiles.location_* (used when signing in).
export function locationFromProfile(p) {
  if (!p || !p.location_mode) return null;
  if (p.location_mode === 'device') return { mode: 'device', lat: NaN, lng: NaN, label: '' };
  if (p.location_lat == null || p.location_lng == null) return null;
  return { mode: 'chosen', lat: Number(p.location_lat), lng: Number(p.location_lng), label: p.location_label || '' };
}

// Save a choice everywhere it belongs. `persistToAccount` is api.saveProfile bound to the user, or null.
export async function saveLocation(loc, persistToAccount) {
  applyLocation(loc);
  writeLocal(loc);
  if (persistToAccount) {
    await persistToAccount({
      location_mode: loc ? loc.mode : null,
      location_lat: loc && loc.mode === 'chosen' ? loc.lat : null,
      location_lng: loc && loc.mode === 'chosen' ? loc.lng : null,
      location_label: loc ? loc.label || null : null,
    });
  }
}

// Follow GPS: returns the location, or throws with a readable message.
export async function useDeviceLocation() {
  const p = await getDevicePosition();
  const label = await reverseGeocode(p.lat, p.lng).catch(() => '');
  return { mode: 'device', lat: p.lat, lng: p.lng, label };
}

// ---------- place search (OpenStreetMap Nominatim) ----------
// Free service with a fair-use policy: search only when the user presses Search
// (never on every keystroke), at most about one request per second.
const NOMINATIM = 'https://nominatim.openstreetmap.org';
let lastRequest = 0;
async function politeFetch(url) {
  const wait = 1100 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search is unavailable right now.');
  return res.json();
}

function shortLabel(addr = {}, fallback = '') {
  const local = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.quarter || addr.road;
  const town = addr.city || addr.town || addr.municipality || addr.county || addr.state_district;
  return [local, town].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || fallback;
}

export async function searchPlaces(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
  const rows = await politeFetch(url);
  return rows.map(r => ({
    lat: Number(r.lat),
    lng: Number(r.lon),
    label: shortLabel(r.address, r.name || q),
    detail: r.display_name,
  }));
}

export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&zoom=16&addressdetails=1&lat=${lat}&lon=${lng}`;
  const r = await politeFetch(url);
  return shortLabel(r.address, '');
}
