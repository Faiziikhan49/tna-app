import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface TimeLog {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
}
export interface Schedule {
  id: string;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}
export interface TeamMember {
  id: string;
  full_name: string;
  status: "in" | "out";
  weeklyClosedHours: number;
  openSince: string | null;
}

interface State {
  role: "employee" | "manager" | null;
  userId: string | null;
  openLog: TimeLog | null;
  closedHoursThisWeek: number;
  schedules: Schedule[];
  team: TeamMember[];
  alerts: number;
  init: (userId: string, role: "employee" | "manager") => Promise<void>;
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
  openLog: null,
  closedHoursThisWeek: 0,
  schedules: [],
  team: [],
  alerts: 0,

  init: async (userId, role) => {
    set({ userId, role });
    await refreshSelf(userId, set);
    if (role === "manager") await refreshTeam(set);

    // Realtime subscriptions. RLS scopes what each role actually receives.
    const logCh = supabase
      .channel("rt-time_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_logs" }, async () => {
        await refreshSelf(get().userId!, set);
        if (get().role === "manager") await refreshTeam(set);
      })
      .subscribe();

    const schedCh = supabase
      .channel("rt-schedules")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, async () => {
        const { data } = await supabase
          .from("schedules")
          .select("*")
          .order("shift_date");
        set({ schedules: (data as Schedule[]) ?? [] });
      })
      .subscribe();

    const alertCh = supabase
      .channel("rt-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "geofence_alerts" }, async () => {
        const { count } = await supabase
          .from("geofence_alerts")
          .select("*", { count: "exact", head: true })
          .eq("resolved", false);
        set({ alerts: count ?? 0 });
      })
      .subscribe();

    channels = [logCh, schedCh, alertCh];

    const { data: sched } = await supabase.from("schedules").select("*").order("shift_date");
    set({ schedules: (sched as Schedule[]) ?? [] });
  },

  teardown: () => {
    channels.forEach((c) => supabase.removeChannel(c));
    channels = [];
  },
}));

async function refreshSelf(userId: string, set: (p: Partial<State>) => void) {
  const { start, end } = weekWindow();
  const { data: open } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", userId)
    .is("clock_out_at", null)
    .maybeSingle();
  const { data: closed } = await supabase.rpc("completed_hours", {
    p_user: userId,
    p_from: start,
    p_to: end,
  });
  set({ openLog: (open as TimeLog) ?? null, closedHoursThisWeek: Number(closed ?? 0) });
}

async function refreshTeam(set: (p: Partial<State>) => void) {
  const { start, end } = weekWindow();
  const { data: users } = await supabase.from("users").select("id, full_name");
  const team: TeamMember[] = [];
  for (const u of (users as { id: string; full_name: string }[]) ?? []) {
    const { data: open } = await supabase
      .from("time_logs")
      .select("clock_in_at")
      .eq("user_id", u.id)
      .is("clock_out_at", null)
      .maybeSingle();
    const { data: closed } = await supabase.rpc("completed_hours", {
      p_user: u.id,
      p_from: start,
      p_to: end,
    });
    team.push({
      id: u.id,
      full_name: u.full_name,
      status: open ? "in" : "out",
      weeklyClosedHours: Number(closed ?? 0),
      openSince: (open as { clock_in_at: string } | null)?.clock_in_at ?? null,
    });
  }
  set({ team });
}
