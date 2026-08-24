// =============================================================================
// VAYTU — redirect()/permanentRedirect()/notFound() control-flow guard
// =============================================================================
// Next.js throws a special internal error for redirect(), permanentRedirect()
// and notFound() (see node_modules/next/dist/docs/01-app/02-guides/redirecting.md:
// "redirect throws an error so it should be called outside the try block when
// using try/catch statements"). A generic `catch` wrapping one of these calls
// swallows that throw and reports it as a normal error instead of letting the
// navigation happen — this shipped twice (app/creator/experiences/[id]/
// actions.ts, then app/business/(app)/experiences/actions.ts) before either
// was noticed, because it only breaks the SUCCESS path and every automated
// check up to typecheck/lint/build is blind to it.
//
// This is a brace-depth scanner, not a real parser (same philosophy as
// tests/unit/dynamic-params-contract.mjs — cheap and specific, not exhaustive):
// it walks each file character by character, skips over string/template/
// comment content, and tracks which `{ ... }` blocks were opened by `try`.
// Any redirect(/permanentRedirect(/notFound( call found while at least one
// enclosing block is a `try` block is flagged.
//
// Usage: node tests/unit/control-flow-contract.mjs
// =============================================================================
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
let failures = 0;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const CONTROL_FLOW_CALLS = ['redirect(', 'permanentRedirect(', 'notFound('];

/**
 * Scans one file's source for CONTROL_FLOW_CALLS occurring inside a `try {}`
 * block. Returns an array of { call, line } violations.
 */
function findViolations(src) {
  const violations = [];
  // Stack of booleans: true = this block was opened by `try`.
  const blockStack = [];
  let i = 0;
  const n = src.length;
  let line = 1;

  function precedingKeywordIsTry(pos) {
    // Walk backward from pos (which points just before the `{`) over
    // whitespace, then check if the preceding word is exactly "try".
    let j = pos - 1;
    while (j >= 0 && /\s/.test(src[j])) j--;
    let end = j + 1;
    while (j >= 0 && /[a-zA-Z]/.test(src[j])) j--;
    const word = src.slice(j + 1, end);
    return word === 'try';
  }

  while (i < n) {
    const ch = src[i];

    if (ch === '\n') {
      line++;
      i++;
      continue;
    }

    // Skip line comments.
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // Skip block comments.
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }

    // Skip string literals ('...', "...", `...`), honoring backslash escapes.
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') i++;
        else if (src[i] === '\n') line++;
        i++;
      }
      i++;
      continue;
    }

    if (ch === '{') {
      blockStack.push(precedingKeywordIsTry(i));
      i++;
      continue;
    }

    if (ch === '}') {
      blockStack.pop();
      i++;
      continue;
    }

    for (const call of CONTROL_FLOW_CALLS) {
      if (src.startsWith(call, i)) {
        // A word-boundary check on the left so e.g. `myRedirect(` doesn't
        // match, AND excluding a preceding `.` so a member call like
        // `NextResponse.redirect(...)` — a different, non-throwing API —
        // isn't mistaken for next/navigation's redirect().
        const prevChar = i > 0 ? src[i - 1] : '';
        const isWordBoundary = !/[a-zA-Z0-9_$.]/.test(prevChar);
        if (isWordBoundary && blockStack.some(Boolean)) {
          violations.push({ call: call.slice(0, -1), line });
        }
      }
    }

    i++;
  }

  return violations;
}

const files = walk(join(root, 'app'));

console.log(`--- scanning ${files.length} .ts/.tsx file(s) under app/ ---`);

for (const file of files) {
  const rel = relative(root, file);
  const src = readFileSync(file, 'utf8');
  if (!CONTROL_FLOW_CALLS.some((c) => src.includes(c))) continue;

  const violations = findViolations(src);
  if (violations.length === 0) continue;

  failures += violations.length;
  for (const v of violations) {
    console.log(`  FAIL  ${rel}:${v.line} — ${v.call}() called inside a try{} block`);
    console.log(
      `         -> move ${v.call}() outside the try/catch (track success in a local flag) — a catch here would swallow its internal throw`
    );
  }
}

if (failures === 0) {
  console.log('  PASS  no redirect()/permanentRedirect()/notFound() call sits inside a try{} block');
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} problem(s))`);
process.exit(failures === 0 ? 0 : 1);
