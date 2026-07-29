import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Shows an "Install app" banner. On Chrome/Edge/Android it uses the native
 * beforeinstallprompt event. iOS Safari has no such event, so we show the
 * manual "Share -> Add to Home Screen" instruction instead. Hides itself
 * once the app is already installed (running in standalone display mode).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return; // already installed

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        {isIos ? (
          <p className="text-sm text-slate-700">
            Install: tap <span className="font-medium">Share</span> then{" "}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="text-sm text-slate-700">Install the app on this device for quick access.</p>
        )}
        <div className="flex items-center gap-2">
          {!isIos && (
            <button
              onClick={install}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Install app
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-500"
            aria-label="Dismiss"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
