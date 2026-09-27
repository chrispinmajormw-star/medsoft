// Single shared app state. Screens read from it; app.js updates it.
import { CONFIG, isSupabaseConfigured } from './config.js';

export const store = {
  mode: isSupabaseConfigured() ? 'live' : 'demo',
  loading: true,
  loadError: null,
  facilities: [],
  saved: new Set(),
  user: null,
  profile: null,
  position: { lat: CONFIG.DEFAULT_LOCATION.lat, lng: CONFIG.DEFAULT_LOCATION.lng },
  positionSource: 'default', // 'default' | 'device'
  filters: { type: 'all', query: '', radius: CONFIG.DEFAULT_RADIUS_KM, openOnly: false },
  mapMode: false,
};

export function facilityById(id) {
  return store.facilities.find(f => f.id === Number(id)) || null;
}

export function displayName() {
  return store.profile?.full_name || store.user?.user_metadata?.full_name || store.user?.email?.split('@')[0] || '';
}
