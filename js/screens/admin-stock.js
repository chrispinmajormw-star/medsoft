// Daily updates for one facility: service availability, medication stock and equipment for sale.
// (Which services are offered is set in the facility form; this screen sets today's availability.)
import { store, myFacilityById, isFacilityAdmin } from '../store.js';
import { ICON } from '../icons.js';
import * as api from '../api.js';
import { esc, timeAgo, statusLabels, kindInfo, itemsOf } from '../utils.js';
import { emptyState } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { refreshAfterAdminChange } from '../data.js';

// Suggestions shown while typing. Admins can type anything.
const SUGGESTIONS = {
  medicine: [
    'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Cotrimoxazole', 'Metronidazole', 'Ciprofloxacin', 'Doxycycline',
    'LA (Artemether-lumefantrine)', 'Malaria test kits', 'ORS sachets', 'Zinc tablets', 'Insulin', 'Metformin',
    'Amlodipine', 'Hydrochlorothiazide', 'Salbutamol inhaler', 'Antihistamines', 'Cough syrup', 'Contraceptives',
    'Condoms', 'Pregnancy tests', 'HIV self-test kits', 'Antiretrovirals (ARVs)', 'Ferrous sulphate', 'Folic acid',
    'Vitamins', 'Baby formula', 'Diabetes test strips',
  ],
  equipment: [
    'Blood pressure monitor', 'Glucometer', 'Digital thermometer', 'Pulse oximeter', 'Nebuliser', 'Stethoscope',
    'Oxygen concentrator', 'Wheelchair', 'Crutches', 'Walking frame', 'Walking stick', 'Hospital bed',
    'Weighing scale', 'First aid kit', 'Hearing aid', 'Face masks', 'Examination gloves', 'Syringes and needles',
    'Catheters', 'Adult diapers', 'Breast pump', 'Orthopaedic supports',
  ],
};
const PLACEHOLDER = { medicine: 'e.g. Amoxicillin', equipment: 'e.g. Blood pressure monitor' };

let facilityId = null;

function statusButtons(s) {
  return `<div class="status-seg" role="group" aria-label="Level for ${esc(s.item)}">
    ${Object.entries(statusLabels(s.kind)).map(([value, label]) => `
      <button type="button" data-action="stock-status" data-stock-id="${s.id}" data-status="${value}"
        class="${s.status === value ? 'active' : ''}" aria-pressed="${s.status === value}">${label}</button>`).join('')}
  </div>`;
}

function row(s) {
  return `
    <div class="stock-row">
      <div class="stock-name"><b>${esc(s.item)}</b>${s.updatedAt ? `<small>Updated ${timeAgo(s.updatedAt)}</small>` : ''}</div>
      ${statusButtons(s)}
      <button type="button" class="iconbtn icon-danger" data-action="stock-remove" data-stock-id="${s.id}" aria-label="Remove ${esc(s.item)}">${ICON.trash}</button>
    </div>`;
}

// Add form + list for a kind that is sold from stock (medications, equipment).
function stockedSection(f, kind) {
  const k = kindInfo(kind);
  const items = itemsOf(f, kind);
  const listed = new Set(f.stock.map(s => s.item.toLowerCase()));
  return `
    <h4 class="section-label">${k.heading}</h4>
    <form class="card panel form stock-add" id="${kind}AddForm" data-kind="${kind}" novalidate>
      <label class="field">Add ${kind === 'equipment' ? 'equipment' : 'a medication'}
        <input name="item" list="${kind}Suggestions" maxlength="80" autocomplete="off" placeholder="${PLACEHOLDER[kind]}" required>
      </label>
      <datalist id="${kind}Suggestions">
        ${SUGGESTIONS[kind].filter(i => !listed.has(i.toLowerCase())).map(i => `<option value="${esc(i)}">`).join('')}
      </datalist>
      <label class="field">Level
        <select name="status">${Object.entries(k.statuses).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      </label>
      <p class="form-error" data-error></p>
      <button class="btn btn-block" type="submit">${ICON.plus} Add ${kind === 'equipment' ? 'equipment' : 'medication'}</button>
    </form>
    <div class="card stock-list" data-list="${kind}">
      ${items.length ? items.map(row).join('')
        : `<p class="panel-text stock-empty">No ${k.plural} listed yet.${kind === 'equipment' ? ' Add any machines or devices you sell.' : ''}</p>`}
    </div>`;
}

