-- ============================================================================
-- Gym Radar — Phase 4: referrals (who brought whom)
-- Run AFTER schema.sql + multi-tenant.sql.
-- ============================================================================
alter table members add column if not exists referred_by bigint references members(id) on delete set null;
create index if not exists idx_members_referred_by on members(referred_by);
