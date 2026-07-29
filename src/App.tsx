import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { useRealtimeStore } from "./store/useRealtimeStore";
import { Auth } from "./components/Auth";
import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { ManagerView } from "./components/ManagerView";

interface Profile {
  id: string;
  full_name: string;
  role: "employee" | "manager";
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const initDone = useRef(false);

  const init = useRealtimeStore((s) => s.init);
  const teardown = useRealtimeStore((s) => s.teardown);

  // Track the auth session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setProfileError(null);
        initDone.current = false;
        teardown();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [teardown]);

  // Once we have a session, load the profile and start realtime once.
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !data) {
        setProfileError(
          "No employee profile found for this account. It may not have completed roster registration.",
        );
        return;
      }
      const p = data as Profile;
      setProfile(p);
      if (!initDone.current) {
        initDone.current = true;
        await init(p.id, p.role);
      }
    })();
  }, [session, init]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading…</div>;
  }

  if (!session) return <Auth />;

  if (profileError) {
    return (
      <div className="mx-auto mt-20 max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-rose-700">{profileError}</p>
        <button onClick={signOut} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Sign out
        </button>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-10 text-center text-slate-500">Loading profile…</div>;
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-medium">
          {profile.full_name}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {profile.role}
          </span>
        </span>
        <button onClick={signOut} className="text-sm text-slate-500 underline">
          Sign out
        </button>
      </header>

      {profile.role === "manager" ? (
        <ManagerView managerId={profile.id} />
      ) : (
        <EmployeeDashboard />
      )}
    </div>
  );
}
