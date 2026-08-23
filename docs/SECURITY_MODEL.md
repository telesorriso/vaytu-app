# VAYTU — Security Model (fase database)

## 1. Ruoli

Tre ruoli applicativi, memorizzati in `public.profiles.role` (enum
`app_role`): **Creator**, **Business**, **Admin**. Sono distinti dai ruoli
Postgres di Supabase (`anon`, `authenticated`, `service_role`): ogni utente
autenticato (Creator/Business/Admin) arriva al database come Postgres role
`authenticated`; le policy RLS usano `public.is_admin()` /
`public.is_creator()` / `public.is_business()` (funzioni `SECURITY DEFINER`
che leggono `profiles.role` per `auth.uid()`) per distinguerli riga per
riga.

`service_role` **non compare in nessuna policy**: ha `BYPASSRLS` su
Supabase per definizione ed è riservato a codice server-side fidato. Vedi
§6.

## 2. Principio generale

Ogni tabella ha `ENABLE ROW LEVEL SECURITY` e **nessuna policy permissiva
di default**: se nessuna policy match, l'accesso è negato. Le policy sono
scritte per comando (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) invece di un
generico `FOR ALL`, tranne dove il comportamento è davvero identico (es.
`admin_notes_all_admin`), per rendere esplicito ciò che ogni ruolo può fare.

Due livelli di controllo, entrambi necessari:

1. **GRANT a livello di tabella** (`004_rls_policies.sql`, Sezione 0) — il
   cancello esterno. Es. `anon` non ha alcun privilegio su `profiles`:
   anche prima che RLS venga valutata, la query fallisce con
   `permission denied`.
2. **Policy RLS** — il cancello interno, riga per riga.

## 3. Requisiti espliciti e dove sono implementati

| Requisito | Implementazione |
|---|---|
| Creator vede/modifica solo ciò che gli compete | Policy `*_select_self` / `*_update_self` basate su `id = auth.uid()` o `creator_id = auth.uid()` su ogni tabella creator-scoped |
| Creator non può modificare metriche verificate, verification status, Vaytu Level, reliability score | Trigger `protect_creator_protected_fields` (003) su `creator_profiles`; nessuna policy `UPDATE` per Creator su `creator_metrics`/`submission_metrics` (004) |
| Creator non vede evidence o dati privati di altri Creator | `creator_metric_evidence`, `creator_verifications`: solo `creator_id = auth.uid()` o admin, **mai** altri Creator; `creator_profiles`: visibile solo a sé stesso, admin, Business — mai ad altri Creator |
| Business non vede screenshot Insights grezzi, verification evidence, admin notes, dati Creator non necessari | Nessuna policy `SELECT` per Business su `creator_metric_evidence`, `creator_verifications`, `admin_notes`; `creator_metrics` (dati aggregati, non le evidence) resta visibile a scopo di vetting |
| Business gestisce solo le proprie Experiences e Applications/Collaborations correlate | Ownership via `business_id = auth.uid()` su `experiences`, `applications`, `collaborations`, `collaboration_deliverables`, `content_submissions` |
| Admin ha accesso alle funzioni amministrative | Policy `*_admin` dedicate su ogni tabella (`using (public.is_admin())`) |
| `audit_log` non scrivibile arbitrariamente dal client | Nessuna policy `INSERT`/`UPDATE`/`DELETE` per **nessun** ruolo client (nemmeno admin); solo GRANT `SELECT` a `authenticated`, ristretto ad admin da RLS. Le uniche righe sono scritte dal trigger `fn_audit_log()` (`SECURITY DEFINER`, bypassa RLS come owner della tabella) |
| `SUPABASE_SERVICE_ROLE_KEY` mai esposta al browser né committata | `.gitignore` esclude `.env*` e pattern `*SERVICE_ROLE_KEY*`; nessuna chiave è mai stata scritta in questo repository. Vedi §6 |
| Soft delete non descritto come automaticamente GDPR compliant | Vedi §7 |

## 4. Colonne protette (dettaglio tecnico)

RLS opera a livello di riga. Per impedire che un utente autorizzato a fare
`UPDATE` sulla propria riga alteri anche colonne "di sistema" nella stessa
istruzione, si usano trigger `BEFORE UPDATE` che confrontano `OLD`/`NEW`
per colonna e sollevano `RAISE EXCEPTION ... errcode = '42501'` (lo stesso
codice usato da Postgres per le violazioni RLS, così il client li tratta
allo stesso modo) quando una colonna protetta cambia e il chiamante non è
admin né dentro un "trusted system context".

Il **trusted system context** (`public.is_trusted_system_context()`) è un
flag di sessione (`vaytu.system_context`, impostato con
`set_config(..., true)` quindi automaticamente locale alla transazione)
attivato solo dai trigger interni fidati (es. incremento di
`completed_collaborations_count` alla chiusura di una collaboration). Non è
mai impostabile dal client.

## 5. `creator_metric_evidence` vs `content_submissions`

Distinzione volutamente esplicita nello schema, perché il requisito le
tratta diversamente:

- `creator_metric_evidence`: prova privata del profilo (es. screenshot
  Instagram Insights per dimostrare i follower dichiarati). **Mai**
  visibile a Business o ad altri Creator.
- `content_submissions`: la consegna stessa di una collaborazione (link al
  post pubblicato). È corretto che il Business coinvolto la veda: è
  l'oggetto della collaborazione, non un dato privato di vetting.

## 6. `service_role` / chiavi

- Nessuna migration, trigger o policy fa riferimento a segreti o chiavi.
- `.gitignore` esclude esplicitamente `.env*` e ogni pattern
  `*SERVICE_ROLE_KEY*`/`*.pem`/`*.key`.
- Raccomandazione per le fasi successive (fuori scope qui): la
  `service_role` key va usata **solo** in codice server-side (Edge
  Functions, backend), mai in bundle spediti al browser; ogni chiamata
  amministrativa dal frontend deve passare da un endpoint server-side che
  verifica `is_admin()` prima di usare `service_role`.

## 7. Soft delete non è compliance GDPR

`profiles.deleted_at` (e `experiences.deleted_at`) permette un soft delete:
la riga resta nel database ma viene esclusa dalle query applicative (es.
`experiences_select_public` filtra `deleted_at is null`). **Questo non
costituisce, da solo, cancellazione ai sensi del GDPR (diritto
all'oblio)**: i dati personali restano fisicamente memorizzati,
raggiungibili da admin/service_role, e continuano a comparire in
`audit_log`, `creator_metric_evidence` (storage path), backup, ecc. Una
reale procedura di erasure richiederà, in una fase successiva:

- cancellazione fisica (hard delete) o anonimizzazione dei campi personali;
- rimozione dei file collegati in Storage;
- gestione esplicita di cosa succede a `audit_log` (che per natura è
  un registro storico) e ai dati necessari per obblighi legali/fiscali;
- un processo documentato e verificabile, non solo un flag booleano.

## 8. Cosa NON è stato validato in questa fase

- Nessun progetto Supabase reale è stato usato: i test RLS sono stati
  eseguiti su PostgreSQL 16 locale con un'emulazione minimale dello schema
  `auth` (vedi `/docs/DATABASE.md` §6 e `/tests/integration/README.md`).
  GoTrue (emissione/verifica JWT reale), Storage, Realtime e il
  connection-pooling via PgBouncer di Supabase non sono stati esercitati.
- Non sono stati stimati/validati costi, quota, o limiti del piano
  Supabase.
- Nessun test di carico o di concorrenza.
