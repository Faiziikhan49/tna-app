import { useRealtimeStore } from "../store/useRealtimeStore";
import { useLiveWeeklyHours } from "../hooks/useLiveWeeklyHours";
import { ClockControls } from "./ClockControls";

export function EmployeeDashboard() {
  const { openLog, closedHoursThisWeek, schedules, userId } = useRealtimeStore();
  const liveHours = useLiveWeeklyHours(closedHoursThisWeek, openLog?.clock_in_at ?? null);

  const today = new Date().toISOString().slice(0, 10);
  const mine = schedules.filter((s) => s.user_id === userId);
  const todayShift = mine.find((s) => s.shift_date === today);
  const lookahead = mine
    .filter((s) => s.shift_date >= today)
    .sort((a, b) => a.shift_date.localeCompare(b.shift_date))
    .slice(0, 7);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-md space-y-5 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">My day</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            openLog ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {openLog ? "Clocked in" : "Clocked out"}
        </span>
      </header>

      <section className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Current shift</p>
        <p className="mt-1 text-base">
          {todayShift
            ? `${fmt(todayShift.start_time)} – ${fmt(todayShift.end_time)}`
            : "No shift assigned today"}
        </p>
      </section>

      <section className="rounded-xl bg-slate-900 p-4 text-white">
        <p className="text-xs uppercase tracking-wide text-slate-400">Hours this week</p>
        <p className="mt-1 font-mono text-3xl tabular-nums">{liveHours.toFixed(4)}</p>
      </section>

      <ClockControls />

      <section>
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Next 7 days</p>
        <ul className="space-y-2">
          {lookahead.length === 0 && (
            <li className="text-sm text-slate-500">No upcoming shifts.</li>
          )}
          {lookahead.map((s) => (
            <li
              key={s.id}
              className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span>{new Date(s.shift_date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
              <span className="text-slate-600">
                {fmt(s.start_time)} – {fmt(s.end_time)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
