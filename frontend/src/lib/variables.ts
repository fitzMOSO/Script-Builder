/** Merge-variable handling shared by the run view and the settings editor. */

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export interface Segment {
  text: string;
  /** Set when this segment came from a `{{token}}`. */
  name?: string;
  /** True when the token had no value and the raw name is being shown. */
  missing?: boolean;
}

/**
 * Split content into plain text and merge-variable segments so the run view can
 * highlight substituted values instead of silently inlining them — an agent
 * needs to see which words came from the customer record.
 */
export function segments(content: string, values: Record<string, string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;

  for (const match of content.matchAll(TOKEN)) {
    const start = match.index;
    if (start > last) out.push({ text: content.slice(last, start) });

    const name = match[1];
    const value = values[name]?.trim();
    out.push(value ? { text: value, name } : { text: name, name, missing: true });
    last = start + match[0].length;
  }

  if (last < content.length) out.push({ text: content.slice(last) });
  return out;
}

/** Every distinct variable used across a set's steps, in first-seen order. */
export function usedVariables(steps: { variables: string[] }[]): string[] {
  const seen = new Set<string>();
  for (const step of steps) for (const name of step.variables) seen.add(name);
  return [...seen];
}
