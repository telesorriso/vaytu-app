import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/actions/timeout';
import { safeInternalPath } from '@/lib/auth/redirect';

// =============================================================================
// VAYTU — Auth email-link callback
// =============================================================================
// Where Supabase sends the user after they click a link in an auth email
// (today: password recovery).
//
// @supabase/ssr pins flowType: "pkce" and detectSessionInUrl: false on both
// the server and browser client — verified in
// node_modules/@supabase/ssr/dist/main/createServerClient.js, where flowType
// is set AFTER the caller's ...options.auth spread and so cannot be
// overridden. That means the link arrives here as ?code=<pkce code>, and the
// session must be established server-side by exchanging it. No token ever
// reaches client JS, and nothing is written to localStorage by hand.
//
// A Route Handler (not a Server Component) because only Route Handlers and
// Server Actions may set cookies, and the exchange sets the session cookies.
//
// The ?next= parameter is passed through safeInternalPath(), so a crafted
// callback URL cannot turn this into an open redirect.
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const next = safeInternalPath(searchParams.get('next'), '/');

  // Supabase reports a rejected/expired link by redirecting here with
  // error params instead of a code.
  const errorParam = searchParams.get('error') ?? searchParams.get('error_code');

  if (errorParam || !code) {
    if (errorParam) {
      // Key deliberately NOT named `code`: this is Supabase's error slug from
      // the query string, not the PKCE code (which is never logged). Truncated
      // because the whole query string is attacker-supplied.
      console.error('[auth/callback] link rejected by Supabase', {
        errorCode: errorParam.slice(0, 64),
      });
    }
    return NextResponse.redirect(`${origin}/reset-password?state=invalid`);
  }

  const supabase = await createClient();

  try {
    const { error } = await withTimeout(supabase.auth.exchangeCodeForSession(code), 10_000);

    if (error) {
      // Never log the code itself: it is a single-use credential.
      console.error('[auth/callback] code exchange failed', { status: error.status });
      return NextResponse.redirect(`${origin}/reset-password?state=invalid`);
    }
  } catch (err) {
    console.error('[auth/callback] code exchange threw', {
      name: err instanceof Error ? err.name : 'unknown',
    });
    return NextResponse.redirect(`${origin}/reset-password?state=invalid`);
  }

  // Session cookies are set. Redirect so the one-time ?code= leaves the
  // address bar and cannot be re-shared or land in browser history.
  return NextResponse.redirect(`${origin}${next}`);
}
