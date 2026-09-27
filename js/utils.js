import { CONFIG } from './config.js';

export function haversineKm(a, b) {
  const R = 6371, tr = d => d * Math.PI / 180;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function withDistances(facilities, position) {
  return facilities.map(f => ({ ...f, dist: haversineKm(position, f) }));
}

// Escape text before putting it into innerHTML — data now comes from a database.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const toMinutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function minutesNow(timeZone = CONFIG.TIMEZONE) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = type => Number(parts.find(p => p.type === type).value);
    return get('hour') * 60 + get('minute');
  } catch {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  }
}

export function isOpenNow(f) {
  if (f.is24h) return true;
  if (!f.openTime || !f.closeTime) return false;
  const now = minutesNow(), open = toMinutes(f.openTime), close = toMinutes(f.closeTime);
  return open <= close ? now >= open && now < close : now >= open || now < close; // handles overnight
}

const trimTime = t => t.replace(/^0(\d)/, '$1');
export function hoursLabel(f) {
  if (f.is24h) return '24 hours';
  if (!f.openTime || !f.closeTime) return 'Hours not listed';
  return `${trimTime(f.openTime)}–${trimTime(f.closeTime)}`;
}

export const typeLabel = t => (t === 'pharmacy' ? 'Pharmacy' : 'Hospital');
export const km = d => `${d.toFixed(1)} km`;

export function getDevicePosition(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Location is not supported on this device.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      err => reject(new Error(err.code === 1 ? 'Location permission was denied.' : 'Could not get your location.')),
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

export function directionsUrl(from, to) {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat},${from.lng};${to.lat},${to.lng}`;
}

export const telUrl = phone => `tel:${phone.replace(/[^\d+]/g, '')}`;
