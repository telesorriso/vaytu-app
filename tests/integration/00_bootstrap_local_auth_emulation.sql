-- =============================================================================
-- VAYTU — LOCAL TEST HARNESS ONLY (NOT a canonical migration, NOT deployed
-- to Supabase). Do not run this against a real Supabase project.
-- =============================================================================
-- Purpose : Reproduce, on a plain local PostgreSQL 16 instance, the minimal
--           slice of Supabase's platform that the canonical migrations in
--           /supabase/migrations and their RLS policies depend on:
--             - schema `auth` with a `auth.users` table
--             - auth.uid() / auth.role() / auth.jwt() functions, reading the
--               same `request.jwt.claims` session GUC Supabase's PostgREST
--               layer sets on every request
--             - the anon / authenticated / service_role Postgres roles
--           This lets the 4 canonical migrations run UNCHANGED against a
--           real PostgreSQL engine so RLS, triggers, constraints and
--           functions can be executed for real — not just statically
--           reviewed. It does NOT emulate GoTrue, Storage, Realtime, or
--           actual JWT signing/verification.
-- =============================================================================

create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  encrypted_password text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Mirrors supabase/gotrue's real implementation: reads the 'sub' claim off
-- the request.jwt.claims session-local JSON GUC set per-request by PostgREST.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
