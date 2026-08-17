import { Bell, X } from "lucide-react";
import type { Notification } from "../../types/hr";

interface NotificationBellProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  unreadCount: number;
  onToggle: () => void;
  onClose: () => void;
  onMarkAllRead: () => void;
}

const formatNotificationTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function NotificationBell({
  notifications,
  loading,
  error,
  isOpen,
  unreadCount,
  onToggle,
  onClose,
  onMarkAllRead,
}: NotificationBellProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold shadow-soft transition sm:px-3 sm:py-2 sm:text-sm ${
          isOpen
            ? "border-brand-200 bg-brand-50 text-brand-900"
            : "border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <Bell className="h-4 w-4" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 ? (
          <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[0.65rem] font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-[320px] max-w-[90vw]">
          <div className="max-h-[80vh] overflow-hidden flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-panel backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/96">
            <div className="flex items-start justify-between gap-3 p-1">
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
                  Alerts
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Updates on leave, payroll, and tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0 || loading}
                className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[0.55rem] font-black uppercase tracking-widest text-brand-800 transition hover:brightness-105 disabled:opacity-50 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-200"
              >
                Mark all read
              </button>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[0.55rem] font-black uppercase tracking-widest text-emerald-700">
                  {unreadCount} new
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto pr-1 pb-1">
              {loading ? (
                <p className="p-4 text-center text-xs font-bold text-slate-400">Loading alerts...</p>
              ) : null}
              {error ? (
                <p className="p-4 text-center text-xs font-bold text-rose-500">{error}</p>
              ) : null}
              {!loading && !error && notifications.length === 0 ? (
                <p className="p-8 text-center text-xs font-bold text-slate-400">All caught up!</p>
              ) : null}
              {notifications.map((item) => {
                const timestamp = formatNotificationTimestamp(item.createdAt);
                return (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-3 text-sm transition ${
                      item.read 
                        ? "border-slate-100 bg-slate-50/50 opacity-70 dark:border-slate-700/60 dark:bg-slate-900/60" 
                        : "border-brand-100 bg-white ring-1 ring-brand-50 shadow-sm dark:border-brand-500/25 dark:bg-slate-900/80 dark:ring-brand-500/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                          {item.message}
                        </p>
                      </div>
                      {!item.read ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      ) : null}
                    </div>
                    {timestamp ? (
                      <p className="mt-2 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {timestamp}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
