import { Bell, Clock3, Command, LogOut, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { NavItem } from "../types/navigation";
import { ThemeToggle } from "./ThemeToggle";

interface AppTopbarProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
  onToggleNotifications?: () => void;
  onOpenCommandPalette?: () => void;
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
  onOpenCommandPalette,
  unreadNotifications = 0,
  notificationsOpen = false,
}: AppTopbarProps) {
  const location = useLocation();
  const [timeLabel, setTimeLabel] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  );
  const currentTitle = useMemo(
    () => resolveCurrentTitle(location.pathname, items, workspaceLabel),
    [items, location.pathname, workspaceLabel],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLabel(
        new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="app-topbar sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-brand-800">HR CRM Workspace</p>
            <p className="truncate text-base font-semibold text-slate-950">{workspaceLabel}</p>
            <p className="truncate text-sm font-medium text-slate-700">{currentTitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/55 bg-white/68 px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] md:inline-flex">
            <Clock3 className="h-4 w-4 text-brand-700" />
            {timeLabel}
          </div>
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/68 px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white"
          >
            <Search className="h-4 w-4 text-brand-700" />
            Search
            <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500 sm:inline-flex">
              <Command className="h-3 w-3" />
              K
            </span>
          </button>
          <button
            type="button"
            onClick={() => onToggleNotifications?.()}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition ${
              notificationsOpen
                ? "border-brand-200 bg-brand-50 text-brand-900"
                : "border-white/55 bg-white/68 text-slate-700 hover:bg-white"
            }`}
          >
            <Bell className="h-4 w-4" />
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
