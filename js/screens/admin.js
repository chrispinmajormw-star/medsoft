// "My facilities": the dashboard for facility admin accounts.
import { store, isFacilityAdmin } from '../store.js';
import { ICON } from '../icons.js';
import { CONFIG } from '../config.js';
import { esc, typeLabel, timeAgo } from '../utils.js';
import { badge, emptyState } from '../components/cards.js';

function statusPill(f) {
  if (!f.isActive) return '<span class="pill closed">Hidden</span>';
  if (!f.verified) return '<span class="pill pending">Awaiting verification</span>';
  return '<span class="pill open">Live on map</span>';
}

function stockSummary(f) {
  if (!f.stock.length) return 'No stock listed yet';
  const low = f.stock.filter(s => s.status === 'low').length;
  const out = f.stock.filter(s => s.status === 'out').length;
  const parts = [`${f.stock.length} item${f.stock.length === 1 ? '' : 's'}`];
  if (low) parts.push(`${low} running low`);
  if (out) parts.push(`${out} out`);
  return parts.join(', ');
}

function facilityCard(f) {
  const updated = f.stockUpdatedAt || f.updatedAt;
  return `
    <div class="card admin-card">
      <div class="rc-top">
        ${badge(f)}
        <div class="rc-title">
          <h4>${esc(f.name)}</h4>
          <p>${typeLabel(f.type)}${f.address ? `, ${esc(f.address)}` : ''}</p>
        </div>
        ${statusPill(f)}
      </div>
      <p class="admin-meta">${stockSummary(f)}${updated ? `. Updated ${timeAgo(updated)}` : ''}</p>
      <div class="admin-actions">
        <button class="btn btn-sm" data-action="go-param" data-screen="admin-stock" data-id="${f.id}">${ICON.box} Update stock</button>
        <button class="btn btn-sm btn-outline" data-action="go-param" data-screen="admin-edit" data-id="${f.id}">${ICON.edit} Edit details</button>
        <button class="btn btn-sm btn-outline" data-action="open-detail" data-id="${f.id}">View listing</button>
      </div>
    </div>`;
}

export function renderAdmin() {
  const body = document.getElementById('adminBody');
  if (store.mode === 'demo') {
    body.innerHTML = emptyState('building', 'Facility accounts need Supabase.<br>Add your keys to js/config.js.');
    return;
  }
  if (!store.user) {
    body.innerHTML = emptyState('building', 'Sign in with a facility admin account to manage your listings.',
      '<button class="btn btn-sm" data-action="go" data-screen="profile">Sign in</button>');
    return;
  }
  if (!isFacilityAdmin()) {
    body.innerHTML = emptyState('building', 'Run a pharmacy, clinic or hospital?<br>Register it to list it on the map.',
      '<button class="btn btn-sm" data-action="become-admin">Register a facility</button>');
    return;
  }
  const list = store.myFacilities;
  body.innerHTML = `
    <p class="admin-intro">New listings appear on the map once ${esc(CONFIG.APP_NAME)} verifies them. Stock updates show straight away.</p>
    <div class="list-wrap">
      ${list.length ? list.map(facilityCard).join('') : emptyState('building', 'You have not added a facility yet.')}
      <button class="btn btn-block" data-action="go-param" data-screen="admin-edit" data-id="new">${ICON.plus} Add a facility</button>
    </div>`;
}
