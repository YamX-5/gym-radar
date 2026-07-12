-- ============================================================================
-- Gym Radar — AUTO-PROVISION  (run ONCE, after schema.sql + multi-tenant.sql)
-- After this: creating a user in Authentication → Add user is the ONLY step.
-- A trigger automatically creates that user's gym + links them as admin.
-- No more running new_gym() per customer.
-- ============================================================================

-- When a new auth user is created, make their gym + staff row automatically.
-- Optional: set the gym name by putting {"gym_name":"Gold's Gym"} in the user's
-- "User Metadata" when adding them. If omitted, it defaults to the email prefix,
-- and the gym owner can rename it in the app's Settings later.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare g uuid; nm text;
begin
  nm := coalesce(nullif(new.raw_user_meta_data->>'gym_name',''), split_part(new.email,'@',1), 'New Gym');
  insert into gyms(name) values (nm) returning id into g;
  insert into staff(user_id, gym_id, role) values (new.id, g, 'admin')
    on conflict (user_id) do nothing;
  insert into app_settings(gym_id, key, value) values (g, 'gym_name', nm)
    on conflict (gym_id, key) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- one-time backfill: link any EXISTING users that have no gym yet ----------
-- (fixes the accounts you already created before this trigger existed)
do $$
declare r record; g uuid; nm text;
begin
  for r in
    select u.id, u.email, u.raw_user_meta_data
    from auth.users u
    left join staff s on s.user_id = u.id
    where s.user_id is null
  loop
    nm := coalesce(nullif(r.raw_user_meta_data->>'gym_name',''), split_part(r.email,'@',1), 'New Gym');
    insert into gyms(name) values (nm) returning id into g;
    insert into staff(user_id, gym_id, role) values (r.id, g, 'admin');
    insert into app_settings(gym_id, key, value) values (g, 'gym_name', nm)
      on conflict (gym_id, key) do nothing;
  end loop;
end $$;
