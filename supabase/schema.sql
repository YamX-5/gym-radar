-- ============================================================================
-- Gym Radar — Supabase schema  (RUN THIS IN: Supabase → SQL Editor → New query)
-- Written to match the app's data model 1:1. Single project = single gym.
-- (Multi-gym/white-label notes at the bottom.)
-- ============================================================================

-- ---------- tables ----------
create table if not exists members (
  id           bigint generated always as identity primary key,
  full_name    text not null,
  phone        text,
  gender       text default 'male',
  birth_date   date,
  photo        text,
  join_date    date not null default current_date,
  notes        text,
  status       text not null default 'active',
  created_at   timestamptz default now()
);

create table if not exists plans (
  id        bigint generated always as identity primary key,
  name      text not null,
  type      text not null default 'duration',   -- duration | session
  days      int,
  sessions  int,
  price     numeric not null default 0,
  active    boolean not null default true
);

create table if not exists subscriptions (
  id              bigint generated always as identity primary key,
  member_id       bigint references members(id) on delete cascade,
  plan_id         bigint references plans(id),
  plan_name       text,
  start_date      date not null,
  end_date        date,
  sessions_total  int,
  sessions_used   int default 0,
  price_paid      numeric default 0,
  status          text default 'active',
  created_at      timestamptz default now()
);

create table if not exists payments (
  id               bigint generated always as identity primary key,
  member_id        bigint references members(id) on delete cascade,
  subscription_id  bigint references subscriptions(id) on delete set null,
  amount           numeric not null,
  date             date not null default current_date,
  method           text default 'cash',   -- cash | cliq | other
  receipt          text,
  note             text
);

create table if not exists debts (
  id            bigint generated always as identity primary key,
  member_id     bigint references members(id) on delete cascade,
  amount        numeric not null,
  created_date  date not null default current_date,
  reason        text,
  status        text not null default 'open',   -- open | paid
  paid_date     date
);

create table if not exists reminders (
  id         bigint generated always as identity primary key,
  member_id  bigint references members(id) on delete cascade,
  kind       text not null,       -- pre_expiry | expired | debt
  sent_date  date not null default current_date
);

create table if not exists app_settings (
  key    text primary key,
  value  text
);

create index if not exists idx_sub_member on subscriptions(member_id);
create index if not exists idx_pay_member on payments(member_id);
create index if not exists idx_pay_date   on payments(date);
create index if not exists idx_debt_member on debts(member_id);

-- ---------- atomic receipt numbers  GYM-2026-0001 ----------
create table if not exists receipt_counter (year int primary key, seq int not null default 0);

create or replace function next_receipt() returns text
language plpgsql security definer as $$
declare y int := extract(year from now())::int; n int;
begin
  insert into receipt_counter(year, seq) values (y, 1)
  on conflict (year) do update set seq = receipt_counter.seq + 1
  returning seq into n;
  return 'GYM-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- ============================================================================
-- Row-Level Security
-- Simple start: any signed-in staff member can use the app (one gym).
-- ============================================================================
alter table members       enable row level security;
alter table plans         enable row level security;
alter table subscriptions enable row level security;
alter table payments      enable row level security;
alter table debts         enable row level security;
alter table reminders     enable row level security;
alter table app_settings  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','plans','subscriptions','payments','debts','reminders','app_settings']
  loop
    execute format('drop policy if exists staff_all on %I;', t);
    execute format('create policy staff_all on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

grant execute on function next_receipt() to authenticated;

-- ============================================================================
-- OPTIONAL — quick insecure test WITHOUT building login yet.
-- Uncomment to let the anon key read/write directly (PRIVATE TESTING ONLY —
-- anyone with the URL could write). Remove before real use, then use Auth.
-- ----------------------------------------------------------------------------
-- do $$ declare t text; begin
--   foreach t in array array['members','plans','subscriptions','payments','debts','reminders','app_settings']
--   loop execute format('create policy anon_all on %I for all to anon using (true) with check (true);', t); end loop;
-- end $$;
-- grant execute on function next_receipt() to anon;

-- ============================================================================
-- LATER — multi-gym (white-label SaaS):
--   1. add `gym_id uuid` to every table above.
--   2. table gyms(id uuid pk, name text, owner uuid) + staff(user_id, gym_id, role).
--   3. replace the staff_all policies with:
--        using (gym_id = (select gym_id from staff where user_id = auth.uid()))
--   4. role (admin/reception) → a column in staff; gate revenue with a policy or a view.
-- ============================================================================
