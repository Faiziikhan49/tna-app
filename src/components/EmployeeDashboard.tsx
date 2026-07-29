import { useRealtimeStore } from "../store/useRealtimeStore";
import { useLiveWeeklyHours } from "../hooks/useLiveWeeklyHours";
import { ClockControls } from "./ClockControls";
import { MySchedule } from "./MySchedule";
import { SwapPanel } from "./SwapPanel";

export function EmployeeDashboard() {
  const { openLog, closedHoursThisWeek } = useRealtimeStore();
  const liveHours = useLiveWeeklyHours(closedHoursThisWeek, openLog?.clock_in_at ?? null);

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

      <ClockControls />
      <MySchedule />
      <SwapPanel />
    </div>
  );
}
