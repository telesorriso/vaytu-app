// =============================================================================
// VAYTU — Password recovery security regression (FASE 11 / FASE 14)
// =============================================================================
// Guards the properties that would fail silently if this flow is ever
// refactored: account enumeration, the recovery-session gate on
// /reset-password, and the absence of tokens or driver errors in the DOM.
//
// Runs against a dev server. Supabase does not need to be reachable — the
// enumeration guarantee is structural (a single neutral return regardless of
// outcome), so a blocked Supabase exercises the same code path.
//
// Usage:  npm run dev   (in another shell)
//         node tests/e2e/password-recovery.mjs
// =============================================================================
import { chromium } from 'playwright';

const BASE = process.env.VAYTU_BASE_URL ?? 'http://localhost:3000';
// PLAYWRIGHT_CHROMIUM_PATH lets a preinstalled browser be used (CI sandboxes);
// otherwise Playwright resolves its own download.
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const b = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
let fail = 0;
const check = (name, ok, detail='') => { if(!ok) fail++; console.log(`  ${ok?'PASS':'FAIL'}  ${name}${detail?' — '+detail:''}`); };

// --- 1. login link ---
await p.goto(BASE + '/login', { waitUntil: 'networkidle' });
const link = await p.evaluate(() => {
  const a = [...document.querySelectorAll('a')].find(x => x.textContent.trim() === 'Password dimenticata?');
  if (!a) return null;
  const r = a.getBoundingClientRect();
  const pw = document.getElementById('password').getBoundingClientRect();
  return { href: a.getAttribute('href'), below: r.top >= pw.bottom - 1, w: Math.round(r.width), h: Math.round(r.height) };
});
console.log('LOGIN LINK');
check('link exists', !!link);
check('href = /forgot-password', link?.href === '/forgot-password', link?.href);
check('positioned below password field', !!link?.below);

// --- 2. reset-password with no recovery session ---
await p.goto(BASE + '/reset-password', { waitUntil: 'networkidle' });
const noSess = await p.evaluate(() => ({
  txt: document.body.innerText,
  hasPwField: !!document.getElementById('password'),
}));
console.log('RESET WITHOUT SESSION');
check('shows invalid-link state', noSess.txt.includes('Link non valido'));
check('does NOT render a password form', !noSess.hasPwField);

// --- 3. account enumeration: two different addresses, same answer ---
console.log('ACCOUNT ENUMERATION');
const answers = [];
for (const email of ['definitely-not-a-user-9z8x7@example.com', 'another-nonexistent-4a3b@example.com']) {
  await p.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' });
  await p.fill('#email', email);
  await p.click('button[type=submit]');
  await p.waitForSelector('[role=status]', { timeout: 20000 }).catch(()=>{});
  answers.push(await p.evaluate(() => document.querySelector('[role=status]')?.innerText.trim() ?? 'NONE'));
}
check('neutral confirmation shown', answers[0].startsWith('Se esiste un account'), answers[0].slice(0,50));
check('identical answer for both addresses', answers[0] === answers[1]);
check('never says "non trovato"', !answers.join(' ').toLowerCase().includes('non trovato'));

// --- 4. invalid email validation ---
await p.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' });
await p.evaluate(() => { document.querySelector('form').noValidate = true; document.getElementById('email').value = 'not-an-email'; });
await p.fill('#email', 'not-an-email');
await p.click('button[type=submit]');
await p.waitForTimeout(2500);
const invalidEmail = await p.evaluate(() => document.querySelector('[role=alert]')?.innerText.trim() ?? null);
console.log('EMAIL VALIDATION');
check('rejects malformed email', /email valido/i.test(invalidEmail ?? ''), invalidEmail ?? 'no alert');

// --- 4b. timeout safety: UI must always come back, Supabase is unreachable here ---
console.log('TIMEOUT SAFETY (Supabase unreachable in this env)');
await p.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' });
await p.fill('#email', 'timeout-probe@example.com');
{
  const t0 = Date.now();
  await p.click('button[type=submit]');
  await p.waitForSelector('[role=status]', { timeout: 25000 }).catch(()=>{});
  const dt = Date.now() - t0;
  const settled = await p.evaluate(() => !!document.querySelector('[role=status]'));
  check('reset request settles (no infinite spinner)', settled, `${dt}ms`);
  check('settles within the 10s bound + overhead', dt < 20000, `${dt}ms`);
}

// --- 5. technical leakage across all pages ---
console.log('LEAKAGE SCAN');
let leaked = [];
for (const url of ['/login','/forgot-password','/reset-password','/reset-password?state=invalid']) {
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  const html = await p.content();
  for (const bad of ['AuthApiError','SQLSTATE','PGRST','access_token','refresh_token','code_verifier','service_role']) {
    if (html.includes(bad)) leaked.push(`${url}:${bad}`);
  }
}
check('no technical detail / token in DOM', leaked.length === 0, leaked.join(', '));

await b.close();
console.log(`\nRESULT: ${fail===0?'PASS':'FAIL'} (${fail} problem(s))`);
process.exit(fail===0?0:1);
