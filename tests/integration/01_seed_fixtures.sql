-- =============================================================================
-- VAYTU — LOCAL TEST HARNESS ONLY: deterministic fixture data
-- =============================================================================
-- Run as the postgres superuser (bypasses RLS, as any Supabase migration or
-- service_role-driven seed script would). Exercises real INSERT/UPDATE
-- statements against the real trigger logic in 003 (collaboration
-- auto-creation, verification-status sync, notification fan-out, audit
-- logging), so those side effects are also genuinely executed, not assumed.
-- Fixed UUIDs so every test file can reference the same identities.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Identities
-- -----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@vaytu.test'),
  ('22222222-2222-2222-2222-222222222222', 'creator.a@vaytu.test'),
  ('33333333-3333-3333-3333-333333333333', 'creator.b@vaytu.test'),
  ('44444444-4444-4444-4444-444444444444', 'business.a@vaytu.test'),
  ('55555555-5555-5555-5555-555555555555', 'business.b@vaytu.test');

insert into public.profiles (id, role, email, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'admin',    'admin@vaytu.test',      'Admin Vaytu'),
  ('22222222-2222-2222-2222-222222222222', 'creator',  'creator.a@vaytu.test',  'Creator A'),
  ('33333333-3333-3333-3333-333333333333', 'creator',  'creator.b@vaytu.test',  'Creator B'),
  ('44444444-4444-4444-4444-444444444444', 'business', 'business.a@vaytu.test', 'Business A Srl'),
  ('55555555-5555-5555-5555-555555555555', 'business', 'business.b@vaytu.test', 'Business B Srl');

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------
insert into public.creator_levels (id, code, name, sort_order, min_reliability_score) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bronze', 'Bronze', 1, 0),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'silver', 'Silver', 2, 50);

-- -----------------------------------------------------------------------------
-- Creator / business profile extensions
-- -----------------------------------------------------------------------------
insert into public.creator_profiles (id, display_name, city, country, current_level_id) values
  ('22222222-2222-2222-2222-222222222222', 'Creator A', 'Milano', 'IT', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Creator B', 'Roma',   'IT', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.business_profiles (id, company_name, city, country) values
  ('44444444-4444-4444-4444-444444444444', 'Business A Srl', 'Firenze', 'IT'),
  ('55555555-5555-5555-5555-555555555555', 'Business B Srl', 'Napoli',  'IT');

-- -----------------------------------------------------------------------------
-- Creator metrics + private evidence (creator_A only, self-reported)
-- -----------------------------------------------------------------------------
insert into public.creator_metrics (id, creator_id, platform, followers_count, source, is_verified) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'instagram', 12000, 'self_reported', false);

insert into public.creator_metric_evidence (id, metric_id, creator_id, storage_path, file_type) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'evidence/creator-a/insights-2026-08.png', 'image/png');

