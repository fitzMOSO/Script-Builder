import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, History, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { confirmAction, confirmDelete } from "@/lib/alerts";
import { Button, Empty, Label, Page, Panel, TextArea, TextInput } from "@/components/ui";
import { api } from "@/lib/api";
import { formatStamp } from "@/lib/format";
import { usedVariables } from "@/lib/variables";
import { useScriptStore } from "@/store/useScriptStore";
import type { ScriptVersionSummary, VersionSnapshot } from "@/lib/types";

export function SettingsView() {
  const { activeSet, updateSet, deleteSet, setView, saving } = useScriptStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setName(activeSet?.name ?? "");
    setDescription(activeSet?.description ?? "");
  }, [activeSet]);

  const dirty =
    activeSet != null && (name !== activeSet.name || description !== (activeSet.description ?? ""));

  const remove = async () => {
    if (!activeSet) return;
    const ok = await confirmDelete(
      "Delete this script set?",
      `"${activeSet.name}", its ${activeSet.steps.length} steps and ${activeSet.objections.length} objections will be permanently removed. This cannot be undone.`,
    );
    if (ok) {
      await deleteSet(activeSet.id);
      setView("library");
    }
  };

  const unpublish = async () => {
    if (!activeSet) return;
    const ok = await confirmAction(
      "Return this script to draft?",
      `"${activeSet.name}" will be marked as a draft. Agents opening it will see a "not approved" warning.`,
      "Unpublish",
    );
    if (ok) await updateSet({ status: "draft" });
  };

  if (!activeSet) {
    return (
      <Page title="Settings" subtitle="Manage the open script set.">
        <Empty>No script set selected — pick one from the library.</Empty>
      </Page>
    );
  }

  return (
    <Page title="Settings" subtitle={`Settings for "${activeSet.name}".`}>
      <Panel title="Details">
        <div className="space-y-4">
          <div>
            <Label htmlFor="set-name">Name</Label>
            <TextInput id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="set-description">Description</Label>
            <TextArea
              id="set-description"
              rows={3}
              value={description}
              placeholder="What this script set is for…"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {dirty && (
              <p className="mr-auto text-sm font-semibold text-amber-700">Unsaved changes.</p>
            )}
            <Button
              variant="primary"
              disabled={saving || !name.trim()}
              onClick={() => void updateSet({ name: name.trim(), description })}
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Panel>

      <VariableValues />

      <Panel title="Publishing">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Currently <strong>{activeSet.status}</strong> at version {activeSet.version}. Publishing
            happens from the Editor's Publish button, which also bumps the version.
          </p>
          <Button disabled={activeSet.status !== "published"} onClick={() => void unpublish()}>
            <Undo2 className="size-4" aria-hidden="true" />
            Unpublish
          </Button>
        </div>
      </Panel>

      <Versions />

      <Panel title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Deleting a script set removes its steps and objections. There is no undo.
          </p>
          <Button variant="danger" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete this script set
          </Button>
        </div>
      </Panel>
    </Page>
  );
}

/**
 * Version history for the open set — the one place versions can be selected,
 * previewed, restored or deleted. Each entry is a frozen snapshot taken at
 * publish time, so restoring one never depends on the live steps still existing.
 */
function Versions() {
  const { activeSet, versions, loadVersions, restoreVersion, deleteVersion } = useScriptStore();
  const setId = activeSet?.id;

  useEffect(() => {
    if (setId != null) void loadVersions();
  }, [setId, loadVersions]);

  if (versions.length === 0) {
    return (
      <Panel title="Version history">
        <Empty>
          No versions yet. Publishing from the Editor freezes a snapshot you can come back to.
        </Empty>
      </Panel>
    );
  }

  return (
    <Panel title="Version history">
      <p className="mb-3 text-sm text-muted-foreground">
        {versions.length} snapshot{versions.length === 1 ? "" : "s"}, newest first. Restoring copies
        a snapshot back over the live script and returns it to draft.
      </p>
      <ul className="divide-y divide-border">
        {versions.map((version) => (
          <VersionRow
            key={version.id}
            version={version}
            setId={setId!}
            isCurrent={version.version === activeSet?.version}
            onRestore={restoreVersion}
            onDelete={deleteVersion}
          />
        ))}
      </ul>
    </Panel>
  );
}

