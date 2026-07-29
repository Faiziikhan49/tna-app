import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function ScheduleEditor({ userId }: { userId: string }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    const startTs = new Date(`${date}T${start}:00`).toISOString();
    const endTs = new Date(`${date}T${end}:00`).toISOString();
    const { error } = await supabase.from("schedules").upsert({
      user_id: userId,
      shift_date: date,
      start_time: startTs,
      end_time: endTs,
    });
    setMsg(error ? error.message : "Shift saved — pushed to employee.");
  }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-800">Set a shift</h3>
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
      </div>
      <button onClick={save} className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white">
        Save shift
      </button>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
