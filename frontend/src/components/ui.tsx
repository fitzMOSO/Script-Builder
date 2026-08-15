/** Small shared primitives so the five views stay short and consistent. */

export function Page({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, className = "" }: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      {title && <h3 className="mb-3 text-sm font-bold text-navy">{title}</h3>}
      {children}
    </section>
  );
}

/**
 * Contiguous metric grid. Cells draw their own hairline outline rather than
 * sitting in a `gap-px` sheet, so a half-empty last row stays white instead of
 * exposing a slab of border colour.
 */
export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * One metric: outline icon, then the number, then an uppercase label — the
 * layout the Outbound Sales Tool uses for its MTD figures. Orange is the
 * default; green is reserved for money and "achieved" counts.
 */
export function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ElementType;
  tone?: "accent" | "success";
}) {
  return (
    <div className="flex flex-col items-center justify-start gap-2 p-5 text-center outline outline-border">
      {Icon && (
        <Icon
          className={`size-7 ${tone === "success" ? "text-success" : "text-accent"}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
      <p className="text-2xl leading-none font-extrabold text-foreground tabular-nums">{value}</p>
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold ${
        published ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover",
    secondary:
      "border border-border bg-surface text-slate-700 hover:bg-muted active:bg-muted",
    danger: "border border-red-200 bg-surface text-destructive hover:bg-red-50 active:bg-red-50",
  }[variant];

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    />
  );
}

export function TextInput({ className = "", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus:border-primary ${className}`}
    />
  );
}

export function TextArea({ className = "", ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-lg border border-border px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors duration-150 focus:border-primary ${className}`}
    />
  );
}

export function Select({ className = "", ...props }: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary ${className}`}
    />
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Horizontal proportion bar used by the reports view. */
export function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-slate-700">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
          {value} · {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
