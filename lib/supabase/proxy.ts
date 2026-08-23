// =============================================================================
// VAYTU — Supabase session refresh for proxy.ts (Next.js 16's renamed
// middleware; see https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
// =============================================================================
// Runs on (almost) every request. Two jobs, both required by
// @supabase/ssr's documented pattern:
//   1. Refresh the auth token if it's expired (auth.getUser() below revalidates
//      against Supabase Auth — NOT a local-only cookie read) and re-issue the
//      session cookie on the response.
//   2. A coarse, OPTIMISTIC route gate: redirect obviously-unauthenticated
//      visitors away from private routes, and obviously-authenticated users
//      away from /login and /signup. This is a fast pre-filter only — it
//      does NOT check role (creator/business/admin), because that requires
//      a database read and Proxy should stay cheap (see Next.js docs:
//      "avoid database checks [in Proxy] to prevent performance issues").
//      The REAL, per-role authorization check happens server-side in each
//      route (see /lib/auth/dal.ts), backed by RLS as the last line of
//      defense — never rely on this file alone.
// =============================================================================
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from './env';
import { withTimeout, ActionTimeoutError } from '@/lib/actions/timeout';

const PRIVATE_PREFIXES = ['/creator', '/business', '/admin'];
const AUTH_ONLY_PATHS = ['/login', '/signup'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token against Supabase Auth.
  // Do not replace with getSession() here — that only reads the (possibly
  // stale/forged-looking) local cookie without server-side verification.
  // Wrapped with timeout to prevent Edge Function hang on network stall.
  let user = null;
  try {
    const { data: { user: authUser } } = await withTimeout(supabase.auth.getUser(), 10_000);
    user = authUser;
  } catch (error) {
    if (error instanceof ActionTimeoutError) {
      // Timeout during auth refresh: fail-safe by treating as unauthenticated
      // for the purpose of route gating. The session cookie is still set if
      // it was already valid, so the request continues; if it was expired,
      // we'll let the route handler catch it with requireRole().
      user = null;
    } else {
      throw error;
    }
  }

  const { pathname } = request.nextUrl;
  const isPrivateRoute = PRIVATE_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnlyRoute = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (isPrivateRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthOnlyRoute && user) {
    // Optimistic only: send them "home" for now, the destination page
    // itself resolves the correct per-role dashboard server-side.
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}
