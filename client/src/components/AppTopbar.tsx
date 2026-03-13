import { CalendarDays, LogOut, Search } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppTopbarProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
  userLabel: string;
}

function resolveCurrentTitle(pathname: string, items: NavItem[], fallback: string): string {
  const sorted = [...items].sort((left, right) => right.path.length - left.path.length);
  const match = sorted.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return match?.label ?? fallback;
}

export function AppTopbar({ onSignOut, items, workspaceLabel, userLabel }: AppTopbarProps) {
  const location = useLocation();
  const currentTitle = useMemo(
    () => resolveCurrentTitle(location.pathname, items, workspaceLabel),
    [items, location.pathname, workspaceLabel],
  );

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-500">Global Creative HR</p>
          <p className="truncate text-sm font-medium text-slate-700">
            {workspaceLabel} <span className="text-slate-400">/</span> {currentTitle}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          <label className="relative min-w-[220px] flex-1 lg:w-[300px] lg:flex-none">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input type="search" placeholder="Search records" className="input-surface w-full py-2.5 pl-10 pr-3" />
          </label>
          <span className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 md:inline-flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}
          </span>
          <span className="hidden max-w-[180px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 sm:inline-flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-900 text-[0.68rem] font-bold text-white">
              {userLabel.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate">{userLabel}</span>
          </span>
          <button type="button" onClick={onSignOut} className="btn-primary px-4 py-2.5">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
