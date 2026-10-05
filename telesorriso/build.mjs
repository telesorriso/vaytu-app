// =============================================================================
// TELESORRISO — build statica (Node >= 20, nessuna dipendenza)
// =============================================================================
//   src/  ->  dist/
//   - <!-- @include nome -->  sostituito con src/partials/nome.html
//   - %%CSS%%                 CSS incorporato inline (nessuna richiesta bloccante)
//   - %%SITE_URL%% %%PATH%%   URL canonico / Open Graph
//   - %%GTM_ID%%              ID Google Tag Manager (vuoto = nessun tracker)
//   - shared/quiz.mjs         copiato in dist/js/quiz-config.mjs
// Al termine stampa quanti segnaposto [DA ...] restano da completare.
// =============================================================================
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

const SITE_URL = (process.env.SITE_URL || process.env.URL || 'https://www.telesorriso.it').replace(/\/+$/, '');
const GTM_ID = (process.env.GTM_ID || '').trim();

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

let placeholders = 0;
for (const file of await walk(DIST)) {
  if (file.endsWith('.html')) {
    let html = await readFile(file, 'utf8');
    html = html.replace(/<!-- @include (\w+) -->/g, (_, name) => {
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
    if (js.includes('%%GTM_ID%%')) await writeFile(file, js.replaceAll('%%GTM_ID%%', GTM_ID));
  }
}

console.log(`Build completata in dist/  (SITE_URL=${SITE_URL}, GTM_ID=${GTM_ID || 'non impostato: nessun tracker'})`);
if (placeholders) {
  console.warn(`ATTENZIONE: ${placeholders} segnaposto ancora da completare prima della pubblicazione (cerca class="ph" in src/).`);
}
