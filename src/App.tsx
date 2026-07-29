import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { useRealtimeStore } from "./store/useRealtimeStore";
import { Auth } from "./components/Auth";
import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { ManagerView } from "./components/ManagerView";
import { InstallPrompt } from "./components/InstallPrompt";
import { ResetPassword } from "./components/ResetPassword";

interface Profile {
  id: string;
  full_name: string;
  role: "employee" | "manager";
}

// Try a few times — right after registration the profile row appears a
// moment after the session does, so we wait for it instead of erroring.
async function loadProfile(userId: string): Promise<Profile | null> {
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase
      .from("users").select("id, full_name, role").eq("id", userId).maybeSingle();
    if (data) return data as Profile;
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const initDone = useRef(false);

  const init = useRealtimeStore((s) => s.init);
  const teardown = useRealtimeStore((s) => s.teardown);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
      if (!s) {
        setProfile(null);
        setProfileError(null);
        setRecovering(false);
        initDone.current = false;
        teardown();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [teardown]);

  useEffect(() => {
    if (!session?.user || recovering) return;
    (async () => {
      const p = await loadProfile(session.user.id);
      if (!p) {
        setProfileError("No profile found for this account. It may not have completed registration.");
        return;
      }
      setProfile(p);
      if (!initDone.current) {
        initDone.current = true;
        await init(p.id, p.role);
      }
    })();
  }, [session, init, recovering]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (recovering) return <ResetPassword />;

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-400">Loading…</div>;
  }

  if (!session)
    return (
      <>
        <Auth />
        <InstallPrompt />
      </>
    );

  if (profileError) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-xl">
          <p className="text-sm text-rose-700">{profileError}</p>
          <button onClick={signOut} className="rounded-xl bg-slate-900 px-5 py-2 text-sm text-white">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="grid min-h-screen place-items-center text-slate-400">Loading profile…</div>;
  }

  const isCeo = profile.role === "manager";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50">
      <header className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-lg">
              <span aria-hidden="true">🕘</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{profile.full_name}</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {isCeo ? "CEO" : "Employee"}
              </span>
            </div>
          </div>
          <button onClick={signOut} className="text-sm font-medium text-white/90 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        {isCeo ? <ManagerView managerId={profile.id} /> : <EmployeeDashboard />}
      </main>

      <InstallPrompt />
    </div>
  );
}
