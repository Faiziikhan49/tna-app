import { useState } from "react";
import { updatePassword, supabase } from "../lib/supabaseClient";

export function ResetPassword() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (pw.length < 6) throw new Error("Password must be at least 6 characters");
      if (pw !== pw2) throw new Error("Passwords don't match");
      await updatePassword(pw);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl">
        <h1 className="mb-1 text-xl font-bold text-slate-800">Set a new password</h1>
        {done ? (
          <>
            <p className="mt-3 text-sm text-emerald-700">Password updated. You can sign in now.</p>
            <button onClick={() => supabase.auth.signOut()}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 text-sm font-semibold text-white">
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">Enter your new password below.</p>
            <div className="space-y-3">
              <input type="password" placeholder="New password" value={pw}
                onChange={(e) => setPw(e.target.value)} className={field} />
              <input type="password" placeholder="Confirm new password" value={pw2}
                onChange={(e) => setPw2(e.target.value)} className={field} />
              <button onClick={save} disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Saving…" : "Update password"}
              </button>
              {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
