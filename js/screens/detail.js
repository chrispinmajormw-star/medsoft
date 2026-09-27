import { store, facilityById } from '../store.js';
import { ICON } from '../icons.js';
import { esc, isOpenNow, hoursLabel, typeLabel, km, directionsUrl, telUrl, timeAgo, statusLabels, KINDS, itemsOf } from '../utils.js';
import { emptyState, loadingList, errorState, stockTag } from '../components/cards.js';

let currentId = null;
export const currentDetailId = () => currentId;

export function updateSaveButton() {
  const btn = document.getElementById('saveBtn');
  const isSaved = currentId != null && store.saved.has(currentId);
  btn.innerHTML = isSaved ? ICON.bookmarkFill : ICON.bookmark;
  btn.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save this place');
  btn.setAttribute('aria-pressed', String(isSaved));
}

// One section per kind, grouped by level (In stock / Running low / Out, or Available / Limited / Unavailable).
function listSection(list, kind) {
  const labels = statusLabels(kind);
  return ['in_stock', 'low', 'out']
    .map(status => ({ status, items: list.filter(s => s.status === status) }))
    .filter(g => g.items.length)
    .map(g => `
      <p class="stock-group">${labels[g.status]}</p>
      <div class="stock">${g.items.map(s => stockTag(s)).join('')}</div>`).join('');
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
  const isOwner = store.user && f.ownerId === store.user.id;
  const stockUpdated = f.stockUpdatedAt || f.updatedAt;
  body.innerHTML = `
    ${!f.verified ? '<div class="note">' + ICON.info + '<span>This listing is waiting for verification. Only you can see it until it is approved.</span></div>' : ''}
    <div class="status-card ${f.type}">
      <span class="type">${typeLabel(f.type)}</span>
      <h2>${esc(f.name)} ${f.verified ? `<span style="color:#fff">${ICON.check}</span>` : ''}</h2>
      <div class="sub">${km(f.dist)} away. ${open ? 'Open now' : 'Closed now'}, ${hoursLabel(f)}.</div>
    </div>
    ${f.notice ? `<div class="note notice">${ICON.info}<span>${esc(f.notice)}</span></div>` : ''}
    <div class="card info-list">
      <div class="info-row"><span>Address</span><span>${esc(f.address || 'Not listed')}</span></div>
      <div class="info-row"><span>Distance</span><span>${km(f.dist)}</span></div>
      <div class="info-row"><span>Hours</span><span>${hoursLabel(f)}</span></div>
      <div class="info-row"><span>Phone</span><span>${esc(f.phone || 'Not listed')}</span></div>
      ${f.reviews ? `<div class="info-row"><span>Rating</span><span>${f.rating.toFixed(1)} ★ (${f.reviews})</span></div>` : ''}
    </div>
    <div class="note">${ICON.info}<span>Call ahead to confirm they still have what you need in stock.</span></div>
    ${KINDS.filter(k => itemsOf(f, k.id).length).map(k => `
    <div class="stockwrap">
      <h4>${k.heading}</h4>
      ${listSection(itemsOf(f, k.id), k.id)}
    </div>`).join('') || '<div class="stockwrap"><div class="stock"><span class="tag">No medications, services or equipment listed yet</span></div></div>'}
    ${stockUpdated && store.mode === 'live' ? `<p class="stock-updated stockwrap">Updated ${timeAgo(stockUpdated)}</p>` : ''}
    ${isOwner ? `<div class="btnrow owner-row">
      <button class="btn btn-outline" data-action="go-param" data-screen="admin-edit" data-id="${f.id}">${ICON.edit} Edit details</button>
      <button class="btn btn-outline" data-action="go-param" data-screen="admin-stock" data-id="${f.id}">${ICON.box} Stock & services</button>
    </div>` : ''}`;

  actions.classList.remove('hidden');
  const call = document.getElementById('callBtn');
  if (f.phone) { call.href = telUrl(f.phone); call.removeAttribute('aria-disabled'); }
  else { call.removeAttribute('href'); call.setAttribute('aria-disabled', 'true'); }
  document.getElementById('dirBtn').href = directionsUrl(store.position, f);
}
