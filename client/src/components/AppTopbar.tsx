import { LogOut } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { NavItem } from "../types/navigation";

interface AppTopbarProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
  onToggleNotifications?: () => void;
  unreadNotifications?: number;
  notificationsOpen?: boolean;
}

function resolveCurrentTitle(pathname: string, items: NavItem[], fallback: string): string {
  const sorted = [...items].sort((left, right) => right.path.length - left.path.length);
  const match = sorted.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return match?.label ?? fallback;
}

export function AppTopbar({
  onSignOut,
  items,
  workspaceLabel,
  onToggleNotifications,
  unreadNotifications = 0,
  notificationsOpen = false,
}: AppTopbarProps) {
  const location = useLocation();
  const currentTitle = useMemo(
    () => resolveCurrentTitle(location.pathname, items, workspaceLabel),
    [items, location.pathname, workspaceLabel],
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-brand-800">HR CRM Workspace</p>
            <p className="truncate text-base font-semibold text-slate-950">{workspaceLabel}</p>
            <p className="truncate text-sm font-medium text-slate-700">{currentTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleNotifications?.()}
            className={`btn-secondary px-3 py-2 ${notificationsOpen ? "border-brand-200 bg-brand-50" : ""}`}
          >
            Alerts
            {unreadNotifications > 0 ? (
              <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                {unreadNotifications}
              </span>
            ) : null}
          </button>
          <button type="button" onClick={onSignOut} className="btn-primary px-4 py-2.5">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
