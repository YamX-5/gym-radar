-- ============================================================================
-- Gym Radar — MULTI-TENANT upgrade (white-label SaaS)
-- Run AFTER schema.sql. Turns the single-gym DB into isolated per-gym tenants.
-- After this, remove anon-testing.sql's policies (this script drops them) and
-- every request must be an authenticated gym account.
-- ============================================================================

-- ---------- tenants + membership ----------
create table if not exists gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists staff (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  gym_id   uuid not null references gyms(id) on delete cascade,
  role     text not null default 'admin'        -- admin | reception
);

-- caller helpers (security definer so they can read staff regardless of RLS)
create or replace function my_gym() returns uuid
  language sql stable security definer set search_path = public as
  $$ select gym_id from staff where user_id = auth.uid() $$;

create or replace function my_role() returns text
  language sql stable security definer set search_path = public as
  $$ select role from staff where user_id = auth.uid() $$;

alter table gyms  enable row level security;
alter table staff enable row level security;
drop policy if exists gym_read   on gyms;
drop policy if exists staff_read  on staff;
create policy gym_read  on gyms  for select to authenticated using (id = my_gym());
create policy staff_read on staff for select to authenticated using (user_id = auth.uid());

-- ---------- clear legacy single-tenant seed (re-created per gym) ----------
delete from payments; delete from subscriptions; delete from debts;
delete from reminders; delete from members; delete from plans; delete from app_settings;

-- ---------- add gym_id everywhere + auto-fill + gym-scoped RLS ----------
do $$
declare t text;
begin
  foreach t in array array['members','plans','subscriptions','payments','debts','reminders']
  loop
    execute format('alter table %I add column if not exists gym_id uuid;', t);
    execute format('alter table %I alter column gym_id set default my_gym();', t);
    execute format('alter table %I alter column gym_id set not null;', t);
    -- replace any prior policies with a single gym-scoped one
    execute format('drop policy if exists staff_all on %I;', t);
    execute format('drop policy if exists anon_all  on %I;', t);
    execute format('drop policy if exists gym_all   on %I;', t);
    execute format('create policy gym_all on %I for all to authenticated using (gym_id = my_gym()) with check (gym_id = my_gym());', t);
  end loop;
end $$;

-- ---------- per-gym settings (composite key) ----------
alter table app_settings add column if not exists gym_id uuid;
alter table app_settings alter column gym_id set default my_gym();
alter table app_settings drop constraint if exists app_settings_pkey;
alter table app_settings alter column gym_id set not null;
alter table app_settings add primary key (gym_id, key);
drop policy if exists staff_all on app_settings;
drop policy if exists anon_all  on app_settings;
drop policy if exists gym_all   on app_settings;
create policy gym_all on app_settings for all to authenticated using (gym_id = my_gym()) with check (gym_id = my_gym());

-- receipts stay global-atomic; make sure only signed-in users can call it
revoke execute on function next_receipt() from anon;
grant  execute on function next_receipt() to authenticated;

-- ============================================================================
-- PROVISION A NEW GYM  (you run this per customer)
--   1. Supabase → Authentication → Users → Add user  (email + password → give to the gym)
--   2. SQL editor:   select new_gym('اسم النادي', 'that-email@example.com');
-- Creates the tenant, links the login, and seeds that gym's default plans + name.
-- ============================================================================
create or replace function new_gym(p_name text, p_email text) returns uuid
  language plpgsql security definer set search_path = public as $$
declare g uuid; u uuid;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then raise exception 'No auth user with email %. Create the user first.', p_email; end if;

  insert into gyms(name) values (p_name) returning id into g;
  insert into staff(user_id, gym_id, role) values (u, g, 'admin')
    on conflict (user_id) do update set gym_id = excluded.gym_id, role = 'admin';

  insert into plans(gym_id, name, type, days, sessions, price) values
    (g,'شهري','duration',30,null,25),
    (g,'3 أشهر','duration',90,null,60),
    (g,'6 أشهر','duration',180,null,100),
    (g,'سنوي','duration',365,null,150),
    (g,'12 حصة','session',null,12,35);

  insert into app_settings(gym_id, key, value) values (g,'gym_name', p_name);
  -- remaining settings + message templates are filled by the app on first login.
  return g;
end $$;

-- to add a reception (read-only-money) account to an existing gym:
--   create the auth user, then:  insert into staff(user_id, gym_id, role)
--     values ('<user-uuid>', '<gym-uuid>', 'reception');
