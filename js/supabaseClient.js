/**
 * CampusHub 1.0 — Supabase Client Configuration
 * Provides auth, database, realtime, and storage via Supabase.
 */

const SUPABASE_URL = 'https://dcyeufxjjgwvcljcbqzx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeWV1Znhqamd3dmNsamNicXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzYzMjUsImV4cCI6MjEwMzY1MjMyNX0.s68EJtRLGXsRuamfsPujMlcHcLKaaFCuM8VvROl3EIs';

// Initialize Supabase client (loaded via CDN in index.html)
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

// Check if Supabase is available
function isSupabaseReady() {
  return getSupabase() !== null;
}

export { getSupabase, isSupabaseReady, SUPABASE_URL, SUPABASE_ANON_KEY };
