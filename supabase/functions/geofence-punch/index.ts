// =====================================================================
// geofence-punch — the ONLY path by which an employee punch is written.
// Validates identity (JWT), evaluates the geofence server-side, enforces
// clock state, and writes with the service role. Clients cannot bypass it.
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isWithinGeofence } from "../_shared/haversine.ts";

interface PunchRequest {
  action: "clock_in" | "clock_out";
  latitude: number;
  longitude: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Resolve the caller from their JWT (never trust a user_id in the body).
  const authed = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await authed.auth.getUser();
  if (!auth?.user) return json({ error: "AUTH_REQUIRED" }, 401);
  const userId = auth.user.id;

  let body: PunchRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  if (!["clock_in", "clock_out"].includes(body.action)) {
    return json({ error: "BAD_ACTION" }, 400);
  }
  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return json({ error: "COORDS_REQUIRED" }, 400);
  }

  // 2. Service-role client for authoritative reads/writes.
  const db = createClient(url, service);

  const { data: profile } = await db
    .from("users")
    .select("id, worksite_id, worksites(latitude, longitude, radius_meters)")
    .eq("id", userId)
    .single();
  if (!profile?.worksites) return json({ error: "NO_WORKSITE" }, 409);

  const site = profile.worksites as unknown as {
    latitude: number;
    longitude: number;
    radius_meters: number;
  };

  // 3. Server-side geofence evaluation (Haversine).
  const { allowed, distance } = isWithinGeofence(
    { latitude: body.latitude, longitude: body.longitude },
    { latitude: site.latitude, longitude: site.longitude },
    site.radius_meters,
  );

  if (!allowed) {
    await db.from("geofence_alerts").insert({
      user_id: userId,
      action: body.action,
      latitude: body.latitude,
      longitude: body.longitude,
      distance_meters: Math.round(distance),
    });
    return json(
      {
        error: "GEOFENCE_REJECT",
        message: `You are ${Math.round(distance)} m from the worksite ` +
          `(max ${site.radius_meters} m). Punch blocked.`,
        distance_meters: Math.round(distance),
      },
      403,
    );
  }

  // 4. Enforce clock state via the open-log invariant.
  const { data: openLog } = await db
    .from("time_logs")
    .select("id, clock_in_at")
    .eq("user_id", userId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (body.action === "clock_in") {
    if (openLog) return json({ error: "ALREADY_CLOCKED_IN" }, 409);
    const { data, error } = await db
      .from("time_logs")
      .insert({
        user_id: userId,
        clock_in_at: new Date().toISOString(),
        clock_in_lat: body.latitude,
        clock_in_lng: body.longitude,
        source: "geofenced",
        created_by: userId,
      })
      .select()
      .single();
    if (error) return json({ error: "WRITE_FAILED", detail: error.message }, 500);
    return json({ ok: true, log: data });
  }

  // clock_out
  if (!openLog) return json({ error: "NOT_CLOCKED_IN" }, 409);
  const outAt = new Date();
  const durationHours =
    (outAt.getTime() - new Date(openLog.clock_in_at).getTime()) / 3_600_000;
  const { data, error } = await db
    .from("time_logs")
    .update({
      clock_out_at: outAt.toISOString(),
      clock_out_lat: body.latitude,
      clock_out_lng: body.longitude,
    })
    .eq("id", openLog.id)
    .select()
    .single();
  if (error) return json({ error: "WRITE_FAILED", detail: error.message }, 500);
  return json({ ok: true, log: data, shift_hours: Number(durationHours.toFixed(4)) });
});
