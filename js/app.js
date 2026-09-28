// Entry point: wires the screens, data layer and events together.
import { CONFIG } from './config.js';
import { store, isFacilityAdmin } from './store.js';
import * as api from './api.js';
import { hydrateIcons } from './icons.js';
import { getDevicePosition, applyTheme, rememberRadius } from './utils.js';
import { loadFacilities, loadMyFacilities, applyPosition, allFacilityIds } from './data.js';
import { renderNavbars } from './components/navbar.js';
import { toast } from './components/toast.js';
import { registerScreen, startRouter, render, go, back, currentRoute, FORM_SCREENS } from './router.js';
import { renderHome } from './screens/home.js';
import { renderFind, bindFind, toggleMap, clearFilters } from './screens/find.js';
import { renderDetail, currentDetailId, updateSaveButton } from './screens/detail.js';
import { renderSaved } from './screens/saved.js';
import { renderProfile, setAuthTab } from './screens/profile.js';
import { renderSettings, settingsActions, settingsChanges, settingsSubmits } from './screens/settings.js';
import { renderAdmin } from './screens/admin.js';
import { renderAdminEdit, adminEditActions, adminEditChanges, adminEditSubmits } from './screens/admin-edit.js';
import { renderAdminStock, adminStockActions, adminStockSubmits } from './screens/admin-stock.js';
import { renderSysadmin, sysadminActions } from './screens/sysadmin.js';
import { refreshMapSize } from './screens/map.js';

registerScreen('home', renderHome);
registerScreen('find', renderFind);
registerScreen('detail', renderDetail);
registerScreen('saved', renderSaved);
registerScreen('profile', renderProfile);
registerScreen('settings', renderSettings);
registerScreen('admin', renderAdmin);
registerScreen('admin-edit', renderAdminEdit);
registerScreen('admin-stock', renderAdminStock);
registerScreen('sysadmin', renderSysadmin);

const isFormScreen = () => FORM_SCREENS.has(currentRoute().screen);

async function loadSaved() {
  try {
    store.saved = await api.fetchSaved(store.user);
  } catch (err) {
    console.error('Failed to load saved places', err);
    toast('Saved places could not be loaded.');
  }
}

// Apply settings stored on the account (theme, default radius).
function applyProfilePreferences() {
  const p = store.profile;
  if (!p) return;
  if (p.theme && p.theme !== store.theme) { store.theme = p.theme; applyTheme(p.theme); }
  if (p.default_radius_km) { store.filters.radius = p.default_radius_km; rememberRadius(p.default_radius_km); }
}

// ---------------- auth ----------------
// reloadFacilities: which listings are visible depends on who is signed in
// (owners also see their own pending listings), so refetch when the account changes.
async function setUser(user, { reloadFacilities = true } = {}) {
  const previousId = store.user?.id || null;
  store.user = user || null;
  if (store.user?.id === previousId) return false;

  store.profile = null;
  store.isSystemAdmin = false;
  if (store.user) {
    try { store.profile = await api.fetchProfile(store.user.id); }
    catch (err) { console.error('Failed to load profile', err); }
    store.isSystemAdmin = await api.fetchIsSystemAdmin(store.user);
    applyProfilePreferences();
    await api.mergeLocalSavedInto(store.user, allFacilityIds());
  }
  await Promise.all([
    loadSaved(),
    loadMyFacilities(),
    reloadFacilities ? loadFacilities({ quiet: true }) : null,
  ]);
  renderNavbars(isFacilityAdmin(), store.isSystemAdmin);
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
      const result = await api.signUp(data.email.trim(), data.password, data.full_name.trim(), data.account_type);
      if (!result.session) {
        setAuthTab('signin');
        renderProfile();
        toast('Account created. Check your email to confirm it, then sign in.', 5000);
        return;
      }
      toast('Account created.');
      if (data.account_type === 'facility_admin') setTimeout(() => go('admin'), 400);
    } else {
      await api.signIn(data.email.trim(), data.password);
      toast('Signed in.');
    }
    // onAuthChange updates the screens.
  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Try again.';
  } finally {
    button.disabled = false;
  }
}

