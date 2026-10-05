// =============================================================================
// TELESORRISO — questionario (/valutazione/)
// =============================================================================
// Una domanda per schermata, poi il modulo contatti, poi la conferma.
// Ogni passaggio è una voce della cronologia (#domanda-1, #domanda-2, ...,
// #contatti): i tasti avanti/indietro del browser funzionano come ci si aspetta.
// Le risposte restano in sessionStorage: un ricaricamento non le perde.
// Domande e opzioni sono in /shared/quiz.mjs.
// =============================================================================
import { QUESTIONS, NETLIFY_FORM_NAME } from './quiz-config.mjs';
import { track, EVENTS, getAttribution } from './site.mjs';

const STATE_KEY = 'ts_quiz_v1';
const ENDPOINT = '/api/lead';
// Impostato dalla build: 'function' (Netlify Function + Resend, default) oppure
// 'netlify-forms' (versione drag and drop, senza funzioni).
const LEAD_MODE = '%%LEAD_MODE%%';
const TIMEOUT_MS = 15000;

const root = document.getElementById('quiz');
const backBtn = document.getElementById('back');
const progressEl = document.getElementById('progress');
const progressLabel = document.getElementById('progress-label');
const progressFill = document.getElementById('progress-fill');
const progressTrack = progressEl.querySelector('.progress-track');

const TOTAL = QUESTIONS.length + 1; // domande + contatti
const FORM_STEP = QUESTIONS.length;

// --- Stato -------------------------------------------------------------------

function loadState() {
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY)) || {};
  } catch {
    return {};
  }
}
const state = Object.assign(
  { answers: {}, form: {}, startedAt: 0, submissionId: '', submitted: false, tracked: {} },
  loadState()
);
function save() {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* si prosegue senza persistenza */
  }
}

