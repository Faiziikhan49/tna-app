import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Employee self-signup: first name + email + phone + password. */
export async function signUpEmployee(
  firstName: string,
  email: string,
  phone: string,
  password: string,
) {
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  const { error: e2 } = await supabase.rpc("create_my_profile", {
    p_first_name: firstName.trim(),
    p_phone: phone.trim() || null,
  });
  if (e2) {
    await supabase.auth.signOut();
    throw new Error(e2.message.replace(/^.*:\s*/, "") || "Sign up failed");
  }
}

/** Login with email + password. */
export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error("Wrong email or password");
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

export async function updateMyProfile(opts: { firstName?: string; phone?: string; email?: string }) {
  const { error } = await supabase.rpc("update_my_profile", {
    p_first_name: opts.firstName ?? null,
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
