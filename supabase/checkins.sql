-- ============================================================================
-- Gym Radar — Phase 1: check-ins (QR gate + attendance + at-risk retention)
-- Run AFTER schema.sql + multi-tenant.sql (+ auto-provision.sql).
-- Each scan/check-in is one row; gym_id auto-fills and RLS keeps gyms isolated.
-- ============================================================================
create table if not exists checkins (
  id         bigint generated always as identity primary key,
  gym_id     uuid not null default my_gym(),
  member_id  bigint references members(id) on delete cascade,
  at         timestamptz not null default now()
);

alter table checkins enable row level security;
drop policy if exists gym_all on checkins;
create policy gym_all on checkins for all to authenticated
  using (gym_id = my_gym()) with check (gym_id = my_gym());

create index if not exists idx_checkins_member on checkins(member_id);
create index if not exists idx_checkins_gym_at on checkins(gym_id, at);
