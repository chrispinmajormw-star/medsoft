// Entry point: wires the screens, data layer and events together.
import { CONFIG } from './config.js';
import { store } from './store.js';
import * as api from './api.js';
import { hydrateIcons } from './icons.js';
import { withDistances, getDevicePosition } from './utils.js';
import { renderNavbars } from './components/navbar.js';
import { toast } from './components/toast.js';
import { registerScreen, startRouter, render, go, back, currentRoute } from './router.js';
import { renderHome } from './screens/home.js';
import { renderFind, bindFind, toggleMap, clearFilters } from './screens/find.js';
import { renderDetail, currentDetailId, updateSaveButton } from './screens/detail.js';
import { renderSaved } from './screens/saved.js';
import { renderProfile, setAuthTab } from './screens/profile.js';
import { refreshMapSize } from './screens/map.js';

registerScreen('home', renderHome);
registerScreen('find', renderFind);
registerScreen('detail', renderDetail);
registerScreen('saved', renderSaved);
registerScreen('profile', renderProfile);

// ---------------- data loading ----------------
let rawFacilities = [];

function applyPosition() {
  store.facilities = withDistances(rawFacilities, store.position);
}

async function loadFacilities() {
  store.loading = true;
  store.loadError = null;
  render();
  try {
    rawFacilities = await api.fetchFacilities();
    applyPosition();
  } catch (err) {
    console.error('Failed to load facilities', err);
    store.loadError = err.message || String(err);
  } finally {
    store.loading = false;
  }
}

async function loadSaved() {
  try {
    store.saved = await api.fetchSaved(store.user);
  } catch (err) {
    console.error('Failed to load saved places', err);
    toast('Saved places could not be loaded.');
  }
}

// ---------------- auth ----------------
async function setUser(user) {
  const previousId = store.user?.id || null;
  store.user = user || null;
  if (store.user?.id === previousId) return false;

  store.profile = null;
  if (store.user) {
    try { store.profile = await api.fetchProfile(store.user.id); }
    catch (err) { console.error('Failed to load profile', err); }
    await api.mergeLocalSavedInto(store.user, new Set(rawFacilities.map(f => f.id)));
  }
  await loadSaved();
  return true;
}

async function handleAuthSubmit(form) {
  const errorEl = document.getElementById('authError');
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  const isSignup = 'full_name' in data;
  errorEl.textContent = '';

  if (!data.email || !data.password) { errorEl.textContent = 'Enter your email and password.'; return; }
  if (data.password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (isSignup && !data.full_name.trim()) { errorEl.textContent = 'Enter your full name.'; return; }

  button.disabled = true;
  try {
    if (isSignup) {
      const result = await api.signUp(data.email.trim(), data.password, data.full_name.trim());
      if (!result.session) {
        setAuthTab('signin');
        renderProfile();
        toast('Account created. Check your email to confirm it, then sign in.', 5000);
        return;
      }
      toast('Account created.');
    } else {
      await api.signIn(data.email.trim(), data.password);
      toast('Signed in.');
    }
    // onAuthChange updates the screen.
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Try again.';
  } finally {
    button.disabled = false;
  }
}

async function handleProfileSubmit(form) {
  const errorEl = document.getElementById('profileError');
  const button = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  errorEl.textContent = '';
  button.disabled = true;
  try {
    store.profile = await api.saveProfile(store.user.id, {
      full_name: data.full_name.trim() || null,
      city: data.city.trim() || null,
    });
    toast('Changes saved.');
    renderProfile();
  } catch (err) {
    errorEl.textContent = err.message || 'Changes could not be saved.';
  } finally {
    button.disabled = false;
  }
}

async function handleSignOut() {
  try {
    await api.signOut();
    toast('Signed out.');
  } catch (err) {
    toast(err.message || 'Could not sign out.');
  }
}

// ---------------- saving places ----------------
async function toggleSave() {
  const id = currentDetailId();
  if (id == null) return;
  const wasSaved = store.saved.has(id);
  const before = new Set(store.saved);

  if (wasSaved) store.saved.delete(id); else store.saved.add(id);
  updateSaveButton();
  try {
    if (wasSaved) await api.removeSaved(store.user, id, store.saved);
    else await api.addSaved(store.user, id, before);
    toast(wasSaved ? 'Removed from saved.' : 'Saved.');
  } catch (err) {
    console.error('Save failed', err);
    store.saved = before;
    updateSaveButton();
    toast('That change could not be saved. Try again.');
  }
}

// ---------------- location ----------------
async function locate({ silent = false } = {}) {
  try {
    store.position = await getDevicePosition();
    store.positionSource = 'device';
    applyPosition();
    refreshMapSize(true);
    render();
    if (!silent) toast('Using your current location.');
  } catch (err) {
    if (!silent) toast(`${err.message} Showing places near ${CONFIG.DEFAULT_LOCATION.label}.`, 4000);
  }
}

// ---------------- emergency ----------------
function openEmergency() {
  const hospitals = store.facilities.filter(f => f.type === 'hospital').sort((a, b) => a.dist - b.dist);
  const nearest = hospitals.find(f => f.is24h) || hospitals[0];
  if (nearest) go('detail', nearest.id);
  else toast(store.loading ? 'Still loading places. Try again in a moment.' : 'No hospitals are listed yet.');
}

// ---------------- events ----------------
function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action } = el.dataset;
    switch (action) {
      case 'noop': return; // let links (e.g. Directions) work without opening the card
      case 'go': go(el.dataset.screen); break;
      case 'find-type': store.filters.type = el.dataset.type; go('find'); break;
      case 'open-detail': go('detail', el.dataset.id); break;
      case 'emergency': openEmergency(); break;
      case 'back': back('find'); break;
      case 'toggle-save': toggleSave(); break;
      case 'toggle-map': toggleMap(); break;
      case 'clear-filters': clearFilters(); break;
      case 'locate': locate(); break;
      case 'retry': loadFacilities().then(render); break;
      case 'auth-tab': setAuthTab(el.dataset.tab); renderProfile(); break;
      case 'sign-out': handleSignOut(); break;
      default: return;
    }
  });

  // Keyboard support for card "buttons".
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.id === 'authForm') { e.preventDefault(); handleAuthSubmit(e.target); }
    if (e.target.id === 'profileForm') { e.preventDefault(); handleProfileSubmit(e.target); }
  });

  bindFind();
}

// ---------------- boot ----------------
async function init() {
  document.title = CONFIG.APP_NAME;
  const slider = document.getElementById('radiusSlider');
  slider.max = CONFIG.MAX_RADIUS_KM;

  hydrateIcons(document);
  renderNavbars();
  bindEvents();
  if (!window.location.hash) history.replaceState(null, '', '#/home');
  startRouter();

  await loadFacilities();

  if (store.mode === 'live') {
    try {
      const session = await api.getSession();
      await setUser(session?.user || null);
    } catch (err) {
      console.error('Auth init failed', err);
      await loadSaved();
    }
    api.onAuthChange(async session => {
      const changed = await setUser(session?.user || null);
      if (changed) render();
    }).catch(err => console.error('Auth listener failed', err));
  } else {
    await loadSaved();
  }

  render();
  locate({ silent: true });

  // Refresh open/closed badges every minute on the current screen.
  setInterval(() => { if (currentRoute().screen !== 'profile') render(); }, 60000);
}

init();
