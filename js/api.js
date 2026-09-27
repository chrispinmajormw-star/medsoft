// Data layer. Every read/write to Supabase goes through here, so screens
// never talk to the database directly. In demo mode it serves seed data
// and keeps saved places in localStorage.
import { getClient } from './supabase-client.js';
import { SEED_FACILITIES } from './seed-data.js';
import { normalizeKind } from './utils.js';

const LOCAL_SAVED_KEY = 'medsoft:saved';
const FACILITY_COLUMNS = [
  'id', 'name', 'type', 'lat', 'lng', 'is_24h', 'open_time', 'close_time', 'phone', 'address', 'city',
  'rating', 'reviews_count', 'verified', 'is_active', 'notice', 'owner_id', 'updated_at', 'stock_updated_at',
  'facility_stock(id,item,status,kind,updated_at)',
].join(',');
const PROFILE_COLUMNS = 'id,full_name,city,phone,default_radius_km,theme,role';

// Columns a facility admin is allowed to write (matches the grants in 002_accounts_and_admin.sql).
const EDITABLE_FACILITY_FIELDS = [
  'name', 'type', 'lat', 'lng', 'is_24h', 'open_time', 'close_time', 'phone', 'address', 'city', 'notice', 'is_active',
];

const STATUS_ORDER = { in_stock: 0, low: 1, out: 2 };

function normalizeStock(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(s => (typeof s === 'string'
      ? { id: null, item: s, status: 'in_stock', kind: 'medicine', updatedAt: null }
      : {
        id: s.id != null ? Number(s.id) : null,
        item: s.item,
        status: s.status || 'in_stock',
        kind: normalizeKind(s.kind),
        updatedAt: s.updated_at || null,
      }))
    .sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.item.localeCompare(b.item));
}

function normalizeFacility(row) {
  return {
    id: Number(row.id),
    name: row.name,
    type: ['pharmacy', 'clinic', 'hospital'].includes(row.type) ? row.type : 'pharmacy',
    lat: Number(row.lat),
    lng: Number(row.lng),
    is24h: Boolean(row.is_24h),
    openTime: row.open_time ? String(row.open_time).slice(0, 5) : null,
    closeTime: row.close_time ? String(row.close_time).slice(0, 5) : null,
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || '',
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews_count || 0),
    stock: normalizeStock(row.facility_stock ?? row.stock),
    verified: row.verified !== false,
    isActive: row.is_active !== false,
    notice: row.notice || '',
    ownerId: row.owner_id || null,
    updatedAt: row.updated_at || null,
    stockUpdatedAt: row.stock_updated_at || null,
    reviewNote: row.review_note || '',
    reviewedAt: row.reviewed_at || null,
  };
}

function pickEditable(fields) {
  const out = {};
  EDITABLE_FACILITY_FIELDS.forEach(k => { if (k in fields) out[k] = fields[k]; });
  return out;
}

// ---------- facilities (public) ----------
export async function fetchFacilities() {
  const sb = await getClient();
  if (!sb) return SEED_FACILITIES.map(normalizeFacility);
  const { data, error } = await sb.from('facilities').select(FACILITY_COLUMNS).eq('is_active', true);
  if (error) throw error;
  return data.map(normalizeFacility);
}

// ---------- facilities (admin) ----------
export async function fetchMyFacilities(user) {
  const sb = await getClient();
  if (!sb || !user) return [];
  const query = cols => sb.from('facilities').select(cols).eq('owner_id', user.id).order('created_at', { ascending: true });
  // review_note arrives with 006_system_admin.sql; keep working if that hasn't been run yet.
  let { data, error } = await query(`${FACILITY_COLUMNS},review_note,reviewed_at`);
  if (error && /review_note|reviewed_at|42703/.test(`${error.code} ${error.message}`)) ({ data, error } = await query(FACILITY_COLUMNS));
  if (error) throw error;
  return data.map(normalizeFacility);
}

