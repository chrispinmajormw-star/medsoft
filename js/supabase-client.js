// Lazily creates a single Supabase client. Returns null in demo mode,
// so the Supabase library is only downloaded when it's actually needed.
import { CONFIG, isSupabaseConfigured } from './config.js';

let clientPromise = null;

export function getClient() {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({ createClient }) => createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }))
      .catch(err => { clientPromise = null; throw err; }); // allow a retry after a network failure
  }
  return clientPromise;
}
