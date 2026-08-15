import { useId, useRef } from "react";
import { X } from "lucide-react";
import { useDialog } from "@/lib/useDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  /** "left" for navigation, "bottom" for a thumb-reachable sheet. */
  side?: "left" | "bottom";
  title: string;
  children: React.ReactNode;
}

/**
 * Mobile slide-over. Rendered only while open, so it never sits in the tab
 * order on desktop where the same content is shown inline.
 */
export function Drawer({ open, onClose, side = "left", title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useDialog(open, panelRef, onClose);

  if (!open) return null;

  const isLeft = side === "left";

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        onClick={onClose}
        className="drawer-overlay absolute inset-0 h-full w-full bg-navy/40 backdrop-blur-[1px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          isLeft
            ? "drawer-panel-left pt-safe pb-safe absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-2xl"
            : "drawer-panel-bottom pb-safe absolute inset-x-0 bottom-0 flex max-h-[78dvh] flex-col rounded-t-2xl bg-surface shadow-2xl"
        }
      >
        {!isLeft && (
          <div className="flex justify-center pt-2" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-border" />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-navy">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-muted active:bg-muted"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
