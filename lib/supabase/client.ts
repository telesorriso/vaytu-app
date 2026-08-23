// =============================================================================
// VAYTU — Supabase browser client
// =============================================================================
// For use in Client Components ('use client') only. Uses the anon/publishable
// key — safe to ship to the browser, protected by RLS. Never import the
// service_role key here.
// =============================================================================
import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './env';

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