function VersionRow({
  version,
  setId,
  isCurrent,
  onRestore,
  onDelete,
}: {
  version: ScriptVersionSummary;
  setId: number;
  isCurrent: boolean;
  onRestore: (versionId: number) => Promise<void>;
  onDelete: (versionId: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<VersionSnapshot | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    // Fetch once, on first expand — the list endpoint deliberately omits the
    // snapshot payload so a set with 20 versions stays cheap to load.
    if (next && !snapshot) {
      const full = await api.getVersion(setId, version.id);
      setSnapshot(full.snapshot);
    }
  };

  const restore = async () => {
    const ok = await confirmAction(
      `Restore version ${version.version}?`,
      "The live steps and objections will be replaced with this snapshot, and the script goes back to draft. Your current content is not kept unless it was published.",
      "Restore",
    );
    if (ok) await onRestore(version.id);
  };

  const remove = async () => {
    const ok = await confirmDelete(
      `Delete version ${version.version}?`,
      "This snapshot will be permanently removed. The live script is not affected.",
    );
    if (ok) await onDelete(version.id);
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-expanded={open}
          className="flex min-h-11 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <History className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            <span className="font-medium">Version {version.version}</span>
            {isCurrent && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                current
              </span>
            )}
            <span className="block text-xs text-muted-foreground">
              {version.name} · {formatStamp(version.created_at)}
            </span>
          </span>
        </button>

        <div className="flex gap-2">
          <Button onClick={() => void restore()}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Restore
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-3 ml-6 rounded-md border border-border bg-muted/40 p-3 text-sm">
          {!snapshot ? (
            <p className="text-muted-foreground">Loading snapshot…</p>
          ) : (
            <>
              <p className="text-muted-foreground">
                {snapshot.steps.length} step
                {snapshot.steps.length === 1 ? "" : "s"} · {snapshot.objections.length} objection
                {snapshot.objections.length === 1 ? "" : "s"}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {snapshot.steps.map((step, index) => (
                  <li key={index}>{step.title}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Gives every `{{token}}` found in the step content a value. Without this the
 * run view has nothing to substitute and the agent reads the raw token aloud.
 */
function VariableValues() {
  const { activeSet, updateSet, saving } = useScriptStore();
  const [values, setValues] = useState<Record<string, string>>({});

  const names = useMemo(() => {
    const used = usedVariables(activeSet?.steps ?? []);
    const stored = Object.keys(activeSet?.variable_values ?? {});
    return [...new Set([...used, ...stored])];
  }, [activeSet]);

  useEffect(() => {
    setValues(activeSet?.variable_values ?? {});
  }, [activeSet]);

  const stored = activeSet?.variable_values ?? {};
  const dirty = names.some((n) => (values[n] ?? "") !== (stored[n] ?? ""));
  const unset = names.filter((n) => !(values[n] ?? "").trim()).length;

  return (
    <Panel title="Merge variable values">
      {names.length === 0 ? (
        <Empty>
          No merge variables yet. Write <code>{"{{like_this}}"}</code> in a step's content and it
          will appear here.
        </Empty>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {unset > 0
              ? `${unset} of ${names.length} have no value — agents will see the raw token.`
              : "All variables have values."}
          </p>
          <div className="space-y-3">
            {names.map((name) => (
              <div key={name} className="grid gap-1.5 sm:grid-cols-[14rem_1fr] sm:items-center">
                <Label htmlFor={`var-${name}`}>
                  <code className="text-xs">{`{{${name}}}`}</code>
                </Label>
                <TextInput
                  id={`var-${name}`}
                  value={values[name] ?? ""}
                  placeholder="Value read to the customer…"
                  onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {dirty && (
              <p className="mr-auto text-sm font-semibold text-amber-700">Values not saved yet.</p>
            )}
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => void updateSet({ variable_values: values })}
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save values"}
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}
