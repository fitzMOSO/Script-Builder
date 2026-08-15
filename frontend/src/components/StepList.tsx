import { Plus } from "lucide-react";
import type { ScriptStep } from "@/lib/types";

interface Props {
  steps: ScriptStep[];
  activeStepId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
}

/** Static column, desktop only. Below `lg` this content goes in a bottom sheet. */
export function StepList(props: Props) {
  return (
    <div className="hidden w-80 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-bold text-navy">Script Steps</h2>
        <AddStepButton onAdd={props.onAdd} />
      </div>
      <StepItems {...props} />
    </div>
  );
}

/** Same list, sized for touch, for use inside the mobile Drawer. */
export function StepListPanel(props: Props) {
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3">
        <AddStepButton onAdd={props.onAdd} full />
      </div>
      <StepItems {...props} />
    </div>
  );
}

function AddStepButton({ onAdd, full }: { onAdd: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary transition-colors duration-150 hover:bg-primary-soft active:bg-primary-soft-hover ${
        full ? "w-full justify-center border border-dashed border-primary/40 px-3" : "px-2"
      }`}
    >
      <Plus className="size-4" aria-hidden="true" />
      Add Step
    </button>
  );
}

function StepItems({ steps, activeStepId, onSelect }: Omit<Props, "onAdd">) {
  return (
    <ol className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3">
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={isActive ? "step" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 ${
                isActive ? "bg-primary-soft ring-1 ring-primary/30" : "hover:bg-muted active:bg-muted"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  isActive ? "bg-primary text-on-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`truncate text-sm font-semibold ${
                  isActive ? "text-primary" : "text-slate-700"
                }`}
              >
                {step.title}
              </span>
            </button>
          </li>
        );
      })}

      {steps.length === 0 && (
        <li className="px-3 py-8 text-center text-sm text-muted-foreground">
          No steps yet. Add your first step to begin.
        </li>
      )}
    </ol>
  );
}
