import { useState } from "react";
import { DAY_NAMES, addEmployee, shiftHours } from "../lib/scheduling";

interface Row {
  on: boolean;
  start: string;
  end: string;
}
const blank = (): Row[] =>
  DAY_NAMES.map((_, i) => ({ on: i < 5, start: "09:00", end: "17:00" }));

export function AddEmployee() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>(blank());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = rows.reduce((a, r) => (r.on ? a + shiftHours(r.start, r.end) : a), 0);

  function set(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      if (!name.trim()) throw new Error("Enter a name");
      const shifts = rows
        .map((r, i) => ({ day: i, start: r.start, end: r.end, on: r.on }))
        .filter((r) => r.on)
        .map(({ day, start, end }) => ({ day, start, end }));
      await addEmployee(name, shifts);
      setMsg(`Added ${name.trim()} — they can now register with this name.`);
      setName("");
      setRows(blank());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-bold text-slate-800">Add employee</h2>
      <input
        placeholder="Full name (must match how they'll register)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400"
      />

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex w-24 items-center gap-2 text-sm">
              <input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} />
              <span className="font-medium text-slate-700">{DAY_NAMES[i]}</span>
            </label>
            <input
              type="time" value={r.start} disabled={!r.on}
              onChange={(e) => set(i, { start: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time" value={r.end} disabled={!r.on}
              onChange={(e) => set(i, { end: e.target.value })}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40"
            />
            {r.on && (
              <span className="ml-auto text-xs text-slate-400">{shiftHours(r.start, r.end).toFixed(1)}h</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">Weekly total: <b>{total.toFixed(1)}h</b></span>
        <button
          onClick={save} disabled={busy}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add employee"}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
