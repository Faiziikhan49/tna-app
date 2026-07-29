import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { DAY_NAMES, shiftHours, hhmm, type WeeklyShift } from "../lib/scheduling";

interface Row { on: boolean; start: string; end: string }

export function WeeklyScheduleEditor({ employeeId, name }: { employeeId: string; name: string }) {
  const tick = useRealtimeStore((s) => s.tick);
  const [rows, setRows] = useState<Row[]>(
    DAY_NAMES.map(() => ({ on: false, start: "09:00", end: "17:00" })),
  );
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("weekly_shifts").select("*").eq("employee_id", employeeId);
      const next: Row[] = DAY_NAMES.map(() => ({ on: false, start: "09:00", end: "17:00" }));
      for (const w of (data as WeeklyShift[]) ?? []) {
        next[w.day_of_week] = { on: true, start: hhmm(w.start_time), end: hhmm(w.end_time) };
      }
      setRows(next);
    })();
  }, [employeeId, tick]);

  const total = rows.reduce((a, r) => (r.on ? a + shiftHours(r.start, r.end) : a), 0);
  const set = (i: number, patch: Partial<Row>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  async function save() {
    setMsg(null);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.on) {
        await supabase.from("weekly_shifts").upsert(
          { employee_id: employeeId, day_of_week: i, start_time: r.start, end_time: r.end },
          { onConflict: "employee_id,day_of_week" },
        );
      } else {
        await supabase.from("weekly_shifts").delete()
          .eq("employee_id", employeeId).eq("day_of_week", i);
      }
    }
    setMsg("Schedule updated — pushed to the employee.");
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="mb-3 font-semibold text-slate-800">Weekly schedule — {name}</h3>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex w-24 items-center gap-2 text-sm">
              <input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} />
              <span className="font-medium text-slate-700">{DAY_NAMES[i]}</span>
            </label>
            <input type="time" value={r.start} disabled={!r.on}
              onChange={(e) => set(i, { start: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" />
            <span className="text-slate-400">–</span>
            <input type="time" value={r.end} disabled={!r.on}
              onChange={(e) => set(i, { end: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" />
            {r.on && <span className="ml-auto text-xs text-slate-400">{shiftHours(r.start, r.end).toFixed(1)}h</span>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">Weekly total: <b>{total.toFixed(1)}h</b></span>
        <button onClick={save} className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white">
          Save schedule
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
