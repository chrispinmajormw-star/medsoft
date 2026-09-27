// HTML builders for facility cards and empty states.
import { ICON } from '../icons.js';
import { store } from '../store.js';
import { esc, isOpenNow, hoursLabel, typeLabel, km, directionsUrl } from '../utils.js';

const badge = f => `<div class="rc-ic ${f.type}"><b>${f.type === 'pharmacy' ? 'Rx' : 'H'}</b></div>`;

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
  const q = query.trim().toLowerCase();
  const open = isOpenNow(f);
  const stock = f.stock.map(s =>
    `<span class="tag${q && s.toLowerCase().includes(q) ? ' match' : ''}">${esc(s)}</span>`).join('');
  return `
    <div class="card result-card" role="button" tabindex="0" data-action="open-detail" data-id="${f.id}">
      <div class="rc-top">
        ${badge(f)}
        <div class="rc-title">
          <h4>${esc(f.name)} ${f.verified ? `<span class="verified" title="Verified">${ICON.check}</span>` : ''}</h4>
          <p>${typeLabel(f.type)}, ${km(f.dist)} away</p>
          ${f.reviews ? `<div class="rc-rating">${ICON.star}<b>${f.rating.toFixed(1)}</b> (${f.reviews})</div>` : ''}
        </div>
        <span class="pill ${open ? 'open' : 'closed'}">${open ? 'Open' : 'Closed'}</span>
      </div>
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
