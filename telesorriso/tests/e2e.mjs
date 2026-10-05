// =============================================================================
// TELESORRISO — test end-to-end del funnel (browser reale, Playwright)
// =============================================================================
// Prerequisiti: server locale avviato (`npm run dev`) e Playwright disponibile:
//   npm i --no-save playwright && node tests/e2e.mjs
// Variabili: BASE_URL (default http://localhost:8888), SHOTS (cartella per gli
// screenshot, opzionale), CHROMIUM_PATH (eseguibile Chromium, opzionale).
// =============================================================================
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://localhost:8888';
const SHOTS = process.env.SHOTS || '';
const UTM = 'utm_source=google&utm_medium=cpc&utm_campaign=ortodonzia_test&utm_content=annuncio_a&utm_term=allineatori&gclid=TEST-GCLID-123';

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
if (SHOTS) await mkdir(SHOTS, { recursive: true });

// L'invio del lead va a /api/lead (versione con funzione) oppure, nella
// versione drag and drop, a Netlify Forms con un POST su "/".
const isLeadUrl = (url) => url.pathname === '/api/lead' || url.pathname === '/';
const isLeadRequest = (r) => r.method() === 'POST' && isLeadUrl(new URL(r.url()));
/** Corpo dell'invio ricondotto a un'unica forma, qualunque sia la modalità. */
function parseLead(r) {
  const raw = r.postData();
  if (new URL(r.url()).pathname === '/api/lead') {
    const p = JSON.parse(raw);
    return { ...p.attribution, answers: p.answers, marketing: p.consents.marketing, mode: 'function' };
  }
  const f = new URLSearchParams(raw);
  return {
    utm_source: f.get('sorgente'), utm_medium: f.get('mezzo'), utm_campaign: f.get('campagna'),
    utm_content: f.get('contenuto'), utm_term: f.get('termine'), gclid: f.get('gclid'),
    landing_page: f.get('landing-page'), referrer: f.get('referrer'),
    answers: {
      obiettivo: f.get('cosa-vorrebbe-migliorare'),
      tempistica: f.get('quando-vorrebbe-iniziare'),
      pagamento: f.get('interesse-pagamento-150-al-mese'),
    },
    marketing: f.get('consenso-marketing') === 'Sì',
    subject: f.get('subject'), formName: f.get('form-name'), nome: f.get('nome'), telefono: f.get('telefono'),
    mode: 'netlify-forms',
  };
}
/** Intercetta solo i POST di invio; il resto (es. GET della landing) prosegue. */
async function routeLead(page, handler) {
  await page.route(isLeadUrl, (route) => (route.request().method() === 'POST' ? handler(route) : route.fallback()));
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['OK  ', name]);
  } catch (err) {
    results.push(['FAIL', `${name}\n      ${err.message.split('\n').slice(0, 6).join(' ')}`]);
  }
}

function iphone(width, height) {
  return browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'it-IT',
  });
}

async function events(page) {
  return page.evaluate(() => window.dataLayer.filter((e) => e && e.event).map((e) => e.event));
}

async function answerAll(page) {
  await page.getByRole('button', { name: 'Denti affollati' }).click();
  await page.getByRole('heading', { name: 'Quando vorresti iniziare?' }).waitFor();
  await page.getByRole('button', { name: 'Entro 1 mese' }).click();
  await page.getByRole('heading', { name: /pagamento da €150/ }).waitFor();
  await page.getByRole('button', { name: 'Vorrei conoscere entrambe le possibilità' }).click();
  await page.getByRole('heading', { name: 'Ci siamo quasi.' }).waitFor();
}

async function fillForm(page, phone = '333 123 4567') {
  await page.getByLabel('Nome e cognome').fill('Giulia Bianchi');
  await page.getByLabel('Telefono').fill(phone);
  await page.getByLabel('Email').fill('giulia.bianchi@example.it');
  await page.getByLabel(/Ho letto/).check();
}

// --- 1. Landing: prima schermata su 375 / 390 / 430 -------------------------
for (const [w, h] of [[375, 667], [390, 844], [430, 932]]) {
  await check(`Landing ${w}px: CTA nella prima schermata, nessuno scroll orizzontale`, async () => {
    const ctx = await iphone(w, h);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    const cta = page.locator('[data-cta=hero]');
    const box = await cta.boundingBox();
    assert.ok(box && box.y + box.height <= h, `CTA fuori schermo (bottom ${box && box.y + box.height} > ${h})`);
    assert.ok(box.height >= 48, 'CTA troppo piccola');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `scroll orizzontale di ${overflow}px`);
    if (SHOTS) {
      await page.screenshot({ path: `${SHOTS}/landing-${w}-fold.png` });
      await page.screenshot({ path: `${SHOTS}/landing-${w}-full.png`, fullPage: true });
    }
    await ctx.close();
  });
}

