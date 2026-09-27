import { store, displayName } from '../store.js';
import { isOpenNow } from '../utils.js';
import { miniCard, loadingList, errorState, emptyState } from '../components/cards.js';

export function renderHome() {
  const name = displayName();
  document.getElementById('helloLine').textContent = name ? `Hello, ${name.split(' ')[0]} 👋` : 'Hello 👋';
  document.getElementById('homeAvatar').textContent = (name || 'M').charAt(0).toUpperCase();
  document.getElementById('demoNote').classList.toggle('hidden', store.mode !== 'demo');

  const list = document.getElementById('nearList');
  if (store.loading) { list.innerHTML = loadingList(3); return; }
  if (store.loadError) { list.innerHTML = errorState(); return; }

  const near = store.facilities.filter(isOpenNow).sort((a, b) => a.dist - b.dist).slice(0, 3);
  list.innerHTML = near.length
    ? near.map(miniCard).join('')
    : emptyState('clock', 'Nothing is open nearby right now.', '<button class="btn btn-sm" data-action="emergency">Find a 24-hour hospital</button>');
}
