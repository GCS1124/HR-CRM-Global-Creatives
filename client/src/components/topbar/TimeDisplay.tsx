import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export function TimeDisplay() {
  const [timeLabel, setTimeLabel] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date())
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
        }).format(new Date())
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-bold text-slate-700 shadow-soft md:inline-flex dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-100">
      <Clock3 className="h-4 w-4 text-brand-700" />
      <span className="tabular-nums">{timeLabel}</span>
    </div>
  );
}