/** Traccia un evento una sola volta per sessione (evita doppioni con avanti/indietro). */
function trackOnce(event, params) {
  if (state.tracked[event]) return;
  state.tracked[event] = true;
  save();
  track(event, params);
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// --- Passaggi e cronologia --------------------------------------------------

function firstUnanswered() {
  const i = QUESTIONS.findIndex((q) => !state.answers[q.id]);
  return i === -1 ? FORM_STEP : i;
}

function hashFor(step) {
  return step === FORM_STEP ? '#contatti' : `#domanda-${step + 1}`;
}

function stepFromHash() {
  const h = location.hash;
  if (h === '#contatti') return FORM_STEP;
  const m = /^#domanda-(\d+)$/.exec(h);
  return m ? Number(m[1]) - 1 : 0;
}

let current = -1;
// Quante voci di cronologia del questionario precedono quella attuale:
// se > 0, "Indietro" usa history.back() e resta allineato al browser.
let depth = 0;

function go(step, { push = true } = {}) {
  // Non si può saltare a un passaggio successivo senza aver risposto prima.
  step = Math.max(0, Math.min(step, firstUnanswered()));
  if (push) {
    history.pushState({ step }, '', hashFor(step));
    depth++;
  } else {
    history.replaceState({ step }, '', hashFor(step));
  }
  render(step);
}

window.addEventListener('popstate', () => {
  if (state.submitted) {
    history.replaceState({ step: 'grazie' }, '', '#grazie');
    renderThanks();
    return;
  }
  const wanted = typeof history.state?.step === 'number' ? history.state.step : stepFromHash();
  const allowed = Math.min(wanted, firstUnanswered());
  if (allowed !== wanted) history.replaceState({ step: allowed }, '', hashFor(allowed));
  depth = Math.max(0, depth + (allowed < current ? -1 : 1));
  render(allowed);
});

backBtn.addEventListener('click', () => {
  if (depth > 0) history.back();
  else if (current > 0) go(current - 1, { push: false });
  else location.href = '/' + location.search;
});

// --- Rendering --------------------------------------------------------------

function setProgress(step) {
  const done = step;
  const pct = Math.round((done / TOTAL) * 100);
  progressEl.hidden = false;
  progressLabel.textContent =
    step === FORM_STEP ? 'Ultimo passaggio' : `Domanda ${step + 1} di ${QUESTIONS.length}`;
  progressFill.style.width = `${Math.max(pct, 6)}%`;
  progressTrack.setAttribute('aria-valuenow', String(step + 1));
  progressTrack.setAttribute('aria-valuetext', progressLabel.textContent);
}

function focusHeading() {
  const h = root.querySelector('h1');
  if (h) h.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function render(step) {
  current = step;
  backBtn.hidden = false;
  backBtn.setAttribute('aria-label', step === 0 ? 'Torna alla pagina iniziale' : 'Torna alla domanda precedente');
  setProgress(step);
  if (step === FORM_STEP) renderForm();
  else renderQuestion(step);
  focusHeading();
}

function el(tag, attrs = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) n.append(c);
  return n;
}

function renderQuestion(i) {
  const q = QUESTIONS[i];
  const selected = state.answers[q.id];
  const list = el('ul', { class: 'options', role: 'list' });
  for (const opt of q.options) {
    const btn = el('button', { type: 'button', class: 'option', 'aria-pressed': String(selected === opt.id) }, [
      el('span', { text: opt.label }),
      el('span', { class: 'radio', 'aria-hidden': 'true' }),
    ]);
    btn.addEventListener('click', () => choose(i, opt.id, btn));
    list.append(el('li', {}, btn));
  }
  root.replaceChildren(
    el('div', { class: 'step', role: 'group', 'aria-labelledby': 'step-title' }, [
      el('h1', { id: 'step-title', tabindex: '-1', text: q.title }),
      list,
      el('p', { class: 'step-footnote', text: 'Nessun impegno · Ti servono circa 60 secondi' }),
    ])
  );
}

let advancing = false;
function choose(i, optionId, btn) {
  if (advancing) return;
  advancing = true;
  const q = QUESTIONS[i];
  state.answers[q.id] = optionId;
  save();
  root.querySelectorAll('.option').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  track(EVENTS[`QuizQuestion${i + 1}Completed`] || `QuizQuestion${i + 1}Completed`, {
    quiz_question: q.id,
    quiz_answer: optionId,
  });
  // Breve pausa per mostrare la selezione prima di passare oltre.
  setTimeout(() => {
    advancing = false;
    go(i + 1);
  }, 180);
}

// --- Modulo contatti ---------------------------------------------------------

const FIELD_RULES = {
  name: (v) => {
    const parts = v.trim().split(/\s+/).filter(Boolean);
    if (!v.trim()) return 'Inserisci nome e cognome.';
    if (parts.length < 2) return 'Inserisci sia il nome sia il cognome.';
    if (!/^[\p{L}][\p{L}' .\-’]*$/u.test(v.trim())) return 'Usa solo lettere per nome e cognome.';
    return '';
  },
  phone: (v) => {
    const x = v.replace(/[\s.\-()/]/g, '').replace(/^00/, '+');
    if (!x) return 'Inserisci il tuo numero di telefono.';
    if (!/^(\+\d{8,15}|[03]\d{5,10})$/.test(x)) return 'Inserisci un numero di telefono valido, ad esempio 333 123 4567.';
    return '';
  },
  email: (v) => {
    if (!v.trim()) return 'Inserisci il tuo indirizzo email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Inserisci un indirizzo email valido, ad esempio nome@esempio.it.';
    return '';
  },
  privacy: (_, input) => (input.checked ? '' : 'Per inviare la richiesta conferma di aver letto l’informativa privacy.'),
};

function renderForm() {
  const tpl = document.getElementById('form-template');
  const frag = tpl.content.cloneNode(true);
  root.replaceChildren(frag);
  const form = root.querySelector('form');

  // Ripristina quanto già inserito (es. dopo un errore o un "indietro").
  for (const [k, v] of Object.entries(state.form)) {
    const input = form.elements[k];
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = v === true;
    else input.value = v;
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name || t.name === 'website') return;
    state.form[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    save();
    if (t.getAttribute('aria-invalid') === 'true') validateField(form, t.name);
  });
  form.addEventListener(
    'blur',
    (e) => {
      const t = e.target;
      if (FIELD_RULES[t.name] && t.type !== 'checkbox' && t.value) validateField(form, t.name);
    },
    true
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(form);
  });

  trackOnce(EVENTS.LeadFormViewed);
}

function setFieldError(form, name, msg) {
  const input = form.elements[name];
  const err = form.querySelector(`#err-${name}`);
  if (!input || !err) return;
  err.textContent = msg;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

function validateField(form, name) {
  const input = form.elements[name];
  const msg = FIELD_RULES[name](input.value || '', input);
  setFieldError(form, name, msg);
  return !msg;
}

let sending = false;

async function submit(form) {
  if (sending) return;
  const alertBox = form.querySelector('#form-alert');
  alertBox.textContent = '';

  const invalid = Object.keys(FIELD_RULES).filter((n) => !validateField(form, n));
  if (invalid.length) {
    form.elements[invalid[0]].focus();
    return;
  }

  // Domande non completate (es. sessione scaduta): si torna alla prima mancante.
  if (firstUnanswered() < FORM_STEP) {
    go(firstUnanswered());
    return;
  }

  if (!state.submissionId) state.submissionId = newId();
  if (!state.startedAt) state.startedAt = Date.now();
  save();

  const btn = form.querySelector('button[type=submit]');
  const label = btn.querySelector('.btn-label');
  const idleLabel = label.textContent;
  sending = true;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  label.textContent = 'Invio in corso…';
  btn.prepend(el('span', { class: 'spinner', 'aria-hidden': 'true' }));

  const payload = {
    submission_id: state.submissionId,
    name: form.elements.name.value.trim(),
    phone: form.elements.phone.value.trim(),
    email: form.elements.email.value.trim(),
    answers: state.answers,
    consents: { privacy: form.elements.privacy.checked, marketing: form.elements.marketing.checked },
    attribution: getAttribution(),
    page_url: location.href.split('#')[0],
    website: form.elements.website.value,
    elapsed_ms: Date.now() - state.startedAt,
  };

  let ok = false;
  let message = 'Non siamo riusciti a inviare la richiesta. Riprova tra qualche secondo.';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res =
      LEAD_MODE === 'netlify-forms'
        ? await fetch('/', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: netlifyFormBody(payload).toString(),
            signal: ctrl.signal,
          })
        : await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });
    clearTimeout(timer);
    const data = LEAD_MODE === 'netlify-forms' ? { ok: res.ok } : await res.json().catch(() => ({}));
    ok = res.ok && data.ok === true;
    if (!ok) {
      if (data.fields) {
        for (const [k, msg] of Object.entries(data.fields)) setFieldError(form, k, msg);
        message = 'Controlla i dati evidenziati e riprova.';
      } else if (res.status === 429 && data.error) {
        message = data.error;
      }
    }
  } catch {
    message = 'Connessione assente o lenta. Controlla la rete e riprova.';
  }

  if (ok) {
    state.submitted = true;
    save();
    track(EVENTS.LeadSubmitted, {
      event_id: state.submissionId,
      quiz_obiettivo: state.answers.obiettivo,
      quiz_tempistica: state.answers.tempistica,
      quiz_pagamento: state.answers.pagamento,
    });
    history.replaceState({ step: 'grazie' }, '', '#grazie');
    renderThanks();
    return;
  }

  sending = false;
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.querySelector('.spinner')?.remove();
  label.textContent = idleLabel;
  alertBox.textContent = message;
  alertBox.focus();
}

