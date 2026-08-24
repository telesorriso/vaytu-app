// =============================================================================
// VAYTU — Dynamic route `params` contract guard
// =============================================================================
// Next.js 16.3.2 (this repo's pinned version, per AGENTS.md) always passes a
// dynamic route's `params` prop as a Promise at runtime. A page typed with
// the pre-16 synchronous shape (`params: { id: string }`) still compiles —
// TypeScript never validates a declared type against what actually arrives
// at runtime — but every synchronous `params.<field>` access on that real
// Promise silently evaluates to `undefined`, breaking the route in a way
// nothing except a live click-through would catch (see PR #13 and this
// PR's fix for the five other routes that shipped with the same defect).
//
// This is a static string-level guard, not a TS parser: it flags any
// `page.tsx` under a `[...]` dynamic segment whose declared `params` type is
// a plain object literal (`params: { ... }`) instead of a `Promise<{ ... }>`.
// That single pattern was the actual defect in all six affected files, so a
// cheap regex check is enough to keep it from coming back.
//
// Usage: node tests/unit/dynamic-params-contract.mjs
// =============================================================================
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const appDir = join(root, 'app');
let failures = 0;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === 'page.tsx') out.push(full);
  }
  return out;
}

// Only page.tsx files that sit under at least one `[segment]` directory are
// dynamic routes and actually receive a `params` Promise.
const dynamicPages = walk(appDir).filter((f) => /\[[^[\]]+\]/.test(f));

console.log(`--- ${dynamicPages.length} dynamic route page.tsx file(s) found ---`);

for (const file of dynamicPages) {
  const rel = relative(root, file);
  const src = readFileSync(file, 'utf8');

  if (!/\bparams\b/.test(src)) {
    // Some dynamic pages don't read params at all (e.g. only use a sibling
    // segment); nothing to check.
    continue;
  }

  // The broken pattern: `params: { ... }` as a type — a plain object
  // literal, not `Promise<{ ... }>`. A tolerant-enough match: `params:`
  // immediately followed (ignoring whitespace) by `{`, never by `Promise<`.
  const badSync = /params\s*:\s*\{/.test(src);
  const usesPromise = /params\s*:\s*Promise\s*</.test(src);

  const ok = !badSync && usesPromise;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${rel}`);
  if (!ok) {
    failures++;
    if (badSync) {
      console.log(
        `         -> declares params as a synchronous object type; must be Promise<{ ... }> on Next.js 16`
      );
    } else if (!usesPromise) {
      console.log(`         -> no Promise<{ ... }> params type found`);
    }
  }
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} problem(s))`);
process.exit(failures === 0 ? 0 : 1);
