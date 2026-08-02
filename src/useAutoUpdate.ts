import { useEffect } from "react";

// Silently reloads the app once when public/version.json changes.
export function useAutoUpdate() {
  useEffect(() => {
    let current: string | null = null;

    async function check() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (current === null) {
          current = version;
        } else if (version !== current) {
          current = version;
          window.location.reload();
        }
      } catch {
        // offline or hiccup — ignore, try again next time
      }
    }

    check();
    const onFocus = () => check();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    const interval = setInterval(check, 60_000); // also check every minute

    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);
}
