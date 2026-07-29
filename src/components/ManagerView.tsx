import { useState } from "react";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { ManagerMatrix } from "./ManagerMatrix";
import { ScheduleEditor } from "./ScheduleEditor";
import { PunchOverride } from "./PunchOverride";

export function ManagerView({ managerId }: { managerId: string }) {
  const team = useRealtimeStore((s) => s.team);
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <ManagerMatrix />

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Manage employee:</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="grid gap-4 md:grid-cols-2">
            <ScheduleEditor userId={selected} />
            <PunchOverride userId={selected} managerId={managerId} />
          </div>
        )}
      </section>
    </div>
  );
}
