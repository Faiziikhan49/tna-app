# Time & Attendance — real-time management app

Real-time employee time & attendance for web and mobile. Supabase (Postgres +
Auth + Realtime + Edge Functions) with a React / React Native client on a
Zustand realtime store. Read `ARCHITECTURE.md` first — it explains the trust
model and every design decision.

## Repository layout

```
db/                         SQL — run in order
  01_schema.sql             tables, enums, indexes
  02_rls.sql                Row Level Security = RBAC
  03_functions.sql          roster gate, hours helper, realtime publication
supabase/functions/
  geofence-punch/           authoritative clock in/out (server-side Haversine)
  payroll-dispatch/         bi-weekly aggregation + email/CSV via Resend
  _shared/haversine.ts      shared distance util
src/
  lib/                      supabase client, punch/auth helpers, haversine
  store/useRealtimeStore.ts Zustand + Realtime subscriptions
  hooks/useLiveWeeklyHours  per-second live counter (client projection)
  components/               EmployeeDashboard, ManagerMatrix, ClockControls,
                            ScheduleEditor, PunchOverride
```

## Setup

1. **Create a Supabase project.** Note the project URL, anon key, service role key.
2. **Apply the database.** In the SQL editor run `db/01_schema.sql`,
   `db/02_rls.sql`, `db/03_functions.sql` in that order.
3. **Seed the roster.** Insert allowed employees, e.g.
   ```sql
   insert into master_corporate_roster (employee_id, full_name, default_role)
   values ('E-1001', 'Ada Lovelace', 'manager'),
          ('E-1002', 'Grace Hopper', 'employee');
   ```
4. **Deploy Edge Functions.**
   ```bash
   supabase functions deploy geofence-punch
   supabase functions deploy payroll-dispatch
   supabase secrets set RESEND_API_KEY=... PAYROLL_RECIPIENT=payroll@yourco.com \
     PAYROLL_SENDER=payroll@yourco.com
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically for deployed functions.)
5. **Client env** — `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
6. **Schedule payroll.** Either pg_cron:
   ```sql
   select cron.schedule('payroll-biweekly', '0 6 */14 * *', $$
     select net.http_post(
       url := 'https://<ref>.functions.supabase.co/payroll-dispatch',
       headers := '{"Authorization":"Bearer <service_role>"}'::jsonb) $$);
   ```
   or Supabase scheduled functions. A true "close of each 14-day cycle" cadence
   is best anchored to a fixed epoch — pin the cron to your actual cycle dates.

## Registration flow

`signUpWithRoster(email, password, employeeId)` calls Supabase Auth, then the
`register_employee` RPC. If the Employee ID is missing, invalid, or already
registered, the RPC raises `ROSTER_REJECT` and the helper signs the half-created
auth user out and rethrows — no partial accounts.

## Mobile (React Native)

The store, hooks, and lib are platform-agnostic. For native: replace
`navigator.geolocation` in `getDeviceCoords` with `expo-location`, swap the web
components for RN views (NativeWind gives you the same Tailwind classes), and
point the same `requestPunch` at the same Edge Function.

## Security notes (don't skip)

- Employees cannot write `time_logs` — RLS denies it; only the Edge Function
  (service role) or a manager override can. The geofence is validated
  server-side because client GPS is spoofable.
- This stops casual spoofing, not a rooted device feeding fake OS coordinates.
  For higher assurance add Play Integrity / App Attest, Wi-Fi BSSID / IP
  correlation, or on-site NFC/QR. See `ARCHITECTURE.md` §1.
