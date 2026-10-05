// =============================================================================
// TELESORRISO — Validazione del lead e testo dell'email (lato server)
// =============================================================================
// Funzioni pure, senza I/O: usate dalla Netlify Function `lead` e dai test.
// I messaggi di errore sono in italiano perché vengono mostrati all'utente.
// =============================================================================
import { QUESTIONS, ATTRIBUTION_KEYS } from './quiz.mjs';

const MAX_TEXT = 300;
const MAX_URL = 2000;

/** Stringa ripulita: niente caratteri di controllo, spazi compattati, tagliata. */
export function clean(value, max = MAX_TEXT) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Normalizza un numero di telefono in formato internazionale (+39...).
 * Accetta "333 123 4567", "+39 333...", "0039 333...", "06 1234567".
 * Restituisce '' se il numero non è plausibile.
 */
export function normalizePhone(raw) {
  let x = clean(raw, 40).replace(/[\s.\-()/]/g, '');
  if (x.startsWith('00')) x = '+' + x.slice(2);
  if (!x.startsWith('+')) {
    // Numeri italiani senza prefisso: cellulari (3xx) e fissi (0x).
    if (/^[03]\d{5,10}$/.test(x)) x = '+39' + x;
    else return '';
  }
  if (!/^\+\d{8,15}$/.test(x)) return '';
  // Un numero italiano ha 6-11 cifre dopo il +39.
  if (x.startsWith('+39') && !/^\+39[03]\d{5,10}$/.test(x)) return '';
  return x;
}

export function isValidEmail(raw) {
  const v = clean(raw, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Nome e cognome: almeno due parole, solo lettere/apostrofi/trattini. */
export function isValidFullName(raw) {
  const v = clean(raw, 100);
  if (v.length < 4) return false;
  const parts = v.split(' ').filter(Boolean);
  if (parts.length < 2) return false;
  return /^[\p{L}][\p{L}' .\-’]*$/u.test(v);
}

/**
 * Valida il payload inviato dal browser.
 * Restituisce { ok: true, lead } oppure { ok: false, errors: { campo: messaggio } }.
 */
export function validateLead(body) {
  const errors = {};
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: { form: 'Richiesta non valida.' } };
  }

  const name = clean(body.name, 100);
  const phone = normalizePhone(body.phone);
  const email = clean(body.email, 254).toLowerCase();

  if (!isValidFullName(name)) errors.name = 'Inserisci nome e cognome.';
  if (!phone) errors.phone = 'Inserisci un numero di telefono valido.';
  if (!isValidEmail(email)) errors.email = 'Inserisci un indirizzo email valido.';

  const answers = {};
  const rawAnswers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.id === rawAnswers[q.id]);
    if (!opt) errors.answers = 'Rispondi a tutte le domande del questionario.';
    else answers[q.id] = opt.id;
  }

  const consents = body.consents && typeof body.consents === 'object' ? body.consents : {};
  if (consents.privacy !== true) {
    errors.privacy = 'Per inviare la richiesta conferma di aver letto l’informativa privacy.';
  }

  const rawAttr = body.attribution && typeof body.attribution === 'object' ? body.attribution : {};
  const attribution = {};
  for (const key of ATTRIBUTION_KEYS) attribution[key] = clean(rawAttr[key], MAX_TEXT);
  attribution.landing_page = clean(rawAttr.landing_page, MAX_URL);
  attribution.referrer = clean(rawAttr.referrer, MAX_URL);

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      submissionId: clean(body.submission_id, 64),
      name,
      phone,
      email,
      answers,
      consents: { privacy: true, marketing: consents.marketing === true },
      attribution,
      pageUrl: clean(body.page_url, MAX_URL),
    },
  };
}

/** Etichetta leggibile di una risposta, a partire dagli id. */
export function answerLabel(questionId, optionId) {
  const q = QUESTIONS.find((x) => x.id === questionId);
  const o = q && q.options.find((x) => x.id === optionId);
  return o ? o.label : '—';
}

export function formatRomeDate(date) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

/** "+393331234567" -> "+39 333 123 4567" (solo per leggibilità nell'email). */
export function prettyPhone(phone) {
  const m = /^\+39(3\d{2})(\d{3})(\d{3,5})$/.exec(phone);
  return m ? `+39 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Costruisce oggetto, testo e HTML dell'email per la segreteria. */
export function buildLeadEmail(lead, receivedAt = new Date()) {
  const v = (x) => (x ? x : '—');
  const a = lead.attribution;

  const sections = [
    {
      title: 'CONTATTI',
      rows: [
        ['Nome', lead.name],
        ['Telefono', prettyPhone(lead.phone)],
        ['Email', lead.email],
      ],
    },
    {
      title: 'QUALIFICAZIONE',
      rows: QUESTIONS.map((q) => [q.emailLabel, answerLabel(q.id, lead.answers[q.id])]),
    },
    {
      title: 'ATTRIBUZIONE',
      rows: [
        ['Sorgente', v(a.utm_source)],
        ['Mezzo', v(a.utm_medium)],
        ['Campagna', v(a.utm_campaign)],
        ['Contenuto', v(a.utm_content)],
        ['Termine', v(a.utm_term)],
        ['GCLID', v(a.gclid)],
        ['FBCLID', v(a.fbclid)],
        ['Landing page', v(a.landing_page)],
        ['Referrer', v(a.referrer)],
        ['Pagina di invio', v(lead.pageUrl)],
        ['Data e ora', formatRomeDate(receivedAt)],
      ],
    },
    {
      title: 'CONSENSI',
      rows: [
        ['Presa visione informativa privacy', 'Sì'],
        ['Consenso marketing (facoltativo)', lead.consents.marketing ? 'Sì' : 'No'],
        ['ID richiesta', v(lead.submissionId)],
      ],
    },
  ];

  const subject = `NUOVO LEAD TELESORRISO — ${lead.name}`.replace(/[\r\n]+/g, ' ');

  const text = [
    'NUOVO LEAD TELESORRISO',
    '',
    ...sections.flatMap((s) => [s.title, '', ...s.rows.map(([k, val]) => `${k}: ${val}`), '']),
    'AZIONE',
    '',
    'CHIAMARE IL LEAD APPENA POSSIBILE.',
    '',
  ].join('\n');

  const rowHtml = ([k, val]) => {
    let cell = escapeHtml(val);
    if (k === 'Telefono') cell = `<a href="tel:${escapeHtml(lead.phone)}">${cell}</a>`;
    if (k === 'Email') cell = `<a href="mailto:${escapeHtml(lead.email)}">${cell}</a>`;
    return `<tr><td style="padding:4px 12px 4px 0;color:#5b6579;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0;color:#13213c;word-break:break-all">${cell}</td></tr>`;
  };

  const html = `<!doctype html><html lang="it"><body style="margin:0;padding:24px;background:#f5f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#13213c">NUOVO LEAD TELESORRISO</h1>
${sections
  .map(
    (s) =>
      `<h2 style="margin:20px 0 8px;font-size:13px;letter-spacing:.08em;color:#0a6e61">${s.title}</h2><table role="presentation" style="border-collapse:collapse;width:100%">${s.rows.map(rowHtml).join('')}</table>`
  )
  .join('\n')}
<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:.08em;color:#0a6e61">AZIONE</h2>
<p style="margin:0;padding:12px 16px;background:#13213c;color:#fff;border-radius:8px;font-weight:700">CHIAMARE IL LEAD APPENA POSSIBILE.</p>
</div></body></html>`;

  return { subject, text, html };
}
