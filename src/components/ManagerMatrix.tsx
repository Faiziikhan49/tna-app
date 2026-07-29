import { useRealtimeStore } from "../store/useRealtimeStore";

export function ManagerMatrix() {
  const { team, alerts } = useRealtimeStore();

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Team</h2>
          {alerts > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {alerts} alert{alerts === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {team.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white">
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-slate-700">{m.full_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    m.status === "in" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {m.status === "in" ? "● In" : "Out"}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-700">
                  {liveHours(m).toFixed(1)}h
                </span>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No team members yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
