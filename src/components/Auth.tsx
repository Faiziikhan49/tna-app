import { useState } from "react";
import { supabase, signUpWithName, sendPasswordReset } from "../lib/supabaseClient";

type Mode = "signin" | "register" | "forgot";

export function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "register") {
        await signUpWithName(email, password, fullName, phone);
      } else {
        await sendPasswordReset(email);
        setInfo("If that email exists, a reset link is on its way. Check your inbox.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-2xl">
            <span aria-hidden="true">🕘</span>
          </div>
          <h1 className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-2xl font-bold text-transparent">
            Time &amp; Attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin" && "Welcome back — sign in"}
            {mode === "register" && "Register with your full name"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <>
              <input type="text" placeholder="Full name (e.g. Syed Fakher Naqvi)"
                value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} />
              <input type="tel" placeholder="Phone number"
                value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </>
          )}

          <input type="email" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className={field} />

          {mode !== "forgot" && (
            <input type="password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          )}

          <button onClick={submit} disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50">
            {busy ? "Please wait…"
              : mode === "signin" ? "Sign in"
              : mode === "register" ? "Create account"
              : "Send reset link"}
          </button>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {info && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</p>}
        </div>

        <div className="mt-5 space-y-1 text-center text-sm">
          {mode === "signin" && (
            <>
              <button onClick={() => { setMode("register"); setError(null); setInfo(null); }}
                className="block w-full font-medium text-indigo-600 hover:underline">
                New here? Create an account
              </button>
              <button onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                className="block w-full text-slate-500 hover:underline">
                Forgot your password?
              </button>
            </>
          )}
          {mode !== "signin" && (
            <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
              className="block w-full font-medium text-indigo-600 hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
