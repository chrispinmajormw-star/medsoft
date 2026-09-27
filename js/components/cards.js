// HTML builders for facility cards and empty states.
import { ICON } from '../icons.js';
import { store } from '../store.js';
import { esc, isOpenNow, hoursLabel, typeLabel, typeInfo, km, directionsUrl, STOCK_STATUS } from '../utils.js';

export const badge = f => `<div class="rc-ic ${f.type}"><b>${typeInfo(f.type).letter}</b></div>`;

export function stockTag(s, query = '') {
  const q = query.trim().toLowerCase();
  const match = q && s.item.toLowerCase().includes(q) && s.status !== 'out';
  const cls = [s.status !== 'in_stock' ? s.status : '', match ? 'match' : ''].filter(Boolean).join(' ');
  const title = STOCK_STATUS[s.status] || '';
  return `<span class="tag ${cls}" title="${title}">${esc(s.item)}${s.status === 'low' ? ' · low' : ''}</span>`;
}

export function miniCard(f) {
  return `
    <div class="card mini" role="button" tabindex="0" data-action="open-detail" data-id="${f.id}">
      ${badge(f)}
      <div class="mini-body">
        <h4>${esc(f.name)}</h4>
        <p>${km(f.dist)} away, ${typeLabel(f.type).toLowerCase()}</p>
      </div>
      <span class="pill open">Open</span>
    </div>`;
}

export function resultCard(f, query = '') {
  const open = isOpenNow(f);
  const stock = f.stock.map(s => stockTag(s, query)).join('');
  const pending = !f.verified ? '<span class="pill pending">Awaiting verification</span>' : '';
  return `
    <div class="card result-card" role="button" tabindex="0" data-action="open-detail" data-id="${f.id}">
      <div class="rc-top">
        ${badge(f)}
        <div class="rc-title">
          <h4>${esc(f.name)} ${f.verified ? `<span class="verified" title="Verified">${ICON.check}</span>` : ''}</h4>
          <p>${typeLabel(f.type)}, ${km(f.dist)} away</p>
          ${f.reviews ? `<div class="rc-rating">${ICON.star}<b>${f.rating.toFixed(1)}</b> (${f.reviews})</div>` : ''}
        </div>
        ${pending || `<span class="pill ${open ? 'open' : 'closed'}">${open ? 'Open' : 'Closed'}</span>`}
      </div>
      ${f.notice ? `<p class="card-notice">${esc(f.notice)}</p>` : ''}
      ${stock ? `<div class="stock">${stock}</div>` : ''}
      <div class="rc-foot">
        <small>${hoursLabel(f)}</small>
        <a class="btn btn-sm" data-action="noop" href="${directionsUrl(store.position, f)}" target="_blank" rel="noopener">Directions</a>
      </div>
    </div>`;
}

export function emptyState(iconName, message, button) {
  return `<div class="empty">${ICON[iconName] || ''}<div>${message}</div>${button || ''}</div>`;
}

export function loadingList(n = 3) {
  return Array.from({ length: n }, () => '<div class="skeleton"></div>').join('');
}

export function errorState() {
  return emptyState('info', `Places couldn't be loaded.<br>${esc(store.loadError || 'Check your connection.')}`,
    '<button class="btn btn-sm" data-action="retry">Try again</button>');
}
