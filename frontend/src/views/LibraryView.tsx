import { useMemo, useState } from "react";
import { Copy, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { confirmDelete, promptText } from "@/lib/alerts";
import { Button, Empty, Page, Panel, StatusBadge, TextInput } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";
import type { ScriptSetSummary } from "@/lib/types";

type Filter = "all" | "published" | "draft";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
];

/**
 * The one place script sets are listed. Replaces the old Dashboard, Templates
 * and Settings switcher, which were three renderings of the same list with
 * different buttons.
 */
export function LibraryView() {
  const { sets, activeSet, runSet, editSet, cloneSet, deleteSet, createSet, saving } =
    useScriptStore();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sets.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) || (s.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [sets, query, filter]);

  const create = async () => {
    const name = await promptText("New script set", { placeholder: "e.g. Q3 Outbound Campaign" });
    if (name) await createSet(name);
  };

  const duplicate = async (s: ScriptSetSummary) => {
    const name = await promptText("Duplicate script set", {
      text: `A new draft will be created with every step and objection copied from "${s.name}".`,
      value: `${s.name} (copy)`,
      confirmButtonText: "Duplicate",
    });
    if (name) await cloneSet(s.id, name);
  };

  const remove = async (s: ScriptSetSummary) => {
    const ok = await confirmDelete(
      "Delete this script set?",
      `"${s.name}", its steps and its objections will be permanently removed. This cannot be undone.`,
    );
    if (ok) await deleteSet(s.id);
  };

  return (
    <Page
      title="Script Library"
      subtitle="Pick the script for this call. Use opens it read-only; Edit opens the authoring view."
      actions={
        <Button variant="primary" onClick={() => void create()}>
          <Plus className="size-4" aria-hidden="true" />
          New script set
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search script sets…"
            aria-label="Search script sets"
            className="pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Filter by status"
          className="flex shrink-0 gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-9 rounded-md px-3 text-sm font-bold transition-colors duration-150 ${
                filter === key
                  ? "bg-primary text-on-primary"
                  : "text-slate-600 hover:bg-muted active:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty>
          {sets.length === 0
            ? "No script sets yet. Create one to get started."
            : "No script sets match this search."}
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((s) => (
            <Panel key={s.id} className="flex flex-col">
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 text-sm font-bold text-navy">{s.name}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">
                {s.description || "No description"}
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                v{s.version}
                {s.id === activeSet?.id && <span className="text-primary"> · open</span>}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => void runSet(s.id)}
                >
                  <Play className="size-4" aria-hidden="true" />
                  Use
                </Button>
                <Button disabled={saving} onClick={() => void editSet(s.id)} aria-label={`Edit ${s.name}`}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void duplicate(s)}
                  aria-label={`Duplicate ${s.name}`}
                  className="px-3"
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="danger"
                  disabled={saving}
                  onClick={() => void remove(s)}
                  aria-label={`Delete ${s.name}`}
                  className="px-3"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </Page>
  );
}