// --- 2. Percorso completo con attribuzione ----------------------------------
let leadRequests = [];
await check('Percorso completo: attribuzione, avanti/indietro, validazione, invio, conferma', async () => {
  const ctx = await iphone(390, 844);
  const page = await ctx.newPage();
  page.on('request', (r) => isLeadRequest(r) && leadRequests.push(parseLead(r)));

  // Arrivo da un sito esterno (simulato) con un annuncio che punta alla landing.
  await page.route('http://www.google.com/annuncio', (route) =>
    route.fulfill({ contentType: 'text/html', body: `<a id="ad" href="${BASE}/?${UTM}">annuncio</a>` })
  );
  await page.goto('http://www.google.com/annuncio');
  await Promise.all([page.waitForURL(`${BASE}/**`), page.click('#ad')]);
  const href = await page.locator('[data-cta=hero]').getAttribute('href');
  assert.ok(href.includes('utm_campaign=ortodonzia_test') && href.includes('gclid=TEST-GCLID-123'), `CTA senza UTM: ${href}`);

  // Visita a un'altra pagina senza UTM: l'attribuzione deve restare.
  await page.goto(`${BASE}/privacy/`);
  await page.goto(`${BASE}/`);
  await page.locator('[data-cta=hero]').click();
  await page.getByRole('heading', { name: 'Cosa vorresti migliorare del tuo sorriso?' }).waitFor();
  assert.match(await page.locator('#progress-label').textContent(), /Domanda 1 di 3/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-1.png` });

  await page.getByRole('button', { name: 'Denti affollati' }).click();
  await page.getByRole('heading', { name: 'Quando vorresti iniziare?' }).waitFor();
  assert.equal(new URL(page.url()).hash, '#domanda-2');

  // Indietro del browser -> domanda 1 con la risposta selezionata.
  await page.goBack();
  await page.getByRole('heading', { name: 'Cosa vorresti migliorare del tuo sorriso?' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Denti affollati' }).getAttribute('aria-pressed'), 'true');
  // Avanti del browser -> domanda 2.
  await page.goForward();
  await page.getByRole('heading', { name: 'Quando vorresti iniziare?' }).waitFor();
  // Pulsante "Indietro" dell'interfaccia.
  await page.getByRole('button', { name: /domanda precedente/ }).click();
  await page.getByRole('heading', { name: 'Cosa vorresti migliorare del tuo sorriso?' }).waitFor();

  await answerAll(page);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-form.png`, fullPage: true });
  // Il server scarta come bot gli invii completati in meno di 3 secondi.
  await page.waitForTimeout(3000);

  // Invio a vuoto: errori comprensibili, nessuna richiesta.
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  assert.equal(await page.locator('#err-name').textContent(), 'Inserisci nome e cognome.');
  assert.equal(await page.locator('#err-phone').textContent(), 'Inserisci il tuo numero di telefono.');
  assert.equal(await page.locator('#err-email').textContent(), 'Inserisci il tuo indirizzo email.');
  assert.match(await page.locator('#err-privacy').textContent(), /informativa privacy/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'f-name');
  assert.equal(leadRequests.length, 0);

  // Valori non validi.
  await page.getByLabel('Nome e cognome').fill('Giulia');
  await page.getByLabel('Telefono').fill('123');
  await page.getByLabel('Email').fill('giulia@');
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  assert.match(await page.locator('#err-name').textContent(), /nome sia il cognome/);
  assert.match(await page.locator('#err-phone').textContent(), /numero di telefono valido/);
  assert.match(await page.locator('#err-email').textContent(), /email valido/);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/quiz-form-errori.png`, fullPage: true });

  // Il consenso marketing non deve essere preselezionato né obbligatorio.
  assert.equal(await page.getByLabel(/comunicazioni promozionali/).isChecked(), false);
  assert.equal(await page.getByLabel(/Ho letto/).isChecked(), false);

  await fillForm(page);
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  await page.getByRole('heading', { name: 'Richiesta ricevuta ✓' }).waitFor();
  assert.ok(await page.getByText('Tieni il telefono a portata di mano.').isVisible());
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/grazie.png` });

  assert.equal(leadRequests.length, 1);
  const p = leadRequests[0];
  assert.equal(p.utm_source, 'google');
  assert.equal(p.utm_medium, 'cpc');
  assert.equal(p.utm_campaign, 'ortodonzia_test');
  assert.equal(p.utm_content, 'annuncio_a');
  assert.equal(p.utm_term, 'allineatori');
  assert.equal(p.gclid, 'TEST-GCLID-123');
  assert.equal(new URL(p.landing_page).pathname, '/', 'la landing page deve restare quella di arrivo');
  assert.ok(p.landing_page.includes('utm_source=google'));
  assert.equal(p.referrer, 'http://www.google.com/');
  if (p.mode === 'function') {
    assert.deepEqual(p.answers, { obiettivo: 'affollati', tempistica: 'entro_1_mese', pagamento: 'entrambe' });
  } else {
    assert.deepEqual(p.answers, {
      obiettivo: 'Denti affollati',
      tempistica: 'Entro 1 mese',
      pagamento: 'Vorrei conoscere entrambe le possibilità',
    });
    assert.equal(p.formName, 'lead');
    assert.equal(p.subject, 'NUOVO LEAD TELESORRISO — Giulia Bianchi');
    assert.equal(p.nome, 'Giulia Bianchi');
  }
  assert.equal(p.marketing, false);
  console.log(`      (modalità di invio: ${p.mode})`);

  const ev = await events(page);
  for (const e of ['PageView', 'QuizStarted', 'QuizQuestion1Completed', 'QuizQuestion2Completed',
    'QuizQuestion3Completed', 'LeadFormViewed', 'LeadSubmitted', 'ThankYouViewed']) {
    assert.ok(ev.includes(e), `evento mancante: ${e}`);
  }
  assert.equal(ev.filter((e) => e === 'LeadSubmitted').length, 1);

  // Indietro dopo l'invio: resta la conferma, nessun nuovo invio.
  await page.goBack();
  await page.getByRole('heading', { name: 'Richiesta ricevuta ✓' }).waitFor();
  assert.equal(leadRequests.length, 1);
  await ctx.close();
});

