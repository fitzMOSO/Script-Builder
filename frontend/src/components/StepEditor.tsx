import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Copy, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { StepVariables } from "@/components/StepVariables";
import { useScriptStore } from "@/store/useScriptStore";
import type { ScriptStep, StepDraft } from "@/lib/types";

const schema = z.object({
  title: z.string().min(1, "Step title is required").max(200, "Keep the title under 200 characters"),
  statement_no: z.coerce.number().int().min(1, "Statement number must be 1 or higher"),
  content: z.string(),
  notes: z.string(),
  category: z.string(),
  is_required: z.boolean(),
  allow_skip: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  step: ScriptStep;
  categories: string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSave: (patch: Partial<StepDraft>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function extractVariables(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(VARIABLE_PATTERN), (m) => m[1]))];
}

export function StepEditor({
  step,
  categories,
  canMoveUp,
  canMoveDown,
  onSave,
  onDuplicate,
  onDelete,
  onMove,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(step),
  });

  const { saving, setEditorDirty } = useScriptStore();

  useEffect(() => {
    reset(toFormValues(step));
  }, [step, reset]);

  // Publish the dirty flag so the header can warn and step navigation can guard.
  useEffect(() => {
    setEditorDirty(isDirty);
  }, [isDirty, setEditorDirty]);

  // Leaving the editor entirely (switching view or set) must not strand a stale
  // "unsaved" warning on a form that no longer exists.
  useEffect(() => () => setEditorDirty(false), [setEditorDirty]);

  const content = watch("content");
  const variables = extractVariables(content ?? "");

  const submit = handleSubmit((values) => onSave(values));

  // react-hook-form owns the textarea's ref, so keep our own alongside it.
  const { ref: registerContentRef, ...contentField } = register("content");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Splice `{{name}}` in at the caret — or at the end if the textarea was never
   * focused — then put the caret after it so typing continues naturally.
   */
  const insertVariable = useCallback(
    (name: string) => {
      const token = `{{${name}}}`;
      const field = contentRef.current;
      const current = field?.value ?? content ?? "";
      const start = field?.selectionStart ?? current.length;
      const end = field?.selectionEnd ?? current.length;

      const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
      setValue("content", next, { shouldDirty: true, shouldValidate: true });

      requestAnimationFrame(() => {
        if (!field) return;
        field.focus();
        const caret = start + token.length;
        field.setSelectionRange(caret, caret);
      });
    },
    [content, setValue],
  );

  return (
    // The id lets the header's Save button submit this form from outside it,
    // so saving never depends on scrolling to the bottom of a long step.
    <form
      id="step-form"
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_auto] lg:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Step Title" error={errors.title?.message} htmlFor="title">
              <input
                id="title"
                {...register("title")}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus:border-primary"
              />
            </Field>

            <Field label="Statement No." error={errors.statement_no?.message} htmlFor="statement_no">
              <input
                id="statement_no"
                type="number"
                min={1}
                {...register("statement_no")}
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus:border-primary"
              />
            </Field>
          </div>

          <Field label="Script Content" htmlFor="content" hint="Wrap merge fields in {{double_braces}}.">
            <textarea
              id="content"
              rows={8}
              {...contentField}
              ref={(node) => {
                registerContentRef(node);
                contentRef.current = node;
              }}
              className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors duration-150 focus:border-primary"
            />
          </Field>

          <StepVariables usedHere={variables} onInsert={insertVariable} />

          <Field label="Notes (Optional)" htmlFor="notes">
            <textarea
              id="notes"
              rows={3}
              placeholder="Add any notes or instructions for this step..."
              {...register("notes")}
              className="w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary"
            />
          </Field>
        </div>

        {/* Column beside the fields on desktop; a 2x2 button grid under them on
            phones, where a 190px-wide rail would squeeze the textarea. */}
        <div className="grid grid-cols-2 gap-1 self-start rounded-xl border border-border p-2 lg:w-48 lg:grid-cols-1">
          <ActionButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
          <ActionButton icon={Trash2} label="Delete" onClick={onDelete} destructive />
          <ActionButton icon={ArrowUp} label="Move Up" onClick={() => onMove(-1)} disabled={!canMoveUp} />
          <ActionButton
            icon={ArrowDown}
            label="Move Down"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-primary-soft/60 px-4 py-4 sm:grid-cols-3 sm:gap-6 sm:px-5">
        <Field label="Category" htmlFor="category">
          <select
            id="category"
            {...register("category")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Toggle label="Required" htmlFor="is_required" {...register("is_required")} />
        <Toggle label="Allow Skip" htmlFor="allow_skip" {...register("allow_skip")} />
      </div>

      {/* Always enabled: a Save button that greys out the moment you open a
          draft reads as broken, and it costs nothing to let someone re-save a
          step they believe they changed. Only an in-flight write disables it. */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <p
          className={`mr-auto text-sm font-semibold ${
            isDirty ? "text-amber-700" : "text-muted-foreground"
          }`}
        >
          {isDirty ? "Unsaved changes to this step." : "All changes saved."}
        </p>
        <Button type="submit" variant="primary" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function toFormValues(step: ScriptStep): FormValues {
  return {
    title: step.title,
    statement_no: step.statement_no,
    content: step.content,
    notes: step.notes ?? "",
    category: step.category,
    is_required: step.is_required,
    allow_skip: step.allow_skip,
  };
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 lg:justify-start lg:gap-3 ${
        destructive
          ? "text-destructive hover:bg-red-50 active:bg-red-50"
          : "text-slate-700 hover:bg-muted active:bg-muted disabled:hover:bg-transparent"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

const Toggle = ({
  label,
  htmlFor,
  ...props
}: { label: string; htmlFor: string } & React.ComponentProps<"input">) => (
  <div className="space-y-1.5">
    <span className="block text-sm font-semibold text-slate-700">{label}</span>
    {/* The whole label is the hit area, so the 16px box still tags a 44px target. */}
    <label htmlFor={htmlFor} className="flex min-h-11 cursor-pointer items-center gap-2">
      <input
        id={htmlFor}
        type="checkbox"
        {...props}
        className="size-5 cursor-pointer accent-[var(--color-primary)]"
      />
      <span className="text-sm font-medium text-slate-600">Yes</span>
    </label>
  </div>
);
