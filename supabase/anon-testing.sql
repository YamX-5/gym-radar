-- ============================================================================
-- Gym Radar — TEMPORARY anon access for testing WITHOUT a login screen yet.
-- Run this AFTER schema.sql.  ⚠️ PRIVATE TESTING ONLY: anyone with the anon key
-- could read/write. Remove these policies before real use (we'll add login).
--   To remove later:  drop policy anon_all on members;  (repeat per table)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['members','plans','subscriptions','payments','debts','reminders','app_settings']
  loop
    execute format('drop policy if exists anon_all on %I;', t);
    execute format('create policy anon_all on %I for all to anon using (true) with check (true);', t);
  end loop;
end $$;

grant execute on function next_receipt() to anon;
