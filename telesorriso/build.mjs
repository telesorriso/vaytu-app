// =============================================================================
// TELESORRISO — build statica (Node >= 20, nessuna dipendenza)
// =============================================================================
//   src/  ->  dist/
//   - <!-- @include nome -->  sostituito con src/partials/nome.html
//   - %%CSS%%                 CSS incorporato inline (nessuna richiesta bloccante)
//   - %%SITE_URL%% %%PATH%%   URL canonico / Open Graph
//   - %%GTM_ID%%              ID Google Tag Manager (vuoto = nessun tracker)
//   - shared/quiz.mjs         copiato in dist/js/quiz-config.mjs
//
// `node build.mjs --netlify-forms` produce la versione DRAG AND DROP: il modulo
// invia a Netlify Forms invece che alla funzione /api/lead, e header/redirect
// vengono scritti in dist/_headers e dist/_redirects (netlify.toml non viene
// letto nei deploy drag and drop).
// Al termine stampa quanti segnaposto [DA ...] restano da completare.
// =============================================================================
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NETLIFY_FORM_NAME, NETLIFY_FORM_FIELDS } from './shared/quiz.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const SITE_URL = (process.env.SITE_URL || process.env.URL || 'https://www.telesorriso.it').replace(/\/+$/, '');
const GTM_ID = (process.env.GTM_ID || '').trim();
const NETLIFY_FORMS = process.argv.includes('--netlify-forms');
const LEAD_MODE = NETLIFY_FORMS ? 'netlify-forms' : 'function';

if (GTM_ID && !/^GTM-[A-Z0-9]+$/.test(GTM_ID)) {
  console.error(`GTM_ID non valido: "${GTM_ID}" (formato atteso: GTM-XXXXXXX)`);
  process.exit(1);
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

function pagePath(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html' || rel === '404.html') return '/';
  return '/' + rel.replace(/index\.html$/, '');
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(SRC, DIST, {
  recursive: true,
  filter: (p) => !p.startsWith(join(SRC, 'partials')) && !p.startsWith(join(SRC, 'css')),
});
await cp(join(ROOT, 'shared', 'quiz.mjs'), join(DIST, 'js', 'quiz-config.mjs'));

const css = minifyCss(await readFile(join(SRC, 'css', 'style.css'), 'utf8'));
const partials = {};
for (const f of await readdir(join(SRC, 'partials'))) {
  partials[f.replace(/\.html$/, '')] = (await readFile(join(SRC, 'partials', f), 'utf8')).trim();
}

// Modulo statico nascosto: serve solo a far rilevare a Netlify il modulo e i
// suoi campi al momento del deploy. L'invio vero avviene via JavaScript.
partials['netlify-form'] = NETLIFY_FORMS
  ? `<form name="${NETLIFY_FORM_NAME}" data-netlify="true" netlify-honeypot="website" hidden>
    <input type="hidden" name="form-name" value="${NETLIFY_FORM_NAME}">
    <input type="text" name="website">
${NETLIFY_FORM_FIELDS.map((f) => `    <input type="hidden" name="${f}">`).join('\n')}
  </form>`
  : '';

let placeholders = 0;
for (const file of await walk(DIST)) {
  if (file.endsWith('.html')) {
    let html = await readFile(file, 'utf8');
    html = html.replace(/<!-- @include ([\w-]+) -->/g, (_, name) => {
      if (!(name in partials)) throw new Error(`Parziale mancante: ${name} (in ${file})`);
      return partials[name];
    });
    html = html
      .replaceAll('%%CSS%%', css)
      .replaceAll('%%SITE_URL%%', SITE_URL)
      .replaceAll('%%PATH%%', pagePath(file));
    placeholders += (html.match(/class="ph"/g) || []).length;
    await writeFile(file, html);
  } else if (file.endsWith('.mjs')) {
    const js = await readFile(file, 'utf8');
    if (js.includes('%%')) {
      await writeFile(file, js.replaceAll('%%GTM_ID%%', GTM_ID).replaceAll('%%LEAD_MODE%%', LEAD_MODE));
    }
  }
}

if (NETLIFY_FORMS) {
  await writeFile(
    join(DIST, '_headers'),
    `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
/img/*
  Cache-Control: public, max-age=604800
`
  );
  await writeFile(join(DIST, '_redirects'), '/valutazione  /valutazione/  301\n');
}

console.log(`Modalità invio lead: ${LEAD_MODE === 'netlify-forms' ? 'Netlify Forms (drag and drop)' : 'Netlify Function /api/lead'}`);
console.log(`Build completata in dist/  (SITE_URL=${SITE_URL}, GTM_ID=${GTM_ID || 'non impostato: nessun tracker'})`);
if (placeholders) {
  console.warn(`ATTENZIONE: ${placeholders} segnaposto ancora da completare prima della pubblicazione (cerca class="ph" in src/).`);
}
