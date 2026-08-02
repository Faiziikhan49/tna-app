import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { requestSwap, acceptSwap, hhmm } from "../lib/scheduling";

interface RosterRow { employee_id: string; full_name: string }
interface Swap {
  id: string;
  swap_date: string;
  start_time: string;
  end_time: string;
  original_employee_id: string;
  status: string;
}

export function SwapPanel() {
  const { myEmployeeId, tick } = useRealtimeStore();
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [incoming, setIncoming] = useState<Swap[]>([]);
  const [date, setDate] = useState("");
  const [cover, setCover] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase
        .from("users").select("employee_id, full_name").eq("role", "employee");
      setRoster((r as RosterRow[]) ?? []);
      const { data: s } = await supabase
        .from("shift_swaps").select("*")
        .eq("covering_employee_id", myEmployeeId).eq("status", "pending");
      setIncoming((s as Swap[]) ?? []);
    })();
  }, [myEmployeeId, tick]);

  const nameOf = (id: string) => roster.find((r) => r.employee_id === id)?.full_name ?? "Someone";
  const coworkers = roster.filter((r) => r.employee_id !== myEmployeeId);

  async function ask() {
    setMsg(null);
    try {
      if (!date || !cover) throw new Error("Pick a date and a coworker");
      await requestSwap(date, cover);
      setMsg("Swap request sent.");
      setDate(""); setCover("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  async function take(id: string) {
    try { await acceptSwap(id); } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-slate-800">Ask someone to cover a shift</h2>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <select value={cover} onChange={(e) => setCover(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <option value="">Choose coworker…</option>
            {coworkers.map((c) => (
              <option key={c.employee_id} value={c.employee_id}>{c.full_name}</option>
            ))}
          </select>
          <button onClick={ask}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white">
            Request swap
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      </div>

      {incoming.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <h2 className="mb-2 font-bold text-indigo-800">Cover requests for you</h2>
          <ul className="space-y-2">
            {incoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-2">
                <span className="text-sm text-slate-700">
                  {nameOf(s.original_employee_id)} · {new Date(s.swap_date + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · {hhmm(s.start_time)}–{hhmm(s.end_time)}
                </span>
                <button onClick={() => take(s.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
