import { store } from '../store.js';
import { ICON } from '../icons.js';
import { isOpenNow, rememberRadius, byDistanceOrName, esc } from '../utils.js';
import { hasLocation, locationSummary } from '../location.js';
import { resultCard, emptyState, loadingList, errorState } from '../components/cards.js';
import { initMap, syncMap, refreshMapSize, mapAvailable } from './map.js';
import { toast } from '../components/toast.js';
import { go } from '../router.js';

export function filteredFacilities() {
  const { type, query, radius, openOnly } = store.filters;
  const q = query.trim().toLowerCase();
  return store.facilities.filter(f => {
    if (f.dist != null && f.dist > radius) return false; // no location yet: no distance filter
    if (type !== 'all' && f.type !== type) return false;
    if (openOnly && !isOpenNow(f)) return false;
    if (q && !(f.name.toLowerCase().includes(q) || f.stock.some(s => s.status !== 'out' && s.item.toLowerCase().includes(q)))) return false;
    return true;
  }).sort(byDistanceOrName);
}

function syncControls() {
  const { type, openOnly, radius, query } = store.filters;
  document.querySelectorAll('#typeChips [data-type]').forEach(c => c.classList.toggle('active', c.dataset.type === type));
  document.querySelector('#typeChips [data-open]').classList.toggle('active', openOnly);
  document.getElementById('radiusSlider').value = radius;
  document.getElementById('radiusLabel').textContent = `${radius} km`;
  document.getElementById('radiusFrom').textContent = hasLocation() ? `of ${locationSummary()}` : '';
  document.getElementById('radiusStrip').classList.toggle('hidden', !hasLocation());
  const note = document.getElementById('findLocNote');
  note.classList.toggle('hidden', hasLocation());
  note.innerHTML = hasLocation() ? '' : `Showing all places, A–Z. <button class="link-btn" data-action="go" data-screen="location">Set your location</button> to see the nearest.`;
  const input = document.getElementById('searchInput');
  if (document.activeElement !== input) input.value = query;
}

export function renderFind() {
  syncControls();
  const list = document.getElementById('findList');
  if (store.loading) { list.innerHTML = loadingList(4); return; }
  if (store.loadError) { list.innerHTML = errorState(); return; }

  const items = filteredFacilities();
  list.innerHTML = items.length
    ? items.map(f => resultCard(f, store.filters.query)).join('')
    : emptyState('find', hasLocation() ? `Nothing matches within ${store.filters.radius} km.<br>Widen the radius or clear the filters.` : 'Nothing matches.<br>Try clearing the filters.',
        '<button class="btn btn-sm" data-action="clear-filters">Clear filters</button>');
  syncMap(items);
}

export function toggleMap() {
  const screen = document.getElementById('scr-find');
  const btn = document.getElementById('mapToggleBtn');
  if (!store.mapMode) {
    if (!mapAvailable()) { toast('The map could not load. Check your connection.'); return; }
    initMap(id => go('detail', id));
  }
  store.mapMode = !store.mapMode;
  screen.classList.toggle('map-mode', store.mapMode);
  btn.innerHTML = store.mapMode ? ICON.list : ICON.map;
  btn.setAttribute('aria-label', store.mapMode ? 'Show list' : 'Show map');
  if (store.mapMode) { syncMap(filteredFacilities()); refreshMapSize(); }
}

export function bindFind() {
  document.getElementById('searchInput').addEventListener('input', e => {
    store.filters.query = e.target.value;
    renderFind();
  });
  document.getElementById('typeChips').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) store.filters.openOnly = !store.filters.openOnly;
    else store.filters.type = b.dataset.type;
    renderFind();
  });
  document.getElementById('radiusSlider').addEventListener('input', e => {
    store.filters.radius = Number(e.target.value);
    rememberRadius(store.filters.radius);
    renderFind();
  });
}

export function clearFilters() {
  Object.assign(store.filters, { type: 'all', query: '', openOnly: false });
  renderFind();
}
