import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, History, RotateCcw, Settings, X } from "lucide-react";
import { confirmAction } from "@/lib/alerts";
import { api } from "@/lib/api";
import { formatStamp } from "@/lib/format";
import { useDialog } from "@/lib/useDialog";
import { Button } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";
import type { ScriptVersion, ScriptVersionSummary } from "@/lib/types";

/**
 * Version picker for the Editor header. Deliberately read-mostly: you can look
 * at any published snapshot and restore one, but deleting versions stays in
 * Settings so a destructive action isn't one stray click from the edit surface.
 */
export function VersionMenu() {
  const { activeSet, versions, loadVersions, restoreVersion, setView } = useScriptStore();

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ScriptVersion | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable identity: the preview's focus-trap effect depends on it, and an
  // inline arrow would re-run that effect on every render of this header.
  const closePreview = useCallback(() => setPreview(null), []);

  const setId = activeSet?.id;

  useEffect(() => {
    if (setId != null) void loadVersions();
  }, [setId, loadVersions]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!activeSet) return null;

  const show = async (version: ScriptVersionSummary) => {
    setOpen(false);
    setLoadingPreview(true);
    try {
      setPreview(await api.getVersion(activeSet.id, version.id));
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Version history — currently version ${activeSet.version}`}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/30 px-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-white/10 active:bg-white/20"
      >
        <History className="size-4 text-white/70" aria-hidden="true" />
        <span>v{activeSet.version}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-white/70" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Published versions"
          className="absolute top-full right-0 z-40 mt-1 flex max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <p className="border-b border-border px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Published versions
          </p>

          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {versions.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No versions yet — publishing freezes a snapshot you can return to.
              </li>
            )}

            {versions.map((version) => {
              const current = version.version === activeSet.version;
              return (
                <li key={version.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={current}
                    onClick={() => void show(version)}
                    className={`flex min-h-12 w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 ${
                      current ? "bg-primary-soft" : "hover:bg-muted active:bg-muted"
                    }`}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${current ? "text-primary" : "invisible"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-bold ${
                          current ? "text-primary" : "text-slate-800"
                        }`}
                      >
                        Version {version.version}
                        {current && " · current"}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {formatStamp(version.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setView("settings");
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-primary transition-colors duration-150 hover:bg-primary-soft active:bg-primary-soft-hover"
            >
              <Settings className="size-4" aria-hidden="true" />
              Manage versions in Settings
            </button>
          </div>
        </div>
      )}

      {loadingPreview && (
        <span className="sr-only" role="status">
          Loading version…
        </span>
      )}

      {preview && (
        <VersionPreview
          version={preview}
          onClose={closePreview}
          onRestore={async () => {
            const ok = await confirmAction(
              `Restore version ${preview.version}?`,
              "The live steps and objections will be replaced with this snapshot, and the script goes back to draft. Your current content is kept only if it was published.",
              "Restore",
            );
            if (ok) {
              await restoreVersion(preview.id);
              closePreview();
            }
          }}
        />
      )}
    </div>
  );
}

/** Read-only look at a snapshot, so restoring is never a blind decision. */
function VersionPreview({
  version,
  onClose,
  onRestore,
}: {
  version: ScriptVersion;
  onClose: () => void;
  onRestore: () => Promise<void>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(true, panelRef, onClose);

  const { steps, objections } = version.snapshot;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-navy/40 backdrop-blur-[1px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Version ${version.version} preview`}
        className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-navy">Version {version.version}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {version.name} · published {formatStamp(version.created_at)} · {steps.length} step
              {steps.length === 1 ? "" : "s"} · {objections.length} objection
              {objections.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-muted active:bg-muted"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
          {steps.length === 0 && (
            <p className="text-sm text-muted-foreground">This version has no steps.</p>
          )}
          {steps.map((step, i) => (
            <article key={i} className="rounded-lg border border-border p-3">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {step.content || <span className="italic text-muted-foreground">No content.</span>}
              </p>
            </article>
          ))}
        </div>

        <div className="pb-safe flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => void onRestore()}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Restore this version
          </Button>
        </div>
      </div>
    </div>
  );
}
