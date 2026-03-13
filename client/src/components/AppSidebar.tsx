import clsx from "clsx";
import { ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppSidebarProps {
  items: NavItem[];
  workspaceLabel: string;
}

export function AppSidebar({ items, workspaceLabel }: AppSidebarProps) {
  const isEmployeeWorkspace = workspaceLabel.toLowerCase().includes("employee");

  return (
    <aside className="hidden w-[256px] shrink-0 border-r border-slate-200 bg-brand-950 text-white lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-brand-200">Global Creative</p>
              <p className="mt-1 text-xl font-bold leading-tight text-white">{workspaceLabel}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/64">
                {isEmployeeWorkspace ? "Employee self-service and reporting." : "HR operations and approvals."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/45">Navigation</p>
          <span className="text-[0.68rem] font-semibold text-white/35">{items.length} modules</span>
        </div>
        <nav className="mt-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  isActive ? "bg-white text-brand-950" : "text-white/78 hover:bg-white/8 hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx("absolute left-0 top-2 bottom-2 w-1 rounded-r-full", isActive ? "bg-brand-500" : "bg-transparent")} />
                  <span
                    className={clsx(
                      "ml-1 flex h-9 w-9 items-center justify-center rounded-lg transition",
                      isActive ? "bg-brand-50 text-brand-900" : "bg-white/5 text-white/72 group-hover:bg-white/10",
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

      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <p className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/58">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure workspace
        </p>
        <p className="mt-2 text-sm text-white/45">Role-aware navigation and protected data access.</p>
      </div>
    </aside>
  );
}
