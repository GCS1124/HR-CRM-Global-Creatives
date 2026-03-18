import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppSidebarProps {
  items: NavItem[];
  workspaceLabel: string;
}

export function AppSidebar({ items, workspaceLabel }: AppSidebarProps) {
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-slate-200 bg-white/95 lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900 text-white shadow-[0_10px_24px_rgba(26,42,105,0.25)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
            <p className="text-lg font-semibold text-slate-900">{workspaceLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <nav className="mt-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  isActive ? "bg-brand-50 text-brand-900" : "text-slate-600 hover:bg-slate-100",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-md transition",
                      isActive ? "bg-brand-100 text-brand-900" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
