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
      // No local state mutation needed — the Realtime subscription updates
      // the store, which re-renders these buttons. Dual-state by design.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Punch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <button
          disabled={isClockedIn || busy}
          onClick={() => punch("clock_in")}
          className="flex-1 rounded-lg bg-emerald-600 py-3 font-medium text-white disabled:opacity-40"
        >
          Clock In
        </button>
        <button
          disabled={!isClockedIn || busy}
          onClick={() => punch("clock_out")}
          className="flex-1 rounded-lg bg-rose-600 py-3 font-medium text-white disabled:opacity-40"
        >
          Clock Out
        </button>
      </div>
      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
    </div>
  );
}
