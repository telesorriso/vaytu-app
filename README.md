# VAYTU

VAYTU è il marketplace che mette in contatto **Creator** e **Business** per
collaborazioni basate su esperienze (soggiorni, prodotti, eventi...) in
cambio di contenuti social.

Questo repository è l'unica fonte ufficiale del codice di VAYTU.

## Stato del progetto

🚧 **Fase attuale: APPLICATION FOUNDATION.** Database (fase 1) e scheletro
applicativo Next.js + Supabase Auth (fase 2) sono completati. Onboarding,
Esperienze, pagamenti, integrazioni social e design completo **non sono
ancora stati iniziati** — vedi `/PROJECT.md` e `/TODO.md`.

## Struttura del repository

```
/app/                     Rotte Next.js (App Router): /, /login, /signup, /creator, /business, /admin
/lib/supabase/             Client Supabase (browser, server, sessione per proxy.ts)
/lib/auth/                 Data Access Layer — verifica ruolo server-side (RLS come ultimo livello)
proxy.ts                   Refresh sessione + redirect ottimistico (Next.js 16, ex "middleware.ts")
/supabase/migrations/     Migration SQL canoniche (001 -> 006)
/tests/integration/        Harness di test RLS eseguito realmente (PostgreSQL locale)
/docs/                     Documentazione tecnica
  DATABASE.md              Schema, entità, come eseguire migration e test
  SECURITY_MODEL.md         Modello di sicurezza, ruoli, RLS, colonne protette
PROJECT.md                 Visione di prodotto e roadmap per fasi
TODO.md                    Stato di avanzamento dettagliato
.env.example                Variabili d'ambiente pubbliche richieste (nessun secret)
```

## Avvio rapido (applicazione)

```bash
npm install
cp .env.example .env.local   # compila con URL + anon key del progetto Supabase (vedi .env.example)
npm run dev
npm run build      # build di produzione
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Requisiti

- PostgreSQL >= 15 (target di produzione: Supabase)
- Per eseguire i test locali: PostgreSQL 16 con `psql`, un utente con
  privilegio `CREATEDB` (es. `postgres`)

## Avvio rapido (fase database)

Applicare le migration su un progetto Supabase vuoto, **in quest'ordine**:

```
supabase/migrations/001_init_enums.sql
supabase/migrations/002_create_tables.sql
supabase/migrations/003_indexes_constraints_triggers.sql
supabase/migrations/004_rls_policies.sql
```

Eseguire la suite di test RLS in locale (PostgreSQL, non Supabase reale —
vedi `/tests/integration/README.md`):

```bash
sudo -u postgres tests/integration/run_all.sh
```

## Sicurezza

- Row Level Security attiva su tutte le tabelle. Dettagli completi in
  `/docs/SECURITY_MODEL.md`.
- La `SUPABASE_SERVICE_ROLE_KEY` non deve **mai** essere committata né
  esposta al browser: vedi `.gitignore` e `/docs/SECURITY_MODEL.md` §6.

## Documentazione

- [`PROJECT.md`](./PROJECT.md) — visione di prodotto, ruoli, roadmap per fasi
- [`TODO.md`](./TODO.md) — stato di avanzamento dettagliato
- [`docs/DATABASE.md`](./docs/DATABASE.md) — riferimento tecnico dello schema
- [`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md) — modello di sicurezza
- [`tests/integration/README.md`](./tests/integration/README.md) — metodologia di test
