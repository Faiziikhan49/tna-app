import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function PunchOverride({ userId, managerId }: { userId: string; managerId: string }) {
  const [inAt, setInAt] = useState("");
  const [outAt, setOutAt] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    const { error } = await supabase.from("time_logs").insert({
      user_id: userId,
      clock_in_at: new Date(inAt).toISOString(),
      clock_out_at: outAt ? new Date(outAt).toISOString() : null,
      source: "manager_override",
      created_by: managerId,
      note: note || "Manual correction",
    });
    setMsg(error ? error.message : "Override recorded.");
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400";

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-800">Fix a punch</h3>
      <label className="block text-xs text-slate-500">Clock in</label>
      <input type="datetime-local" value={inAt} onChange={(e) => setInAt(e.target.value)} className={field} />
      <label className="block text-xs text-slate-500">Clock out (optional)</label>
      <input type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} className={field} />
      <input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      <button onClick={save} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
        Record override
      </button>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
