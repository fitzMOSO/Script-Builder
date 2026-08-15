import { CircleAlert, ListOrdered, ShieldCheck, Tags } from "lucide-react";
import { Bar, Empty, Page, Panel, Stat, StatGrid } from "@/components/ui";
import { useScriptStore } from "@/store/useScriptStore";

export function ReportsView() {
  const { activeSet, categories, severities } = useScriptStore();

  const steps = activeSet?.steps ?? [];
  const objections = activeSet?.objections ?? [];

  const byCategory = categories
    .map((name) => ({ name, count: steps.filter((s) => s.category === name).length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const bySeverity = severities.map((name) => ({
    name,
    count: objections.filter((o) => o.severity === name).length,
  }));

  // Where each merge variable is used, so a rename can be traced before it breaks.
  const variableUsage = new Map<string, string[]>();
  for (const step of steps) {
    for (const variable of step.variables) {
      variableUsage.set(variable, [...(variableUsage.get(variable) ?? []), step.title]);
    }
  }
  const variables = [...variableUsage.entries()].sort(([a], [b]) => a.localeCompare(b));

  const required = steps.filter((s) => s.is_required).length;
  const skippable = steps.filter((s) => s.allow_skip).length;
  const emptyContent = steps.filter((s) => !s.content.trim()).length;

  if (!activeSet) {
    return (
      <Page title="Reports">
        <Empty>Select a script set to see its breakdown.</Empty>
      </Page>
    );
  }

  return (
    <Page title="Reports" subtitle={`Breakdown of "${activeSet.name}" (v${activeSet.version})`}>
      <StatGrid>
        <Stat icon={ListOrdered} label="Total steps" value={steps.length} />
        <Stat
          icon={ShieldCheck}
          tone="success"
          label="Required"
          value={required}
          hint={`${skippable} skippable`}
        />
        <Stat icon={Tags} label="Merge variables" value={variables.length} />
        <Stat
          icon={CircleAlert}
          label="Empty steps"
          value={emptyContent}
          hint={emptyContent > 0 ? "needs content" : "all filled in"}
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Steps by category">
          {byCategory.length === 0 ? (
            <Empty>No steps yet.</Empty>
          ) : (
            <div className="space-y-3">
              {byCategory.map((row) => (
                <Bar key={row.name} label={row.name} value={row.count} total={steps.length} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Objections by severity">
          {objections.length === 0 ? (
            <Empty>No objections recorded.</Empty>
          ) : (
            <div className="space-y-3">
              {bySeverity.map((row) => (
                <Bar key={row.name} label={row.name} value={row.count} total={objections.length} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Merge variable usage">
        {variables.length === 0 ? (
          <Empty>No {"{{variables}}"} used in this script yet.</Empty>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {variables.map(([name, usedIn]) => (
              <li key={name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <code className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-xs text-primary">
                  {`{{${name}}}`}
                </code>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {usedIn.length} step{usedIn.length === 1 ? "" : "s"}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                  {usedIn.join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
