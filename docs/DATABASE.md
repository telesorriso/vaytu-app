# VAYTU — Database Reference

Questo documento descrive lo schema PostgreSQL/Supabase di VAYTU realizzato
nella **fase database** del progetto. Copre solo il database: nessuna UI,
nessun pagamento, nessuna integrazione social è stata implementata in questa
fase.

## 1. Stack e principi

- **Motore**: PostgreSQL (target: Supabase, versione >= 15).
- **Chiavi primarie**: `uuid`, generate con `gen_random_uuid()` (built-in dal
  core Postgres 13+, nessuna estensione richiesta).
- **Sicurezza**: Row Level Security (RLS) attiva su **tutte** le 20 tabelle,
  nessuna eccezione.
- **Niente materialized view, niente ottimizzazioni premature**: per l'MVP
  si usano solo indici semplici su colonne FK/filtro e (dove utile) indici
  parziali (es. notifiche non lette).

## 2. Ordine delle migration

Le migration in `/supabase/migrations/` sono **canoniche e complete**:
nessun placeholder, nessuna patch successiva, nessun riferimento a file
precedenti da modificare. Vanno eseguite in quest'ordine su un database
Supabase vuoto:

1. `001_init_enums.sql` — 14 tipi ENUM
2. `002_create_tables.sql` — 20 tabelle (solo forma: PK, FK, NOT NULL, default)
3. `003_indexes_constraints_triggers.sql` — indici, CHECK/UNIQUE aggiuntivi,
   funzioni helper di sicurezza, trigger `updated_at`, trigger di
   protezione colonne, audit log, notifiche, macchina a stati
   application → collaboration
4. `004_rls_policies.sql` — GRANT di base + `ENABLE ROW LEVEL SECURITY` +
   tutte le policy

In un progetto Supabase reale si applicano con `supabase db push` (o
incollandole nell'SQL editor nell'ordine sopra). Il flusso è stato
**eseguito realmente** (non solo validato staticamente) su PostgreSQL 16
locale — vedi `/tests/integration/README.md` per i dettagli.

## 3. Le 20 entità

| Tabella | Scopo |
|---|---|
| `profiles` | Riga 1:1 per ogni `auth.users`, dati identità/contatto privati, `role` (creator/business/admin) |
| `creator_levels` | Tabella di riferimento "Vaytu Level" (Bronze/Silver/...), gestita solo da admin |
| `creator_profiles` | Estensione pubblica-ish del profilo Creator (bio, città, livello, reliability score) |
| `business_profiles` | Estensione pubblica del profilo Business (ragione sociale, sito, verifica) |
| `creator_metrics` | Metriche social dichiarate/verificate per piattaforma (follower, engagement...) |
| `creator_metric_evidence` | File di prova (screenshot Insights) — **strettamente privati** |
| `creator_verifications` | Richieste di verifica identità Creator + evidence |
| `business_verifications` | Richieste di verifica azienda Business + evidence |
| `experiences` | Annunci pubblicati da un Business |
| `experience_images` | Galleria immagini di un'experience |
| `experience_slots` | Finestre di date prenotabili per un'experience |
| `applications` | Candidatura di un Creator a un'experience |
| `collaborations` | Collaborazione confermata (creata automaticamente all'accettazione) |
| `collaboration_deliverables` | Singolo contenuto atteso in una collaborazione |
| `content_submissions` | Prova del contenuto pubblicato dal Creator |
| `submission_metrics` | Metriche di performance di un content submission |
| `reviews` | Recensione 1-5 tra le due parti di una collaborazione completata |
| `notifications` | Notifiche in-app, scritte solo da trigger/admin, mai dal client |
| `admin_notes` | Note interne admin, polimorfiche, mai visibili a Creator/Business |
| `audit_log` | Log di sistema append-only, scritto solo da trigger `SECURITY DEFINER` |

## 4. Denormalizzazione intenzionale

Alcune tabelle duplicano `creator_id`/`business_id` anche se raggiungibili
tramite join (es. `applications.business_id`, `collaborations.business_id`,
`content_submissions.creator_id`/`business_id`). È una scelta deliberata:
mantiene le policy RLS semplici, leggibili e senza join, il che le rende
anche più veloci e più facili da verificare per correttezza. Il costo è la
responsabilità applicativa di mantenere questi campi coerenti in fase di
INSERT — mitigato dai controlli `WITH CHECK` che confrontano il valore
denormalizzato con quello reale dell'entità collegata (vedi
`applications_insert_creator` in `004_rls_policies.sql`).

