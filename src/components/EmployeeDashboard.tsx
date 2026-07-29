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

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d: string) =>
    new Date(d + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">My day</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            openLog ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {openLog ? "● Clocked in" : "Clocked out"}
        </span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-5 text-white shadow-lg">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">Hours this week</p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{liveHours.toFixed(2)}</p>
        <p className="mt-1 text-xs text-white/70">
          {openLog ? "Counting live while you're clocked in" : "Clock in to start counting"}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Today's shift</p>
        <p className="mt-1 text-lg font-semibold text-slate-800">
          {todayShift ? `${fmtTime(todayShift.start_time)} – ${fmtTime(todayShift.end_time)}` : "No shift today"}
        </p>
      </div>

      <ClockControls />

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700">My schedule — next 7 days</p>
        <div className="space-y-2">
          {lookahead.length === 0 && (
            <div className="rounded-2xl bg-white p-4 text-sm text-slate-400 shadow-sm">
              No upcoming shifts scheduled.
            </div>
          )}
          {lookahead.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl border-l-4 border-indigo-500 bg-white p-4 shadow-sm"
            >
              <span className="font-medium text-slate-700">{fmtDay(s.shift_date)}</span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
