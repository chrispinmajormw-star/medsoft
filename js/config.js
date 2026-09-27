// =====================================================================
// Medsoft configuration — the only file you need to edit to go live.
// =====================================================================
// Find these in Supabase: Project Settings -> API (or "API Keys").
// Use the anon / publishable key. It is safe in a public repo because
// Row Level Security (supabase/schema.sql) controls what it can do.
// NEVER put the service_role / secret key here.
export const CONFIG = {
  APP_NAME: 'Medsoft',

  SUPABASE_URL: 'https://mfxyopjyilqkkgusagii.supabase.co',        // e.g. 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meHlvcGp5aWxxa2tndXNhZ2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODk2MDgsImV4cCI6MjEwNjA2NTYwOH0.wR0vBxLFngcp3J_2S9j10wBcr16rFnD797JOnvoUSYY',   // e.g. 'eyJhbGciOi...' or 'sb_publishable_...'

  // Used until the browser shares the person's real location (or if they decline).
  DEFAULT_LOCATION: { lat: -13.9626, lng: 33.7741, label: 'Lilongwe, Malawi' },

  // Opening hours in the database are stored in this time zone.
  TIMEZONE: 'Africa/Blantyre',

  DEFAULT_RADIUS_KM: 5,
  MAX_RADIUS_KM: 25,
};

export function isSupabaseConfigured() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = CONFIG;
  return Boolean(url && key && url.startsWith('https://'));
}
