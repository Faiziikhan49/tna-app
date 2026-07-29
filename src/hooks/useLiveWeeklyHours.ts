import { useEffect, useState } from "react";

/**
 * Live decimal running total of hours worked this week.
 * = closed hours already logged + elapsed time of the current open shift.
 * Ticks every second WITHOUT writing to the DB; punches are the only
 * events that persist. On reconnect, closedHours is re-fetched upstream,
 * so this projection self-heals.
 */
export function useLiveWeeklyHours(
  closedHours: number,
  clockInAt: string | null,
): number {
  const [live, setLive] = useState(closedHours);

  useEffect(() => {
    if (!clockInAt) {
      setLive(closedHours);
      return;
    }
    const inMs = new Date(clockInAt).getTime();
    const tick = () => {
      const elapsedH = (Date.now() - inMs) / 3_600_000;
      setLive(closedHours + elapsedH);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closedHours, clockInAt]);

  return live;
}
