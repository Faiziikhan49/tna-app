-- =====================================================================
-- Row Level Security — RBAC is enforced HERE, not in the UI.
-- Realtime respects these policies, so an employee's stream cannot
-- carry another employee's rows.
-- =====================================================================

-- Helper: current user's role, resolved without recursive RLS.
create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid()
$$;

create or replace function is_manager()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'manager', false)
$$;

alter table master_corporate_roster enable row level security;
alter table worksites             enable row level security;
alter table users                 enable row level security;
alter table schedules             enable row level security;
alter table time_logs             enable row level security;
alter table geofence_alerts       enable row level security;
alter table payroll_runs          enable row level security;
alter table payroll_line_items    enable row level security;

-- master_corporate_roster: NO policies => no client access at all.
-- Only the service role (Edge Functions / register_employee) touches it.

-- worksites: everyone authenticated may read; only managers write.
create policy worksites_read on worksites
  for select to authenticated using (true);
create policy worksites_write on worksites
  for all to authenticated using (is_manager()) with check (is_manager());

-- users: read self or (manager) all; managers may update anyone.
create policy users_read on users
  for select to authenticated
  using (id = auth.uid() or is_manager());
create policy users_update_mgr on users
  for update to authenticated
  using (is_manager()) with check (is_manager());
-- Inserts happen via register_employee (security definer), not directly.

-- schedules: employees read own; managers full CRUD.
create policy schedules_read on schedules
  for select to authenticated
  using (user_id = auth.uid() or is_manager());
create policy schedules_write on schedules
  for all to authenticated
  using (is_manager()) with check (is_manager());

-- time_logs: employees READ own; managers read all AND may correct
-- (historical overrides). Employees have NO insert/update — punches go
-- through the geofence-punch Edge Function (service role).
create policy time_logs_read on time_logs
  for select to authenticated
  using (user_id = auth.uid() or is_manager());
create policy time_logs_mgr_write on time_logs
  for all to authenticated
  using (is_manager()) with check (is_manager());

-- geofence_alerts: employees read own; managers read/resolve all.
create policy alerts_read on geofence_alerts
  for select to authenticated
  using (user_id = auth.uid() or is_manager());
create policy alerts_mgr_update on geofence_alerts
  for update to authenticated
  using (is_manager()) with check (is_manager());

-- payroll: managers only.
create policy payroll_runs_mgr on payroll_runs
  for select to authenticated using (is_manager());
create policy payroll_items_mgr on payroll_line_items
  for select to authenticated using (is_manager());
