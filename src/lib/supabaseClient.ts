import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function signUpWithRoster(
  email: string,
  password: string,
  employeeId: string,
) {
  const { error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) throw signErr;

  const { data, error } = await supabase.rpc("register_employee", {
    p_employee_id: employeeId,
  });
  if (error) {
    await supabase.auth.signOut();
    throw new Error(error.message.replace(/^.*ROSTER_REJECT:\s*/, "") || "Registration rejected");
  }
  return data;
}

export async function requestPunch(action: "clock_in" | "clock_out") {
  const { data, error } = await supabase.rpc("punch", { p_action: action });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, "") || "PUNCH_FAILED");
  return data;
}
