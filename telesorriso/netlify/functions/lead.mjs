// =============================================================================
// TELESORRISO — POST /api/lead
// =============================================================================
// Riceve il lead dal questionario, lo valida e invia la notifica email alla
// segreteria tramite l'API HTTP di Resend (nessuna dipendenza npm).
//
// Variabili d'ambiente (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY           chiave API Resend (SEGRETA, mai lato client)
//   LEAD_NOTIFICATION_EMAIL  destinatario/i, separati da virgola
//   LEAD_FROM_EMAIL          mittente su dominio verificato in Resend,
//                            es. "Telesorriso <lead@telesorriso.it>"
//   LEAD_EMAIL_DRY_RUN       "true" = non invia, stampa l'email nei log
//                            (solo per test locali / anteprime)
//
// Anti-spam leggero: honeypot, tempo minimo di compilazione, limite di invii
// per IP e deduplica degli invii ripetuti. Limite e deduplica sono in memoria
// per singola istanza della funzione: bloccano doppi clic, retry e raffiche
// ravvicinate, non un attacco distribuito.
// =============================================================================
import { validateLead, buildLeadEmail } from '../../shared/lead.mjs';

export const config = { path: '/api/lead' };

const MAX_BODY_BYTES = 10_000;
const MIN_FILL_MS = 3_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;
const DEDUPE_MS = 10 * 60_000;

const hitsByIp = new Map(); // ip -> [timestamp, ...]
const recent = new Map(); // chiave (id invio / telefono) -> timestamp

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function prune(now) {
  for (const [k, t] of recent) if (now - t > DEDUPE_MS) recent.delete(k);
  for (const [ip, list] of hitsByIp) {
    const kept = list.filter((t) => now - t < RATE_WINDOW_MS);
    if (kept.length) hitsByIp.set(ip, kept);
    else hitsByIp.delete(ip);
  }
}

async function sendEmail({ subject, text, html }, replyTo) {
  const env = process.env;
  const to = (env.LEAD_NOTIFICATION_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (env.LEAD_EMAIL_DRY_RUN === 'true') {
    console.log(`[lead] DRY RUN — email non inviata a ${to.join(', ') || '(nessun destinatario)'}\n${subject}\n\n${text}`);
    return true;
  }
  if (!env.RESEND_API_KEY || !env.LEAD_FROM_EMAIL || !to.length) {
    console.error('[lead] configurazione email mancante: RESEND_API_KEY, LEAD_FROM_EMAIL o LEAD_NOTIFICATION_EMAIL');
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: env.LEAD_FROM_EMAIL, to, subject, text, html, reply_to: replyTo }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Si registra solo lo stato, non il corpo: niente dati personali nei log.
    console.error(`[lead] invio email fallito: HTTP ${res.status}`);
    return false;
  }
  return true;
}

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'Metodo non consentito.' });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'Richiesta troppo grande.' });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'Richiesta non valida.' });
  }

  // Honeypot compilato o compilazione troppo veloce per un essere umano:
  // si risponde "ok" senza inviare nulla, per non dare indizi ai bot.
  if (body.website || (typeof body.elapsed_ms === 'number' && body.elapsed_ms < MIN_FILL_MS)) {
    return json(200, { ok: true });
  }

  const now = Date.now();
  prune(now);

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const hits = hitsByIp.get(ip) || [];
  if (hits.length >= RATE_MAX) {
    return json(429, {
      ok: false,
      error: 'Hai già inviato diverse richieste. Riprova tra qualche minuto.',
    });
  }

  const result = validateLead(body);
  if (!result.ok) {
    return json(400, { ok: false, error: 'Controlla i dati inseriti.', fields: result.errors });
  }
  const { lead } = result;

  // Deduplica: stesso invio ripetuto (retry, doppio clic) o stesso numero
  // appena inviato. La segreteria riceve una sola email.
  const keys = [lead.submissionId && `id:${lead.submissionId}`, `tel:${lead.phone}`].filter(Boolean);
  if (keys.some((k) => recent.has(k))) {
    return json(200, { ok: true, duplicate: true });
  }

  hitsByIp.set(ip, [...hits, now]);

  let sent = false;
  try {
    sent = await sendEmail(buildLeadEmail(lead, new Date(now)), lead.email);
  } catch (err) {
    console.error(`[lead] errore durante l'invio: ${err?.name || 'Error'}`);
  }
  if (!sent) {
    return json(502, { ok: false, error: 'Non siamo riusciti a inviare la richiesta. Riprova tra qualche secondo.' });
  }

  for (const k of keys) recent.set(k, now);
  return json(200, { ok: true });
}
