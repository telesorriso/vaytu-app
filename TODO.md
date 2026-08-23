# VAYTU — TODO / stato di avanzamento

Aggiornato: 2026-08-23. Ambito di questa sessione: **solo fase database**.

## ✅ Fase 1 — Database (MVP): completata in questa sessione

- [x] Struttura repository (`README.md`, `PROJECT.md`, `TODO.md`,
      `.gitignore`, `/supabase/migrations/`, `/tests/integration/`, `/docs/`)
- [x] `001_init_enums.sql` — 14 tipi ENUM
- [x] `002_create_tables.sql` — 20 tabelle, tutte con PK `uuid`
- [x] `003_indexes_constraints_triggers.sql` — indici, CHECK/UNIQUE
      aggiuntivi, funzioni helper (`is_admin`/`is_creator`/`is_business`),
      trigger `updated_at`, trigger di protezione colonne, audit log,
      notifiche, macchina a stati application → collaboration, sync
      verification status
- [x] `004_rls_policies.sql` — GRANT di base + RLS su tutte le 20 tabelle +
      113 policy
- [x] Esecuzione reale delle 4 migration su PostgreSQL 16 locale (database
      vuoto → schema completo, zero errori)
- [x] Harness di test RLS (`/tests/integration/`) con emulazione minimale
      dello schema `auth` di Supabase
- [x] 114 test RLS **eseguiti realmente** per i 6 ruoli richiesti
      (anonymous, creator_A, creator_B, business_A, business_B, admin) — 114/114 PASS
- [x] `docs/DATABASE.md` — riferimento tecnico dello schema
- [x] `docs/SECURITY_MODEL.md` — modello di sicurezza, con distinzione
      esplicita di cosa è stato validato e cosa no

### Limitazioni note della fase 1 (dichiarate, non nascoste)

- [ ] Test contro un vero progetto Supabase (GoTrue/Storage/Realtime/PgBouncer)
      — **NOT EXECUTED**, richiede credenziali di un progetto reale (non
      disponibili/non richieste in questa sessione)
- [ ] Macchina a stati completa per `collaborations` (oltre al controllo di
      appartenenza) — rimandata
- [ ] Vista pubblica curata dei Creator (directory) — rimandata, il default
      MVP è conservativo (nessuna visibilità Creator-to-Creator)
- [ ] Procedura reale di erasure GDPR (oltre al soft delete) — rimandata,
      vedi `docs/SECURITY_MODEL.md` §7
- [ ] Test di performance/carico/concorrenza — non eseguiti

## ✅ Fase 2 — Application Foundation: completata in questa sessione

- [x] Scaffold Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- [x] `@supabase/supabase-js` + `@supabase/ssr`, client browser (`lib/supabase/client.ts`)
      e server (`lib/supabase/server.ts`), sessione cookie-based
- [x] `proxy.ts` (Next.js 16 ha rinominato `middleware.ts` in `proxy.ts`) —
      refresh sessione + redirect ottimistico per anonimi su rotte private
- [x] `lib/auth/dal.ts` — Data Access Layer: verifica ruolo **server-side
      reale** (`requireRole()`), mai solo redirect client-side; RLS resta
      l'ultimo livello di protezione
- [x] Rotte: `/`, `/login`, `/signup`, `/creator`, `/business`, `/admin`
      (dashboard minimali)
- [x] Signup limitato a Creator/Business (nessuna opzione Admin in UI né
      accettata dal server action; bloccato anche da RLS
      `profiles_insert_self`)
- [x] `.env.example` (solo variabili pubbliche `NEXT_PUBLIC_*`), nessun
      secret committato
- [x] Build, lint, typecheck: **PASS**
- [x] Test E2E reali: redirect anonimo verificato lato server (HTTP 307);
      signup/login/logout/cross-role **NOT EXECUTED** — la rete in uscita
      di questa sessione non raggiunge `*.supabase.co` (policy egress
      dell'ambiente sandbox), vedi report della fase per i dettagli

### Limitazioni note della fase 2

- [ ] Test E2E completi (signup/login/logout/cross-role access) contro il
      progetto Supabase reale — **NOT EXECUTED**, bloccati dalla policy di
      rete dell'ambiente (non un difetto del codice); da rieseguire in un
      ambiente con accesso a `*.supabase.co` o in locale
- [ ] Nessun provisioning di un account Admin reale (per design, non
      registrabile pubblicamente) — da creare fuori banda quando serve

## ✅ Fase 3 — Onboarding MVP: completata in questa sessione (branch `feature/onboarding-mvp`)

- [x] Migration additive 007 (colonne `username`/`instagram_handle`/`tiktok_handle`
      su `creator_profiles`; `address`/`instagram_handle`/`cover_image_url` su
      `business_profiles`), 008 (bucket Storage `public-assets` pubblico +
      `verification-evidence` privato, owner+admin only), 009 (seed dei 4
      Vaytu Level: Explorer/Insider/Select/Icon) — scritte, validate sul
      harness locale (007+009; 008 richiede lo schema `storage` reale di
      Supabase), **non ancora applicate all'hosted** (connector Supabase
      disabilitato per questa chat — vedi Remaining blockers)
