// =============================================================================
// TELESORRISO — server locale per lo sviluppo (nessuna dipendenza)
// =============================================================================
// Serve dist/ e inoltra POST /api/lead alla stessa Netlify Function usata in
// produzione. Senza RESEND_API_KEY usa LEAD_EMAIL_DRY_RUN=true: l'email viene
// stampata nel terminale invece di essere inviata.
//
//   npm run dev                  -> http://localhost:8888
//   PORT=3000 npm run dev
//   LEAD_FORCE_ERROR=1 npm run dev  -> /api/lead risponde sempre 502 (test errori)
//   npm run build:dragdrop && node scripts/dev-server.mjs
//                                -> versione drag and drop: i POST a Netlify
//                                   Forms vengono simulati e stampati qui
// =============================================================================
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8888);

if (!process.env.RESEND_API_KEY && !process.env.LEAD_EMAIL_DRY_RUN) process.env.LEAD_EMAIL_DRY_RUN = 'true';
const { default: lead } = await import('../netlify/functions/lead.mjs');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveFile(res, path, status = 200) {
  const body = await readFile(path);
  res.writeHead(status, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(body);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/lead') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let response;
    if (process.env.LEAD_FORCE_ERROR) {
      response = Response.json({ ok: false, error: 'Errore simulato.' }, { status: 502 });
    } else {
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      });
      response = await lead(request, { ip: req.socket.remoteAddress });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }

  // Simulazione di Netlify Forms (build --netlify-forms): stampa i campi.
  if (req.method === 'POST' && url.pathname === '/') {
    let body = '';
    for await (const c of req) body += c;
    const fields = new URLSearchParams(body);
    console.log(`[Netlify Forms simulato] modulo "${fields.get('form-name')}"`);
    for (const [k, v] of fields) if (k !== 'form-name') console.log(`  ${k}: ${v}`);
    res.writeHead(process.env.LEAD_FORCE_ERROR ? 500 : 200, { 'content-type': 'text/html' }).end('ok');
    return;
  }

  let path = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!path.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(path);
    if (s.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { location: url.pathname + '/' + url.search }).end();
        return;
      }
      path = join(path, 'index.html');
    }
    await serveFile(res, path);
  } catch {
    await serveFile(res, join(DIST, '404.html'), 404).catch(() => res.writeHead(404).end());
  }
}).listen(PORT, () => {
  console.log(`Telesorriso in locale: http://localhost:${PORT}`);
  console.log(process.env.LEAD_EMAIL_DRY_RUN === 'true' ? 'Email: DRY RUN (stampate qui)' : 'Email: invio reale via Resend');
});
