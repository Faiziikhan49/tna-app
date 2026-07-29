-- =====================================================================
-- Time & Attendance — schema
-- All timestamps are timestamptz (UTC). Never store naive local time.
-- =====================================================================

create type user_role as enum ('employee', 'manager');
create type punch_source as enum ('geofenced', 'manager_override');
create type punch_action as enum ('clock_in', 'clock_out');

-- Immutable source of truth for who is allowed to register. -----------
create table master_corporate_roster (
  employee_id   text primary key,
  full_name     text not null,
  default_role  user_role not null default 'employee',
  is_registered boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Configurable geofence nodes. --------------------------------------
create table worksites (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  latitude       double precision not null,
  longitude      double precision not null,
  radius_meters  integer not null default 200,
  created_at     timestamptz not null default now()
);

-- App user profile, 1:1 with auth.users. ----------------------------
create table users (
  id           uuid primary key references auth.users (id) on delete cascade,
  employee_id  text not null unique references master_corporate_roster (employee_id),
  full_name    text not null,
  email        text not null,
  role         user_role not null default 'employee',
  worksite_id  uuid references worksites (id),
  created_at   timestamptz not null default now()
);

-- Assigned shifts. --------------------------------------------------
create table schedules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  shift_date  date not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  created_by  uuid references users (id),
  updated_at  timestamptz not null default now(),
  constraint shift_bounds check (end_time > start_time)
);
create index idx_schedules_user_date on schedules (user_id, shift_date);

-- The authoritative punch ledger. Written only by the Edge Function
-- (employees) or by managers via override. --------------------------
create table time_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  clock_in_at   timestamptz not null,
  clock_out_at  timestamptz,
  clock_in_lat  double precision,
  clock_in_lng  double precision,
  clock_out_lat double precision,
  clock_out_lng double precision,
  source        punch_source not null default 'geofenced',
  created_by    uuid references users (id),
  note          text,
  created_at    timestamptz not null default now(),
  constraint out_after_in check (clock_out_at is null or clock_out_at > clock_in_at)
);
create index idx_time_logs_user_in on time_logs (user_id, clock_in_at desc);
-- At most one OPEN (not-yet-clocked-out) log per user.
create unique index uniq_open_log_per_user
  on time_logs (user_id) where (clock_out_at is null);

-- Geofence rejections surfaced to managers. -------------------------
create table geofence_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users (id) on delete cascade,
  action           punch_action not null,
  latitude         double precision,
  longitude        double precision,
  distance_meters  double precision not null,
  resolved         boolean not null default false,
  created_at       timestamptz not null default now()
);
create index idx_alerts_unresolved on geofence_alerts (created_at desc) where (not resolved);

-- Payroll audit trail. ----------------------------------------------
create table payroll_runs (
  id            uuid primary key default gen_random_uuid(),
  period_start  date not null,
  period_end    date not null,
  generated_at  timestamptz not null default now(),
  dispatched_at timestamptz
);
create table payroll_line_items (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references payroll_runs (id) on delete cascade,
  user_id        uuid not null references users (id),
  week_start     date not null,
  regular_hours  numeric(6,2) not null default 0,
  overtime_hours numeric(6,2) not null default 0
);
create index idx_line_items_run on payroll_line_items (run_id);

-- Seed the default worksite from the spec (London, ON). -------------
insert into worksites (name, latitude, longitude, radius_meters)
values ('HQ', 42.9849, -81.2453, 200);
