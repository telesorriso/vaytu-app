// =============================================================================
// VAYTU — safeInternalPath open-redirect tests (FASE 11 / FASE 14)
// =============================================================================
// safeInternalPath() is the only thing standing between the ?next= parameter
// on /auth/callback and an open redirect: a crafted recovery callback URL
// must never bounce the user off-site. These are the payloads that actually
// get used against redirect allow-lists.
//
// The function is re-implemented here rather than imported because
// lib/auth/redirect.ts carries `import 'server-only'`, which refuses to load
// outside a Next.js server runtime. The body below is kept byte-identical to
// the shipped one; the guard test at the bottom fails if they drift apart.
//
// Usage: node tests/unit/redirect-safety.mjs
// =============================================================================
import { readFileSync } from 'node:fs';

function safeInternalPath(candidate, fallback = '/') {
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  if (candidate.includes('\\')) return fallback;
  return candidate;
}

const MUST_REJECT = [
  '//evil.com',
  '//evil.com/path',
  '///evil.com',
  '/\\evil.com',
  '\\\\evil.com',
  '/path\\..\\evil',
  'https://evil.com',
  'http://evil.com',
  '//google.com/%2f..',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'evil.com',
  '',
  null,
  undefined,
];

const MUST_ACCEPT = [
  '/reset-password',
  '/',
  '/creator/collaborazioni',
  '/business/dashboard?tab=1',
];

let failures = 0;
console.log('--- must be rejected (fall back to "/") ---');
for (const payload of MUST_REJECT) {
  const got = safeInternalPath(payload, '/');
  const ok = got === '/';
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(payload)} -> ${JSON.stringify(got)}`);
}

console.log('--- must be accepted unchanged ---');
for (const payload of MUST_ACCEPT) {
  const got = safeInternalPath(payload, '/');
  const ok = got === payload;
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(payload)} -> ${JSON.stringify(got)}`);
}

// Drift guard: the copy above must still match the shipped implementation.
console.log('--- implementation drift guard ---');
const src = readFileSync(new URL('../../lib/auth/redirect.ts', import.meta.url), 'utf8');
const shipped = src.slice(src.indexOf('export function safeInternalPath'));
const CHECKS = [
  "if (!candidate) return fallback;",
  "if (!candidate.startsWith('/')) return fallback;",
  "if (candidate.startsWith('//') || candidate.startsWith('/\\\\')) return fallback;",
  "if (candidate.includes('\\\\')) return fallback;",
];
for (const line of CHECKS) {
  const ok = shipped.includes(line);
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  shipped contains: ${line}`);
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} problem(s))`);
process.exit(failures === 0 ? 0 : 1);
