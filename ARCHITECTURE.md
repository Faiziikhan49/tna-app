# Time & Attendance — Architecture

Principal Software Solutions Architect design brief. Stack: **Supabase**
(Postgres + Auth + Realtime + Edge Functions) with a **React (web) / React
Native (mobile)** client sharing a **Zustand** realtime store. This document
explains the decisions; the code implements them.

## 1. The trust boundary (read this first)

A time clock is a system where users have a direct financial incentive to lie.
Two rules follow:

1. **Clients never write punches.** `time_logs` inserts/updates for clock
   in/out happen only inside the `geofence-punch` Edge Function, which runs with
   the service role. RLS denies employees `INSERT`/`UPDATE` on `time_logs`
   entirely. The client's job is to *request* a punch and supply coordinates;
   the server decides whether it happened.
2. **The geofence is validated server-side.** `navigator.geolocation` /
   `expo-location` can be spoofed. The Haversine check therefore runs in the
   Edge Function against a `worksites` row, not in the UI. The client-side
   distance check exists only for instant UX feedback and is never trusted.

> Honesty note: server-side validation stops casual spoofing (dev tools, fake
> GPS apps), not a determined attacker with a rooted device feeding fake
> coordinates to the OS. If you need stronger assurance, layer on
> attestation (Play Integrity / App Attest), IP/Wi-Fi BSSID correlation, or
> on-site NFC/QR — noted in §7. No pure-GPS solution is tamper-proof.

## 2. Identity, roster gating, RBAC

- **Auth**: Supabase Auth issues JWTs (email/password). We don't hand-roll JWT.
- **Roster gateway**: `master_corporate_roster` is service-role only (no RLS
  policy = no client access). Registration calls the `register_employee`
  SECURITY DEFINER function, which, in one transaction, row-locks the roster
  entry, verifies the Employee ID exists and is unregistered, creates the
  `users` profile, and flips `is_registered`. A unique constraint on
  `users.employee_id` is the backstop against races/double-registration.
- **RBAC**: enforced in the database via RLS, not just the UI. `employee` sees
  only its own `schedules`/`time_logs`; `manager` sees and mutates everything.
  Because **Supabase Realtime respects RLS**, an employee's realtime stream
  physically cannot carry another employee's rows.

## 3. Realtime model

`schedules`, `time_logs`, and `geofence_alerts` are in the `supabase_realtime`
publication. The Zustand store opens one channel per concern:

- Employee: filtered subscriptions (RLS scopes them to `auth.uid()`).
- Manager: unfiltered subscriptions → the Live Team Matrix.

Schedule edits by a manager `UPDATE` the row; the change is pushed to the
affected employee's client with no extra plumbing — the DB write *is* the event.

## 4. The live weekly counter

The per-second decimal counter is a **client-side projection**, never persisted
per tick (that would be thousands of pointless writes). The store holds
`closedHoursThisWeek` (sum of completed logs) plus the open `clock_in_at`; a
`setInterval` renders `closed + (now - clockInAt)`. Punch *events* are the only
things that hit the database. On reconnect the closed sum is re-fetched, so the
counter is self-healing.

## 5. Payroll engine

`payroll-dispatch` runs on a schedule (pg_cron or a scheduled Edge Function) at
the close of each 14-day cycle. It aggregates **closed** logs per user, bucketed
by ISO week, and splits `regular = min(week, 40)`, `overtime = max(0, week-40)`.
Overtime is a **weekly** threshold evaluated per week inside the cycle, not on
the 14-day total. Results are written to `payroll_runs` / `payroll_line_items`
(auditable), then formatted as an HTML table + CSV and emailed via Resend.

## 6. Schema

```
master_corporate_roster (employee_id PK, full_name, default_role, is_registered)
worksites               (id, name, latitude, longitude, radius_meters)
users                   (id=auth.uid PK, employee_id UNIQUE, role, worksite_id, ...)
schedules               (id, user_id, shift_date, start_time, end_time, ...)
time_logs               (id, user_id, clock_in_at, clock_out_at, geo..., source)
geofence_alerts         (id, user_id, action, distance_meters, resolved, ...)
payroll_runs            (id, period_start, period_end, dispatched_at)
payroll_line_items      (id, run_id, user_id, week_start, regular_hours, overtime_hours)
```

## 7. What's fully implemented vs. scaffolded

**Fully implemented (the hard, security-critical parts):** schema, RLS/RBAC,
roster-gated signup, server-authoritative geofenced punch with Haversine,
payroll aggregation with weekly OT split, HTML+CSV email dispatch, the realtime
Zustand store, the live-counter hook.

**Scaffolded (functional, meant to be extended):** the React screens
(`EmployeeDashboard`, `ManagerMatrix`, `ClockControls`, `ScheduleEditor`) are
working reference UIs, not a finished design system. Native mobile shares the
store/lib; swap web components for React Native views and `expo-location`.

**Deliberately deferred:** anti-spoofing attestation, push notifications,
offline punch queue, i18n, and load/perf hardening. See §1's honesty note.
