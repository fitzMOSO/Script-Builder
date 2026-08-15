import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { confirmDelete } from "@/lib/alerts";
import { Button, Empty, Label, Page, Panel, Select, TextArea, TextInput } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";
import type { Objection, ScriptStep } from "@/lib/types";

/** Sentinel for "not pinned to a step" — a <select> value must be a string. */
const ANY_STEP = "";

/** Questions and rebuttals are edited as one-per-line text, then split on save. */
const toLines = (values: { text: string }[]) => values.map((v) => v.text).join("\n");
const fromLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function ObjectionsView() {
  const { activeSet, severities, addObjection } = useScriptStore();
  const objections = activeSet?.objections ?? [];

  const add = () =>
    void addObjection({
      title: "New objection",
      severity: severities[0] ?? "MAJOR",
      step_id: null,
      questions: [],
      rebuttals: [],
    });

  return (
    <Page
      title="Objections & Rebuttals"
      subtitle={
        activeSet
          ? `${objections.length} objection${objections.length === 1 ? "" : "s"} in "${activeSet.name}"`
          : "No script set selected"
      }
      actions={
        <Button variant="primary" onClick={add} disabled={!activeSet}>
          <Plus className="size-4" aria-hidden="true" />
          Add objection
        </Button>
      }
    >
      {!activeSet && <Empty>Select a script set first.</Empty>}

      {activeSet && objections.length === 0 && (
        <Empty>No objections recorded yet. Add one to capture how agents should respond.</Empty>
      )}

      <div className="space-y-4">
        {objections.map((objection) => (
          <ObjectionCard
            key={objection.id}
            objection={objection}
            severities={severities}
            steps={activeSet?.steps ?? []}
          />
        ))}
      </div>
    </Page>
  );
}

function ObjectionCard({
  objection,
  severities,
  steps,
}: {
  objection: Objection;
  severities: string[];
  steps: ScriptStep[];
}) {
  const { updateObjection, deleteObjection, saving } = useScriptStore();

  const [title, setTitle] = useState(objection.title);
  const [severity, setSeverity] = useState(objection.severity);
  const [stepId, setStepId] = useState(
    objection.step_id == null ? ANY_STEP : `${objection.step_id}`,
  );
  const [questions, setQuestions] = useState(() => toLines(objection.questions));
  const [rebuttals, setRebuttals] = useState(() => toLines(objection.rebuttals));

  // Re-sync when the store refreshes this objection from the server.
  useEffect(() => {
    setTitle(objection.title);
    setSeverity(objection.severity);
    setStepId(objection.step_id == null ? ANY_STEP : `${objection.step_id}`);
    setQuestions(toLines(objection.questions));
    setRebuttals(toLines(objection.rebuttals));
  }, [objection]);

  const savedStepId = objection.step_id == null ? ANY_STEP : `${objection.step_id}`;
  const dirty =
    title !== objection.title ||
    severity !== objection.severity ||
    stepId !== savedStepId ||
    questions !== toLines(objection.questions) ||
    rebuttals !== toLines(objection.rebuttals);

  const save = () =>
    void updateObjection(objection.id, {
      title: title.trim() || objection.title,
      severity,
      step_id: stepId === ANY_STEP ? null : Number(stepId),
      questions: fromLines(questions),
      rebuttals: fromLines(rebuttals),
    });

  const remove = async () => {
    const ok = await confirmDelete(
      "Delete this objection?",
      `"${objection.title}" and its questions and rebuttals will be permanently removed.`,
    );
    if (ok) await deleteObjection(objection.id);
  };

  const qId = `objection-${objection.id}`;

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <div>
          <Label htmlFor={`${qId}-title`}>Objection</Label>
          <TextInput id={`${qId}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${qId}-severity`}>Severity</Label>
          <Select
            id={`${qId}-severity`}
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor={`${qId}-step`}>Comes up at</Label>
        <Select id={`${qId}-step`} value={stepId} onChange={(e) => setStepId(e.target.value)}>
          <option value={ANY_STEP}>Any point in the call</option>
          {steps.map((step, index) => (
            <option key={step.id} value={step.id}>
              {index + 1}. {step.title}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Pinned objections are surfaced first when the agent is on that step.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <Label htmlFor={`${qId}-questions`}>What the prospect says</Label>
          <TextArea
            id={`${qId}-questions`}
            rows={5}
            value={questions}
            placeholder="One phrasing per line…"
            onChange={(e) => setQuestions(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">One phrasing per line.</p>
        </div>
        <div>
          <Label htmlFor={`${qId}-rebuttals`}>How the agent responds</Label>
          <TextArea
            id={`${qId}-rebuttals`}
            rows={5}
            value={rebuttals}
            placeholder="One rebuttal per line…"
            onChange={(e) => setRebuttals(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">One rebuttal per line.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && <p className="mr-auto text-sm font-semibold text-amber-700">Unsaved changes.</p>}
        <Button variant="danger" onClick={() => void remove()}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Panel>
  );
}
