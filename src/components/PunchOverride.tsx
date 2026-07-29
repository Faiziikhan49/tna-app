import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Managers correct missed/erroneous punches by writing custom historical
 * timestamps. Allowed by RLS (time_logs_mgr_write) and stamped source=
 * 'manager_override' so corrections are distinguishable from geofenced punches
 * in the audit trail.
 */
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

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <h2 className="font-medium">Historical punch override</h2>
      <label className="block text-xs text-slate-500">Clock in</label>
      <input type="datetime-local" value={inAt} onChange={(e) => setInAt(e.target.value)} className="w-full rounded border px-2 py-1" />
      <label className="block text-xs text-slate-500">Clock out (optional)</label>
      <input type="datetime-local" value={outAt} onChange={(e) => setOutAt(e.target.value)} className="w-full rounded border px-2 py-1" />
      <input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border px-2 py-1" />
      <button onClick={save} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
        Record override
      </button>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
