import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Sign up, then approve against the pre-approved NAME list (with phone). */
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

/** Email a password-reset link back to this app. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/** Set a new password (used on the recovery screen). */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Clock in / out via a database function (no location check). */
export async function requestPunch(action: "clock_in" | "clock_out") {
  const { data, error } = await supabase.rpc("punch", { p_action: action });
  if (error) throw new Error(error.message.replace(/^.*:\s*/, "") || "PUNCH_FAILED");
  return data;
}
