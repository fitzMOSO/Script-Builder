import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { promptText } from "@/lib/alerts";
import { StatusBadge } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";
import type { ScriptSetSummary } from "@/lib/types";

/** Show the search field once scanning the list by eye stops being realistic. */
const SEARCH_THRESHOLD = 6;

/**
 * Header control for choosing which script set is loaded — the "which script
 * do I run for this call?" decision. Published sets sort first because those
 * are the ones agents are meant to use.
 */
export function ScriptSetPicker() {
  const { sets, activeSet, selectSet, createSet, setView } = useScriptStore();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const ordered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matches = (s: ScriptSetSummary) =>
      !term ||
      s.name.toLowerCase().includes(term) ||
      (s.description ?? "").toLowerCase().includes(term);

    return [...sets].filter(matches).sort((a, b) => {
      // Published first, then most recently updated.
      const rank = Number(b.status === "published") - Number(a.status === "published");
      return rank !== 0 ? rank : b.updated_at.localeCompare(a.updated_at);
    });
  }, [sets, query]);

  const choose = async (id: number) => {
    setOpen(false);
    if (id !== activeSet?.id) await selectSet(id);
  };

  const create = async () => {
    setOpen(false);
    const name = await promptText("New script set", { placeholder: "e.g. Q3 Outbound Campaign" });
    if (name) {
      await createSet(name);
      setView("builder");
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="-mx-2 flex min-h-11 w-full max-w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-white/10 active:bg-white/20"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-bold text-white sm:text-lg">
              {activeSet?.name ?? "Choose a script set"}
            </span>
            {activeSet && <StatusBadge status={activeSet.status} />}
          </span>
          {activeSet && (
            <span className="block truncate text-xs font-medium text-white/70">
              v{activeSet.version} · {activeSet.status} · switch script
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-white/70" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Script sets"
          className="absolute top-full left-0 z-40 mt-1 flex max-h-[70dvh] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          {sets.length > SEARCH_THRESHOLD && (
            <div className="relative border-b border-border p-2">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search script sets…"
                aria-label="Search script sets"
                className="w-full rounded-lg border border-border py-2.5 pr-3 pl-9 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            {ordered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {sets.length === 0 ? "No script sets yet." : "No matches."}
              </li>
            )}

            {ordered.map((s) => {
              const current = s.id === activeSet?.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={current}
                    onClick={() => void choose(s.id)}
                    className={`flex min-h-12 w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 ${
                      current ? "bg-primary-soft" : "hover:bg-muted active:bg-muted"
                    }`}
                  >
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${current ? "text-primary" : "invisible"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`truncate text-sm font-bold ${
                            current ? "text-primary" : "text-slate-800"
                          }`}
                        >
                          {s.name}
                        </span>
                        <StatusBadge status={s.status} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        v{s.version} · {s.description || "No description"}
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
              onClick={() => void create()}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-bold text-primary transition-colors duration-150 hover:bg-primary-soft active:bg-primary-soft-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
              New script set
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
