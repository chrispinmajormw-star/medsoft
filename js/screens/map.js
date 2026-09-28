// Leaflet map for the Find screen. Leaflet is loaded as a global <script> in index.html.
import { store } from '../store.js';
import { esc, awayText, isOpenNow, typeInfo } from '../utils.js';
import { MAP_START } from '../location.js';

let mapObj = null;
let userMarker = null;
let radiusCircle = null;
const markers = new Map();

const colorFor = type => typeInfo(type).color;

function pinIcon(f) {
  const hex = colorFor(f.type);
  const html = `<div style="position:relative;width:28px;height:36px;${isOpenNow(f) ? '' : 'opacity:.55'}">
    <svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 22 14 22s14-12.2 14-22C28 6.3 21.7 0 14 0z" fill="${hex}"/><circle cx="14" cy="14" r="8.5" fill="#fff"/></svg>
    <div style="position:absolute;top:5px;left:0;width:28px;text-align:center;color:${hex};font-weight:700;font-size:12px;font-family:'Space Grotesk',sans-serif">${typeInfo(f.type).letter}</div>
  </div>`;
  return L.divIcon({ html, className: '', iconSize: [28, 36], iconAnchor: [14, 34], popupAnchor: [0, -32] });
}

export function mapAvailable() { return typeof window.L !== 'undefined'; }

export function initMap(onSelect) {
  if (mapObj || !mapAvailable()) return Boolean(mapObj);
  const { lat, lng } = store.position || MAP_START;
  mapObj = L.map('findMap', { zoomControl: false }).setView([lat, lng], store.position ? 13 : MAP_START.zoom);
  L.control.zoom({ position: 'bottomright' }).addTo(mapObj);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  }).addTo(mapObj);
  radiusCircle = L.circle([lat, lng], { radius: store.filters.radius * 1000, color: '#149A85', weight: 1, fillOpacity: 0.04 }).addTo(mapObj);
  userMarker = L.marker([lat, lng], {
    icon: L.divIcon({ html: '<div style="width:14px;height:14px;border-radius:50%;background:#E3A73B;border:3px solid #fff;box-shadow:0 0 0 4px rgba(227,167,59,.3)"></div>', className: '', iconSize: [14, 14], iconAnchor: [7, 7] }),
    interactive: false,
  }).addTo(mapObj);
  mapObj._onSelect = onSelect;
  return true;
}

export function syncMap(items) {
  if (!mapObj) return;
  if (store.position) {
    const { lat, lng } = store.position;
    userMarker.setLatLng([lat, lng]).addTo(mapObj);
    radiusCircle.setLatLng([lat, lng]).setRadius(store.filters.radius * 1000).addTo(mapObj);
  } else {
    userMarker.remove();
    radiusCircle.remove();
  }

  const keep = new Set(items.map(f => f.id));
  markers.forEach((m, id) => { if (!keep.has(id)) { mapObj.removeLayer(m); markers.delete(id); } });
  items.forEach(f => {
    let m = markers.get(f.id);
    if (!m) {
      m = L.marker([f.lat, f.lng], { icon: pinIcon(f), title: f.name }).addTo(mapObj);
      m.on('click', () => mapObj._onSelect?.(f.id));
      markers.set(f.id, m);
    }
    m.setLatLng([f.lat, f.lng]); // admins can move their pin
    m.setIcon(pinIcon(f));
    m.bindTooltip(`<b>${esc(f.name)}</b><br>${[awayText(f.dist), isOpenNow(f) ? 'open now' : 'closed'].filter(Boolean).join(', ')}`, { direction: 'top', offset: [0, -30] });
  });
}

export function refreshMapSize(recenter = false) {
  if (!mapObj) return;
  setTimeout(() => {
    mapObj.invalidateSize();
    if (recenter && store.position) mapObj.setView([store.position.lat, store.position.lng], Math.max(mapObj.getZoom(), 13));
  }, 60);
}
