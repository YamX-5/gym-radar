/* =========================================================================
   Gym Radar — connection config
   Leave BOTH empty  -> the app runs on local browser storage (offline demo).
   Paste your Supabase Project URL + anon (public) key -> the app uses Supabase.
   The anon key is meant to be public; RLS is what protects your data.
   Find both in: Supabase dashboard → Project Settings → API.
   ========================================================================= */
window.GR_CONFIG = {
  supabaseUrl: 'https://fzmtrewrinpenfjnfvvx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6bXRyZXdyaW5wZW5mam5mdnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDM3MTUsImV4cCI6MjA5OTI3OTcxNX0.H3sQgJvFV7sdUgYU9egjWEbihyXO2IzIBiDmKbqfzoo',
  seedDemoIfEmpty: false // real DB stays clean (plans+settings seed automatically; no fake members). Set true once if you want sample members.
};
