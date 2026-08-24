// =============================================================================
// VAYTU — Data-layer contract checks (red-team QA regressions)
// =============================================================================
// Four rules whose violations were all shipped to main at some point and were
// invisible to typecheck, lint and the RLS suite, because every one of them
// needs a live Supabase round-trip to surface. These are cheap static guards
// so they cannot come back silently.
//
// Usage: node tests/unit/data-layer-contracts.mjs
// =============================================================================
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const libFiles = walk(join(root, 'lib'));
const appFiles = walk(join(root, 'app'));

// 1. lib/ modules are server-only, never server actions.
//    lib/submissions/data.ts shipped with 'use server', which published six
//    data-access functions as remotely callable endpoints.
console.log("--- lib/ must use `import 'server-only'`, never 'use server' ---");
{
  const offenders = libFiles.filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8')));
  check('no lib module is a server-action module', offenders.length === 0,
    offenders.map((f) => f.replace(root, '')).join(', '));
}

// 2. Any insert into content_submissions must set creator_id and business_id:
//    both are NOT NULL with no default, so omitting them fails every time.
console.log('--- content_submissions inserts supply all NOT NULL columns ---');
{
  const REQUIRED = ['creator_id', 'business_id', 'collaboration_id', 'deliverable_id',
                    'content_url', 'platform'];
  let checked = 0;
  for (const f of [...libFiles, ...appFiles]) {
    const src = readFileSync(f, 'utf8');
    let i = src.indexOf("from('content_submissions')");
    while (i !== -1) {
      const insertAt = src.indexOf('.insert(', i);
      // only consider an .insert() that belongs to this call chain
      if (insertAt !== -1 && insertAt - i < 200) {
        const block = src.slice(insertAt, src.indexOf('})', insertAt) + 2);
        const missing = REQUIRED.filter((c) => !block.includes(`${c}:`));
        check(`${f.replace(root, '')} insert supplies required columns`,
          missing.length === 0, missing.length ? 'missing ' + missing.join(', ') : '');
        checked++;
      }
      i = src.indexOf("from('content_submissions')", i + 1);
    }
  }
  check('at least one content_submissions insert was inspected', checked > 0, `${checked} found`);
}

// 3. No raw Supabase/driver message is returned to a caller. toUserMessage()
//    exists precisely so SQLSTATEs, constraint and policy names stay server-side.
console.log('--- no raw error.message returned to callers ---');
{
  const offenders = [];
  for (const f of [...libFiles, ...appFiles]) {
    if (f.endsWith('lib/actions/errors.ts')) continue; // the mapper itself
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/error:\s*(error|err)\.message/g)) {
      offenders.push(`${f.replace(root, '')}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  check('no raw driver message reaches the UI', offenders.length === 0, offenders.join(', '));
}

// 4. createApplication must not resolve the experience through the
//    business-owner-scoped getExperienceDetail: for a Creator that always
//    returns null, so no application could ever be created.
console.log('--- createApplication resolves a PUBLISHED experience ---');
{
  const src = readFileSync(join(root, 'lib/experiences/data.ts'), 'utf8');
  const fn = src.slice(src.indexOf('export async function createApplication'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  check('does not call getExperienceDetail', !body.includes('getExperienceDetail('));
  check('calls getPublishedExperience', body.includes('getPublishedExperience('));
}

console.log(`\nRESULT: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} problem(s))`);
process.exit(failures === 0 ? 0 : 1);