-- -----------------------------------------------------------------------------
-- Verification requests (creator_A + business_A), then admin approves them
-- to also exercise the *_verifications -> *_profiles sync trigger (003).
-- -----------------------------------------------------------------------------
insert into public.creator_verifications (id, creator_id, document_type, storage_path, status) values
  ('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'id_card', 'evidence/creator-a/id-card.png', 'pending');

insert into public.business_verifications (id, business_id, document_type, storage_path, status) values
  ('eeeeeeee-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'business_registration', 'evidence/business-a/reg.pdf', 'pending');

update public.creator_verifications
  set status = 'verified', reviewed_by = '11111111-1111-1111-1111-111111111111', reviewed_at = now()
  where id = 'dddddddd-0000-0000-0000-000000000001';

update public.business_verifications
  set status = 'verified', reviewed_by = '11111111-1111-1111-1111-111111111111', reviewed_at = now()
  where id = 'eeeeeeee-0000-0000-0000-000000000001';

-- -----------------------------------------------------------------------------
-- Experiences (business_A: one published + one draft; business_B: one published)
-- -----------------------------------------------------------------------------
insert into public.experiences (id, business_id, title, description, compensation_type, status) values
  ('ffffffff-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Weekend in Toscana', 'Soggiorno di 2 notti in agriturismo.', 'free_stay', 'published'),
  ('ffffffff-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'Bozza non pubblicata', 'Ancora in preparazione.',              'free_stay', 'draft'),
  ('ffffffff-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'Cena degustazione a Napoli', 'Menu degustazione per due persone.', 'free_product', 'published');

insert into public.experience_images (id, experience_id, storage_path, is_cover) values
  ('11111111-aaaa-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'experiences/toscana/cover.jpg', true);

insert into public.experience_slots (id, experience_id, start_date, end_date, capacity) values
  ('22222222-aaaa-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', '2026-09-01', '2026-09-03', 2);

-- -----------------------------------------------------------------------------
-- Applications
--   app1: creator_A -> business_A experience, left pending (RLS write tests
--         will accept/withdraw it live).
--   app2: creator_B -> business_B experience, inserted pending then updated
--         to accepted here to genuinely exercise
--         fn_create_collaboration_on_acceptance (auto-creates collaboration2).
-- -----------------------------------------------------------------------------
insert into public.applications (id, experience_id, slot_id, creator_id, business_id, status) values
  ('33333333-aaaa-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', '22222222-aaaa-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'pending');

insert into public.applications (id, experience_id, creator_id, business_id, status) values
  ('33333333-aaaa-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'pending');

update public.applications
  set status = 'accepted', decided_at = now(), decided_by = '55555555-5555-5555-5555-555555555555'
  where id = '33333333-aaaa-0000-0000-000000000002';
-- ^ fires fn_create_collaboration_on_acceptance -> creates a collaborations row
--   (application_id = ...002) and fn_notify_application_decided.

-- -----------------------------------------------------------------------------
-- Deliverable + content submission + metrics on the auto-created collaboration
-- -----------------------------------------------------------------------------
insert into public.collaboration_deliverables (id, collaboration_id, deliverable_type, status)
select '44444444-aaaa-0000-0000-000000000001', c.id, 'instagram_post', 'submitted'
from public.collaborations c where c.application_id = '33333333-aaaa-0000-0000-000000000002';

insert into public.content_submissions (id, deliverable_id, collaboration_id, creator_id, business_id, content_url, platform, status)
select '55555555-aaaa-0000-0000-000000000001', '44444444-aaaa-0000-0000-000000000001', c.id,
       '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
       'https://instagram.com/p/example', 'instagram', 'pending_review'
from public.collaborations c where c.application_id = '33333333-aaaa-0000-0000-000000000002';

insert into public.submission_metrics (id, submission_id, views, likes, source, is_verified) values
  ('66666666-aaaa-0000-0000-000000000001', '55555555-aaaa-0000-0000-000000000001', 5000, 300, 'self_reported', false);

-- Mark the auto-created collaboration completed, to exercise
-- fn_on_collaboration_completed (increments creator_B.completed_collaborations_count).
update public.collaborations
  set status = 'completed'
  where application_id = '33333333-aaaa-0000-0000-000000000002';

-- -----------------------------------------------------------------------------
-- Review left by creator_B about business_B, now that the collaboration is completed
-- -----------------------------------------------------------------------------
insert into public.reviews (id, collaboration_id, reviewer_id, reviewee_id, review_type, rating, comment)
select '77777777-aaaa-0000-0000-000000000001', c.id,
       '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
       'creator_to_business', 5, 'Esperienza ottima, staff disponibile.'
from public.collaborations c where c.application_id = '33333333-aaaa-0000-0000-000000000002';

-- -----------------------------------------------------------------------------
-- Admin note (never visible to creator/business)
-- -----------------------------------------------------------------------------
insert into public.admin_notes (id, target_table, target_id, author_id, note) values
  ('88888888-aaaa-0000-0000-000000000001', 'creator_profiles', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Nota interna: profilo da monitorare.');
