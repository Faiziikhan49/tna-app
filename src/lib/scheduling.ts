import { supabase } from "./supabaseClient";

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface WeeklyShift {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

const ANCHOR = Date.UTC(2024, 0, 1); // a Monday
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** The current aligned 14-day pay period. */
export function biweek() {
  const days = Math.floor((Date.now() - ANCHOR) / 86_400_000);
  const idx = Math.floor(days / 14);
  const startMs = ANCHOR + idx * 14 * 86_400_000;
  const start = new Date(startMs);
  const end = new Date(startMs + 14 * 86_400_000);
  const last = new Date(startMs + 13 * 86_400_000);
  const fmt = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });
  return {
    startDate: isoDate(start),
    endDate: isoDate(end),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    label: `${fmt(start)} – ${fmt(last)}`,
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export const shiftHours = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
};

export const hhmm = (t: string) => t.slice(0, 5);

export async function addEmployee(
  name: string,
  shifts: { day: number; start: string; end: string }[],
) {
  const { error } = await supabase.rpc("add_employee", {
    p_name: name.trim(),
    p_shifts: shifts,
  });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, ""));
}

export async function requestSwap(swapDate: string, coveringEmployeeId: string) {
  const { error } = await supabase.rpc("request_swap", {
    p_swap_date: swapDate,
    p_covering_employee_id: coveringEmployeeId,
  });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, ""));
}

export async function acceptSwap(id: string) {
  const { error } = await supabase.rpc("accept_swap", { p_id: id });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, ""));
}

export async function scheduledHours(employeeId: string, from: string, to: string) {
  const { data } = await supabase.rpc("scheduled_hours", {
    p_emp: employeeId,
    p_from: from,
    p_to: to,
  });
  return Number(data ?? 0);
}

export async function actualHours(userId: string, fromISO: string, toISO: string) {
  const { data } = await supabase.rpc("completed_hours", {
    p_user: userId,
    p_from: fromISO,
    p_to: toISO,
  });
  return Number(data ?? 0);
}
