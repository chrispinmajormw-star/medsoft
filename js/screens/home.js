import { store, displayName } from '../store.js';
import { isOpenNow, esc } from '../utils.js';
import { ICON } from '../icons.js';
import { hasLocation, locationSummary } from '../location.js';
import { miniCard, loadingList, errorState, emptyState } from '../components/cards.js';

export function renderHome() {
  const name = displayName();
  document.getElementById('helloLine').textContent = name ? `Hello, ${name.split(' ')[0]} 👋` : 'Hello 👋';
  document.getElementById('homeAvatar').textContent = (name || 'M').charAt(0).toUpperCase();
  document.getElementById('demoNote').classList.toggle('hidden', store.mode !== 'demo');
  const chip = document.getElementById('locChip');
  chip.innerHTML = `${ICON.target}<span>${hasLocation() ? esc(locationSummary()) : 'Set your location'}</span><b>${hasLocation() ? 'Change' : 'Set'}</b>`;
  chip.classList.toggle('unset', !hasLocation());

  const list = document.getElementById('nearList');
  if (store.loading) { list.innerHTML = loadingList(3); return; }
  if (store.loadError) { list.innerHTML = errorState(); return; }

  if (!hasLocation()) {
    document.querySelector('#scr-home .sec-head h3').textContent = 'Places near you';
    list.innerHTML = `
      <div class="card loc-prompt">
        <p>Choose where you are to see the nearest pharmacies, clinics and hospitals.</p>
        <button class="btn btn-sm" data-action="locate">${ICON.target} Use my current location</button>
        <button class="btn btn-sm btn-outline" data-action="go" data-screen="location">Choose a place</button>
      </div>`;
    return;
  }
  document.querySelector('#scr-home .sec-head h3').textContent = 'Open near you';
  const near = store.facilities.filter(isOpenNow).sort((a, b) => a.dist - b.dist).slice(0, 3);
  list.innerHTML = near.length
    ? near.map(miniCard).join('')
    : emptyState('clock', 'Nothing is open nearby right now.', '<button class="btn btn-sm" data-action="emergency">Find a 24-hour hospital</button>');
}
