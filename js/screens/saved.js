import { store } from '../store.js';
import { resultCard, emptyState, loadingList, errorState } from '../components/cards.js';

export function renderSaved() {
  const list = document.getElementById('savedList');
  if (store.loading) { list.innerHTML = loadingList(2); return; }
  if (store.loadError) { list.innerHTML = errorState(); return; }
  const items = store.facilities.filter(f => store.saved.has(f.id)).sort((a, b) => a.dist - b.dist);
  const hint = store.mode === 'live' && !store.user
    ? '<br>Sign in on the Profile tab to keep them across devices.' : '';
  list.innerHTML = items.length
    ? items.map(f => resultCard(f)).join('')
    : emptyState('saved', `No saved places yet.<br>Tap the bookmark on any place to save it here.${hint}`);
}
