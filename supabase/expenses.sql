-- ============================================================================
-- Gym Radar — Phase 2: expenses (for profit = revenue − expenses)
-- Run AFTER schema.sql + multi-tenant.sql.
-- ============================================================================
create table if not exists expenses (
  id        bigint generated always as identity primary key,
  gym_id    uuid not null default my_gym(),
  amount    numeric not null,
  category  text default 'other',   -- rent | salaries | equipment | utilities | other
  note      text,
  date      date not null default current_date
);
alter table expenses enable row level security;
drop policy if exists gym_all on expenses;
create policy gym_all on expenses for all to authenticated
  using (gym_id = my_gym()) with check (gym_id = my_gym());
create index if not exists idx_expenses_gym_date on expenses(gym_id, date);
