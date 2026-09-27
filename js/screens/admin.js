// "My facility": the dashboard for facility admin accounts (one facility per account).
import { store, isFacilityAdmin } from '../store.js';
import { ICON } from '../icons.js';
import { CONFIG } from '../config.js';
import { esc, typeLabel, timeAgo, KINDS, itemsOf } from '../utils.js';
import { badge, emptyState } from '../components/cards.js';

function statusPill(f) {
  if (!f.isActive) return '<span class="pill closed">Hidden</span>';
  if (!f.verified && f.reviewNote) return '<span class="pill closed">Needs changes</span>';
  if (!f.verified) return '<span class="pill pending">Awaiting verification</span>';
  return '<span class="pill open">Live on map</span>';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function stockSummary(f) {
  if (!f.stock.length) return 'No medications, services or equipment listed yet';
  const parts = KINDS.map(k => {
    const n = itemsOf(f, k.id).length;
    return `${n} ${n === 1 ? k.singular : k.plural}`;
  });
  const sold = f.stock.filter(s => s.kind !== 'service');
  const low = sold.filter(s => s.status === 'low').length;
  const out = sold.filter(s => s.status === 'out').length;
  const unavailable = itemsOf(f, 'service').filter(s => s.status === 'out').length;
  if (low) parts.push(`${low} running low`);
  if (out) parts.push(`${out} out of stock`);
  if (unavailable) parts.push(`${plural(unavailable, 'service')} unavailable`);
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
      ${f.reviewNote ? `<p class="review-note"><b>${f.verified ? 'Note' : 'Not approved yet'}:</b> ${esc(f.reviewNote)}<br><small>Fix this in Edit details. Your listing will be reviewed again.</small></p>` : ''}
      <p class="admin-meta">${stockSummary(f)}${updated ? `. Updated ${timeAgo(updated)}` : ''}</p>
      <div class="admin-actions">
        <button class="btn btn-sm" data-action="go-param" data-screen="admin-stock" data-id="${f.id}">${ICON.box} Stock & services</button>
        <button class="btn btn-sm btn-outline" data-action="go-param" data-screen="admin-edit" data-id="${f.id}">${ICON.edit} Edit details</button>
        <button class="btn btn-sm btn-outline" data-action="open-detail" data-id="${f.id}">View listing</button>
      </div>
    </div>`;
}

export function renderAdmin() {
  const body = document.getElementById('adminBody');
  document.querySelector('#scr-admin .screen-title').textContent = 'My facility';
  if (store.mode === 'demo') {
    body.innerHTML = emptyState('building', 'Facility accounts need Supabase.<br>Add your keys to js/config.js.');
    return;
  }
  if (!store.user) {
    body.innerHTML = emptyState('building', 'Sign in with a facility admin account to manage your listing.',
      '<button class="btn btn-sm" data-action="go" data-screen="profile">Sign in</button>');
    return;
  }
  if (!isFacilityAdmin()) {
    body.innerHTML = emptyState('building', 'Run a pharmacy, clinic or hospital?<br>Register it to list it on the map.',
      '<button class="btn btn-sm" data-action="become-admin">Register a facility</button>');
    return;
  }
  const mine = store.myFacilities[0];
  body.innerHTML = mine ? `
    <p class="admin-intro">Stock updates show on the map straight away. Changing your facility's name or type sends it back for verification.</p>
    <div class="list-wrap">${facilityCard(mine)}</div>` : `
    <p class="admin-intro">Each account manages one pharmacy, clinic or hospital. Your listing appears on the map once ${esc(CONFIG.APP_NAME)} verifies it.</p>
    <div class="list-wrap">
      ${emptyState('building', 'You have not added your facility yet.')}
      <button class="btn btn-block" data-action="go-param" data-screen="admin-edit" data-id="new">${ICON.plus} Add your facility</button>
    </div>`;
}
