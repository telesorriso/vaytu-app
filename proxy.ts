// =============================================================================
// VAYTU — Proxy (Next.js 16's renamed middleware file convention)
// =============================================================================
// Session refresh + optimistic route gate only. The authoritative,
// per-role authorization check happens server-side inside each protected
// route (/lib/auth/dal.ts), with RLS as the final backstop. See
// /lib/supabase/proxy.ts for the actual logic and rationale.
// =============================================================================
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and image optimization
     * files, so it doesn't unintentionally block CSS/JS/images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
