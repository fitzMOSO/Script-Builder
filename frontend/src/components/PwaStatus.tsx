import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { CloudOff, Download, RefreshCw, X } from "lucide-react";

/** Not in lib.dom yet — Chromium-only, and only fires when installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Inline strip shown while the device is offline. Deliberately in the document
 * flow rather than fixed, so it can never cover a control.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const online = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden="true" />
      Offline — showing the last loaded script. Edits will not save until you reconnect.
    </div>
  );
}

/**
 * Floating stack for the two things the service worker can tell us about:
 * a new build is waiting, and the app can be installed to the home screen.
 * Sits above the mobile bottom bar.
 */
export function PwaPrompts() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Stop Chrome's own mini-infobar so our card is the only affordance.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // The event can only be used once, whatever the user chose.
    setInstallEvent(null);
  };

  const showInstall = installEvent !== null && !installDismissed;
  if (!needRefresh && !showInstall) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-40 flex flex-col items-end gap-2 lg:inset-x-auto lg:right-4 lg:bottom-4 lg:w-80">
      {needRefresh && (
        <Card
          icon={RefreshCw}
          title="A new version is ready"
          body="Reload to pick up the latest changes."
          actionLabel="Reload"
          onAction={() => void updateServiceWorker(true)}
          onDismiss={() => setNeedRefresh(false)}
        />
      )}

      {showInstall && (
        <Card
          icon={Download}
          title="Install Script Builder"
          body="Add it to your home screen to run it full screen and offline."
          actionLabel="Install"
          onAction={() => void install()}
          onDismiss={() => setInstallDismissed(true)}
        />
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="pointer-events-auto w-full rounded-xl border border-border bg-surface p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss: ${title}`}
          className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-muted active:bg-muted"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="mt-3 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-on-primary transition-colors duration-150 hover:bg-primary-hover active:bg-primary-hover"
      >
        {actionLabel}
      </button>
    </div>
  );
}