export function renderAdminStock(param) {
  const body = document.getElementById('adminStockBody');
  const heading = document.querySelector('#scr-admin-stock .detail-head h2');
  if (heading) heading.textContent = 'Stock & services';
  const f = myFacilityById(param);
  if (store.mode !== 'live' || !isFacilityAdmin() || !f) {
    body.innerHTML = emptyState('box', 'This facility is not one of yours, or it was deleted.',
      '<button class="btn btn-sm" data-action="go" data-screen="admin">Go to My facility</button>');
    return;
  }
  facilityId = f.id;
  const services = itemsOf(f, 'service');
  body.innerHTML = `
    <div class="stock-head">
      <h3>${esc(f.name)}</h3>
      <p>${f.verified && f.isActive ? 'Changes show on the map straight away.' : 'Changes will show on the map once your listing is verified and visible.'}</p>
    </div>

    <h4 class="section-label">${kindInfo('service').heading}</h4>
    <div class="card stock-list" data-list="service">
      ${services.length ? services.map(row).join('') : '<p class="panel-text stock-empty">No services listed yet.</p>'}
      <div class="stock-list-foot">
        <button type="button" class="btn btn-sm btn-outline" data-action="go-param" data-screen="admin-edit" data-id="${f.id}">${ICON.edit} Add or remove services</button>
      </div>
    </div>

    ${stockedSection(f, 'medicine')}
    ${stockedSection(f, 'equipment')}`;
}

async function afterChange(message) {
  await refreshAfterAdminChange();
  renderAdminStock(facilityId);
  if (message) toast(message);
}

// Shared by the medication and equipment forms.
async function addItem(formEl) {
  const kind = formEl.dataset.kind;
  const k = kindInfo(kind);
  const errorEl = formEl.querySelector('[data-error]');
  const button = formEl.querySelector('button[type="submit"]');
  // namedItem(): form.elements.item is a built-in method, not the input called "item".
  const item = formEl.elements.namedItem('item').value.trim().replace(/\s+/g, ' ');
  const status = formEl.elements.namedItem('status').value;
  errorEl.textContent = '';
  if (!item) { errorEl.textContent = `Type the name of the ${k.singular}.`; return; }
  const f = myFacilityById(facilityId);
  const duplicate = f?.stock.find(s => s.item.toLowerCase() === item.toLowerCase());
  if (duplicate && duplicate.kind !== kind) {
    errorEl.textContent = `${duplicate.item} is already listed under ${kindInfo(duplicate.kind).label}.`;
    return;
  }
  button.disabled = true;
  try {
    if (duplicate) await api.setStockStatus(duplicate.id, status);
    else await api.addStockItem(facilityId, item, status, kind);
    await afterChange(duplicate ? `${duplicate.item} updated.` : `${item} added.`);
    document.querySelector(`#${kind}AddForm input[name="item"]`)?.focus();
  } catch (err) {
    errorEl.textContent = err.message || `The ${k.singular} could not be added.`;
    button.disabled = false;
  }
}

export const adminStockSubmits = {
  medicineAddForm: addItem,
  equipmentAddForm: addItem,
};

export const adminStockActions = {
  'stock-status': async el => {
    el.closest('.status-seg')?.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await api.setStockStatus(Number(el.dataset.stockId), el.dataset.status);
      await afterChange();
    } catch (err) {
      toast(err.message || 'That change could not be saved.');
      renderAdminStock(facilityId);
    }
  },
  'stock-remove': async el => {
    const f = myFacilityById(facilityId);
    const s = f?.stock.find(x => x.id === Number(el.dataset.stockId));
    if (!s || !confirm(`Remove ${s.item} from your ${kindInfo(s.kind).label.toLowerCase()}?`)) return;
    try {
      await api.removeStockItem(s.id);
      await afterChange(`${s.item} removed.`);
    } catch (err) {
      toast(err.message || 'That item could not be removed.');
    }
  },
};
