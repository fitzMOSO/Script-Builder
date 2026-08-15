import { create } from "zustand";
import { api } from "@/lib/api";
import { notify } from "@/lib/alerts";
import type {
  ObjectionDraft,
  ScriptSet,
  ScriptSetSummary,
  ScriptStep,
  ScriptVersionSummary,
  SetDraft,
  StepDraft,
  View,
} from "@/lib/types";

interface ScriptState {
  view: View;
  sets: ScriptSetSummary[];
  activeSet: ScriptSet | null;
  activeStepId: number | null;
  categories: string[];
  severities: string[];
  /** Published snapshots of the active set, newest first. */
  versions: ScriptVersionSummary[];
  /**
   * True while the step editor holds edits that haven't been saved. Lives in
   * the store because the header indicator and the step-navigation guards both
   * need it, and neither is a child of the form.
   */
  editorDirty: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;

  setView: (view: View) => void;
  bootstrap: () => Promise<void>;
  selectSet: (id: number) => Promise<void>;
  /** Open a set in the read-only run view — the CSR's "use this script". */
  runSet: (id: number) => Promise<void>;
  /** Open a set in the authoring editor. */
  editSet: (id: number) => Promise<void>;
  createSet: (name: string, description?: string) => Promise<void>;
  updateSet: (patch: Partial<SetDraft>) => Promise<void>;
  deleteSet: (id: number) => Promise<void>;
  cloneSet: (id: number, name: string) => Promise<void>;
  addObjection: (draft: ObjectionDraft) => Promise<void>;
  updateObjection: (objectionId: number, patch: Partial<ObjectionDraft>) => Promise<void>;
  deleteObjection: (objectionId: number) => Promise<void>;
  selectStep: (stepId: number) => void;
  addStep: () => Promise<void>;
  saveStep: (stepId: number, patch: Partial<StepDraft>) => Promise<void>;
  duplicateStep: (stepId: number) => Promise<void>;
  deleteStep: (stepId: number) => Promise<void>;
  moveStep: (stepId: number, direction: -1 | 1) => Promise<void>;
  publish: () => Promise<void>;
  setEditorDirty: (dirty: boolean) => void;
  loadVersions: () => Promise<void>;
  restoreVersion: (versionId: number) => Promise<void>;
  deleteVersion: (versionId: number) => Promise<void>;
}