async function handleSignOut() {
  try {
    await api.signOut();
    toast('Signed out.');
    go('profile');
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
    if (!isFormScreen()) render();
    if (!silent) toast('Using your current location.');
  } catch (err) {
    if (!silent) toast(`${err.message} Showing places near ${CONFIG.DEFAULT_LOCATION.label}.`, 4000);
  }
}

// ---------------- emergency ----------------
function openEmergency() {
  const care = store.facilities.filter(f => f.type !== 'pharmacy' && f.verified).sort((a, b) => a.dist - b.dist);
  const nearest = care.find(f => f.type === 'hospital' && f.is24h) || care.find(f => f.is24h) || care[0];
  if (nearest) go('detail', nearest.id);
  else toast(store.loading ? 'Still loading places. Try again in a moment.' : 'No hospitals are listed yet.');
}

// ---------------- events ----------------
const ACTIONS = {
  noop: () => {}, // let links (e.g. Directions) work without opening the card
  go: el => go(el.dataset.screen),
  'go-param': el => go(el.dataset.screen, el.dataset.id),
  'find-type': el => { store.filters.type = el.dataset.type; go('find'); },
  'open-detail': el => go('detail', el.dataset.id),
  emergency: () => openEmergency(),
  back: el => back(el.dataset.fallback || 'find'),
  'toggle-save': () => toggleSave(),
  'toggle-map': () => toggleMap(),
  'clear-filters': () => clearFilters(),
  locate: () => locate(),
  retry: () => loadFacilities({ onStart: render }).then(render),
  'auth-tab': el => { setAuthTab(el.dataset.tab); renderProfile(); },
  'sign-out': () => handleSignOut(),
  ...settingsActions,
  ...adminEditActions,
  ...adminStockActions,
  ...sysadminActions,
};

const SUBMITS = {
  authForm: handleAuthSubmit,
  ...settingsSubmits,
  ...adminEditSubmits,
  ...adminStockSubmits,
};

const CHANGES = { ...settingsChanges, ...adminEditChanges };

function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const handler = ACTIONS[el.dataset.action];
    if (!handler) return;
    if (el.dataset.action !== 'noop') e.preventDefault();
    handler(el);
  });

  // Keyboard support for card "buttons".
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-action]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('submit', e => {
    const handler = SUBMITS[e.target.id];
    if (handler) { e.preventDefault(); handler(e.target); }
  });

  document.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el) CHANGES[el.dataset.change]?.(el);
  });

  // Fired by settings when the account type changes.
  window.addEventListener('medsoft:profile-changed', async () => {
    await loadMyFacilities();
    renderNavbars(isFacilityAdmin(), store.isSystemAdmin);
    render();
  });

  bindFind();
}

// Live map: re-fetch when any facility or stock changes (debounced).
let liveTimer;
function onLiveChange() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(async () => {
    await Promise.all([loadFacilities({ quiet: true }), loadMyFacilities()]);
    if (!isFormScreen()) render();
  }, 700);
}

// ---------------- boot ----------------
async function init() {
  document.title = CONFIG.APP_NAME;
  applyTheme(store.theme);
  document.getElementById('radiusSlider').max = CONFIG.MAX_RADIUS_KM;

  hydrateIcons(document);
  renderNavbars(false);
  bindEvents();
  if (!window.location.hash) history.replaceState(null, '', '#/home');
  startRouter();

  await loadFacilities({ onStart: render });

  if (store.mode === 'live') {
    try {
      const session = await api.getSession();
      await setUser(session?.user || null, { reloadFacilities: false }); // just loaded above
    } catch (err) {
      console.error('Auth init failed', err);
      await loadSaved();
    }
    api.onAuthChange(async session => {
      const changed = await setUser(session?.user || null);
      if (changed) render();
    }).catch(err => console.error('Auth listener failed', err));
    api.subscribeToChanges(onLiveChange).catch(err => console.error('Live updates unavailable', err));
  } else {
    await loadSaved();
  }

  render();
  locate({ silent: true });

  // Installable app + opens offline (see sw.js). Needs https (or localhost).
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Offline support unavailable', err));
  }

  // Refresh open/closed badges every minute (not on screens with forms).
  setInterval(() => { if (!isFormScreen()) render(); }, 60000);
}

init();
