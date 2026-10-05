// Test della validazione, dell'email e della Netlify Function (node --test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, normalizePhone, buildLeadEmail, isValidFullName } from '../shared/lead.mjs';

const valid = () => ({
  submission_id: 'abc-123',
  name: 'Mario Rossi',
  phone: '333 123 4567',
  email: 'Mario.Rossi@Example.it',
  answers: { obiettivo: 'affollati', tempistica: 'subito', pagamento: 'si' },
  consents: { privacy: true, marketing: false },
  attribution: {
    utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'ortodonzia', utm_content: 'ad1',
    utm_term: 'allineatori', gclid: 'G-1', fbclid: '', landing_page: 'https://x/?utm_source=google', referrer: '',
  },
  page_url: 'https://x/valutazione/',
  website: '',
  elapsed_ms: 30000,
});

test('normalizePhone', () => {
  assert.equal(normalizePhone('333 123 4567'), '+393331234567');
  assert.equal(normalizePhone('+39 333-123-4567'), '+393331234567');
  assert.equal(normalizePhone('0039 333 1234567'), '+393331234567');
  assert.equal(normalizePhone('06 1234567'), '+39061234567');
  assert.equal(normalizePhone('+41 79 123 45 67'), '+41791234567');
  assert.equal(normalizePhone('12345'), '');
  assert.equal(normalizePhone('abc'), '');
  assert.equal(normalizePhone('+39 999 1234567'), '');
});

test('isValidFullName', () => {
  assert.ok(isValidFullName('Mario Rossi'));
  assert.ok(isValidFullName("Anna Maria D'Angelo"));
  assert.ok(!isValidFullName('Mario'));
  assert.ok(!isValidFullName('<script> x'));
});

test('validateLead accetta un lead valido e normalizza', () => {
  const r = validateLead(valid());
  assert.equal(r.ok, true);
  assert.equal(r.lead.phone, '+393331234567');
  assert.equal(r.lead.email, 'mario.rossi@example.it');
  assert.equal(r.lead.attribution.gclid, 'G-1');
});

test('validateLead rifiuta campi mancanti, risposte inventate e privacy non accettata', () => {
  const b = valid();
  b.name = 'Mario';
  b.phone = '';
  b.email = 'x@';
  b.answers.pagamento = 'gratis';
  b.consents.privacy = false;
  const r = validateLead(b);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['answers', 'email', 'name', 'phone', 'privacy']);
});

test('email: oggetto e sezioni richieste', () => {
  const { lead } = validateLead(valid());
  const { subject, text, html } = buildLeadEmail(lead, new Date('2026-10-05T10:00:00Z'));
  assert.equal(subject, 'NUOVO LEAD TELESORRISO — Mario Rossi');
  for (const s of ['CONTATTI', 'QUALIFICAZIONE', 'ATTRIBUZIONE', 'AZIONE', 'CHIAMARE IL LEAD APPENA POSSIBILE.',
    'Telefono: +39 333 123 4567', 'Cosa vorrebbe migliorare: Denti affollati', 'Quando vorrebbe iniziare: Appena possibile',
    'Interesse per il pagamento da €150 al mese: Sì', 'Sorgente: google', 'GCLID: G-1', 'FBCLID: —', 'Data e ora:']) {
    assert.ok(text.includes(s), `manca "${s}"`);
  }
  assert.ok(html.includes('href="tel:+393331234567"'));
});

test('email: i dati utente vengono escapati in HTML e niente a capo nell’oggetto', () => {
  const b = valid();
  b.name = 'Mario Rossi';
  b.attribution.utm_campaign = '<img src=x onerror=alert(1)>';
  const { lead } = validateLead(b);
  const { html } = buildLeadEmail(lead);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x'));
});

test('funzione: invio, deduplica, honeypot, errori', async () => {
  process.env.LEAD_EMAIL_DRY_RUN = 'true';
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    const { default: handler } = await import('../netlify/functions/lead.mjs');
    const post = (body, ip = '1.1.1.1') =>
      handler(new Request('http://x/api/lead', { method: 'POST', body: JSON.stringify(body) }), { ip });

    let res = await post(valid());
    assert.equal(res.status, 200);
    assert.equal(logs.length, 1);
    assert.ok(logs[0].includes('NUOVO LEAD TELESORRISO — Mario Rossi'));

    // Stesso invio ripetuto (doppio clic / retry): ok ma nessuna seconda email.
    res = await post(valid());
    assert.equal(res.status, 200);
    assert.equal((await res.json()).duplicate, true);
    assert.equal(logs.length, 1);

    // Honeypot compilato: ok silenzioso, nessuna email.
    res = await post({ ...valid(), submission_id: 'hp', phone: '3471111111', website: 'spam' });
    assert.equal(res.status, 200);
    assert.equal(logs.length, 1);

    // Compilazione troppo veloce: ok silenzioso, nessuna email.
    res = await post({ ...valid(), submission_id: 'fast', phone: '3472222222', elapsed_ms: 500 });
    assert.equal(logs.length, 1);

    // Dati non validi: 400 con errori per campo, in italiano.
    res = await post({ ...valid(), submission_id: 'bad', email: 'no' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).fields.email, 'Inserisci un indirizzo email valido.');

    // JSON malformato e metodo errato.
    res = await handler(new Request('http://x/api/lead', { method: 'POST', body: '{' }), { ip: '2.2.2.2' });
    assert.equal(res.status, 400);
    res = await handler(new Request('http://x/api/lead'), { ip: '2.2.2.2' });
    assert.equal(res.status, 405);

    // Limite per IP.
    let last;
    for (let i = 0; i < 7; i++) {
      last = await post({ ...valid(), submission_id: `r${i}`, phone: `34800000${10 + i}` }, '9.9.9.9');
    }
    assert.equal(last.status, 429);

    // Configurazione email mancante: errore generico, nessun dettaglio tecnico.
    delete process.env.LEAD_EMAIL_DRY_RUN;
    const errs = [];
    const origErr = console.error;
    console.error = (...a) => errs.push(a.join(' '));
    res = await post({ ...valid(), submission_id: 'cfg', phone: '3490000000' }, '3.3.3.3');
    console.error = origErr;
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.error, 'Non siamo riusciti a inviare la richiesta. Riprova tra qualche secondo.');
    assert.ok(!JSON.stringify(body).includes('RESEND'));
  } finally {
    console.log = orig;
  }
});
