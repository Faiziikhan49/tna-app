import { useState } from "react";
import { requestPunch } from "../lib/supabaseClient";
import { useRealtimeStore } from "../store/useRealtimeStore";

export function ClockControls() {
  const openLog = useRealtimeStore((s) => s.openLog);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClockedIn = !!openLog;

  async function punch(action: "clock_in" | "clock_out") {
    setBusy(true);
    setError(null);
    try {
      await requestPunch(action);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Punch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={isClockedIn || busy}
          onClick={() => punch("clock_in")}
          className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 py-4 text-base font-semibold text-white shadow-lg transition hover:opacity-95 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
        >
          Clock In
        </button>
        <button
          disabled={!isClockedIn || busy}
          onClick={() => punch("clock_out")}
          className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 py-4 text-base font-semibold text-white shadow-lg transition hover:opacity-95 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
        >
          Clock Out
        </button>
      </div>
      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}
    </div>
  );
}
