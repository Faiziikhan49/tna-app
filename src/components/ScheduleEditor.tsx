import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Managers alter future shift records. The DB write emits a Realtime event
 * that the affected employee's store consumes — no direct client-to-client
 * messaging needed.
 */
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

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-medium">Edit shift</h2>
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border px-2 py-1" />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border px-2 py-1" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border px-2 py-1" />
      </div>
      <button onClick={save} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
        Save shift
      </button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
