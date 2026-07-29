// =====================================================================
// payroll-dispatch — run at the close of each 14-day cycle (pg_cron or a
// scheduled invocation). Aggregates closed logs, splits weekly overtime
// (>40h/week), persists an auditable run, and emails HTML + CSV via Resend.
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

interface WeekBucket {
  userId: string;
  name: string;
  weekStart: string;
  hours: number;
}

const isoWeekStart = (d: Date): Date => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - day);
  return x;
};

Deno.serve(async () => {
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Cycle = the last 14 days ending today (UTC).
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);

  const { data: logs, error } = await db
    .from("time_logs")
    .select("user_id, clock_in_at, clock_out_at, users(full_name)")
    .not("clock_out_at", "is", null)
    .gte("clock_in_at", start.toISOString())
    .lt("clock_in_at", end.toISOString());
  if (error) return new Response(error.message, { status: 500 });

  // Bucket hours by (user, ISO week).
  const buckets = new Map<string, WeekBucket>();
  for (const l of logs ?? []) {
    const inAt = new Date(l.clock_in_at as string);
    const outAt = new Date(l.clock_out_at as string);
    const hours = (outAt.getTime() - inAt.getTime()) / 3_600_000;
    const wk = isoWeekStart(inAt).toISOString().slice(0, 10);
    const key = `${l.user_id}|${wk}`;
    const name = (l.users as { full_name: string } | null)?.full_name ?? "Unknown";
    const b = buckets.get(key) ?? { userId: l.user_id as string, name, weekStart: wk, hours: 0 };
    b.hours += hours;
    buckets.set(key, b);
  }

  // Split regular / overtime per week.
  const rows = [...buckets.values()].map((b) => ({
    ...b,
    regular: Math.min(b.hours, 40),
    overtime: Math.max(0, b.hours - 40),
  }));

  // Persist the run for audit.
  const { data: run } = await db
    .from("payroll_runs")
    .insert({
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (run && rows.length) {
    await db.from("payroll_line_items").insert(
      rows.map((r) => ({
        run_id: run.id,
        user_id: r.userId,
        week_start: r.weekStart,
        regular_hours: Number(r.regular.toFixed(2)),
        overtime_hours: Number(r.overtime.toFixed(2)),
      })),
    );
  }

  // Build outputs.
  const money = (n: number) => n.toFixed(2);
  const csv = [
    "employee,week_start,regular_hours,overtime_hours",
    ...rows.map((r) => `"${r.name}",${r.weekStart},${money(r.regular)},${money(r.overtime)}`),
  ].join("\n");

  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.weekStart}</td>` +
        `<td align="right">${money(r.regular)}</td>` +
        `<td align="right">${money(r.overtime)}</td></tr>`,
    )
    .join("");
  const html = `
    <h2>Payroll — ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <thead><tr><th>Employee</th><th>Week</th><th>Regular</th><th>Overtime</th></tr></thead>
      <tbody>${tableRows || "<tr><td colspan=4>No hours in period</td></tr>"}</tbody>
    </table>`;

  // Dispatch via Resend.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("PAYROLL_RECIPIENT");
  if (resendKey && to) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("PAYROLL_SENDER") ?? "payroll@example.com",
        to,
        subject: `Payroll report ${end.toISOString().slice(0, 10)}`,
        html,
        attachments: [
          { filename: "payroll.csv", content: btoa(csv) },
        ],
      }),
    });
    if (run && res.ok) {
      await db.from("payroll_runs").update({ dispatched_at: new Date().toISOString() }).eq("id", run.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, weeks: rows.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
