-- =====================================================================
-- Registration gateway + realtime publication + weekly-hours helper.
-- =====================================================================

-- Called by the client immediately after Supabase Auth sign-up succeeds.
-- Atomically validates the roster and provisions the profile. Any failure
-- raises an explicit exception the client surfaces as a security rejection.
create or replace function register_employee(p_employee_id text)
returns users
language plpgsql security definer set search_path = public as $$
declare
  v_roster  master_corporate_roster%rowtype;
  v_user    users%rowtype;
  v_email   text := auth.jwt() ->> 'email';
  v_default_site uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Row-lock the roster entry to serialize concurrent registrations.
  select * into v_roster
  from master_corporate_roster
  where employee_id = p_employee_id
  for update;

  if not found then
    raise exception 'ROSTER_REJECT: Employee ID % is not on the corporate roster', p_employee_id;
  end if;
  if v_roster.is_registered then
    raise exception 'ROSTER_REJECT: Employee ID % is already registered', p_employee_id;
  end if;

  select id into v_default_site from worksites order by created_at limit 1;

  insert into users (id, employee_id, full_name, email, role, worksite_id)
  values (auth.uid(), p_employee_id, v_roster.full_name, v_email,
          v_roster.default_role, v_default_site)
  returning * into v_user;

  update master_corporate_roster
     set is_registered = true
   where employee_id = p_employee_id;

  return v_user;
exception
  when unique_violation then
    -- users.employee_id unique or users.id pk backstop.
    raise exception 'ROSTER_REJECT: Employee ID % is already registered', p_employee_id;
end;
$$;

-- Sum of COMPLETED hours for a user within a [start,end) window.
create or replace function completed_hours(p_user uuid, p_from timestamptz, p_to timestamptz)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(
    extract(epoch from (least(clock_out_at, p_to) - greatest(clock_in_at, p_from))) / 3600.0
  ), 0)::numeric
  from time_logs
  where user_id = p_user
    and clock_out_at is not null
    and clock_in_at < p_to
    and clock_out_at > p_from;
$$;

-- Publish the live tables for Realtime.
alter publication supabase_realtime add table time_logs;
alter publication supabase_realtime add table schedules;
alter publication supabase_realtime add table geofence_alerts;
