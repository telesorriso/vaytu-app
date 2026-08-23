import 'server-only';
import { headers } from 'next/headers';

// =============================================================================
// VAYTU — Safe redirect construction for auth email links
// =============================================================================
// A password-recovery email needs an absolute URL to send the user back to.
// Getting that wrong is an open-redirect: if either the origin or the path can
// be influenced by whoever submits the form, the recovery link in a real
// user's inbox can be pointed at an attacker's site.
//
// Two separate problems, handled separately:
//
// ORIGIN — must be a host we actually own. The request's Host header is
// attacker-controllable, so it is the LAST resort and only for local dev.
// Preference order:
//   1. NEXT_PUBLIC_SITE_URL   — explicit, set by us for production
//   2. DEPLOY_PRIME_URL       — injected by Netlify for a Deploy Preview
//   3. URL                    — injected by Netlify for the main site
//   4. request origin         — localhost / self-hosted dev only
// Supabase additionally rejects any redirectTo outside its own allow-list, so
// this is defence in depth rather than the only control.
//
// PATH — never taken from user input. Callers pass a literal internal path,
// and safeInternalPath() rejects anything that could escape the site
// (protocol-relative "//evil.com", absolute "https://…", or a backslash
// variant that some parsers normalise to a slash).
// =============================================================================

/** Fallback used when nothing else identifies the deployment. */
const LOCAL_ORIGIN = 'http://localhost:3000';

function normaliseOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Absolute origin for this deployment, resolved from trusted configuration
 * before falling back to the (untrusted) request Host.
 */
export async function resolveSiteOrigin(): Promise<string> {
  const configured =
    normaliseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normaliseOrigin(process.env.DEPLOY_PRIME_URL) ??
    normaliseOrigin(process.env.URL);

  if (configured) return configured;

  // Dev fallback. Host is client-supplied, which is exactly why it sits below
  // every configured value above and why the production deployment should
  // always set NEXT_PUBLIC_SITE_URL.
  try {
    const h = await headers();
    const host = h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return normaliseOrigin(`${proto}://${host}`) ?? LOCAL_ORIGIN;
    }
  } catch {
    // No request scope (e.g. called at build time) — fall through.
  }

  return LOCAL_ORIGIN;
}

/**
 * Accepts only a same-site absolute path ("/reset-password"). Returns
 * `fallback` for anything that could leave the site.
 */
export function safeInternalPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  // Must start with exactly one forward slash. This rejects "//evil.com"
  // (protocol-relative), "https://evil.com", and "/\evil.com" / "\\evil.com",
  // which some URL parsers treat as protocol-relative.
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  if (candidate.includes('\\')) return fallback;
  return candidate;
}

/** Absolute URL for an auth email link. `path` must be a literal, never user input. */
export async function absoluteUrl(path: string): Promise<string> {
  const origin = await resolveSiteOrigin();
  return `${origin}${safeInternalPath(path, '/')}`;
}
