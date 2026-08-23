// =============================================================================
// VAYTU — Data Access Layer (server-side auth/authorization)
// =============================================================================
// Centralizes the REAL authorization check. Every protected route
// (/creator, /business, /admin) calls requireRole() here, server-side,
// before rendering anything. proxy.ts (see /proxy.ts) only does a cheap,
// optimistic pre-filter (redirect anonymous visitors away from private
// routes) — it cannot affordably check role, and per Next.js's own
// guidance a Proxy matcher change could silently stop covering a route.
// This file is the actual gate. RLS (see /supabase/migrations/004_rls_policies.sql)
// remains the last line of defense underneath even this: every query here
// still only returns what the caller's own session is allowed to see.
//
// 'server-only' makes it a build error to import this from a Client
// Component, so session/profile data can never leak into client bundles.
// =============================================================================
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'creator' | 'business' | 'admin';

export interface AuthProfile {
  id: string;
  role: AppRole;
  fullName: string;
}

/**
 * The authenticated Supabase user for this request, or null. Uses
 * auth.getUser(), which revalidates the token against Supabase Auth —
 * NOT auth.getSession(), which only reads the local cookie without
 * server-side verification and must never be used for authorization
 * decisions.
 *
 * Wrapped in React's cache() so multiple calls within one request/render
 * pass reuse the same result instead of re-hitting Supabase Auth.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
});

/**
 * The caller's own application profile (id, role, full name), or null if
 * unauthenticated or the profile row doesn't exist yet. Relies on the
 * profiles_select_self RLS policy — this function has no special
 * privilege, it can only ever see the caller's own row.
 */
export const getAuthProfile = cache(async (): Promise<AuthProfile | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, role: data.role as AppRole, fullName: data.full_name };
});

export function dashboardPathForRole(role: AppRole): string {
  switch (role) {
    case 'creator':
      return '/creator';
    case 'business':
      return '/business';
    case 'admin':
      return '/admin';
  }
}

/**
 * The authoritative per-role gate. Call this at the top of every protected
 * Server Component page, before rendering or fetching anything else.
 *
 * - Not authenticated -> redirect to /login (with a `next` param back to
 *   the route they wanted).
 * - Authenticated but wrong role -> redirect to THEIR OWN dashboard (they
 *   are not anonymous, so /login would be wrong; they are simply not
 *   allowed on this particular route).
 * - Authenticated with the matching role -> returns their profile.
 */
export async function requireRole(role: AppRole): Promise<AuthProfile> {
  const profile = await getAuthProfile();

  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(dashboardPathForRole(role))}`);
  }

  if (profile.role !== role) {
    redirect(dashboardPathForRole(profile.role));
  }

  return profile;
}
