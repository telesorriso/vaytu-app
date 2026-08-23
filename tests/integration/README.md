# VAYTU — Integration/RLS test harness

Questa cartella contiene un harness di test **eseguito realmente** contro
PostgreSQL 16 locale, non solo una revisione statica dell'SQL.

## Cosa dimostra, cosa no

**Dimostra (EXECUTED TEST, PostgreSQL 16 locale reale):**
- le 4 migration canoniche in `/supabase/migrations/` girano senza errori,
  nell'ordine dichiarato, su un database vuoto;
- tutti i vincoli (CHECK/UNIQUE/FK), i trigger (protezione colonne, audit
  log, notifiche, macchina a stati application→collaboration, sync
  verification status) e le 113 policy RLS funzionano davvero, non solo
  "sembrano corrette a lettura";
- 114 asserzioni ALLOW/DENY per 6 ruoli (anonymous, creator_A, creator_B,
  business_A, business_B, admin) passano realmente.

**NON dimostra (NOT EXECUTED in questa fase):**
- comportamento su un vero progetto Supabase (GoTrue reale con JWT firmati
  e verificati, Storage, Realtime, connection pooling via PgBouncer);
- performance/carico/concorrenza;
- costi o limiti di piano.

Lo schema `auth` e le funzioni `auth.uid()/auth.role()/auth.jwt()` usate qui
sono un'**emulazione locale minimale** (file `00_bootstrap_local_auth_emulation.sql`),
non il vero GoTrue di Supabase. Le 4 migration canoniche restano identiche a
quelle che girerebbero su un progetto Supabase reale: solo l'ambiente di
test attorno è emulato.

## Struttura

| File | Scopo |
|---|---|
| `00_bootstrap_local_auth_emulation.sql` | Emula schema `auth` + ruoli Postgres `anon`/`authenticated`/`service_role` (SOLO test locale) |
| `01_seed_fixtures.sql` | Dati deterministici: 1 admin, 2 creator, 2 business, experiences, applications, una collaboration completata, review, ecc. |
| `02_test_helpers.sql` | Schema `testing` (nessuna RLS) + funzioni di asserzione `expect_select_count`, `expect_denied_select`, `expect_allowed_write`, `expect_denied` |
| `10_rls_test_anonymous.sql` | 17 asserzioni per il ruolo Postgres `anon` |
| `20_rls_test_creator_a.sql` | 30 asserzioni per creator_A |
| `21_rls_test_creator_b.sql` | 18 asserzioni per creator_B |
| `30_rls_test_business_a.sql` | 18 asserzioni per business_A |
| `31_rls_test_business_b.sql` | 15 asserzioni per business_B |
| `40_rls_test_admin.sql` | 16 asserzioni per admin |
| `run_all.sh` | Ricostruisce il DB da zero ed esegue tutto in sequenza |

## Come funzionano le asserzioni

Ogni test esegue una query/istruzione **reale** con il ruolo Postgres e il
claim JWT simulato (`SET ROLE ...` + `SET request.jwt.claims = '...'`)
corrispondenti allo scenario, poi:

- `expect_select_count(ruolo, nome, query, atteso)` — conta le righe
  visibili e le confronta con l'atteso (ALLOW/scoping).
- `expect_denied_select(ruolo, nome, query)` — passa se la query è
  bloccata dal GRANT di tabella (`permission denied`, SQLSTATE 42501) **o**
  se scorre ma restituisce 0 righe (bloccata da RLS). Qualunque riga
  visibile è FAIL.
- `expect_allowed_write(ruolo, nome, sql)` — esegue davvero
  l'INSERT/UPDATE/DELETE, verifica che affetti ≥1 riga senza errori, poi
  lo annulla sempre (savepoint interno) così i fixture restano puliti per
  gli altri file di test.
- `expect_denied(ruolo, nome, sql)` — passa se l'istruzione solleva una
  violazione RLS/privilegi (42501) **o** se scorre senza errori ma affetta
  0 righe (riga resa invisibile da `USING`). Qualunque mutazione reale è
  trattata come FAIL e viene comunque annullata.

Nessun test dichiara PASS senza aver eseguito realmente la query.

## Eseguire i test

Richiede un'istanza PostgreSQL locale raggiungibile e un utente con
`CREATEDB` (qui usiamo il superuser `postgres` di sistema):

```bash
sudo -u postgres tests/integration/run_all.sh
```

Variabile opzionale `VAYTU_TEST_DB` per cambiare il nome del database di
lavoro (default `vaytu_test`; viene droppato e ricreato ad ogni run).

## Ultimo risultato registrato

Eseguito il 2026-08-23 contro PostgreSQL 16.13, dopo ricostruzione completa
del database e applicazione delle 4 migration canoniche invariate:

```
role        | passed | failed | total
------------+--------+--------+------
admin       |     16 |      0 |    16
anonymous   |     17 |      0 |    17
business_A  |     18 |      0 |    18
business_B  |     15 |      0 |    15
creator_A   |     30 |      0 |    30
creator_B   |     18 |      0 |    18
------------+--------+--------+------
TOTAL: 114/114 passed, 0 failed
```
