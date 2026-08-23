# VAYTU — Visione di prodotto

## Cos'è VAYTU

VAYTU è un marketplace che connette:

- **Creator**: content creator (Instagram, TikTok, YouTube...) che cercano
  esperienze (soggiorni, prodotti, eventi) in cambio di contenuti.
- **Business**: aziende (hotel, ristoranti, brand...) che pubblicano
  esperienze e cercano Creator per promuoverle.
- **Admin**: gestisce verifiche, livelli, moderazione e supervisione della
  piattaforma.

Flusso di base: un Business pubblica una **Experience**; un Creator si
candida (**Application**); se accettata, nasce una **Collaboration** con
uno o più **Deliverable** attesi; il Creator carica la prova del contenuto
pubblicato (**Content Submission**); a collaborazione completata, le due
parti si lasciano una **Review**.

## Ruoli applicativi

| Ruolo | Cosa può fare (in sintesi) |
|---|---|
| Creator | Gestire il proprio profilo, candidarsi alle experience, consegnare contenuti, lasciare recensioni sulle proprie collaborazioni |
| Business | Pubblicare experience, valutare candidature, gestire le proprie collaborazioni, revisionare i contenuti consegnati |
| Admin | Verificare identità/aziende, gestire i Vaytu Level, moderare, accedere all'audit log |

Il modello di sicurezza completo (chi vede/modifica cosa) è in
[`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md).

## Roadmap per fasi

Ogni fase è un blocco di lavoro separato. **Questa sessione ha coperto
esclusivamente la fase 1.**

1. ✅ **Database (MVP)** — schema PostgreSQL/Supabase, RLS, migration
   canoniche, test RLS eseguiti realmente. *(questa sessione)*
2. ⬜ **Backend/API** — non iniziato
3. ⬜ **Frontend/UI** — non iniziato
4. ⬜ **Autenticazione/onboarding applicativo** — non iniziato (solo lo
   schema dati è pronto: `profiles`, `creator_profiles`,
   `business_profiles`)
5. ⬜ **Pagamenti** — non iniziato
6. ⬜ **Integrazioni social** (verifica automatica metriche, pubblicazione
   contenuti) — non iniziato
7. ⬜ **Moderazione/admin panel** — non iniziato (solo lo schema dati è
   pronto: `admin_notes`, `*_verifications`, `audit_log`)

Non procedere alle fasi successive senza indicazione esplicita.

## Cosa esiste già a livello di dati (fase 1)

Le 20 entità dello schema sono descritte in dettaglio in
[`docs/DATABASE.md`](./docs/DATABASE.md). In sintesi coprono: identità e
profili (Creator/Business), metriche social e relativa evidence privata,
verifiche identità/azienda, il sistema di Vaytu Level, experience e loro
slot/immagini, il ciclo candidatura → collaborazione → deliverable →
content submission → metriche → review, notifiche, note admin e audit log.
