import { useState } from "react";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { ManagerMatrix } from "./ManagerMatrix";
import { ScheduleEditor } from "./ScheduleEditor";
import { PunchOverride } from "./PunchOverride";

export function ManagerView({ managerId }: { managerId: string }) {
  const team = useRealtimeStore((s) => s.team);
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-slate-800">CEO dashboard</h1>

      <ManagerMatrix />

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Manage employee:</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">Select…</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ScheduleEditor userId={selected} />
            <PunchOverride userId={selected} managerId={managerId} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Pick an employee to set their schedule or fix a punch.</p>
        )}
      </div>
    </div>
  );
}
