// Data layer. Every read/write to Supabase goes through here, so screens
// never talk to the database directly. In demo mode it serves seed data
// and keeps saved places in localStorage.
import { getClient } from './supabase-client.js';
import { SEED_FACILITIES } from './seed-data.js';

const LOCAL_SAVED_KEY = 'medsoft:saved';
const FACILITY_COLUMNS =
  'id,name,type,lat,lng,is_24h,open_time,close_time,phone,address,rating,reviews_count,stock,verified,updated_at';

function normalizeFacility(row) {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type === 'hospital' ? 'hospital' : 'pharmacy',
    lat: Number(row.lat),
    lng: Number(row.lng),
    is24h: Boolean(row.is_24h),
    openTime: row.open_time ? String(row.open_time).slice(0, 5) : null,
    closeTime: row.close_time ? String(row.close_time).slice(0, 5) : null,
    phone: row.phone || '',
    address: row.address || '',
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews_count || 0),
    stock: Array.isArray(row.stock) ? row.stock : [],
    verified: row.verified !== false,
    updatedAt: row.updated_at || null,
  };
}

// ---------- facilities ----------
export async function fetchFacilities() {
  const sb = await getClient();
  if (!sb) return SEED_FACILITIES.map(normalizeFacility);
  const { data, error } = await sb.from('facilities').select(FACILITY_COLUMNS).eq('is_active', true);
  if (error) throw error;
  return data.map(normalizeFacility);
}

// ---------- auth ----------
export async function getSession() {
  const sb = await getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function onAuthChange(callback) {
  const sb = await getClient();
  if (!sb) return;
  // Supabase warns against awaiting other Supabase calls inside this
  // callback, so hand off to the next tick.
  sb.auth.onAuthStateChange((_event, session) => setTimeout(() => callback(session), 0));
}

export async function signIn(email, password) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName) {
  const sb = await getClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
  return data; // data.session is null when email confirmation is required
}

export async function signOut() {
  const sb = await getClient();
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

// ---------- profile ----------
export async function fetchProfile(userId) {
  const sb = await getClient();
  if (!sb || !userId) return null;
  const { data, error } = await sb.from('profiles').select('id,full_name,city').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, fields) {
  const sb = await getClient();
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, full_name: fields.full_name, city: fields.city })
    .select('id,full_name,city')
    .single();
  if (error) throw error;
  return data;
}

// ---------- saved places ----------
function readLocalSaved() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SAVED_KEY) || '[]').map(Number); }
  catch { return []; }
}
function writeLocalSaved(ids) {
  try { localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify([...ids])); } catch { /* storage full or blocked */ }
}

export async function fetchSaved(user) {
  const sb = await getClient();
  if (!sb || !user) return new Set(readLocalSaved());
  const { data, error } = await sb.from('saved_facilities').select('facility_id');
  if (error) throw error;
  return new Set(data.map(r => Number(r.facility_id)));
}

export async function addSaved(user, facilityId, currentSet) {
  const sb = await getClient();
  if (!sb || !user) { writeLocalSaved(new Set([...currentSet, facilityId])); return; }
  const { error } = await sb.from('saved_facilities')
    .upsert({ user_id: user.id, facility_id: facilityId }, { onConflict: 'user_id,facility_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeSaved(user, facilityId, currentSet) {
  const sb = await getClient();
  if (!sb || !user) {
    const next = new Set(currentSet); next.delete(facilityId); writeLocalSaved(next); return;
  }
  const { error } = await sb.from('saved_facilities').delete().eq('user_id', user.id).eq('facility_id', facilityId);
  if (error) throw error;
}

// When a guest signs in, move places they saved on this device into their account.
export async function mergeLocalSavedInto(user, validIds) {
  const sb = await getClient();
  const local = readLocalSaved().filter(id => validIds.has(id));
  if (!sb || !user || !local.length) return;
  const { error } = await sb.from('saved_facilities')
    .upsert(local.map(id => ({ user_id: user.id, facility_id: id })), { onConflict: 'user_id,facility_id', ignoreDuplicates: true });
  if (!error) writeLocalSaved([]);
}
