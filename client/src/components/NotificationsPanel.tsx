import type { Notification } from "../types/hr";

interface NotificationsPanelProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const formatTimestamp = (value: string) => {
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

export function NotificationsPanel({
  notifications,
  loading,
  error,
  unreadCount,
  onMarkAllRead,
  onClose,
}: NotificationsPanelProps) {
  return (
    <section className="accent-panel relative mt-6 overflow-hidden rounded-[32px] border p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ffffff,#0095ff,#ffffff)]" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <p className="mt-1 text-sm font-medium text-white/88">Stay on top of leave, payroll, and task updates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/16"
            aria-label="Close notifications"
          >
            Close
          </button>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3">
        {loading ? <p className="text-sm font-medium text-white/88">Loading notifications...</p> : null}
        {error ? <p className="text-sm font-medium text-rose-100">{error}</p> : null}
        {!loading && !error && notifications.length === 0 ? (
          <p className="text-sm font-medium text-white/88">No notifications yet.</p>
        ) : null}
        {notifications.map((item) => {
          const timestamp = formatTimestamp(item.createdAt);
          return (
            <article
              key={item.id}
              className={`rounded-2xl border border-white/16 bg-white/10 p-4 backdrop-blur ${item.read ? "opacity-85" : "ring-1 ring-emerald-300/30"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs font-medium text-white/82">{item.message}</p>
                </div>
                {!item.read ? (
                  <span className="rounded-full bg-emerald-300/24 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-emerald-50">
                    New
                  </span>
                ) : null}
              </div>
              {timestamp ? <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/64">{timestamp}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
