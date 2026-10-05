// =============================================================================
// TELESORRISO — script comune a tutte le pagine
// =============================================================================
//  1. Attribuzione: salva UTM / gclid / fbclid all'arrivo e li conserva per
//     tutta la sessione (sessionStorage + propagazione nei link del funnel).
//  2. Tracciamento: track() scrive eventi nel dataLayer (GTM). Nessuna rete
//     finché l'utente non dà il consenso.
//  3. Consenso: banner con scelte equivalenti; Google Tag Manager viene
//     caricato SOLO dopo il consenso (Consent Mode v2 inizializzato a "denied").
//  4. Barra CTA fissa su mobile.
// =============================================================================
import { ATTRIBUTION_KEYS } from './quiz-config.mjs';

// Sostituito dalla build con la variabile d'ambiente GTM_ID (es. GTM-XXXXXXX).
const GTM_ID = '%%GTM_ID%%';
const TRACKING_ENABLED = /^GTM-[A-Z0-9]+$/.test(GTM_ID);

const ATTR_KEY = 'ts_attribution';
const CONSENT_KEY = 'ts_consent_v1';

// --- Storage sicuro ---------------------------------------------------------

function read(storage, key) {
  try {
    const raw = window[storage].getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(storage, key, value) {
  try {
    window[storage].setItem(key, JSON.stringify(value));
  } catch {
    /* storage non disponibile (es. navigazione privata): si prosegue */
  }
}

// --- Tracciamento -----------------------------------------------------------

window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

/**
 * Eventi del funnel. Gli ultimi cinque non partono dal sito: andranno importati
 * come conversioni offline (Google Ads / Meta) usando gclid / fbclid e l'ID
 * richiesta presenti nell'email del lead.
 */
export const EVENTS = {
  PageView: 'PageView',
  QuizStarted: 'QuizStarted',
  QuizQuestion1Completed: 'QuizQuestion1Completed',
  QuizQuestion2Completed: 'QuizQuestion2Completed',
  QuizQuestion3Completed: 'QuizQuestion3Completed',
  LeadFormViewed: 'LeadFormViewed',
  LeadSubmitted: 'LeadSubmitted',
  ThankYouViewed: 'ThankYouViewed',
  // Fasi successive (offline, gestite dalla segreteria):
  LeadContacted: 'LeadContacted',
  AppointmentBooked: 'AppointmentBooked',
  FirstVisitCompleted: 'FirstVisitCompleted',
  SecondVisitCompleted: 'SecondVisitCompleted',
  TreatmentSold: 'TreatmentSold',
};

export function track(event, params = {}) {
  window.dataLayer.push({ event, ...params });
}

// --- Attribuzione -----------------------------------------------------------

function externalReferrer() {
  try {
    if (!document.referrer) return '';
    const ref = new URL(document.referrer);
    return ref.host === location.host ? '' : document.referrer;
  } catch {
    return '';
  }
}

function captureAttribution() {
  const params = new URLSearchParams(location.search);
  const fromUrl = {};
  for (const k of ATTRIBUTION_KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v.slice(0, 300);
  }
  const stored = read('sessionStorage', ATTR_KEY);
  // Parametri di campagna diversi da quelli salvati = nuovo click su un
  // annuncio: sostituiscono i precedenti (ultimo click). Gli stessi parametri
  // propagati nei link interni (es. landing -> questionario) non cambiano
  // nulla, così landing page e referrer originali restano quelli veri.
  const changed = ATTRIBUTION_KEYS.some((k) => fromUrl[k] && fromUrl[k] !== stored?.[k]);
  if (!stored || changed) {
    write('sessionStorage', ATTR_KEY, {
      ...fromUrl,
      landing_page: location.href.slice(0, 2000),
      referrer: externalReferrer().slice(0, 2000),
    });
  }
}

export function getAttribution() {
  const stored = read('sessionStorage', ATTR_KEY) || {};
  const out = { landing_page: stored.landing_page || '', referrer: stored.referrer || '' };
  const params = new URLSearchParams(location.search);
  for (const k of ATTRIBUTION_KEYS) out[k] = stored[k] || params.get(k) || '';
  return out;
}

/** Aggiunge i parametri di attribuzione ai link del funnel (data-funnel-link). */
function decorateFunnelLinks() {
  const attr = getAttribution();
  document.querySelectorAll('a[data-funnel-link]').forEach((a) => {
    const url = new URL(a.getAttribute('href'), location.href);
    for (const k of ATTRIBUTION_KEYS) if (attr[k]) url.searchParams.set(k, attr[k]);
    a.setAttribute('href', url.pathname + url.search + url.hash);
  });
}

// --- Consenso ---------------------------------------------------------------

function consentState(c) {
  return {
    analytics_storage: c.analytics ? 'granted' : 'denied',
    ad_storage: c.marketing ? 'granted' : 'denied',
    ad_user_data: c.marketing ? 'granted' : 'denied',
    ad_personalization: c.marketing ? 'granted' : 'denied',
  };
}

let gtmLoaded = false;
function loadGtm() {
  if (gtmLoaded || !TRACKING_ENABLED) return;
  gtmLoaded = true;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function applyConsent(c) {
  gtag('consent', 'update', consentState(c));
  window.dataLayer.push({ event: 'consent_update', consent_analytics: c.analytics, consent_marketing: c.marketing });
  if (c.analytics || c.marketing) loadGtm();
}

function saveConsent(analytics, marketing) {
  const c = { analytics, marketing, ts: new Date().toISOString() };
  write('localStorage', CONSENT_KEY, c);
  applyConsent(c);
  closeBanner();
}

let banner = null;
function closeBanner() {
  if (banner) banner.remove();
  banner = null;
}

export function openConsentBanner() {
  if (!TRACKING_ENABLED || banner) return;
  const current = read('localStorage', CONSENT_KEY) || { analytics: false, marketing: false };
  banner = document.createElement('section');
  banner.className = 'consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'consent-title');
  banner.innerHTML = `
    <h2 id="consent-title">Cookie e privacy</h2>
    <p>Usiamo cookie tecnici necessari al funzionamento del sito. Con il tuo consenso usiamo anche cookie statistici e di marketing per misurare l’efficacia delle nostre campagne. Puoi cambiare idea in qualsiasi momento. <a href="/cookie/">Cookie policy</a></p>
    <div class="consent-prefs" hidden>
      <label><input type="checkbox" name="analytics" ${current.analytics ? 'checked' : ''}> <span><strong>Statistici</strong> — misurazione anonima dell’uso del sito.</span></label>
      <label><input type="checkbox" name="marketing" ${current.marketing ? 'checked' : ''}> <span><strong>Marketing</strong> — misurazione delle campagne pubblicitarie (Google, Meta).</span></label>
    </div>
    <div class="consent-actions">
      <button type="button" class="btn" data-c="reject">Rifiuta</button>
      <button type="button" class="btn" data-c="accept">Accetta</button>
      <button type="button" class="btn btn-quiet" data-c="prefs" aria-expanded="false">Personalizza</button>
    </div>`;
  banner.addEventListener('click', (e) => {
    const action = e.target.closest('[data-c]')?.dataset.c;
    if (action === 'accept') saveConsent(true, true);
    else if (action === 'reject') saveConsent(false, false);
    else if (action === 'prefs') {
      const prefs = banner.querySelector('.consent-prefs');
      const btn = e.target.closest('[data-c]');
      if (prefs.hidden) {
        prefs.hidden = false;
        btn.textContent = 'Salva le mie scelte';
        btn.setAttribute('aria-expanded', 'true');
      } else {
        saveConsent(
          banner.querySelector('[name=analytics]').checked,
          banner.querySelector('[name=marketing]').checked
        );
      }
    }
  });
  document.body.appendChild(banner);
}

function initConsent() {
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
  document.querySelectorAll('[data-consent-open]').forEach((el) => {
    if (!TRACKING_ENABLED) {
      el.closest('li')?.remove();
      return;
    }
    el.addEventListener('click', openConsentBanner);
  });
  if (!TRACKING_ENABLED) return;
  const saved = read('localStorage', CONSENT_KEY);
  if (saved) applyConsent(saved);
  else openConsentBanner();
}

// --- Barra CTA fissa (mobile) ----------------------------------------------

function initStickyCta() {
  const bar = document.querySelector('.sticky-cta');
  const watched = document.querySelectorAll('[data-hide-sticky]');
  if (!bar || !watched.length || !('IntersectionObserver' in window)) return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    const show = visible.size === 0;
    bar.classList.toggle('is-visible', show);
    bar.toggleAttribute('inert', !show);
    bar.setAttribute('aria-hidden', String(!show));
  });
  watched.forEach((el) => io.observe(el));
}

// --- Avvio ------------------------------------------------------------------

captureAttribution();
initConsent();
decorateFunnelLinks();
initStickyCta();
track(EVENTS.PageView, { page_path: location.pathname });
