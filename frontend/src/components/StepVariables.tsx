import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCopy, CornerDownLeft, Plus, Save } from "lucide-react";
import { notify } from "@/lib/alerts";
import { copyText } from "@/lib/clipboard";
import { usedVariables } from "@/lib/variables";
import { Button } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";

/** Same shape the run view's token scanner accepts — anything else never substitutes. */
const NAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

/**
 * Past this many variables the panel opens collapsed. A set with 15 of them
 * would otherwise push the step's own Save button well below the fold.
 */
const COLLAPSE_ABOVE = 6;

/**
 * Merge-variable workbench for the editor. Values were previously only
 * editable in Settings, which meant writing a token here and filling it in on
 * another screen; and there was no way to reuse a token without retyping it
 * exactly, where one typo silently produces an unsubstituted `{{token}}` in a
 * live call.
 */
export function StepVariables({
  usedHere,
  onInsert,
}: {
  /** Variables referenced by the step currently open. */
  usedHere: string[];
  /** Drop `{{name}}` into the script content at the cursor. */
  onInsert: (name: string) => void;
}) {
  const { activeSet, updateSet, saving } = useScriptStore();

  const [values, setValues] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stored = useMemo(() => activeSet?.variable_values ?? {}, [activeSet]);

  // Re-sync only when the server's values genuinely differ. `stored` gets a new
  // identity on every store refresh — including the one that follows saving the
  // step — and resyncing on identity alone would wipe half-typed values.
  const syncedRef = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(stored);
    if (key === syncedRef.current) return;
    syncedRef.current = key;
    setValues(stored);
  }, [stored]);

  // Everything the set knows about: tokens written into any step, plus values
  // added here before their token exists. Used-in-this-step ones come first.
  const names = useMemo(() => {
    const all = new Set([...usedVariables(activeSet?.steps ?? []), ...Object.keys(stored)]);
    const rest = [...all].filter((n) => !usedHere.includes(n)).sort();
    return [...usedHere, ...rest];
  }, [activeSet, stored, usedHere]);

  const dirty = names.some((n) => (values[n] ?? "") !== (stored[n] ?? ""));
  const unsetCount = names.filter((n) => !(values[n] ?? "").trim()).length;

  const [open, setOpen] = useState(names.length <= COLLAPSE_ABOVE);

  const copy = async (name: string) => {
    const token = `{{${name}}}`;
    if (await copyText(token)) notify.success(`Copied ${token}`);
    else notify.error("Couldn't copy — select the token and copy manually");
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (!NAME_PATTERN.test(name)) {
      setError("Letters, numbers, dots and underscores only — no spaces.");
      return;
    }
    if (name in values) {
      setError("That variable already exists.");
      return;
    }
    setError(null);
    const next = { ...values, [name]: newValue };
    setValues(next);
    void updateSet({ variable_values: next });
    onInsert(name);
    setNewName("");
    setNewValue("");
  };

  return (
    <section className="rounded-lg border border-border p-3.5 sm:p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 text-left"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-sm font-bold text-slate-700">Merge variables</span>
        <span className="text-xs text-muted-foreground">
          {names.length} total
          {usedHere.length > 0 && ` · ${usedHere.length} in this step`}
          {unsetCount > 0 && ` · ${unsetCount} with no value`}
        </span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {open ? "hide" : "show"}
        </span>
      </button>

      {!open ? null : names.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          None yet. Add one below, or type <code>{"{{like_this}}"}</code> straight into the content.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {names.map((name) => {
            const here = usedHere.includes(name);
            const empty = !(values[name] ?? "").trim();
            return (
              <li
                key={name}
                className="grid gap-2 sm:grid-cols-[minmax(9rem,14rem)_1fr_auto] sm:items-center"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <code
                    title={here ? "Used in this step" : "Defined on this script set"}
                    className={`truncate rounded px-1.5 py-0.5 font-mono text-xs ${
                      here ? "bg-primary-soft text-primary" : "bg-muted text-slate-600"
                    }`}
                  >
                    {`{{${name}}}`}
                  </code>
                  {empty && (
                    <span
                      className="shrink-0 text-xs font-bold text-amber-700"
                      title="No value set"
                    >
                      no value
                    </span>
                  )}
                </span>

                <input
                  aria-label={`Value for ${name}`}
                  value={values[name] ?? ""}
                  placeholder="Value read to the customer…"
                  onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-primary"
                />

                <span className="flex gap-1">
                  <IconAction
                    icon={CornerDownLeft}
                    label={`Insert ${name} into the script`}
                    text="Insert"
                    onClick={() => onInsert(name)}
                  />
                  <IconAction
                    icon={ClipboardCopy}
                    label={`Copy ${name} token`}
                    onClick={() => void copy(name)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <>
          <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-[minmax(9rem,14rem)_1fr_auto] sm:items-center">
            <input
              aria-label="New variable name"
              value={newName}
              placeholder="new_variable_name"
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              // Enter would otherwise submit the surrounding step form.
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm outline-none transition-colors duration-150 focus:border-primary"
            />
            <input
              aria-label="New variable value"
              value={newValue}
              placeholder="Value (optional for now)"
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-primary"
            />
            <Button onClick={add} disabled={!newName.trim()}>
              <Plus className="size-4" aria-hidden="true" />
              Add &amp; insert
            </Button>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center justify-end gap-3">
            {dirty && (
              <p className="mr-auto text-xs font-semibold text-amber-700">
                Variable values not saved yet.
              </p>
            )}
            <Button
              variant="primary"
              onClick={() => void updateSet({ variable_values: values })}
              disabled={saving}
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save values"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function IconAction({
  icon: Icon,
  label,
  text,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  text?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-bold text-slate-700 transition-colors duration-150 hover:bg-muted active:bg-muted"
    >
      <Icon className="size-4" aria-hidden="true" />
      {text}
    </button>
  );
}
