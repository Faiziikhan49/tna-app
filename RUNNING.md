# Running it end-to-end

## 1. Backend (local, via Supabase CLI)

```bash
supabase init
supabase start          # prints API URL, anon key, service_role key
```

In Studio (`http://localhost:54323`) → SQL editor, run in order:
`db/01_schema.sql`, `db/02_rls.sql`, `db/03_functions.sql`, then
`db/04_seed_dev.sql` (Part A).

Serve the Edge Functions:

```bash
supabase functions serve
```

> Email confirmation: the local CLI ships with confirmations OFF, so sign-up
> returns a session immediately and roster registration works. On a HOSTED
> Supabase project, turn OFF "Confirm email" (Auth → Providers → Email) for this
> flow, or the post-signup `register_employee` call runs with no session.

## 2. Client

```bash
cp .env.example .env     # paste your URL + anon key from `supabase start`
npm install
npm run dev              # http://localhost:5173
```

## 3. First run

1. Register with `E-1001` → you're a **manager**.
2. In a separate incognito window, register `E-1002` → an **employee**.
3. Back in Studio, run `db/04_seed_dev.sql` Part B to give both users shifts.
4. Clock in as the employee (set DevTools location first — see below) and watch
   the manager's matrix update live.

## Testing the geofence without moving

Chrome DevTools → `⋮` → More tools → **Sensors** → Location → Other:

- Inside: `42.9849, -81.2453` → punch succeeds.
- Outside: `42.9890, -81.2453` (~450 m) → punch blocked, alert appears on the
  manager matrix.

## Testing payroll now (not in 14 days)

Create a few closed logs (or a manager override spanning ~45h in one week),
then:

```bash
supabase functions invoke payroll-dispatch
```

Check the returned JSON and the `payroll_runs` / `payroll_line_items` tables.
Email only fires if `RESEND_API_KEY` + `PAYROLL_RECIPIENT` secrets are set with
a verified sender — the DB rows prove the aggregation regardless.
```
