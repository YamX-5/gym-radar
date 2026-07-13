-- ============================================================================
-- Gym Radar — Phase 4: super-admin (YOUR cross-gym view)
-- Run AFTER schema.sql + multi-tenant.sql.
-- Then make yourself a platform admin:
--   insert into platform_admins(user_id)
--   select id from auth.users where email = 'your-email@example.com';
-- ============================================================================
create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table platform_admins enable row level security;
-- (no policies -> only reachable via the SECURITY DEFINER functions below)

-- am I a platform admin? (called by the app on login)
create or replace function is_platform_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists(select 1 from platform_admins where user_id = auth.uid()) $$;
grant execute on function is_platform_admin() to authenticated;

-- one row per gym: members, active members, this-month revenue, open debts.
create or replace function platform_overview()
returns table(gym_id uuid, gym_name text, members bigint, active_members bigint,
              revenue_month numeric, open_debts numeric, created_at timestamptz)
  language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from platform_admins where user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select g.id, g.name,
      (select count(*) from members m where m.gym_id = g.id),
      (select count(*) from members m where m.gym_id = g.id and m.status = 'active'),
      (select coalesce(sum(p.amount),0) from payments p where p.gym_id = g.id and p.date >= date_trunc('month', now())::date),
      (select coalesce(sum(d.amount),0) from debts d where d.gym_id = g.id and d.status = 'open'),
      g.created_at
    from gyms g order by g.created_at;
end $$;
grant execute on function platform_overview() to authenticated;
