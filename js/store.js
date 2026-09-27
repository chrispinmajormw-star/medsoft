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

export function isFacilityAdmin() {
  return Boolean(store.user && store.profile?.role === 'facility_admin');
}
