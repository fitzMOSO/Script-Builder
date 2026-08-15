import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  ListOrdered,
  Menu,
  Save,
} from "lucide-react";
import { confirmAction, confirmDelete } from "@/lib/alerts";
import { Drawer } from "@/components/Drawer";
import { OfflineBanner, PwaPrompts } from "@/components/PwaStatus";
import { ScriptSetPicker } from "@/components/ScriptSetPicker";
import { VersionMenu } from "@/components/VersionMenu";
import { Sidebar, SidebarNav } from "@/components/Sidebar";
import { VIEW_TITLES } from "@/lib/views";
import { StepList, StepListPanel } from "@/components/StepList";
import { StepEditor } from "@/components/StepEditor";
import { LibraryView } from "@/views/LibraryView";
import { ObjectionsView } from "@/views/ObjectionsView";
import { ReportsView } from "@/views/ReportsView";
import { RunView } from "@/views/RunView";
import { SettingsView } from "@/views/SettingsView";
import { useScriptStore } from "@/store/useScriptStore";

type OpenDrawer = "nav" | "steps" | null;

export default function App() {
  const {
    view,
    activeSet,
    activeStepId,
    categories,
    loading,
    saving,
    editorDirty,
    bootstrap,
    selectStep,
    addStep,
    saveStep,
    duplicateStep,
    deleteStep,
    moveStep,
    publish,
  } = useScriptStore();

  const [drawer, setDrawer] = useState<OpenDrawer>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Both drawers are `lg:hidden`. If the viewport grows while one is open it
  // would vanish but leave the body scroll-locked, so close it explicitly.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawer(null);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isBuilder = view === "builder";
  const isLibrary = view === "library";
  const steps = activeSet?.steps ?? [];
  const index = steps.findIndex((s) => s.id === activeStepId);
  const activeStep = index >= 0 ? steps[index] : null;
  const percent =
    steps.length > 0 && index >= 0 ? Math.round(((index + 1) / steps.length) * 100) : 0;

  // The indicator used to read "Saved" unconditionally, including while the
  // editor held unsaved edits. It now reports the actual state.
  const unsaved = editorDirty && !saving;
  const saveLabel = saving ? "Saving…" : unsaved ? "Unsaved changes" : "Saved";

  const handlePublish = async () => {
    if (!activeSet) return;
    const ok = await confirmAction(
      "Publish this script set?",
      `"${activeSet.name}" will be published as version ${activeSet.version + 1} and made available to agents.`,
      "Publish",
    );
    if (ok) await publish();
  };

  const handleDeleteStep = async (stepId: number, title: string) => {
    const ok = await confirmDelete(
      "Delete this step?",
      `"${title}" will be permanently removed from the script. This cannot be undone.`,
    );
    if (ok) await deleteStep(stepId);
  };

  /**
   * Now that the editor only saves on demand, moving off a step would silently
   * bin the edits — so ask first.
   */
  const leaveStep = async () => {
    if (!editorDirty) return true;
    return confirmAction(
      "Discard unsaved changes?",
      "This step has edits that haven't been saved. Moving away will lose them.",
      "Discard",
    );
  };

  const openStep = async (stepId: number) => {
    if (await leaveStep()) selectStep(stepId);
  };

  const goTo = async (offset: -1 | 1) => {
    const next = steps[index + offset];
    if (next && (await leaveStep())) selectStep(next.id);
  };

  return (
    // h-dvh, not h-screen: 100vh on mobile Safari includes the URL bar and
    // pushes the bottom bar off-screen.
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />

        {/* Deep navy chrome, continuous with the sidebar masthead — the same
            top-strip treatment the Outbound Sales Tool uses. */}
        <header className="pt-safe flex min-h-16 shrink-0 items-center gap-3 bg-navy px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer("nav")}
            aria-label="Open navigation menu"
            aria-expanded={drawer === "nav"}
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-lg text-white/90 hover:bg-white/10 active:bg-white/20 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          {/* Outside the library the header IS the set switcher — the set every
              screen operates on used to be invisible global state. */}
          <div className="min-w-0 flex-1">
            {isLibrary || !activeSet ? (
              <h1 className="truncate text-base font-bold tracking-wide text-white uppercase sm:text-lg">
                {VIEW_TITLES[view]}
              </h1>
            ) : (
              <>
                <p className="text-xs font-bold tracking-wider text-white/70 uppercase">
                  {VIEW_TITLES[view]}
                </p>
                <ScriptSetPicker />
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!isLibrary && view !== "run" && !isBuilder && (
              <span
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  unsaved ? "text-amber-300" : "text-white/70"
                }`}
                title={saveLabel}
              >
                {unsaved ? (
                  <CircleAlert className="size-4" aria-hidden="true" />
                ) : (
                  <CloudUpload className="size-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{saveLabel}</span>
                <span className="sr-only">{saveLabel}</span>
              </span>
            )}

            {/* A real Save button, not the old greyed-out status text that read
                like a permanently disabled one. `form` targets the step form by
                id, so it works from up here. */}
            {isBuilder && (
              <>
                {unsaved && (
                  <span className="hidden items-center gap-1.5 text-sm font-semibold text-amber-300 sm:flex">
                    <CircleAlert className="size-4" aria-hidden="true" />
                    Unsaved
                  </span>
                )}
                <button
                  type="submit"
                  form="step-form"
                  disabled={saving || !activeStep}
                  title={activeStep ? "Save this step" : "No step open"}
                  className="flex min-h-11 items-center gap-1.5 rounded-lg border border-white/30 px-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-white/10 active:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
                >
                  <Save className="size-4" aria-hidden="true" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}

            {isBuilder && <VersionMenu />}
            {isBuilder && (
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={!activeSet || steps.length === 0}
                // Indigo-on-navy is too low-contrast to read as the primary
                // action, so on the navy bar the fill inverts to white.
                className="min-h-11 rounded-lg bg-white px-4 text-sm font-bold text-navy transition-colors duration-150 hover:bg-white/90 active:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
              >
                Publish
              </button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {isBuilder && (
            <StepList
              steps={steps}
              activeStepId={activeStepId}
              onSelect={(id) => void openStep(id)}
              onAdd={() => void addStep()}
            />
          )}

          {/* pb-24 keeps the last field clear of the fixed mobile bottom bar. */}
          <main
            className={`min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 ${
              isBuilder ? "pb-24 lg:pb-6" : ""
            }`}
          >
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

            {!loading && !isBuilder && (
              <>
                {view === "library" && <LibraryView />}
                {view === "run" && <RunView />}
                {view === "objections" && <ObjectionsView />}
                {view === "reports" && <ReportsView />}
                {view === "settings" && <SettingsView />}
              </>
            )}

            {!loading && isBuilder && (
              <>
                <div className="mb-5 flex items-center gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                      <span className="truncate">
                        {activeStep ? `Step ${index + 1} of ${steps.length}` : "No step selected"}
                      </span>
                      <span className="shrink-0 pl-3 text-muted-foreground">
                        {percent}% Complete
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Script progress"
                      className="h-2 overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* On phones these live in the bottom bar, within thumb reach. */}
                  <div className="hidden shrink-0 gap-2 lg:flex">
                    <NavButton
                      label="Previous"
                      icon={ChevronLeft}
                      disabled={index <= 0}
                      onClick={() => void goTo(-1)}
                    />
                    <NavButton
                      label="Next"
                      icon={ChevronRight}
                      iconRight
                      primary
                      disabled={index < 0 || index >= steps.length - 1}
                      onClick={() => void goTo(1)}
                    />
                  </div>
                </div>

                {activeStep && (
                  <StepEditor
                    key={activeStep.id}
                    step={activeStep}
                    categories={categories}
                    canMoveUp={index > 0}
                    canMoveDown={index < steps.length - 1}
                    onSave={(patch) => void saveStep(activeStep.id, patch)}
                    onDuplicate={() => void duplicateStep(activeStep.id)}
                    onDelete={() => void handleDeleteStep(activeStep.id, activeStep.title)}
                    onMove={(direction) => void moveStep(activeStep.id, direction)}
                  />
                )}

                {!activeStep && (
                  <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center sm:p-12">
                    <p className="text-sm text-muted-foreground">
                      Add a step to get started, or pick one from the step list.
                    </p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {isBuilder && (
          <nav
            aria-label="Step navigation"
            className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-border bg-surface px-2 pt-1 lg:hidden"
          >
            <BarButton
              label="Previous"
              icon={ChevronLeft}
              disabled={index <= 0}
              onClick={() => void goTo(-1)}
            />
            <button
              type="button"
              onClick={() => setDrawer("steps")}
              aria-expanded={drawer === "steps"}
              className="flex min-h-14 flex-[1.4] flex-col items-center justify-center rounded-lg px-2 text-primary hover:bg-primary-soft active:bg-primary-soft-hover"
            >
              <ListOrdered className="size-5" aria-hidden="true" />
              <span className="mt-0.5 text-xs font-bold">
                {activeStep ? `Step ${index + 1} / ${steps.length}` : "Steps"}
              </span>
            </button>
            <BarButton
              label="Next"
              icon={ChevronRight}
              disabled={index < 0 || index >= steps.length - 1}
              onClick={() => void goTo(1)}
            />
          </nav>
        )}
      </div>

      <Drawer open={drawer === "nav"} onClose={closeDrawer} side="left" title="Script Builder">
        <SidebarNav onNavigate={closeDrawer} />
      </Drawer>

      <Drawer open={drawer === "steps"} onClose={closeDrawer} side="bottom" title="Script Steps">
        <StepListPanel
          steps={steps}
          activeStepId={activeStepId}
          onSelect={(id) => {
            void openStep(id).then(closeDrawer);
          }}
          onAdd={() => {
            void addStep();
            closeDrawer();
          }}
        />
      </Drawer>

      <PwaPrompts />
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  iconRight,
  primary,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  iconRight?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 items-center gap-1.5 rounded-lg px-5 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "bg-primary text-on-primary hover:bg-primary-hover"
          : "border border-border bg-surface text-slate-600 hover:bg-muted"
      }`}
    >
      {!iconRight && <Icon className="size-4" aria-hidden="true" />}
      {label}
      {iconRight && <Icon className="size-4" aria-hidden="true" />}
    </button>
  );
}

function BarButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-lg px-2 text-slate-600 hover:bg-muted active:bg-muted disabled:opacity-35 disabled:hover:bg-transparent"
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="mt-0.5 text-xs font-semibold">{label}</span>
    </button>
  );
}
