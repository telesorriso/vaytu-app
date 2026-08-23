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

### Limitazioni note della fase 3

- [ ] Test E2E completi (signup → onboarding → verifica admin → dashboard)
      contro Supabase reale — **NOT EXECUTED**, stesso blocco di rete della
      fase 2 (`*.supabase.co` non raggiungibile da questo sandbox)
- [ ] Deploy Preview Netlify — **NOT EXECUTED**, connector non collegato
- [ ] Autosave è a livello di "intero step" (debounced, tutti i campi testo
      dello step corrente), non per singolo campo isolato — scelta
      pragmatica, vedi report della fase
- [ ] Nessuna UI per re-inviare la candidatura dopo un rifiuto (la pagina di
      stato mostra il motivo ma non riapre lo stepper) — rimandato

## ⬜ Fasi successive (non iniziate — fuori scope di questa sessione)

- [ ] Esperienze (creazione, candidature, collaborazioni) lato UI
- [ ] UI/design completo
- [ ] Pagamenti
- [ ] Integrazioni social (verifica automatica metriche, pubblicazione)
- [ ] Reporting/analytics

Non iniziare le fasi successive senza indicazione esplicita.
