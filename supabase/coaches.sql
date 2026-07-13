-- ============================================================================
-- Gym Radar — Coaches: profiles, salary payments, attendance
-- Run AFTER schema.sql + multi-tenant.sql.
-- Coach salary payments count as expenses (reduce profit).
-- ============================================================================
create table if not exists coaches (
  id      bigint generated always as identity primary key,
  gym_id  uuid not null default my_gym(),
  name    text not null,
  phone   text,
  salary  numeric not null default 0,   -- monthly base (for reference / default pay)
  active  boolean not null default true,
  notes   text
);

create table if not exists coach_payments (
  id        bigint generated always as identity primary key,
  gym_id    uuid not null default my_gym(),
  coach_id  bigint references coaches(id) on delete cascade,
  amount    numeric not null,
  date      date not null default current_date,
  note      text
);

create table if not exists coach_attendance (
  id        bigint generated always as identity primary key,
  gym_id    uuid not null default my_gym(),
  coach_id  bigint references coaches(id) on delete cascade,
  at        timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['coaches','coach_payments','coach_attendance']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists gym_all on %I;', t);
    execute format('create policy gym_all on %I for all to authenticated using (gym_id = my_gym()) with check (gym_id = my_gym());', t);
  end loop;
end $$;
create index if not exists idx_cpay_coach on coach_payments(coach_id);
create index if not exists idx_cpay_gym_date on coach_payments(gym_id, date);
create index if not exists idx_catt_coach on coach_attendance(coach_id);
