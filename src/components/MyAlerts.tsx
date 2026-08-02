import { useRealtimeStore } from "../store/useRealtimeStore";

export function MyAlerts() {
  const myAlerts = useRealtimeStore((s) => s.myAlerts);
  const clear = useRealtimeStore((s) => s.clearMyAlerts);

  if (myAlerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold text-emerald-800">Updates</h2>
        <button onClick={clear} className="text-xs font-medium text-emerald-700 underline">
          Clear
        </button>
      </div>
      <ul className="space-y-1">
        {myAlerts.map((n) => (
          <li key={n.id} className="text-sm text-emerald-900">{n.message}</li>
        ))}
      </ul>
    </div>
  );
}
