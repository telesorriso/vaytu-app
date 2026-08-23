-- =============================================================================
-- VAYTU — Migration 009: Seed the canonical Vaytu Level ladder
-- =============================================================================
-- Purpose : creator_levels (001-006) was created empty. The Admin
--           verification panel needs the four canonical levels to exist so
--           an admin can manually assign one to a creator. Reference-data
--           seed only — no schema change, idempotent (safe to re-run).
-- Order   : Run AFTER 001-008.
-- =============================================================================

insert into public.creator_levels (code, name, sort_order, description)
values
  ('explorer', 'Explorer', 1, 'Livello iniziale per ogni Creator verificato.'),
  ('insider', 'Insider', 2, 'Creator con uno storico di collaborazioni positive.'),
  ('select', 'Select', 3, 'Creator selezionato per affidabilità e qualità costante.'),
  ('icon', 'Icon', 4, 'Livello massimo, assegnato manualmente dall''Admin ai Creator di punta.')
on conflict (code) do nothing;
