# Telesorriso — funnel ortodonzia trasparente

Funnel mobile-first per traffico a pagamento (Google / Meta):
landing → questionario di 3 domande → nome + telefono + email → email alla segreteria.

- Sito **statico** (HTML + CSS + JS vanilla, nessun framework, nessuna dipendenza npm).
- Una **Netlify Function** (`/api/lead`) valida il lead e invia l'email tramite l'API di Resend.
- Build con uno script Node di ~100 righe (`build.mjs`).

Il progetto è autonomo in questa cartella: non dipende dal resto del repository.

## Struttura

```
telesorriso/
├── netlify.toml                 build, funzioni, header, redirect
├── build.mjs                    src/ -> dist/ (parziali, CSS inline, variabili)
├── shared/
│   ├── quiz.mjs                 DOMANDE e OPZIONI del questionario (browser + server)
│   └── lead.mjs                 validazione server e testo dell'email
├── netlify/functions/lead.mjs   POST /api/lead
├── src/
│   ├── index.html               landing (tutti i testi sono qui)
│   ├── valutazione/index.html   questionario, modulo contatti, conferma
│   ├── privacy/ cookie/ note-legali/   pagine legali (BOZZE con segnaposto)
│   ├── partials/                head e footer comuni
│   ├── css/style.css            stile unico (incorporato inline dalla build)
│   ├── js/site.mjs              attribuzione, eventi, consenso cookie, CTA fissa
│   ├── js/quiz.mjs              logica del questionario
│   └── img/                     logo, favicon, icona Apple, immagine Open Graph
├── scripts/dev-server.mjs       server locale (serve dist/ + /api/lead)
└── tests/                       test unitari (node --test) ed e2e (Playwright)
```

## Test in locale

Serve Node ≥ 20. Non c'è nulla da installare.

```bash
cd telesorriso
npm test                 # test unitari: validazione, email, funzione, anti-spam
npm run dev              # build + server su http://localhost:8888
```

Senza `RESEND_API_KEY`, il server locale lavora in **DRY RUN**: l'email del lead viene stampata nel terminale invece di essere inviata.

- Simulare un errore di invio: `LEAD_FORCE_ERROR=1 npm run dev`
- Provare l'attribuzione: http://localhost:8888/?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=ad1&utm_term=allineatori&gclid=abc
- Provare il banner cookie: `GTM_ID=GTM-TEST123 npm run dev`
- Inviare email reali da locale: esporta `RESEND_API_KEY`, `LEAD_FROM_EMAIL` e `LEAD_NOTIFICATION_EMAIL` prima di `npm run dev`.

Test end-to-end (browser reale, con il server locale avviato):

```bash
npm i --no-save playwright && node tests/e2e.mjs
```

Gli e2e coprono:
- landing a 375/390/430 px, con CTA nella prima schermata e nessuno scroll orizzontale;
- attribuzione completa;
- tasti avanti/indietro;
- validazione;
- invio e conferma;
- errore di rete e del server, con dati conservati e nuovo tentativo;
- doppio clic;
- tastiera.

## Variabili d'ambiente

| Variabile | Dove | Obbligatoria | Descrizione |
|---|---|---|---|
| `RESEND_API_KEY` | solo server | sì | Chiave API Resend. **Segreta**: impostarla solo su Netlify. |
| `LEAD_NOTIFICATION_EMAIL` | solo server | sì | Destinatario/i dell'email del lead, separati da virgola. |
| `LEAD_FROM_EMAIL` | solo server | sì | Mittente su un dominio verificato in Resend, es. `Telesorriso <lead@telesorriso.it>`. |
| `LEAD_EMAIL_DRY_RUN` | solo server | no | `true` = non invia, scrive l'email nei log della funzione (utile per le anteprime). |
| `SITE_URL` | build (pubblica) | no | URL canonico senza `/` finale. Default: variabile `URL` di Netlify. |
| `GTM_ID` | build (pubblica) | no | ID del contenitore Google Tag Manager. Vuoto = nessun tracker e nessun banner cookie. |

Se la configurazione email manca, il lead **non viene perso in silenzio**:
- l'utente vede "Non siamo riusciti a inviare la richiesta. Riprova tra qualche secondo." e i suoi dati restano nel modulo;
- nei log della funzione compare l'errore di configurazione.

## Configurazione del servizio email (Resend)

1. Crea un account su resend.com e aggiungi il dominio (es. `telesorriso.it`).
2. Inserisci i record DNS indicati (SPF/DKIM) e attendi la verifica.
3. Crea una API key con permesso "Sending access".
4. Su Netlify imposta `RESEND_API_KEY`, `LEAD_FROM_EMAIL` (indirizzo sul dominio verificato) e `LEAD_NOTIFICATION_EMAIL`.

L'email ha `reply_to` impostato sull'indirizzo del lead.

Puoi usare un altro provider: basta modificare la funzione `sendEmail` in `netlify/functions/lead.mjs`.

## Netlify