// --- 3. Errore di invio: dati conservati, nuovo tentativo -------------------
await check('Errore di invio: messaggio chiaro, dati conservati, nuovo tentativo riuscito', async () => {
  const ctx = await iphone(375, 667);
  const page = await ctx.newPage();
  let calls = 0;
  await routeLead(page, (route) => {
    calls++;
    return route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false,"error":"x"}' });
  });
  await page.goto(`${BASE}/valutazione/`);
  await answerAll(page);
  await fillForm(page, '347 765 4321');
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  await page.getByText('Non siamo riusciti a inviare la richiesta. Riprova tra qualche secondo.').waitFor();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/errore-invio.png`, fullPage: true });
  assert.equal(await page.getByLabel('Nome e cognome').inputValue(), 'Giulia Bianchi');
  assert.equal(await page.getByLabel('Telefono').inputValue(), '347 765 4321');
  assert.equal(await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).isEnabled(), true);

  // Rete assente.
  await page.unroute(isLeadUrl);
  await routeLead(page, (route) => {
    calls++;
    return route.abort('internetdisconnected');
  });
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  await page.getByText(/Connessione assente o lenta/).waitFor();

  // Ricarica della pagina: le risposte e i dati restano.
  await page.reload();
  await page.getByRole('heading', { name: 'Ci siamo quasi.' }).waitFor();
  assert.equal(await page.getByLabel('Email').inputValue(), 'giulia.bianchi@example.it');

  await page.unroute(isLeadUrl);
  await page.getByRole('button', { name: /Richiedi le 2 valutazioni/ }).click();
  await page.getByRole('heading', { name: 'Richiesta ricevuta ✓' }).waitFor();
  assert.equal(calls, 2);
  await ctx.close();
});

// --- 4. Doppio clic: una sola richiesta --------------------------------------
await check('Doppio invio accidentale: una sola richiesta', async () => {
  const ctx = await iphone(430, 932);
  const page = await ctx.newPage();
  let calls = 0;
  await routeLead(page, async (route) => {
    calls++;
    await new Promise((r) => setTimeout(r, 600));
    return route.continue();
  });
  await page.goto(`${BASE}/valutazione/`);
  await answerAll(page);
  await fillForm(page, '348 555 0000');
  const btn = page.getByRole('button', { name: /Richiedi le 2 valutazioni/ });
  await btn.click();
  await btn.click({ force: true }).catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.getByRole('heading', { name: 'Richiesta ricevuta ✓' }).waitFor();
  assert.equal(calls, 1);
  await ctx.close();
});

// --- 5. Accesso diretto a un passaggio non ancora raggiunto -----------------
await check('Accesso diretto a #contatti senza risposte: si torna alla domanda 1', async () => {
  const ctx = await iphone(390, 844);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/valutazione/#contatti`);
  await page.getByRole('heading', { name: 'Cosa vorresti migliorare del tuo sorriso?' }).waitFor();
  await ctx.close();
});

// --- 6. Tastiera ----------------------------------------------------------------
await check('Navigazione da tastiera nel questionario', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/valutazione/`);
  await page.getByRole('heading', { name: 'Cosa vorresti migliorare del tuo sorriso?' }).waitFor();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => document.activeElement.textContent.trim());
    if (label === 'Morso') break;
  }
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Quando vorresti iniziare?' }).waitFor();
  if (SHOTS) {
    await page.goto(`${BASE}/`);
    await page.screenshot({ path: `${SHOTS}/desktop-full.png`, fullPage: true });
  }
  await ctx.close();
});

await browser.close();
for (const [s, n] of results) console.log(`${s} ${n}`);
if (results.some(([s]) => s === 'FAIL')) process.exit(1);
