// Add or edit a facility: details, opening hours, notice and location on the map.
import { store, myFacilityById, isFacilityAdmin } from '../store.js';
import { ICON } from '../icons.js';
import * as api from '../api.js';
import { esc, FACILITY_TYPES, getDevicePosition, typeInfo } from '../utils.js';
import { emptyState } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { go } from '../router.js';
import { refreshAfterAdminChange } from '../data.js';

let picker = null;       // Leaflet map for choosing the location
let pickerMarker = null;
let editingId = null;    // null when adding

function setCoords(lat, lng, pan = false) {
  const latEl = document.getElementById('facLat');
  const lngEl = document.getElementById('facLng');
  if (latEl) latEl.value = lat.toFixed(6);
  if (lngEl) lngEl.value = lng.toFixed(6);
  if (pickerMarker) pickerMarker.setLatLng([lat, lng]);
  if (pan && picker) picker.setView([lat, lng], Math.max(picker.getZoom(), 16));
}

function pinIcon(type) {
  const { color, letter } = typeInfo(type);
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:38px;position:relative"><svg width="30" height="38" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 9.8 14 22 14 22s14-12.2 14-22C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="8.5" fill="#fff"/></svg><div style="position:absolute;top:6px;left:0;width:30px;text-align:center;color:${color};font-weight:700;font-size:12px">${letter}</div></div>`,
    iconSize: [30, 38], iconAnchor: [15, 36],
  });
}

function initPicker(lat, lng, type) {
  if (picker) { picker.remove(); picker = null; pickerMarker = null; }
  const el = document.getElementById('pickerMap');
  if (!el) return;
  if (typeof window.L === 'undefined') {
    el.outerHTML = '<p class="picker-hint">The map could not load. Enter the coordinates below instead.</p>';
    return;
  }
  picker = L.map(el, { zoomControl: true }).setView([lat, lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(picker);
  pickerMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon(type) }).addTo(picker);
  pickerMarker.on('dragend', () => { const p = pickerMarker.getLatLng(); setCoords(p.lat, p.lng); });
  picker.on('click', e => setCoords(e.latlng.lat, e.latlng.lng));
  setTimeout(() => picker && picker.invalidateSize(), 80);
}

