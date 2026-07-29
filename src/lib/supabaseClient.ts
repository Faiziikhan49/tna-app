import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Sign up, then gate against the corporate roster in one flow. */
export async function signUpWithRoster(
  email: string,
  password: string,
  employeeId: string,
) {
  const { error: signErr } = await supabase.auth.signUp({ email, password });
  if (signErr) throw signErr;

  // register_employee raises ROSTER_REJECT on any invalid/taken ID.
  const { data, error } = await supabase.rpc("register_employee", {
    p_employee_id: employeeId,
  });
  if (error) {
    // Roster failed: the auth user exists but has no profile. Sign them
    // out so they can't sit in a half-registered state.
    await supabase.auth.signOut();
    throw new Error(error.message.replace(/^.*ROSTER_REJECT:\s*/, "") || "Registration rejected");
  }
  return data;
}

/** Read current device coordinates (browser). Native: swap for expo-location. */
export function getDeviceCoords(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("NO_GEOLOCATION"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

/** Request a punch. The Edge Function is authoritative — this only asks. */
export async function requestPunch(action: "clock_in" | "clock_out") {
  const coords = await getDeviceCoords();
  const { data: sess } = await supabase.auth.getSession();
  const res = await fetch(
    `${url}/functions/v1/geofence-punch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sess.session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
    },
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.message ?? payload.error ?? "PUNCH_FAILED");
  return payload;
}
