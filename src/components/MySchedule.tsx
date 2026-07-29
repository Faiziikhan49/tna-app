import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRealtimeStore } from "../store/useRealtimeStore";
import {
  DAY_NAMES, biweek, scheduledHours, actualHours, shiftHours, hhmm, round1,
  type WeeklyShift,
} from "../lib/scheduling";

export function MySchedule() {
  const { myEmployeeId, userId, tick } = useRealtimeStore();
  const [shifts, setShifts] = useState<WeeklyShift[]>([]);
  const [sched, setSched] = useState(0);
  const [actual, setActual] = useState(0);
  const bw = biweek();

  useEffect(() => {
    if (!myEmployeeId || !userId) return;
    (async () => {
      const { data } = await supabase
        .from("weekly_shifts").select("*").eq("employee_id", myEmployeeId);
      setShifts((data as WeeklyShift[]) ?? []);
      setSched(await scheduledHours(myEmployeeId, bw.startDate, bw.endDate));
      setActual(await actualHours(userId, bw.startISO, bw.endISO));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmployeeId, userId, tick]);

  const byDay = (d: number) => shifts.find((s) => s.day_of_week === d);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-slate-800">My weekly schedule</h2>
        <div className="space-y-2">
          {DAY_NAMES.map((name, i) => {
            const s = byDay(i);
            return (
              <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span className="font-medium text-slate-700">{name}</span>
                {s ? (
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                      {hhmm(s.start_time)} – {hhmm(s.end_time)}
                    </span>
                    <span className="w-10 text-right text-xs text-slate-400">
                      {shiftHours(s.start_time, s.end_time).toFixed(1)}h
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">Off</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Scheduled (bi-weekly)</p>
          <p className="mt-1 text-2xl font-bold">{round1(sched)}h</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Actual (bi-weekly)</p>
          <p className="mt-1 text-2xl font-bold">{round1(actual)}h</p>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400">Pay period: {bw.label}</p>
    </div>
  );
}