export const useScriptStore = create<ScriptState>((set, get) => {
  const run = async <T>(fn: () => Promise<T>, flag: "loading" | "saving" = "saving") => {
    set({ [flag]: true, error: null } as Partial<ScriptState>);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      set({ error: message });
      notify.error(message);
      return undefined;
    } finally {
      set({ [flag]: false } as Partial<ScriptState>);
    }
  };

  const refreshActive = async () => {
    const id = get().activeSet?.id;
    if (id == null) return;
    const fresh = await api.getSet(id);
    const stillExists = fresh.steps.some((s) => s.id === get().activeStepId);
    set({
      activeSet: fresh,
      activeStepId: stillExists ? get().activeStepId : (fresh.steps[0]?.id ?? null),
    });
  };

  return {
    view: "library",
    sets: [],
    activeSet: null,
    activeStepId: null,
    categories: [],
    severities: [],
    versions: [],
    editorDirty: false,
    loading: false,
    saving: false,
    error: null,

    setView: (view) => set({ view }),

    bootstrap: async () => {
      await run(async () => {
        const [sets, categories, severities] = await Promise.all([
          api.listSets(),
          api.categories(),
          api.severities(),
        ]);
        set({ sets, categories, severities });
        if (sets.length > 0) await get().selectSet(sets[0].id);
      }, "loading");
    },

    selectSet: async (id) => {
      await run(async () => {
        const activeSet = await api.getSet(id);
        // Drop the previous set's history immediately — Settings must never
        // render another set's versions while the new list is in flight.
        set({ activeSet, activeStepId: activeSet.steps[0]?.id ?? null, versions: [] });
      }, "loading");
    },

    runSet: async (id) => {
      await get().selectSet(id);
      set({ view: "run" });
    },

    editSet: async (id) => {
      await get().selectSet(id);
      set({ view: "builder" });
    },

    createSet: async (name, description) => {
      await run(async () => {
        const created = await api.createSet({ name, description });
        set({ sets: await api.listSets(), activeSet: created, activeStepId: null });
        notify.success(`Created "${created.name}"`);
      });
    },

    updateSet: async (patch) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        const updated = await api.updateSet(activeSet.id, patch);
        set({ activeSet: updated, sets: await api.listSets() });
        notify.success("Script set updated");
      });
    },

    deleteSet: async (id) => {
      await run(async () => {
        await api.deleteSet(id);
        const sets = await api.listSets();
        set({ sets });
        // Deleting the open set leaves nothing selected, so fall back to the
        // first remaining one rather than rendering a dangling editor.
        if (get().activeSet?.id === id) {
          set({ activeSet: null, activeStepId: null });
          if (sets.length > 0) await get().selectSet(sets[0].id);
        }
        notify.success("Script set deleted");
      });
    },

    cloneSet: async (id, name) => {
      await run(async () => {
        const source = await api.getSet(id);
        const copy = await api.createSet({ name, description: source.description ?? undefined });

        if (Object.keys(source.variable_values).length > 0) {
          await api.updateSet(copy.id, { variable_values: source.variable_values });
        }

        // Sequential, not Promise.all: the API appends each step at the end of
        // the list, so concurrent creates would land in arbitrary order.
        const copied: ScriptStep[] = [];
        for (const step of source.steps) {
          const made = await api.createStep(copy.id, {
            title: step.title,
            statement_no: step.statement_no,
            content: step.content,
            notes: step.notes,
            category: step.category,
            is_required: step.is_required,
            allow_skip: step.allow_skip,
          });
          copied.push(made);
        }
        for (const objection of source.objections) {
          // Pinned steps can't carry over: the copy's steps have new ids. Match
          // by position instead so "applies to step 3" survives the duplicate.
          const pinned =
            objection.step_id == null
              ? null
              : source.steps.findIndex((s) => s.id === objection.step_id);
          await api.createObjection(copy.id, {
            title: objection.title,
            severity: objection.severity,
            step_id: pinned == null || pinned < 0 ? null : (copied[pinned]?.id ?? null),
            questions: objection.questions.map((q) => q.text),
            rebuttals: objection.rebuttals.map((r) => r.text),
          });
        }

        set({ sets: await api.listSets(), view: "builder" });
        await get().selectSet(copy.id);
        notify.success(`Duplicated as "${name}"`);
      });
    },

    addObjection: async (draft) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.createObjection(activeSet.id, draft);
        await refreshActive();
        notify.success("Objection added");
      });
    },

    updateObjection: async (objectionId, patch) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.updateObjection(activeSet.id, objectionId, patch);
        await refreshActive();
        notify.success("Objection saved");
      });
    },

    deleteObjection: async (objectionId) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.deleteObjection(activeSet.id, objectionId);
        await refreshActive();
        notify.success("Objection deleted");
      });
    },

    // Clearing the flag here rather than waiting for the editor to remount and
    // report in avoids a frame where the header still warns about edits that
    // belong to the step we just left.
    selectStep: (stepId) => set({ activeStepId: stepId, editorDirty: false }),

    addStep: async () => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        const step = await api.createStep(activeSet.id, {
          title: `Step ${activeSet.steps.length + 1}`,
          statement_no: activeSet.steps.length + 1,
        });
        await refreshActive();
        set({ activeStepId: step.id });
        notify.success("Step added");
      });
    },

    saveStep: async (stepId, patch) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.updateStep(activeSet.id, stepId, patch);
        await refreshActive();
        notify.success("Changes saved");
      });
    },

    duplicateStep: async (stepId) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        const clone = await api.duplicateStep(activeSet.id, stepId);
        await refreshActive();
        set({ activeStepId: clone.id });
        notify.success("Step duplicated");
      });
    },

    deleteStep: async (stepId) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.deleteStep(activeSet.id, stepId);
        set({ activeStepId: null });
        await refreshActive();
        notify.success("Step deleted");
      });
    },

    moveStep: async (stepId, direction) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      const ids = activeSet.steps.map((s) => s.id);
      const from = ids.indexOf(stepId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await run(async () => {
        const updated = await api.reorderSteps(activeSet.id, ids);
        set({ activeSet: updated });
      });
    },

    publish: async () => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        const updated = await api.publishSet(activeSet.id);
        set({
          activeSet: updated,
          sets: await api.listSets(),
          versions: await api.listVersions(updated.id),
        });
        notify.success(`Published version ${updated.version}`);
      });
    },

    setEditorDirty: (dirty) => set({ editorDirty: dirty }),

    loadVersions: async () => {
      const activeSet = get().activeSet;
      if (!activeSet) {
        set({ versions: [] });
        return;
      }
      await run(async () => {
        set({ versions: await api.listVersions(activeSet.id) });
      });
    },

    restoreVersion: async (versionId) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        const restored = await api.restoreVersion(activeSet.id, versionId);
        set({
          activeSet: restored,
          activeStepId: restored.steps[0]?.id ?? null,
          sets: await api.listSets(),
          editorDirty: false,
        });
        notify.success("Version restored as a draft");
      });
    },

    deleteVersion: async (versionId) => {
      const activeSet = get().activeSet;
      if (!activeSet) return;
      await run(async () => {
        await api.deleteVersion(activeSet.id, versionId);
        set({ versions: await api.listVersions(activeSet.id) });
        notify.success("Version deleted");
      });
    },
  };
});
