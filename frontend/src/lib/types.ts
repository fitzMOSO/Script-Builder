export interface ScriptStep {
  id: number;
  script_set_id: number;
  title: string;
  statement_no: number;
  content: string;
  notes: string | null;
  category: string;
  is_required: boolean;
  allow_skip: boolean;
  position: number;
  variables: string[];
}

export interface ScriptSetSummary {
  id: number;
  name: string;
  description: string | null;
  status: string;
  version: number;
  /** Values for the `{{tokens}}` in step content, e.g. `{ daily_benefit: "5,000" }`. */
  variable_values: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ObjectionQuestion {
  id: number;
  text: string;
  position: number;
}

export interface Rebuttal {
  id: number;
  text: string;
  position: number;
}

export interface Objection {
  id: number;
  script_set_id: number;
  /** The step this objection usually comes up at; null = any point in the call. */
  step_id: number | null;
  severity: string;
  title: string;
  position: number;
  questions: ObjectionQuestion[];
  rebuttals: Rebuttal[];
}

export interface ScriptSet extends ScriptSetSummary {
  steps: ScriptStep[];
  objections: Objection[];
}

export type StepDraft = Pick<
  ScriptStep,
  "title" | "statement_no" | "content" | "notes" | "category" | "is_required" | "allow_skip"
>;

export type SetDraft = Pick<
  ScriptSetSummary,
  "name" | "description" | "status" | "variable_values"
>;

/** Questions and rebuttals are sent as plain strings; the API assigns ids/positions. */
export interface ObjectionDraft {
  title: string;
  severity: string;
  step_id: number | null;
  questions: string[];
  rebuttals: string[];
}

/** A published version's metadata. The snapshot payload is fetched separately. */
export interface ScriptVersionSummary {
  id: number;
  script_set_id: number;
  version: number;
  name: string;
  note: string | null;
  created_at: string;
}

export interface VersionSnapshot {
  description: string | null;
  variable_values: Record<string, string>;
  steps: Omit<StepDraft, never>[];
  objections: {
    title: string;
    severity: string;
    step_index: number | null;
    questions: string[];
    rebuttals: string[];
  }[];
}

export interface ScriptVersion extends ScriptVersionSummary {
  snapshot: VersionSnapshot;
}

/**
 * Which top-level screen the sidebar has selected. Split into two modes:
 * `library`/`run` are what a CSR uses on a call; the rest are authoring.
 */
export type View = "library" | "run" | "builder" | "objections" | "reports" | "settings";