**Nuovo sito** (consigliato per l'anteprima):

1. Add new site → Import from Git → questo repository.
2. **Base directory: `telesorriso`**. Comando e cartella di pubblicazione vengono letti da `telesorriso/netlify.toml`:
   - `npm run build`
   - `dist`
   - funzioni in `netlify/functions`
3. Imposta le variabili d'ambiente (tabella sopra).

**Deploy di anteprima senza toccare la produzione:**
- da CLI: `cd telesorriso && npx netlify-cli deploy --build` (senza `--prod`), oppure
- apri una Pull Request: Netlify crea un Deploy Preview.

Le anteprime Netlify hanno già `X-Robots-Tag: noindex`.

Per testare l'invio in anteprima senza email reali, imposta `LEAD_EMAIL_DRY_RUN=true` solo nel contesto "Deploy Previews".

## Tracciamento

Eventi inviati al `dataLayer`:

| Evento | Quando | Parametri |
|---|---|---|
| `PageView` | ogni pagina | `page_path` |
| `QuizStarted` | apertura del questionario (1 volta per sessione) | |
| `QuizQuestion1Completed` … `QuizQuestion3Completed` | risposta alla domanda | `quiz_question`, `quiz_answer` |
| `LeadFormViewed` | modulo contatti mostrato (1 volta) | |
| `LeadSubmitted` | invio riuscito | `event_id` (= ID richiesta nell'email), risposte |
| `ThankYouViewed` | conferma mostrata (1 volta) | `event_id` |

**Fasi successive.** `LeadContacted`, `AppointmentBooked`, `FirstVisitCompleted`, `SecondVisitCompleted` e `TreatmentSold` sono già definiti in `EVENTS` (`src/js/site.mjs`). Avvengono però fuori dal sito, quindi vanno caricati come **conversioni offline**:
- Google Ads: import delle conversioni offline tramite **GCLID**;
- Meta: Conversions API tramite **FBCLID** / `event_id`.

GCLID, FBCLID e ID richiesta sono già presenti in ogni email di lead. La segreteria deve solo registrarli insieme all'esito del contatto.

**Consenso.**
- Al caricamento, Consent Mode v2 viene inizializzato con tutto a `denied`.
- Google Tag Manager viene caricato **solo dopo** il consenso (statistici e/o marketing).
- Il banner offre Accetta / Rifiuta con la stessa evidenza, più "Personalizza".
- La scelta si può rivedere da "Preferenze cookie" nel footer.

**Da configurare in GTM** (nessun ID è inventato nel codice):
- GA4;
- conversione Google Ads su `LeadSubmitted`;
- Meta Pixel: `Lead` su `LeadSubmitted`, con `eventID` = `event_id`.

Ogni tag deve rispettare i segnali di consenso.

## Attribuzione

- **Cosa si salva.** All'arrivo vengono salvati in `sessionStorage`:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`;
  - `gclid`, `fbclid`;
  - landing page e referrer esterno.
- **Propagazione.** I parametri vengono propagati anche nei link verso il questionario, quindi sopravvivono anche se lo storage non è disponibile.
- **Ultimo click.** Un nuovo click su un annuncio, con parametri diversi, sostituisce il precedente.
- **Durata.** Si usa solo lo storage di sessione: nessuna persistenza di lungo periodo prima del consenso.

## Anti-spam e duplicati

- Campo honeypot invisibile.
- Tempo minimo di compilazione: 3 secondi.
- Massimo 5 invii ogni 10 minuti per IP.
- Deduplica per ID richiesta e per numero di telefono (10 minuti).
- Nel browser il pulsante si disattiva durante l'invio, e un retry riusa lo stesso ID.

I primi tre controlli rispondono "ok" senza inviare nulla, per non dare indizi ai bot.

## Modifiche CRO

- **Testi della landing:** `src/index.html`.
- **Domande e opzioni:** testi, ordine e numero in `shared/quiz.mjs`. L'email si adegua da sola.
- **Inclusioni "tutto incluso" e FAQ:** liste in `src/index.html`.
- **Foto dell'hero:** oggi è un'illustrazione (`src/img/hero.svg`). Per usare una foto reale, aggiungi `src/img/hero.jpg` (verticale 4:5, circa 1000×1250 px, sotto i 150 KB) e cambia `src` nel tag `<img>` dentro `.hero-media` in `src/index.html`.

## Limitazioni note

- Limite per IP e deduplica sono **in memoria** per istanza della funzione. Bastano per doppi clic e retry, ma non fermano un attacco distribuito. Se servisse, il passo successivo è Netlify Blobs o un CAPTCHA non invasivo (es. Turnstile).
- Le email non vengono archiviate altrove: se Resend accetta l'email ma questa non arriva (spam, casella piena), il lead resta solo nei log di Resend.
- Lighthouse non è stato eseguito in questo ambiente. La pagina è leggera (~29 KB di HTML con CSS inline, ~25 KB di JS, nessun font esterno), ma va misurata sull'anteprima.
- Landing, questionario e footer non hanno segnaposto visibili.
- Le pagine Privacy, Cookie e Note legali restano **bozze** con segnaposto in giallo: dati del titolare, direttore sanitario, testi legali e condizioni del sistema di pagamento. Vanno completate prima di avviare le campagne.