// ---------- system admin ----------
export async function fetchIsSystemAdmin(user) {
  const sb = await getClient();
  if (!sb || !user) return false;
  const { data, error } = await sb.from('system_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) return false; // table missing (006 not run) or no access: not an admin
  return Boolean(data);
}

export async function adminListFacilities() {
  const sb = await getClient();
  const { data, error } = await sb.rpc('admin_list_facilities');
  if (error) throw error;
  return data.map(row => ({
    ...normalizeFacility(row),
    createdAt: row.created_at,
    ownerEmail: row.owner_email || '',
    ownerName: row.owner_name || '',
    counts: { medicine: row.medicines || 0, service: row.services || 0, equipment: row.equipment || 0 },
  }));
}

export async function adminStats() {
  const sb = await getClient();
  const { data, error } = await sb.rpc('admin_stats');
  if (error) throw error;
  return data;
}

// approve = true to make it live; false to reject/suspend with a reason.
export async function adminReview(facilityId, approve, note = null) {
  const sb = await getClient();
  const { error } = await sb.rpc('admin_review_facility', { p_id: facilityId, p_approve: approve, p_note: note });
  if (error) throw error;
}

export async function createFacility(fields) {
  const sb = await getClient();
  const { data, error } = await sb.from('facilities').insert(pickEditable(fields)).select(FACILITY_COLUMNS).single();
  if (error) throw error;
  return normalizeFacility(data);
}

export async function updateFacility(id, fields) {
  const sb = await getClient();
  const { data, error } = await sb.from('facilities').update(pickEditable(fields)).eq('id', id).select(FACILITY_COLUMNS).single();
  if (error) throw error;
  return normalizeFacility(data);
}

export async function deleteFacility(id) {
  const sb = await getClient();
  const { error } = await sb.from('facilities').delete().eq('id', id);
  if (error) throw error;
}

// ---------- stock (admin) ----------
// kind: 'medicine', 'service' or 'equipment'
export async function addStockItem(facilityId, item, status = 'in_stock', kind = 'medicine') {
  const sb = await getClient();
  const { error } = await sb.from('facility_stock')
    .upsert({ facility_id: facilityId, item, status, kind }, { onConflict: 'facility_id,item' });
  if (error) throw error;
}

// Make the facility's services match `wanted` (names): add missing ones, remove unticked ones.
export async function syncServices(facilityId, currentServices, wanted) {
  const want = new Map(wanted.map(n => [n.toLowerCase(), n]));
  const have = new Map(currentServices.map(s => [s.item.toLowerCase(), s]));
  const toAdd = [...want.keys()].filter(k => !have.has(k)).map(k => want.get(k));
  const toRemove = [...have.keys()].filter(k => !want.has(k)).map(k => have.get(k).id);
  const sb = await getClient();
  if (toAdd.length) {
    const { error } = await sb.from('facility_stock').upsert(
      toAdd.map(item => ({ facility_id: facilityId, item, status: 'in_stock', kind: 'service' })),
      { onConflict: 'facility_id,item' });
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await sb.from('facility_stock').delete().in('id', toRemove);
    if (error) throw error;
  }
}

export async function setStockStatus(stockId, status) {
  const sb = await getClient();
  const { error } = await sb.from('facility_stock').update({ status }).eq('id', stockId);
  if (error) throw error;
}

export async function removeStockItem(stockId) {
  const sb = await getClient();
  const { error } = await sb.from('facility_stock').delete().eq('id', stockId);
  if (error) throw error;
}

// ---------- live updates ----------
export async function subscribeToChanges(onChange) {
  const sb = await getClient();
  if (!sb) return;
  sb.channel('medsoft-facilities')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_stock' }, onChange)
    .subscribe();
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

export async function signUp(email, password, fullName, accountType = 'user') {
  const sb = await getClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, account_type: accountType === 'facility_admin' ? 'facility_admin' : 'user' },
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

export async function updatePassword(password) {
  const sb = await getClient();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

// ---------- profile ----------
export async function fetchProfile(userId) {
  const sb = await getClient();
  if (!sb || !userId) return null;
  const { data, error } = await sb.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

// fields: any of full_name, city, phone, default_radius_km, theme, role
export async function saveProfile(userId, fields) {
  const sb = await getClient();
  const { data, error } = await sb.from('profiles').update(fields).eq('id', userId).select(PROFILE_COLUMNS).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // No profile row yet (account created before the sign-up trigger existed).
  const created = await sb.from('profiles').insert({ id: userId, ...fields }).select(PROFILE_COLUMNS).single();
  if (created.error) throw created.error;
  return created.data;
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