/** Corpo dell'invio a Netlify Forms: ogni campo è una riga dell'email. */
function netlifyFormBody(p) {
  const label = (qid) => {
    const q = QUESTIONS.find((x) => x.id === qid);
    return q?.options.find((o) => o.id === p.answers[qid])?.label || '—';
  };
  const a = p.attribution;
  const v = (x) => x || '—';
  const now = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  return new URLSearchParams({
    'form-name': NETLIFY_FORM_NAME,
    website: p.website,
    subject: `NUOVO LEAD TELESORRISO — ${p.name}`,
    nome: p.name,
    telefono: p.phone,
    email: p.email,
    'cosa-vorrebbe-migliorare': label('obiettivo'),
    'quando-vorrebbe-iniziare': label('tempistica'),
    'interesse-pagamento-150-al-mese': label('pagamento'),
    sorgente: v(a.utm_source),
    mezzo: v(a.utm_medium),
    campagna: v(a.utm_campaign),
    contenuto: v(a.utm_content),
    termine: v(a.utm_term),
    gclid: v(a.gclid),
    fbclid: v(a.fbclid),
    'landing-page': v(a.landing_page),
    referrer: v(a.referrer),
    'data-e-ora': now,
    'presa-visione-privacy': p.consents.privacy ? 'Sì' : 'No',
    'consenso-marketing': p.consents.marketing ? 'Sì' : 'No',
    'id-richiesta': p.submission_id,
    azione: 'CHIAMARE IL LEAD APPENA POSSIBILE.',
  });
}

// --- Conferma ---------------------------------------------------------------

function renderThanks() {
  current = TOTAL;
  progressEl.hidden = true;
  backBtn.hidden = true;
  const tpl = document.getElementById('thanks-template');
  root.replaceChildren(tpl.content.cloneNode(true));
  document.title = 'Richiesta ricevuta — Telesorriso';
  focusHeading();
  trackOnce(EVENTS.ThankYouViewed, { event_id: state.submissionId });
  // Dati personali non più necessari nel browser: si cancellano.
  state.form = {};
  save();
}

// --- Avvio ------------------------------------------------------------------

if (state.submitted) {
  history.replaceState({ step: 'grazie' }, '', '#grazie');
  renderThanks();
} else {
  if (!state.startedAt) {
    state.startedAt = Date.now();
    save();
  }
  trackOnce(EVENTS.QuizStarted);
  go(location.hash ? stepFromHash() : 0, { push: false });
}
