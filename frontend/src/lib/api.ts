import type {
  Objection,
  ObjectionDraft,
  ScriptSet,
  ScriptSetSummary,
  ScriptStep,
  ScriptVersion,
  ScriptVersionSummary,
  SetDraft,
  StepDraft,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  listSets: () => request<ScriptSetSummary[]>("/api/script-sets"),
  getSet: (id: number) => request<ScriptSet>(`/api/script-sets/${id}`),
  createSet: (body: { name: string; description?: string }) =>
    request<ScriptSet>("/api/script-sets", { method: "POST", body: JSON.stringify(body) }),
  updateSet: (id: number, body: Partial<SetDraft>) =>
    request<ScriptSet>(`/api/script-sets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSet: (id: number) => request<void>(`/api/script-sets/${id}`, { method: "DELETE" }),
  publishSet: (id: number) =>
    request<ScriptSet>(`/api/script-sets/${id}/publish`, { method: "POST" }),
  createStep: (setId: number, body: Partial<StepDraft> & { title: string }) =>
    request<ScriptStep>(`/api/script-sets/${setId}/steps`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateStep: (setId: number, stepId: number, body: Partial<StepDraft>) =>
    request<ScriptStep>(`/api/script-sets/${setId}/steps/${stepId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  duplicateStep: (setId: number, stepId: number) =>
    request<ScriptStep>(`/api/script-sets/${setId}/steps/${stepId}/duplicate`, { method: "POST" }),
  deleteStep: (setId: number, stepId: number) =>
    request<void>(`/api/script-sets/${setId}/steps/${stepId}`, { method: "DELETE" }),
  reorderSteps: (setId: number, stepIds: number[]) =>
    request<ScriptSet>(`/api/script-sets/${setId}/steps/reorder`, {
      method: "POST",
      body: JSON.stringify({ step_ids: stepIds }),
    }),
  listObjections: (setId: number) =>
    request<Objection[]>(`/api/script-sets/${setId}/objections`),
  createObjection: (setId: number, body: ObjectionDraft) =>
    request<Objection>(`/api/script-sets/${setId}/objections`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateObjection: (setId: number, objectionId: number, body: Partial<ObjectionDraft>) =>
    request<Objection>(`/api/script-sets/${setId}/objections/${objectionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteObjection: (setId: number, objectionId: number) =>
    request<void>(`/api/script-sets/${setId}/objections/${objectionId}`, { method: "DELETE" }),

  listVersions: (setId: number) =>
    request<ScriptVersionSummary[]>(`/api/script-sets/${setId}/versions`),
  getVersion: (setId: number, versionId: number) =>
    request<ScriptVersion>(`/api/script-sets/${setId}/versions/${versionId}`),
  restoreVersion: (setId: number, versionId: number) =>
    request<ScriptSet>(`/api/script-sets/${setId}/versions/${versionId}/restore`, {
      method: "POST",
    }),
  deleteVersion: (setId: number, versionId: number) =>
    request<void>(`/api/script-sets/${setId}/versions/${versionId}`, { method: "DELETE" }),

  categories: () => request<string[]>("/api/categories"),
  severities: () => request<string[]>("/api/severities"),
};
