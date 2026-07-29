import { useRealtimeStore } from "../store/useRealtimeStore";

export function CeoNotifications() {
  const notifications = useRealtimeStore((s) => s.notifications);
  const clear = useRealtimeStore((s) => s.clearNotifications);

  if (notifications.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold text-amber-800">Shift swap alerts</h2>
        <button onClick={clear} className="text-xs font-medium text-amber-700 underline">
          Mark all read
        </button>
      </div>
      <ul className="space-y-1">
        {notifications.map((n) => (
          <li key={n.id} className="text-sm text-amber-900">• {n.message}</li>
        ))}
      </ul>
    </div>
  );
}
