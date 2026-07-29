-- =====================================================================
-- OPTIONAL dev seed. Run AFTER creating the schema.
-- Part A can run immediately. Part B assigns test shifts and should be
-- run AFTER you've registered at least one account (schedules need real
-- user rows, which only exist once someone registers).
-- =====================================================================

-- Part A: allow these Employee IDs to register.
insert into master_corporate_roster (employee_id, full_name, default_role) values
  ('E-1001', 'Ada Manager',   'manager'),
  ('E-1002', 'Grace Employee', 'employee'),
  ('E-1003', 'Alan Employee',  'employee')
on conflict (employee_id) do nothing;

-- Part B: give every registered user a 9am-5pm shift for the next 7 days.
-- Safe to re-run; existing shifts for a date are left as-is.
insert into schedules (user_id, shift_date, start_time, end_time, created_by)
select
  u.id,
  d::date,
  (d::date + time '09:00') at time zone 'UTC',
  (d::date + time '17:00') at time zone 'UTC',
  u.id
from users u
cross join generate_series(current_date, current_date + 6, interval '1 day') as d
on conflict do nothing;
