import { CONFIG } from './config.js';

export const FACILITY_TYPES = [
  { id: 'pharmacy', label: 'Pharmacy', plural: 'Pharmacies', letter: 'Rx', color: '#149A85' },
  { id: 'clinic', label: 'Clinic', plural: 'Clinics', letter: 'C', color: '#C38A2E' },
  { id: 'hospital', label: 'Hospital', plural: 'Hospitals', letter: 'H', color: '#D5695A' },
];
export const typeInfo = t => FACILITY_TYPES.find(x => x.id === t) || FACILITY_TYPES[0];
export const typeLabel = t => typeInfo(t).label;

export const STOCK_STATUS = {
  in_stock: 'In stock',
  low: 'Running low',
  out: 'Out of stock',
};
export const SERVICE_STATUS = {
  in_stock: 'Available',
  low: 'Limited',
  out: 'Unavailable',
};
// What a facility can list. `id` is the value stored in facility_stock.kind.
// Order here is the order shown on screens.
export const KINDS = [
  { id: 'service', label: 'Services', heading: 'Services offered', singular: 'service', plural: 'services', statuses: SERVICE_STATUS },
  { id: 'medicine', label: 'Medications', heading: 'Medications (drugs)', singular: 'medication', plural: 'medications', statuses: STOCK_STATUS },
  { id: 'equipment', label: 'Equipment', heading: 'Equipment for sale', singular: 'equipment item', plural: 'equipment items', statuses: STOCK_STATUS },
];
export const kindInfo = kind => KINDS.find(k => k.id === kind) || KINDS[1];
export const normalizeKind = kind => (KINDS.some(k => k.id === kind) ? kind : 'medicine');

// Status labels worded for the kind (e.g. "Running low" vs "Limited").
export const statusLabels = kind => kindInfo(kind).statuses;

export const itemsOf = (f, kind) => f.stock.filter(s => s.kind === kind);
export const medicinesOf = f => itemsOf(f, 'medicine');
export const servicesOf = f => itemsOf(f, 'service');
export const equipmentOf = f => itemsOf(f, 'equipment');

// Suggested services for the facility form, by facility type.
const SERVICES_COMMON = [
  'General consultation', 'Malaria testing', 'HIV testing and counselling', 'Family planning', 'Vaccination',
  'Blood pressure check', 'Blood sugar test', 'Laboratory tests', 'Wound dressing', 'TB screening',
];
export const SUGGESTED_SERVICES = {
  pharmacy: ['Prescription dispensing', 'Medicine advice', 'Blood pressure check', 'Blood sugar test',
    'Malaria testing', 'Pregnancy test', 'Family planning', 'Home delivery'],
  clinic: [...SERVICES_COMMON, 'Antenatal care', 'Dental care', 'Eye clinic', 'Minor surgery', 'Nutrition counselling'],
  hospital: [...SERVICES_COMMON, 'Emergency care', 'Maternity ward', 'Antenatal care', 'X-ray', 'Ultrasound', 'Surgery',
    'ICU', 'Oxygen', 'Blood transfusion', 'Ambulance', 'Dental care', 'Eye clinic', 'Physiotherapy', 'Mental health services'],
};

export function haversineKm(a, b) {
  const R = 6371, tr = d => d * Math.PI / 180;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function withDistances(facilities, position) {
  return facilities.map(f => ({ ...f, dist: haversineKm(position, f) }));
}

// Escape text before putting it into innerHTML — data comes from a database.
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

export const km = d => `${d.toFixed(1)} km`;

export function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

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

// ---------- theme ----------
const THEME_KEY = 'medsoft:theme';
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  try { localStorage.setItem(THEME_KEY, theme || 'system'); } catch { /* ignore */ }
}
export function savedTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'system'; } catch { return 'system'; }
}

// ---------- device preferences (used for guests, and as a cache) ----------
const RADIUS_KEY = 'medsoft:radius';
export function savedRadius() {
  try { const n = Number(localStorage.getItem(RADIUS_KEY)); return n > 0 ? n : null; } catch { return null; }
}
export function rememberRadius(km) {
  try { localStorage.setItem(RADIUS_KEY, String(km)); } catch { /* ignore */ }
}
