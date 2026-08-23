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

## ⬜ Fasi successive (non iniziate — fuori scope di questa sessione)

- [ ] Backend/API
- [ ] Frontend/UI
- [ ] Autenticazione/onboarding applicativo (signup flow, gestione sessione)
- [ ] Pagamenti
- [ ] Integrazioni social (verifica automatica metriche, pubblicazione)
- [ ] Admin panel

Non iniziare le fasi successive senza indicazione esplicita.
