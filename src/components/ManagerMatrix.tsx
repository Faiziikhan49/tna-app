import { useRealtimeStore } from "../store/useRealtimeStore";
import { biweek, round1 } from "../lib/scheduling";

export function ManagerMatrix() {
  const team = useRealtimeStore((s) => s.team);
  const bw = biweek();

  const liveHours = (m: { weeklyClosedHours: number; openSince: string | null }) => {
    if (!m.openSince) return m.weeklyClosedHours;
    return m.weeklyClosedHours + (Date.now() - new Date(m.openSince).getTime()) / 3_600_000;
  };

  const clockedIn = team.filter((m) => m.status === "in").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Team members</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{team.length}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">Clocked in now</p>
          <p className="mt-1 text-2xl font-bold">{clockedIn}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Team</h2>
          <span className="text-xs text-slate-400">Bi-weekly: {bw.label}</span>
        </div>
        <div className="mb-2 flex justify-end gap-4 pr-1 text-xs font-medium text-slate-400">
          <span className="w-16 text-right">Scheduled</span>
          <span className="w-16 text-right">Actual</span>
        </div>

        <div className="space-y-2">
          {team.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-700">{m.full_name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      m.status === "in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {m.status === "in" ? "● In" : "Out"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 font-mono text-sm tabular-nums text-slate-700">
                <span className="w-16 text-right">{round1(m.scheduledBiweek)}h</span>
                <span className="w-16 text-right font-semibold">{round1(m.actualBiweek)}h</span>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No employees yet — add one below.</p>
          )}
        </div>
      </div>
    </div>
  );
}
