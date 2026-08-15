import {
  BarChart3,
  Library,
  MessagesSquare,
  PlayCircle,
  PencilRuler,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { useScriptStore } from "@/store/useScriptStore";
import type { View } from "@/lib/types";

interface NavItem {
  label: string;
  icon: React.ElementType;
  view: View;
}

/**
 * Two groups, because the two audiences are different: agents pick and read a
 * script, managers author one. Flat nav is what made this confusing.
 */
const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Use",
    items: [
      { label: "Script Library", icon: Library, view: "library" },
      { label: "Run Script", icon: PlayCircle, view: "run" },
    ],
  },
  {
    heading: "Build",
    items: [
      { label: "Editor", icon: PencilRuler, view: "builder" },
      { label: "Objections", icon: ShieldAlert, view: "objections" },
      { label: "Reports", icon: BarChart3, view: "reports" },
      { label: "Settings", icon: Settings, view: "settings" },
    ],
  },
];

/** Static rail, desktop only. Below `lg` the same content lives in a Drawer. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      {/* Navy masthead, same height as the header, so the two form one
          unbroken top strip across the app. */}
      <div className="flex h-16 shrink-0 items-center gap-3 bg-navy px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
          <MessagesSquare className="size-5" aria-hidden="true" />
        </span>
        <span className="text-base font-extrabold tracking-tight text-white">Script Builder</span>
      </div>

      <SidebarNav />
    </aside>
  );
}

/**
 * Nav list plus the account footer. Shared by the desktop rail and the mobile
 * drawer, so touch targets are sized for the drawer case in both.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const view = useScriptStore((s) => s.view);
  const setView = useScriptStore((s) => s.setView);

  return (
    <>
      <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
        {GROUPS.map(({ heading, items }) => (
          <div key={heading} className="mb-4 last:mb-0">
            <p className="px-3 pb-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              {heading}
            </p>
            <div className="space-y-1">
              {items.map(({ label, icon: Icon, view: target }) => {
                const active = view === target;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setView(target);
                      onNavigate?.();
                    }}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150 ${
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-navy/75 hover:bg-muted hover:text-navy active:bg-muted"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3 border-t border-border px-4 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">
          AM
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Agent Manager</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Online
          </p>
        </div>
      </div>
    </>
  );
}