- [x] Onboarding Creator: stepper 6 passi (identità, località/categorie,
      social, evidence — 4 screenshot, portfolio, riepilogo), autosave sui
      campi testo, resume dopo logout/login calcolato dai dati già salvati
      (nessuna colonna "step corrente" necessaria), invio candidatura →
      `creator_verifications` (status `pending`)
- [x] Onboarding Business: stepper 5 passi (attività, localizzazione,
      contatti, presentazione, riepilogo), stesso pattern di autosave/resume,
      invio verifica → `business_verifications` (status `pending`)
- [x] Admin: lista Creator/Business pending, dettaglio con screenshot (URL
      firmati dal bucket privato), inserimento metriche verificate,
      assegnazione manuale Vaytu Level, approve/reject/suspend (suspend =
      `profiles.is_active`, già esistente e admin-only)
- [x] Build, lint, typecheck: **PASS**
- [x] Redirect anonimo verificato realmente (HTTP 307) su tutte le nuove
      rotte, incluse le sotto-rotte onboarding/admin
- [x] `netlify.toml` pronto; deploy Netlify **non attivabile** in questa
      sessione (connector Netlify non collegato all'org)
- [x] Migration 007, 008, 009 **applicate e verificate sul progetto Supabase
      hosted** (`jkyqxqqvqbmjfufsktgp`): schema drift zero (20 tabelle,
      20/20 RLS, 113 policy pubbliche, 31 trigger — tutti invariati), 2
      bucket Storage creati (`public-assets` pubblico, `verification-evidence`
      privato) con 7 policy verificate riga per riga, 4 Vaytu Level seminati
      (Explorer/Insider/Select/Icon). Security advisor: 0 ERROR, stessi 8
      WARN pre-esistenti (helper RLS intenzionalmente pubbliche) + 1 nuovo
      WARN non collegato a queste migration (`auth_leaked_password_protection`
      — impostazione Auth del progetto, non toccata)

- [x] Fix upload evidence (Step 4 Creator onboarding): la UI restava
      indefinitamente in loading su "Carico gli screenshot..." senza mai
      mostrare un errore — root cause: né `@supabase/storage-js`
      (`.upload()`, che non accetta nemmeno un `AbortSignal`) né
      `postgrest-js` applicano un timeout di default. `lib/actions/timeout.ts`
      (`withTimeout`) avvolge ogni chiamata Storage/DB delle server action di
      onboarding con un timeout di 20s: ogni fallimento produce ora un
      errore visibile e un nuovo tentativo è sempre possibile. Nessuna
      modifica a RLS/policy/bucket.
- [x] **Merge in `main`**: PR #1 (`feature/onboarding-mvp` → `main`),
      merge commit `f81686d`. Vedi report della fase per il dettaglio delle
      verifiche pre-merge.

### Limitazioni note della fase 3

- [ ] Test E2E completi (signup → onboarding → verifica admin → dashboard)
      contro Supabase reale — **NOT EXECUTED**, stesso blocco di rete della
      fase 2 (`*.supabase.co` non raggiungibile da questo sandbox)
- [x] Deploy Preview Netlify — generata automaticamente da GitHub/Netlify
      sulla PR #1 (connector collegato), 4 check completati con successo
- [ ] Autosave è a livello di "intero step" (debounced, tutti i campi testo
      dello step corrente), non per singolo campo isolato — scelta
      pragmatica, vedi report della fase
- [ ] Nessuna UI per re-inviare la candidatura dopo un rifiuto (la pagina di
      stato mostra il motivo ma non riapre lo stepper) — rimandato

## 🚧 Fase 4 — Creator Home UI (V1): in corso, su branch `feature/creator-home-ui`

- [x] Nuova Creator Home mobile-first: profilo essenziale → Vaytu Level →
      opportunità vicine/compatibili. Nessuna metrica (follower/engagement/
      analytics) in Home per scelta di prodotto — resta nel sistema per
      verifica/matching/Admin.
- [x] Componenti: `CreatorHeader`, `CreatorProfileCard`, `VaytuLevelBadge`,
      `OpportunityFilters`, `ExperienceCard`, `OpportunitiesSection`,
      `EmptyOpportunities`, `CreatorBottomNav` (mobile), `CreatorSidebar`
      (desktop) — in `components/creator-home/`
- [x] Route group `app/creator/(home)/` (Scopri/Candidature/Messaggi/Profilo)
      — separato da `app/creator/onboarding/**`, stesso guard server-side
      (`requireRole` + stato submission/verifica) di prima, ora nel layout
      condiviso del gruppo
- [x] Dati demo Experiences (`lib/demo/experiences.ts`) — mock puro, mai
      scritto su Supabase, nessuna nuova tabella/migration. Attivo solo fuori
      da Netlify Production (`CONTEXT !== 'production'`); in produzione reale
      mostra sempre l'empty state elegante
- [ ] Merge in `main` — **NON ancora fatto**, in attesa di revisione visuale
      mobile reale da parte dell'utente sulla Deploy Preview

## ✅ Fase 5 — Post-Collaboration MVP (FASE 0-16)

Merge in `main`: PR #6 (FASE 0-2) + PR #7 (FASE 3-16).
Nessuna migration, nessuna modifica RLS, nessuna modifica di schema.

- [x] FASE 0-2 — reviews + notifications: data layer con RLS, viste
      collaborazione completata, liste notifiche (PR #6)
- [x] FASE 3 — invio deliverable: `lib/submissions/data.ts` + form sulla
      collaborazione attiva. Le piattaforme offerte corrispondono esattamente
      all'enum `platform_type` (`instagram, tiktok, youtube, facebook, x,
      linkedin, other`)
- [x] FASE 4 — campanella notifiche con contatore non lette (Creator e Business)
- [x] FASE 5 — profilo Creator: verifica, livello, collaborazioni completate,
      media valutazioni, storico
- [x] FASE 6 — profilo Business (`/business/profilo`): logo, ragione sociale,
      città, descrizione, sito, Instagram, stato verifica, contatori reali,
      valutazioni ricevute, storico collaborazioni
- [x] FASE 7 — dashboard Business (`/business/dashboard`): experiences
      pubblicate, candidature, collaborazioni attive/completate, creator unici,
      contenuti approvati. Tasso di accettazione = accettate/(accettate+rifiutate),
      "Non disponibile" finché nulla è stato deciso. Nessun ROI/EMV/reach/revenue
- [x] FASE 8 — report Experience (`/business/experiences/[id]/report`) con link
      reali ai contenuti approvati
- [x] FASE 9 — navigazione: nuovo route group `app/business/(app)/` con layout,
      sidebar e bottom nav (prima Candidature e Collaborazioni erano raggiungibili
      solo digitando l'URL). Creator: "Messaggi" sostituito da "Collaborazioni",
      rotta placeholder eliminata
- [x] FASE 10 — rimossi il badge fittizio "75% compatibile" (nessun algoritmo di
      matching esiste) e `lib/demo/experiences.ts` (le Deploy Preview mostravano
      ai tester experiences mock invece di quelle reali)
- [x] FASE 11 — `lib/actions/errors.ts`: gli errori Supabase/PostgREST non
      raggiungono più il browser (niente SQLSTATE, nomi di tabella o di policy).
      `error.tsx`, `not-found.tsx` e skeleton di loading in italiano
- [x] FASE 12 — QA mobile misurata in Chromium reale a 375×812, 390×844,
      430×932, 1280×900: zero overflow orizzontale; corretti i touch target
      dei componenti di questa milestone (l'elimina notifica era 10×16 px)
- [x] FASE 13/15 — 39 asserzioni di sicurezza in
      `tests/integration/50_post_collaboration_tests.sql`: suite RLS **153/153**
      su PostgreSQL 16 reale (era 114)
- [x] FASE 14 — audit timeout: ogni query delle nuove aree è limitata con
      `withTimeout(10_000)`
- [x] FASE 16 — `tests/e2e/anonymous-access.mjs`: 36/36 rotte core

Due difetti trovati dai test e corretti:

- `updateCollaborationStatus` filtrava con `.in('creator_id, business_id', [id])`,
  che non è PostgREST valido: ogni chiamata falliva. Ora `.eq('business_id', user.id)`
- Il flusso di completamento non aveva UI: `canCompleteCollaboration` veniva
  calcolato e mai renderizzato, `updateCollaborationStatus` non era chiamato da
  nessuna parte. Nessuna collaborazione poteva diventare `completed` dal
  prodotto, quindi tutto il flusso post-collaborazione era irraggiungibile

### Limitazioni note della fase 5

- [ ] La policy `collaborations_update_participant` permette a **entrambe** le
      parti di cambiare lo stato: un Creator può auto-completare chiamando l'API
      direttamente e gonfiare il proprio `completed_collaborations_count`.
      Limitazione pre-esistente dichiarata nella migration 004; il mitigante
      applicativo è in `updateCollaborationStatus` (scope `business_id`), la UI
      non lo offre mai a un Creator. Stringere la policy è una modifica RLS,
      fuori dallo scope di questa milestone
- [ ] Test E2E autenticati e verifica RLS sul progetto Supabase hosted —
      **NOT EXECUTED**: `*.supabase.co` è bloccato dalla policy di rete di questo
      ambiente (403 su CONNECT). Da rieseguire dove l'egress è consentito
- [ ] Netlify Production — **NOT VERIFIED** da questo ambiente
- [ ] Touch target sotto i 44 px pre-esistenti e fuori da questa milestone:
      cuore "preferiti" della ExperienceCard (36×36) e i campi di login/signup
      (36-38 px)

## ⬜ Fasi successive (non iniziate — fuori scope)

- [ ] Messaging reale, favorites reali, mappe
- [ ] Pagamenti
- [ ] Integrazioni social (verifica automatica metriche, pubblicazione)
- [ ] Analytics avanzate, recommendation/matching engine

Non iniziare le fasi successive senza indicazione esplicita.