## 5. Colonne "protette" e come sono davvero protette

RLS lavora a livello di **riga**, non di colonna: una policy che permette a
un Creator di fare `UPDATE` sulla propria riga non può, da sola, impedirgli
di cambiare anche `reliability_score` nella stessa istruzione. Per questo:

- `creator_profiles.current_level_id`, `reliability_score`,
  `verification_status`, `completed_collaborations_count`
- `business_profiles.verification_status`
- `profiles.role`, `profiles.is_active`

sono protette da **trigger `BEFORE UPDATE`** (`003_indexes_constraints_triggers.sql`)
che confrontano `OLD` e `NEW` e sollevano un'eccezione (`errcode 42501`) se
il chiamante non è admin né un contesto di sistema fidato
(`public.is_trusted_system_context()`, un flag di sessione impostato solo
dai trigger interni come la creazione automatica di una collaboration).

`creator_metrics` e `submission_metrics` seguono un approccio più semplice:
i Creator hanno **solo** `INSERT`/`SELECT`/`DELETE` (quest'ultimo solo su
righe non ancora verificate), **mai** `UPDATE` — quindi non serve un
trigger, i campi di verifica sono raggiungibili solo dalla policy admin.

## 6. Esecuzione locale e test

Non esiste un ambiente Supabase reale collegato a questa sessione. Per
validare realmente lo schema (non solo a livello statico) è stato costruito
un harness di test in `/tests/integration/` che:

1. emula la fetta minima di Supabase da cui le migration dipendono (schema
   `auth`, `auth.uid()/auth.role()/auth.jwt()`, ruoli
   `anon`/`authenticated`/`service_role`) su PostgreSQL 16 locale — **non**
   è un test su un progetto Supabase reale (nessun GoTrue/Storage/Realtime);
2. applica le 4 migration canoniche **invariate**;
3. carica dati di fixture deterministici;
4. esegue 114 asserzioni ALLOW/DENY reali per i 6 ruoli richiesti
   (anonymous, creator_A, creator_B, business_A, business_B, admin).

```bash
sudo -u postgres tests/integration/run_all.sh
```

Vedi `/tests/integration/README.md` per il dettaglio metodologico e la
distinzione tra STATIC VALIDATION, EXECUTED TEST e NOT EXECUTED.

## 7. Known MVP limitations (dichiarate esplicitamente)

- Le transizioni di stato di `collaborations` (`active`/`completed`/
  `cancelled`/`disputed`) sono vincolate solo per appartenenza (le due
  parti coinvolte), non da una vera macchina a stati lato RLS: un
  raffinamento è rimandato a una fase successiva.
- Nessuna directory pubblica dei Creator: la visibilità di
  `creator_profiles` è volutamente conservativa (proprietario, admin,
  qualunque Business — mai altri Creator). Una vista pubblica curata potrà
  essere aggiunta in futuro senza toccare le tabelle base.
- Nessuna vista/materialized view di aggregazione: per l'MVP le query di
  reporting vanno scritte lato applicazione.
- Questo test harness NON sostituisce un test su un vero progetto Supabase
  (GoTrue, Storage, Realtime, connection pooling via PgBouncer non sono
  emulati). Prima del go-live va eseguita almeno una migration reale su un
  progetto Supabase di staging.
