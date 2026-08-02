import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { biweek, scheduledHours, actualHours } from "../lib/scheduling";

export interface TimeLog {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
}
export interface TeamMember {
  id: string;
  employee_id: string;
  full_name: string;
  phone: string | null;
  status: "in" | "out";
  weeklyClosedHours: number;
  openSince: string | null;
  scheduledBiweek: number;
  actualBiweek: number;
}
export interface AppNotification {
  id: string;
  message: string;
  created_at: string;
}

interface State {
  role: "employee" | "manager" | null;
  userId: string | null;
  myEmployeeId: string | null;
  openLog: TimeLog | null;
  closedHoursThisWeek: number;
  team: TeamMember[];
  notifications: AppNotification[];
  myAlerts: AppNotification[];
  tick: number;
  init: (userId: string, role: "employee" | "manager") => Promise<void>;
  clearNotifications: () => Promise<void>;
  clearMyAlerts: () => Promise<void>;
  teardown: () => void;
}

const weekWindow = () => {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
};

let channels: RealtimeChannel[] = [];

export const useRealtimeStore = create<State>((set, get) => ({
  role: null,
  userId: null,
  myEmployeeId: null,
  openLog: null,
  closedHoursThisWeek: 0,
  team: [],
  notifications: [],
  myAlerts: [],
  tick: 0,

  init: async (userId, role) => {
    set({ userId, role });

    const { data: me } = await supabase
      .from("users").select("employee_id").eq("id", userId).maybeSingle();
    const myEmp = (me as { employee_id: string } | null)?.employee_id ?? null;
    set({ myEmployeeId: myEmp });

    await refreshSelf(userId, set);
    if (role === "manager") {
      await refreshTeam(set);
      await refreshNotifications(set);
    } else {
      await refreshMyAlerts(myEmp, set);
    }

    const bump = () => set({ tick: get().tick + 1 });

    const logCh = supabase
      .channel("rt-time_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs" }, async () => {
        await refreshSelf(get().userId!, set);
        if (get().role === "manager") await refreshTeam(set);
        bump();
      })
      .subscribe();

    const weeklyCh = supabase
      .channel("rt-weekly")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_shifts" }, async () => {
        if (get().role === "manager") await refreshTeam(set);
        bump();
      })
      .subscribe();

    const swapCh = supabase
      .channel("rt-swaps")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_swaps" }, async () => {
        if (get().role === "manager") await refreshTeam(set);
        bump();
      })
      .subscribe();

    const notifCh = supabase
      .channel("rt-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async () => {
        if (get().role === "manager") await refreshNotifications(set);
        else await refreshMyAlerts(get().myEmployeeId, set);
      })
      .subscribe();

    channels = [logCh, weeklyCh, swapCh, notifCh];
  },

  clearNotifications: async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false).is("for_employee_id", null);
    set({ notifications: [] });
  },

  clearMyAlerts: async () => {
    const emp = get().myEmployeeId;
    if (emp) await supabase.from("notifications").update({ read: true }).eq("for_employee_id", emp);
    set({ myAlerts: [] });
  },

  teardown: () => {
    channels.forEach((c) => supabase.removeChannel(c));
    channels = [];
  },
}));

async function refreshSelf(userId: string, set: (p: Partial<State>) => void) {
  const { start, end } = weekWindow();
  const { data: open } = await supabase
    .from("time_logs").select("*").eq("user_id", userId).is("clock_out_at", null).maybeSingle();
  const { data: closed } = await supabase.rpc("completed_hours", { p_user: userId, p_from: start, p_to: end });
  set({ openLog: (open as TimeLog) ?? null, closedHoursThisWeek: Number(closed ?? 0) });
}

async function refreshTeam(set: (p: Partial<State>) => void) {
  const { start, end } = weekWindow();
  const bw = biweek();
  const { data: users } = await supabase
    .from("users").select("id, full_name, employee_id, phone").eq("role", "employee");
  const team: TeamMember[] = [];
  for (const u of (users as { id: string; full_name: string; employee_id: string; phone: string | null }[]) ?? []) {
    const { data: open } = await supabase
      .from("time_logs").select("clock_in_at").eq("user_id", u.id).is("clock_out_at", null).maybeSingle();
    const { data: closed } = await supabase.rpc("completed_hours", { p_user: u.id, p_from: start, p_to: end });
    const scheduledBiweek = await scheduledHours(u.employee_id, bw.startDate, bw.endDate);
    const actualBiweek = await actualHours(u.id, bw.startISO, bw.endISO);
    team.push({
      id: u.id,
      employee_id: u.employee_id,
      full_name: u.full_name,
      phone: u.phone,
      status: open ? "in" : "out",
      weeklyClosedHours: Number(closed ?? 0),
      openSince: (open as { clock_in_at: string } | null)?.clock_in_at ?? null,
      scheduledBiweek,
      actualBiweek,
    });
  }
  set({ team });
}

async function refreshNotifications(set: (p: Partial<State>) => void) {
  const { data } = await supabase
    .from("notifications").select("id, message, created_at")
    .eq("read", false).is("for_employee_id", null).order("created_at", { ascending: false });
  set({ notifications: (data as AppNotification[]) ?? [] });
}

async function refreshMyAlerts(empId: string | null, set: (p: Partial<State>) => void) {
  if (!empId) { set({ myAlerts: [] }); return; }
  const { data } = await supabase
    .from("notifications").select("id, message, created_at")
    .eq("read", false).eq("for_employee_id", empId).order("created_at", { ascending: false });
  set({ myAlerts: (data as AppNotification[]) ?? [] });
}
