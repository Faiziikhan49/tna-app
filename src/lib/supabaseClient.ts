import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function signUpWithName(
  email: string,
  password: string,
  fullName: string,
  phone: string,
) {
  const { error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) throw signErr;

  const { data, error } = await supabase.rpc("register_by_name", {
    p_full_name: fullName.trim(),
    p_phone: phone.trim() || null,
  });
  if (error) {
    await supabase.auth.signOut();
    throw new Error(error.message.replace(/^.*ROSTER_REJECT:\s*/, "") || "Registration rejected");
  }
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Update the signed-in user's own profile (never their role). */
export async function updateMyProfile(opts: { fullName?: string; phone?: string; email?: string }) {
  const { error } = await supabase.rpc("update_my_profile", {
    p_name: opts.fullName ?? null,
    p_phone: opts.phone ?? null,
    p_email: opts.email ?? null,
  });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, ""));
  if (opts.email) {
    const { error: e2 } = await supabase.auth.updateUser({ email: opts.email });
    if (e2) throw e2;
  }
}

export async function requestPunch(action: "clock_in" | "clock_out") {
  const { data, error } = await supabase.rpc("punch", { p_action: action });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, "") || "PUNCH_FAILED");
  return data;
}
