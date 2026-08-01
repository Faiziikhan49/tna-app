import { useEffect, useState } from "react";
import { supabase, updateMyProfile } from "../lib/supabaseClient";

export function Profile({ onSaved }: { onSaved?: (name: string) => void }) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id;
      if (!id) return;
      const { data } = await supabase
        .from("users").select("first_name, phone, email").eq("id", id).maybeSingle();
      const row = data as { first_name: string | null; phone: string | null; email: string } | null;
      setFirstName(row?.first_name ?? "");
      setPhone(row?.phone ?? "");
      setEmail(row?.email ?? u.user?.email ?? "");
      setOrigEmail(row?.email ?? u.user?.email ?? "");
    })();
  }, []);

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      if (!firstName.trim()) throw new Error("First name can't be empty");
      const emailChanged = !!email.trim() && email.trim() !== origEmail;
      await updateMyProfile({
        firstName: firstName.trim(),
        phone: phone.trim(),
        email: emailChanged ? email.trim() : undefined,
      });
      setMsg(emailChanged
        ? "Saved. Check your new email for a confirmation link to finish the change."
        : "Profile saved.");
      onSaved?.(firstName.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400";

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">First name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Email (login)</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      <button onClick={save} disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Saving…" : "Save profile"}
      </button>
      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}
    </div>
  );
}
