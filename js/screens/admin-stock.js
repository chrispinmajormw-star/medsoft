// Stock manager for one facility: add items and mark them in stock, running low or out.
import { store, myFacilityById, isFacilityAdmin } from '../store.js';
import { ICON } from '../icons.js';
import * as api from '../api.js';
import { esc, timeAgo, STOCK_STATUS } from '../utils.js';
import { emptyState } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { refreshAfterAdminChange } from '../data.js';

// Suggestions shown while typing. Admins can type anything.
const COMMON_ITEMS = [
  'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Cotrimoxazole', 'Metronidazole', 'Ciprofloxacin', 'Doxycycline',
  'LA (Artemether-lumefantrine)', 'Malaria test kits', 'ORS sachets', 'Zinc tablets', 'Insulin', 'Metformin',
  'Amlodipine', 'Hydrochlorothiazide', 'Salbutamol inhaler', 'Antihistamines', 'Cough syrup', 'Contraceptives',
  'Condoms', 'Pregnancy tests', 'HIV self-test kits', 'Antiretrovirals (ARVs)', 'Ferrous sulphate', 'Folic acid',
  'Vitamins', 'Baby formula', 'Wound dressing', 'Emergency care', 'Maternity ward', 'X-ray', 'Blood tests',
  'Vaccination', 'General consultation', 'Oxygen', 'Blood transfusion',
];

let facilityId = null;

function statusButtons(s) {
  return `<div class="status-seg" role="group" aria-label="Stock level for ${esc(s.item)}">
    ${Object.entries(STOCK_STATUS).map(([value, label]) => `
      <button type="button" data-action="stock-status" data-stock-id="${s.id}" data-status="${value}"
        class="${s.status === value ? 'active' : ''}" aria-pressed="${s.status === value}">${label}</button>`).join('')}
  </div>`;
}

function stockRow(s) {
  return `
    <div class="stock-row">
      <div class="stock-name"><b>${esc(s.item)}</b>${s.updatedAt ? `<small>Updated ${timeAgo(s.updatedAt)}</small>` : ''}</div>
      ${statusButtons(s)}
      <button type="button" class="iconbtn icon-danger" data-action="stock-remove" data-stock-id="${s.id}" aria-label="Remove ${esc(s.item)}">${ICON.trash}</button>
    </div>`;
}

export function renderAdminStock(param) {
  const body = document.getElementById('adminStockBody');
  const f = myFacilityById(param);
  if (store.mode !== 'live' || !isFacilityAdmin() || !f) {
    body.innerHTML = emptyState('box', 'This facility is not one of yours, or it was deleted.',
      '<button class="btn btn-sm" data-action="go" data-screen="admin">Go to My facilities</button>');
    return;
  }
  facilityId = f.id;
  const existing = new Set(f.stock.map(s => s.item.toLowerCase()));
  body.innerHTML = `
    <div class="stock-head">
      <h3>${esc(f.name)}</h3>
      <p>${f.verified && f.isActive ? 'Changes show on the map straight away.' : 'Changes will show on the map once your listing is verified and visible.'}</p>
    </div>
    <form class="card panel form" id="stockAddForm" novalidate>
      <h3>Add an item</h3>
      <label class="field">Medicine or service
        <input name="item" list="stockSuggestions" maxlength="80" autocomplete="off" placeholder="e.g. Amoxicillin" required>
      </label>
      <datalist id="stockSuggestions">
        ${COMMON_ITEMS.filter(i => !existing.has(i.toLowerCase())).map(i => `<option value="${esc(i)}">`).join('')}
      </datalist>
      <label class="field">Level
        <select name="status">${Object.entries(STOCK_STATUS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      </label>
      <p class="form-error" id="stockError"></p>
      <button class="btn btn-block" type="submit">${ICON.plus} Add item</button>
    </form>
    <div class="card stock-list">
      ${f.stock.length ? f.stock.map(stockRow).join('') : '<p class="panel-text stock-empty">Nothing listed yet. Add the medicines and services you have.</p>'}
    </div>`;
}

async function afterChange(message) {
  await refreshAfterAdminChange();
  renderAdminStock(facilityId);
  if (message) toast(message);
}

export const adminStockSubmits = {
  stockAddForm: async formEl => {
    const errorEl = document.getElementById('stockError');
    const button = formEl.querySelector('button[type="submit"]');
    // namedItem(): form.elements.item is a built-in method, not the input called "item".
    const item = formEl.elements.namedItem('item').value.trim().replace(/\s+/g, ' ');
    const status = formEl.elements.namedItem('status').value;
    errorEl.textContent = '';
    if (!item) { errorEl.textContent = 'Type the name of a medicine or service.'; return; }
    const f = myFacilityById(facilityId);
    const duplicate = f?.stock.find(s => s.item.toLowerCase() === item.toLowerCase());
    button.disabled = true;
    try {
      if (duplicate) await api.setStockStatus(duplicate.id, status);
      else await api.addStockItem(facilityId, item, status);
      await afterChange(duplicate ? `${duplicate.item} updated.` : `${item} added.`);
      document.querySelector('#stockAddForm input[name="item"]')?.focus();
    } catch (err) {
      errorEl.textContent = err.message || 'The item could not be added.';
      button.disabled = false;
    }
  },
};

export const adminStockActions = {
  'stock-status': async el => {
    el.closest('.status-seg')?.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      await api.setStockStatus(Number(el.dataset.stockId), el.dataset.status);
      await afterChange();
    } catch (err) {
      toast(err.message || 'The stock level could not be changed.');
      renderAdminStock(facilityId);
    }
  },
  'stock-remove': async el => {
    const f = myFacilityById(facilityId);
    const s = f?.stock.find(x => x.id === Number(el.dataset.stockId));
    if (!s || !confirm(`Remove ${s.item} from your list?`)) return;
    try {
      await api.removeStockItem(s.id);
      await afterChange(`${s.item} removed.`);
    } catch (err) {
      toast(err.message || 'The item could not be removed.');
    }
  },
};
