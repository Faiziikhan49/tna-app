import { useState } from "react";
import { supabase, signUpWithRoster } from "../lib/supabaseClient";

/** Sign in for existing users, or register with a corporate Employee ID. */
export function Auth() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        await signUpWithRoster(email, password, employeeId.trim());
      }
      // On success the auth state change in App.tsx takes over.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-medium">Time &amp; Attendance</h1>
      <p className="mt-1 text-sm text-slate-500">
        {mode === "signin" ? "Sign in to your account" : "Register with your Employee ID"}
      </p>

      <div className="mt-5 space-y-3">
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {mode === "register" && (
          <input
            type="text"
            placeholder="Employee ID (e.g. E-1002)"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Register"}
        </button>

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
      </div>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "register" : "signin");
          setError(null);
        }}
        className="mt-4 text-sm text-slate-500 underline"
      >
        {mode === "signin" ? "Need to register? Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
