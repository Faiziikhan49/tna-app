import { useRealtimeStore } from "../store/useRealtimeStore";

/** Live roster. Rows update in place via the store's Realtime bindings. */
export function ManagerMatrix() {
  const { team, alerts } = useRealtimeStore();

  const liveHours = (m: { weeklyClosedHours: number; openSince: string | null }) => {
    if (!m.openSince) return m.weeklyClosedHours;
    return m.weeklyClosedHours + (Date.now() - new Date(m.openSince).getTime()) / 3_600_000;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Team matrix</h1>
        {alerts > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            {alerts} geofence alert{alerts === 1 ? "" : "s"}
          </span>
        )}
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2">Employee</th>
            <th>Status</th>
            <th className="text-right">Week hours</th>
          </tr>
        </thead>
        <tbody>
          {team.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="py-2">{m.full_name}</td>
              <td>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.status === "in"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m.status === "in" ? "Clocked in" : "Out"}
                </span>
              </td>
              <td className="text-right font-mono tabular-nums">
                {liveHours(m).toFixed(2)}
              </td>
            </tr>
          ))}
          {team.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-slate-500">
                No team members yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
