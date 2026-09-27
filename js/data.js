// Loads data into the store. Shared by app.js and the admin screens.
import { store, isFacilityAdmin } from './store.js';
import * as api from './api.js';
import { withDistances } from './utils.js';

let rawFacilities = [];
let rawMine = [];

export function applyPosition() {
  store.facilities = withDistances(rawFacilities, store.position);
  store.myFacilities = withDistances(rawMine, store.position);
}

export async function loadFacilities({ quiet = false, onStart } = {}) {
  if (!quiet) { store.loading = true; store.loadError = null; onStart?.(); }
  try {
    rawFacilities = await api.fetchFacilities();
    store.loadError = null;
    applyPosition();
  } catch (err) {
    console.error('Failed to load facilities', err);
    if (!quiet) store.loadError = err.message || String(err);
  } finally {
    store.loading = false;
  }
}

export async function loadMyFacilities() {
  if (!isFacilityAdmin()) { rawMine = []; applyPosition(); return; }
  try {
    rawMine = await api.fetchMyFacilities(store.user);
  } catch (err) {
    console.error('Failed to load your facilities', err);
  }
  applyPosition();
}

// After an admin changes something: refresh both the public list and their own.
export async function refreshAfterAdminChange() {
  await Promise.all([loadFacilities({ quiet: true }), loadMyFacilities()]);
}

export const allFacilityIds = () => new Set(rawFacilities.map(f => f.id));
