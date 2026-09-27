import { store, facilityById } from '../store.js';
import { ICON } from '../icons.js';
import { esc, isOpenNow, hoursLabel, typeLabel, km, directionsUrl, telUrl } from '../utils.js';
import { emptyState, loadingList, errorState } from '../components/cards.js';

let currentId = null;
export const currentDetailId = () => currentId;

export function updateSaveButton() {
  const btn = document.getElementById('saveBtn');
  const isSaved = currentId != null && store.saved.has(currentId);
  btn.innerHTML = isSaved ? ICON.bookmarkFill : ICON.bookmark;
  btn.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save this place');
  btn.setAttribute('aria-pressed', String(isSaved));
}

export function renderDetail(param) {
  const body = document.getElementById('detailBody');
  const actions = document.getElementById('detailActions');
  const f = facilityById(param);
  currentId = f ? f.id : null;
  updateSaveButton();
  document.getElementById('saveBtn').classList.toggle('hidden', !f);

  if (!f) {
    actions.classList.add('hidden');
    body.innerHTML = store.loading ? `<div class="list-wrap">${loadingList(2)}</div>`
      : store.loadError ? errorState()
      : emptyState('info', 'This place is no longer listed.', '<button class="btn btn-sm" data-action="go" data-screen="find">Find another place</button>');
    return;
  }

  const open = isOpenNow(f);
  const updated = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  body.innerHTML = `
    <div class="status-card ${f.type}">
      <span class="type">${typeLabel(f.type)}</span>
      <h2>${esc(f.name)} ${f.verified ? `<span style="color:#fff">${ICON.check}</span>` : ''}</h2>
      <div class="sub">${km(f.dist)} away. ${open ? 'Open now' : 'Closed now'}, ${hoursLabel(f)}.</div>
    </div>
    <div class="card info-list">
      <div class="info-row"><span>Address</span><span>${esc(f.address || 'Not listed')}</span></div>
      <div class="info-row"><span>Distance</span><span>${km(f.dist)}</span></div>
      <div class="info-row"><span>Hours</span><span>${hoursLabel(f)}</span></div>
      <div class="info-row"><span>Phone</span><span>${esc(f.phone || 'Not listed')}</span></div>
      ${f.reviews ? `<div class="info-row"><span>Rating</span><span>${f.rating.toFixed(1)} ★ (${f.reviews})</span></div>` : ''}
    </div>
    <div class="note">${ICON.info}<span>Call ahead to confirm they still have what you need in stock.</span></div>
    <div class="stockwrap">
      <h4>What they have</h4>
      <div class="stock">${f.stock.length ? f.stock.map(s => `<span class="tag">${esc(s)}</span>`).join('') : '<span class="tag">No stock listed</span>'}</div>
      ${updated && store.mode === 'live' ? `<p class="stock-updated">Last updated ${updated}</p>` : ''}
    </div>`;

  actions.classList.remove('hidden');
  const call = document.getElementById('callBtn');
  if (f.phone) { call.href = telUrl(f.phone); call.removeAttribute('aria-disabled'); }
  else { call.removeAttribute('href'); call.setAttribute('aria-disabled', 'true'); }
  document.getElementById('dirBtn').href = directionsUrl(store.position, f);
}
