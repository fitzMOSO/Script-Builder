import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Library,
  Lightbulb,
  Search,
  ShieldAlert,
  SkipForward,
} from "lucide-react";
import { Button, Empty, StatusBadge } from "@/components/ui";
import { segments } from "@/lib/variables";
import { useScriptStore } from "@/store/useScriptStore";
import type { Objection } from "@/lib/types";

/**
 * The CSR's screen: read the script aloud, one step at a time. Deliberately
 * has no form controls — nothing here can change the script.
 */
export function RunView() {
  const { activeSet, activeStepId, selectStep, setView } = useScriptStore();

  const [done, setDone] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [showObjections, setShowObjections] = useState(false);

  const steps = activeSet?.steps ?? [];
  const index = steps.findIndex((s) => s.id === activeStepId);
  const step = index >= 0 ? steps[index] : null;
  const percent = steps.length > 0 && index >= 0 ? Math.round(((index + 1) / steps.length) * 100) : 0;

  const parts = useMemo(
    () => (step ? segments(step.content, activeSet?.variable_values ?? {}) : []),
    [step, activeSet?.variable_values],
  );

  if (!activeSet) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Empty>
          No script selected.{" "}
          <button
            type="button"
            onClick={() => setView("library")}
            className="font-bold text-primary underline"
          >
            Choose one from the library
          </button>
          .
        </Empty>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Empty>This script set has no steps yet.</Empty>
      </div>
    );
  }

  /** Move the current step between the covered/skipped sets — never both. */
  const mark = (stepId: number, as: "covered" | "skipped") => {
    const add = as === "covered" ? setDone : setSkipped;
    const drop = as === "covered" ? setSkipped : setDone;
    add((prev) => new Set(prev).add(stepId));
    drop((prev) => {
      if (!prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  };

  const go = (offset: -1 | 1) => {
    const next = steps[index + offset];
    if (next) {
      if (offset === 1 && step) mark(step.id, "covered");
      selectStep(next.id);
      window.scrollTo({ top: 0 });
    }
  };

  /**
   * Skipping advances without marking the step covered — the distinction
   * matters, since "covered" is the agent's record of what was actually read.
   */
  const skip = () => {
    if (!step) return;
    mark(step.id, "skipped");
    const next = steps[index + 1];
    if (next) {
      selectStep(next.id);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-bold text-navy">{activeSet.name}</h2>
          <StatusBadge status={activeSet.status} />
        </div>
        <Button onClick={() => setView("library")}>
          <Library className="size-4" aria-hidden="true" />
          Change script
        </Button>
      </div>

      {activeSet.status !== "published" && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This is a draft, not an approved script. Check with your supervisor before using it live.
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>
            Step {index + 1} of {steps.length}
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Call progress"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {step && (
        <article className="rounded-xl border border-border bg-surface p-5 sm:p-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
                {step.category}
              </span>
              {step.is_required && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  required
                </span>
              )}
              {done.has(step.id) && (
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">
                  covered
                </span>
              )}
              {skipped.has(step.id) && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  skipped
                </span>
              )}
            </div>

            {/* Only offered when the author marked the step skippable — it
                replaces the old static "skippable" chip, which told the agent
                a step could be skipped without letting them do it. */}
            {step.allow_skip && (
              <Button onClick={skip} aria-label={`Skip step: ${step.title}`}>
                <SkipForward className="size-4" aria-hidden="true" />
                Skip this step
              </Button>
            )}
          </div>

          <h3 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
            {step.title}
          </h3>

          {/* Large, high-contrast, generous line-height: this gets read aloud
              off-screen while the agent is also listening to the customer. */}
          <p className="mt-3 text-xl leading-relaxed font-medium whitespace-pre-wrap text-navy sm:text-2xl sm:leading-relaxed">
            {step.content ? (
              parts.map((part, i) =>
                part.name ? (
                  <mark
                    key={i}
                    title={part.missing ? `No value set for {{${part.name}}}` : `{{${part.name}}}`}
                    className={
                      part.missing
                        ? "rounded bg-amber-100 px-1 font-bold text-amber-900"
                        : "rounded bg-primary-soft px-1 font-bold text-primary"
                    }
                  >
                    {part.missing ? `{{${part.text}}}` : part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )
            ) : (
              <span className="text-base text-muted-foreground italic">
                This step has no script text yet.
              </span>
            )}
          </p>

          {step.notes && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold tracking-wide text-amber-900 uppercase">
                  Agent guidance
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-amber-900">
                  {step.notes}
                </p>
              </div>
            </div>
          )}
        </article>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" disabled={index <= 0} onClick={() => go(-1)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          disabled={index >= steps.length - 1}
          onClick={() => go(1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <ObjectionLookup
        objections={activeSet.objections}
        currentStepId={step?.id ?? null}
        open={showObjections}
        onToggle={() => setShowObjections((v) => !v)}
      />
    </div>
  );
}

/** Collapsed by default so it doesn't compete with the script, one tap away
 *  when the prospect pushes back. */
function ObjectionLookup({
  objections,
  currentStepId,
  open,
  onToggle,
}: {
  objections: Objection[];
  currentStepId: number | null;
  open: boolean;
  onToggle: () => void;
}) {
  const [query, setQuery] = useState("");

  const pinnedHere = (o: Objection) => currentStepId != null && o.step_id === currentStepId;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (o: Objection) =>
      !term ||
      o.title.toLowerCase().includes(term) ||
      o.questions.some((q) => q.text.toLowerCase().includes(term)) ||
      o.rebuttals.some((r) => r.text.toLowerCase().includes(term));

    // Objections pinned to the step the agent is on float to the top — that's
    // the whole point of pinning them, and scrolling mid-call is expensive.
    const pinned = (o: Objection) => currentStepId != null && o.step_id === currentStepId;
    return objections
      .filter(matches)
      .map((o, i) => ({ o, i }))
      .sort((a, b) => Number(pinned(b.o)) - Number(pinned(a.o)) || a.i - b.i)
      .map((entry) => entry.o);
  }, [objections, query, currentStepId]);

  const hereCount = objections.filter(pinnedHere).length;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-bold text-navy"
      >
        <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
        Objection handling
        {hereCount > 0 && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
            {hereCount} for this step
          </span>
        )}
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {objections.length} · {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What did the customer just say?"
              aria-label="Search objections"
              className="w-full rounded-lg border border-border py-2.5 pr-3 pl-9 text-sm outline-none focus:border-primary"
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {objections.length === 0 ? "No objections recorded." : "No match."}
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((o) => (
                <li
                  key={o.id}
                  className={`rounded-lg border p-3 ${
                    pinnedHere(o) ? "border-primary bg-primary-soft/50" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-navy">{o.title}</span>
                    {pinnedHere(o) && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        this step
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        o.severity === "MAJOR"
                          ? "bg-red-50 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {o.severity}
                    </span>
                  </div>
                  {o.questions.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground italic">
                      “{o.questions.map((q) => q.text).join("” / “")}”
                    </p>
                  )}
                  <ul className="mt-2 space-y-1.5">
                    {o.rebuttals.map((r) => (
                      <li key={r.id} className="text-sm leading-relaxed text-slate-700">
                        → {r.text}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
