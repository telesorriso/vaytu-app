// =============================================================================
// VAYTU — Supabase server client
// =============================================================================
// For use in Server Components, Server Actions and Route Handlers. Reads/
// writes the auth session via Next.js's cookie store (cookie-based session
// management, per @supabase/ssr's documented pattern). Still only the anon
// key — RLS (as the authenticated user, via their session JWT) is what
// scopes every query, exactly as for the browser client. Never import the
// service_role key here.
//
// Server Components cannot set cookies (Next.js only allows cookie writes
// from Server Actions/Route Handlers), so `setAll` below is wrapped in a
// try/catch: called from a Server Component it will throw and is safely
// ignored there, because proxy.ts (see /proxy.ts) already refreshes the
// session cookie on every request.
// =============================================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAnonKey, supabaseUrl } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — no-op, proxy.ts refreshes
          // the session cookie for us on the next request.
        }
      },
    },
  });
}
