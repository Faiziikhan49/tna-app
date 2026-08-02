import { useState } from "react";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { ManagerMatrix } from "./ManagerMatrix";
import { WeeklyScheduleEditor } from "./WeeklyScheduleEditor";
import { PunchOverride } from "./PunchOverride";
import { AddEmployee } from "./AddEmployee";
import { CeoNotifications } from "./CeoNotifications";
import { Modal } from "./Modal";

export function ManagerView({ managerId }: { managerId: string }) {
  const team = useRealtimeStore((s) => s.team);
  const [selected, setSelected] = useState<string>("");
  const member = team.find((m) => m.id === selected);

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-bold text-slate-800">Employees Schedule Management</h1>

      <CeoNotifications />
      <ManagerMatrix />
      <AddEmployee />

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Manage employee:</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">Select…</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">Choosing someone opens their panel.</span>
        </div>
      </div>

      <Modal open={!!member} onClose={() => setSelected("")} title={member ? `Manage ${member.full_name}` : ""}>
        {member && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {member.phone ? <span>📞 {member.phone}</span> : <span>No phone on file</span>}
            </div>
            <WeeklyScheduleEditor employeeId={member.employee_id} name={member.full_name} />
            <PunchOverride userId={member.id} managerId={managerId} />
          </div>
        )}
      </Modal>
    </div>
  );
}
