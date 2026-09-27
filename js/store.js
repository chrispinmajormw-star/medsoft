// Single shared app state. Screens read from it; app.js and data.js update it.
import { CONFIG, isSupabaseConfigured } from './config.js';
import { savedRadius, savedTheme } from './utils.js';

export const store = {
  mode: isSupabaseConfigured() ? 'live' : 'demo',
  loading: true,
  loadError: null,
  facilities: [],      // what the public map/list shows (plus the owner's own pending listings)
  myFacilities: [],    // listings owned by the signed-in facility admin
  saved: new Set(),
  user: null,
  profile: null,
  isSystemAdmin: false, // from public.system_admins; only settable in the Supabase SQL editor
  theme: savedTheme(),
  position: { lat: CONFIG.DEFAULT_LOCATION.lat, lng: CONFIG.DEFAULT_LOCATION.lng },
  positionSource: 'default', // 'default' | 'device'
  filters: { type: 'all', query: '', radius: savedRadius() || CONFIG.DEFAULT_RADIUS_KM, openOnly: false },
  mapMode: false,
};

export function facilityById(id) {
  return store.facilities.find(f => f.id === Number(id))
    || store.myFacilities.find(f => f.id === Number(id))
    || null;
}

export function myFacilityById(id) {
  return store.myFacilities.find(f => f.id === Number(id)) || null;
}

export function displayName() {
  return store.profile?.full_name || store.user?.user_metadata?.full_name || store.user?.email?.split('@')[0] || '';
}

// Exactly one account type per account. System admin wins: it can never be a facility account.
export function accountType() {
  if (!store.user) return 'guest';
  if (store.isSystemAdmin) return 'system_admin';
  return store.profile?.role === 'facility_admin' ? 'facility_admin' : 'user';
}

export const ACCOUNT_LABELS = {
  guest: 'Guest',
  user: 'User account',
  facility_admin: 'Facility account',
  system_admin: 'System admin',
};

export function isFacilityAdmin() {
  return accountType() === 'facility_admin';
}