function form(f) {
  const v = f || {};
  const is24h = Boolean(v.is24h);
  return `
    <form class="form admin-form" id="facilityForm" novalidate>
      <div class="card panel">
        <h3>Details</h3>
        <div class="form">
          <label class="field">Facility name<input name="name" required maxlength="120" value="${esc(v.name || '')}" placeholder="e.g. Kamuzu Central Pharmacy"></label>
          <label class="field">Type
            <select name="type" data-change="facility-type">
              ${FACILITY_TYPES.map(t => `<option value="${t.id}" ${v.type === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </label>
          <label class="field">Phone<input name="phone" type="tel" value="${esc(v.phone || '')}" placeholder="+265 …"></label>
          <label class="field">Street address<input name="address" value="${esc(v.address || '')}" placeholder="e.g. Kamuzu Rd, Area 9"></label>
          <label class="field">City or town<input name="city" value="${esc(v.city || '')}" placeholder="Lilongwe"></label>
        </div>
      </div>

      <div class="card panel">
        <h3>Opening hours</h3>
        <div class="form">
          <label class="check-row"><input type="checkbox" name="is_24h" data-change="toggle-24h" ${is24h ? 'checked' : ''}> Open 24 hours</label>
          <div class="row-2 ${is24h ? 'hidden' : ''}" id="hoursRow">
            <label class="field">Opens<input name="open_time" type="time" value="${esc(v.openTime || '')}"></label>
            <label class="field">Closes<input name="close_time" type="time" value="${esc(v.closeTime || '')}"></label>
          </div>
        </div>
      </div>

      <div class="card panel">
        <h3>Location</h3>
        <div class="form">
          <p class="picker-hint">Tap the map or drag the pin to your entrance.</p>
          <div id="pickerMap" class="picker-map"></div>
          <button type="button" class="btn btn-outline btn-block" data-action="picker-locate">${ICON.target} Use my current location</button>
          <div class="row-2">
            <label class="field">Latitude<input id="facLat" name="lat" inputmode="decimal" required></label>
            <label class="field">Longitude<input id="facLng" name="lng" inputmode="decimal" required></label>
          </div>
        </div>
      </div>

      <div class="card panel">
        <h3>Notice for patients</h3>
        <label class="field">Shown on your listing (optional)
          <textarea name="notice" maxlength="280" placeholder="e.g. Closed on Sunday 12 Oct for stock-taking.">${esc(v.notice || '')}</textarea>
        </label>
      </div>

      ${f ? `<div class="card panel">
        <h3>Visibility</h3>
        <label class="check-row"><input type="checkbox" name="is_active" ${v.isActive !== false ? 'checked' : ''}> Show this facility on the map</label>
      </div>` : ''}

      <p class="form-error" id="facilityError"></p>
      <div class="btnrow form-buttons">
        <button class="btn" type="submit">${f ? 'Save changes' : 'Add facility'}</button>
      </div>
      ${f ? `<div class="btnrow form-buttons"><button type="button" class="btn btn-outline btn-danger-outline" data-action="delete-facility">${ICON.trash} Delete listing</button></div>` : ''}
    </form>`;
}

export function renderAdminEdit(param) {
  const body = document.getElementById('adminEditBody');
  const title = document.getElementById('adminEditTitle');
  if (store.mode !== 'live' || !isFacilityAdmin()) {
    title.textContent = 'Facility';
    body.innerHTML = emptyState('building', 'Only facility admin accounts can add listings.',
      '<button class="btn btn-sm" data-action="go" data-screen="admin">Go to My facilities</button>');
    return;
  }
  const f = param === 'new' ? null : myFacilityById(param);
  if (param !== 'new' && !f) {
    title.textContent = 'Facility';
    body.innerHTML = emptyState('info', 'This facility is not one of yours, or it was deleted.',
      '<button class="btn btn-sm" data-action="go" data-screen="admin">Go to My facilities</button>');
    return;
  }
  editingId = f ? f.id : null;
  title.textContent = f ? 'Edit facility' : 'Add a facility';
  body.innerHTML = form(f);
  const lat = f ? f.lat : store.position.lat;
  const lng = f ? f.lng : store.position.lng;
  setCoords(lat, lng);
  initPicker(lat, lng, f ? f.type : 'pharmacy');
}

// ---------- handlers ----------
function readForm(formEl) {
  const d = Object.fromEntries(new FormData(formEl));
  const is24h = formEl.elements.is_24h.checked;
  const fields = {
    name: (d.name || '').trim(),
    type: d.type,
    phone: (d.phone || '').trim() || null,
    address: (d.address || '').trim() || null,
    city: (d.city || '').trim() || null,
    notice: (d.notice || '').trim() || null,
    is_24h: is24h,
    open_time: is24h ? null : d.open_time || null,
    close_time: is24h ? null : d.close_time || null,
    lat: Number(d.lat),
    lng: Number(d.lng),
  };
  if (formEl.elements.is_active) fields.is_active = formEl.elements.is_active.checked;
  return fields;
}

function validate(f) {
  if (!f.name) return 'Enter the facility name.';
  if (!Number.isFinite(f.lat) || f.lat < -90 || f.lat > 90) return 'Latitude must be a number between -90 and 90.';
  if (!Number.isFinite(f.lng) || f.lng < -180 || f.lng > 180) return 'Longitude must be a number between -180 and 180.';
  if (!f.is_24h && (Boolean(f.open_time) !== Boolean(f.close_time))) return 'Enter both opening and closing times, or leave both empty.';
  return '';
}

export const adminEditSubmits = {
  facilityForm: async formEl => {
    const errorEl = document.getElementById('facilityError');
    const button = formEl.querySelector('button[type="submit"]');
    const fields = readForm(formEl);
    const problem = validate(fields);
    errorEl.textContent = problem;
    if (problem) return;

    const before = editingId ? myFacilityById(editingId) : null;
    button.disabled = true;
    try {
      if (editingId) {
        const saved = await api.updateFacility(editingId, fields);
        await refreshAfterAdminChange();
        const reverify = before?.verified && !saved.verified;
        toast(reverify ? 'Saved. Changing the name or type means it will be verified again.' : 'Changes saved.', reverify ? 5000 : 2800);
        go('admin');
      } else {
        const created = await api.createFacility(fields);
        await refreshAfterAdminChange();
        toast('Facility added. Now list what you have in stock.', 4000);
        go('admin-stock', created.id);
      }
    } catch (err) {
      errorEl.textContent = err.message || 'The facility could not be saved.';
    } finally {
      button.disabled = false;
    }
  },
};

export const adminEditActions = {
  'picker-locate': async el => {
    el.disabled = true;
    try {
      const p = await getDevicePosition();
      setCoords(p.lat, p.lng, true);
      toast('Pin moved to your current location.');
    } catch (err) {
      toast(err.message);
    } finally {
      el.disabled = false;
    }
  },
  'delete-facility': async () => {
    const f = myFacilityById(editingId);
    if (!f) return;
    if (!confirm(`Delete "${f.name}"? Its stock list will be deleted too. This can't be undone.\n\nTo take it off the map for a while instead, untick "Show this facility on the map".`)) return;
    try {
      await api.deleteFacility(f.id);
      await refreshAfterAdminChange();
      toast('Listing deleted.');
      go('admin');
    } catch (err) {
      toast(err.message || 'The listing could not be deleted.');
    }
  },
};

export const adminEditChanges = {
  'toggle-24h': el => document.getElementById('hoursRow')?.classList.toggle('hidden', el.checked),
  'facility-type': el => { if (pickerMarker) pickerMarker.setIcon(pinIcon(el.value)); },
};

