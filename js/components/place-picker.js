// A map where the user places a pin: search a place, tap the map, drag the pin, or use GPS.
// Used by "Your location" (users) and the facility form (facilities).
import { ICON } from '../icons.js';
import { esc, getDevicePosition } from '../utils.js';
import { MAP_START, searchPlaces, reverseGeocode } from '../location.js';

export function pickerHTML(id, { searchPlaceholder = 'Search a town, area or landmark' } = {}) {
  return `
    <div class="picker" id="${id}">
      <div class="add-inline picker-search">
        <input type="search" data-picker-query placeholder="${esc(searchPlaceholder)}" aria-label="${esc(searchPlaceholder)}" autocomplete="off">
        <button type="button" class="btn btn-sm" data-picker-search>Search</button>
      </div>
      <div class="picker-results hidden" data-picker-results></div>
      <div class="picker-map" data-picker-map></div>
      <button type="button" class="btn btn-outline btn-block" data-picker-gps>${ICON.target} Use my current location</button>
      <p class="picker-hint" data-picker-status>Search, or tap the map to drop the pin. Drag it to adjust.</p>
    </div>`;
}

// options: { initial: {lat,lng}|null, icon: L.DivIcon|null, onPick(lat, lng, label, how) }
export function mountPicker(id, { initial = null, icon = null, onPick = () => {} } = {}) {
  const root = document.getElementById(id);
  const mapEl = root.querySelector('[data-picker-map]');
  const status = root.querySelector('[data-picker-status]');
  const results = root.querySelector('[data-picker-results]');
  const query = root.querySelector('[data-picker-query]');
  const say = t => { status.textContent = t; };

  let map = null;
  let marker = null;
  let labelToken = 0;

  function place(lat, lng, { pan = false, label = null, how = 'map' } = {}) {
    if (map) {
      if (!marker) {
        marker = L.marker([lat, lng], icon ? { draggable: true, icon } : { draggable: true }).addTo(map);
        marker.on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng, { how: 'map' }); });
      } else {
        marker.setLatLng([lat, lng]);
      }
      if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 15));
    }
    onPick(lat, lng, label, how);
    if (label === null) {
      // Name the spot in the background (e.g. "Area 18, Lilongwe"); fine if it fails.
      const token = ++labelToken;
      reverseGeocode(lat, lng).then(name => {
        if (token === labelToken && name) { say(`Pinned: ${name}`); onPick(lat, lng, name, 'label'); }
      }).catch(() => {});
    } else if (label) {
      say(`Pinned: ${label}`);
    }
  }

  if (typeof window.L === 'undefined') {
    mapEl.outerHTML = '<p class="picker-hint">The map could not load. Use search or your current location instead.</p>';
  } else {
    const start = initial || MAP_START;
    map = L.map(mapEl, { zoomControl: true }).setView([start.lat, start.lng], initial ? 16 : MAP_START.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);
    map.on('click', e => place(e.latlng.lat, e.latlng.lng, { how: 'map' }));
    setTimeout(() => map && map.invalidateSize(), 80);
  }
  if (initial) {
    // Show the existing pin without re-announcing it as a new pick.
    if (map) {
      marker = L.marker([initial.lat, initial.lng], icon ? { draggable: true, icon } : { draggable: true }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); place(p.lat, p.lng, { how: 'map' }); });
    }
    say('Drag the pin or tap the map to move it.');
  }

  async function runSearch() {
    const q = query.value.trim();
    if (q.length < 2) { query.focus(); return; }
    say('Searching…');
    results.classList.add('hidden');
    try {
      const found = await searchPlaces(q);
      if (!found.length) { say(`No places found for "${q}". Try a nearby town, or tap the map.`); return; }
      results.innerHTML = found.map((r, i) =>
        `<button type="button" class="picker-result" data-i="${i}"><b>${esc(r.label)}</b><small>${esc(r.detail)}</small></button>`).join('')
        + '<p class="picker-credit">Search by OpenStreetMap Nominatim</p>';
      results.classList.remove('hidden');
      say('Choose the right place below.');
      results.querySelectorAll('.picker-result').forEach(btn => btn.addEventListener('click', () => {
        const r = found[Number(btn.dataset.i)];
        results.classList.add('hidden');
        query.value = r.label;
        place(r.lat, r.lng, { pan: true, label: r.label, how: 'search' });
      }));
    } catch (err) {
      say(err.message || 'Place search failed. Tap the map instead.');
    }
  }

  root.querySelector('[data-picker-search]').addEventListener('click', runSearch);
  query.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });

  const gpsBtn = root.querySelector('[data-picker-gps]');
  gpsBtn.addEventListener('click', async () => {
    gpsBtn.disabled = true;
    say('Finding your location…');
    try {
      const p = await getDevicePosition();
      place(p.lat, p.lng, { pan: true, how: 'gps' });
      say('Pinned at your current location.');
    } catch (err) {
      say(`${err.message} Search or tap the map instead.`);
    } finally {
      gpsBtn.disabled = false;
    }
  });

  return {
    setIcon(newIcon) { icon = newIcon; if (marker && newIcon) marker.setIcon(newIcon); },
    destroy() { if (map) map.remove(); map = null; marker = null; },
  };
}
