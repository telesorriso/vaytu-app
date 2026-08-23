// =============================================================================
// VAYTU — Anonymous access regression (FASE 16)
// =============================================================================
// Asserts the guard layer over every core route: public routes render, and
// every private route bounces an unauthenticated visitor to /login.
//
// This is the only end-to-end assertion available in an environment where
// *.supabase.co is unreachable (the sandbox egress policy blocks it), because
// no session can be established. It still catches the regressions that matter
// most for a route reshuffle: a page accidentally left outside a guarded
// layout, a route group that stopped applying its layout, or a deleted route
// quietly resurrected.
//
// Usage:  npm run dev   (in another shell)
//         node tests/e2e/anonymous-access.mjs
// =============================================================================

const BASE = process.env.VAYTU_BASE_URL ?? 'http://localhost:3000';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

// Anonymous requests to these must redirect. NOTE: this includes paths whose
// route file does not exist (e.g. /creator/messaggi, removed in FASE 9):
// proxy.ts matches the /creator prefix and redirects before Next.js resolves
// the route, so a deleted private path still answers 307, not 404. Route
// deletion is verified by the build manifest, not here.
const PRIVATE_ROUTES = [
  '/creator',
  '/creator/candidature',
  '/creator/collaborazioni',
  '/creator/collaborazioni/00000000-0000-0000-0000-000000000000',
  '/creator/profilo',
  '/creator/notifiche',
  '/creator/experiences/00000000-0000-0000-0000-000000000000',
  '/creator/onboarding',
  '/creator/onboarding/identita',
  '/creator/onboarding/localita',
  '/creator/onboarding/social',
  '/creator/onboarding/evidence',
  '/creator/onboarding/portfolio',
  '/creator/onboarding/riepilogo',
  '/creator/onboarding/status',
  '/business',
  '/business/dashboard',
  '/business/profilo',
  '/business/experiences',
  '/business/experiences/create',
  '/business/experiences/00000000-0000-0000-0000-000000000000',
  '/business/experiences/00000000-0000-0000-0000-000000000000/report',
  '/business/applications',
  '/business/collaborations',
  '/business/notifiche',
  '/business/onboarding',
  '/business/onboarding/identita',
  '/business/onboarding/status',
  '/admin',
  '/admin/creators',
  '/admin/business',
];

// Paths that must not resolve to a page for anyone. Only unguarded prefixes
// can be asserted here, for the proxy reason explained above.
const REMOVED_ROUTES = ['/qa-harness'];

let failures = 0;

async function status(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return res.status;
}

function check(label, path, actual, ok) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${path} -> ${actual}   ${label}`);
}

console.log('--- public routes (expect 200) ---');
for (const path of PUBLIC_ROUTES) {
  const s = await status(path);
  check('renders for anonymous', path, s, s === 200);
}

console.log('--- private routes (expect 307/302 to login) ---');
for (const path of PRIVATE_ROUTES) {
  const s = await status(path);
  check('redirects anonymous', path, s, s === 307 || s === 302);
}

console.log('--- removed routes (expect 404) ---');
for (const path of REMOVED_ROUTES) {
  const s = await status(path);
  check('not routable', path, s, s === 404);
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} problem(s))`);
process.exit(failures === 0 ? 0 : 1);
