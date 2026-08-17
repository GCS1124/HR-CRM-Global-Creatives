import { ChevronDown, Clock3, Play, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { AttendanceBreakKey } from "../../types/hr";
import { BREAK_CONFIGS as breakConfigs } from "../../utils/attendanceBreaks";

interface TimeTrackerProps {
  checkInAt: number | null;
  activeBreak: AttendanceBreakKey | null;
  breaks: Record<AttendanceBreakKey, { totalMs: number; activeStart: number | null }>;
  breakSessionCounts: Record<AttendanceBreakKey, number>;
  onToggleBreak: (key: AttendanceBreakKey) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  error: string | null;
}

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

export function TimeTracker({
  checkInAt,
  activeBreak,
  breaks,
  breakSessionCounts,
  onToggleBreak,
  isOpen,
  onToggleOpen,
  onClose,
  error,
}: TimeTrackerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const totalBreakMs = useMemo(() => {
    return (Object.keys(breaks) as AttendanceBreakKey[]).reduce((total, key) => {
      const entry = breaks[key];
      const activeMs = entry.activeStart ? now - entry.activeStart : 0;
      return total + entry.totalMs + activeMs;
    }, 0);
  }, [breaks, now]);

  const timeOnSystemMs = checkInAt ? Math.max(0, now - checkInAt - totalBreakMs) : 0;
  
  const getBreakElapsed = (key: AttendanceBreakKey) => {
    const entry = breaks[key];
    return entry.totalMs + (entry.activeStart ? now - entry.activeStart : 0);
  };

  const activeBreakElapsed = useMemo(() => {
    if (!activeBreak) return 0;
    const entry = breaks[activeBreak];
    return entry.activeStart ? now - entry.activeStart : 0;
  }, [activeBreak, breaks, now]);

  const activeBreakLabel = activeBreak 
    ? breakConfigs.find((config) => config.key === activeBreak)?.label 
    : null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-soft transition-all hover:shadow-md dark:border-slate-700/60 dark:bg-slate-900 dark:text-white sm:px-3 sm:py-2 sm:text-sm"
        >
          <Clock3 className="h-4 w-4 text-brand-700" />
          <div className="flex min-w-[96px] items-center gap-1.5 sm:min-w-[120px]">
            {activeBreak ? (
              <>
                <span className="max-w-[54px] truncate text-[0.6rem] font-black uppercase text-amber-600 sm:max-w-[60px] sm:text-[0.65rem]">
                  {activeBreakLabel}
                </span>
                <span className="tabular-nums font-black text-slate-700 dark:text-slate-300">
                  {formatDuration(activeBreakElapsed)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[0.6rem] font-black uppercase text-slate-400 sm:text-[0.65rem]">
                  Login
                </span>
                <span className="tabular-nums font-black text-slate-700 dark:text-slate-300">
                  {checkInAt ? formatDuration(timeOnSystemMs) : "00:00"}
                </span>
              </>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {activeBreak ? (
          <button
            type="button"
            onClick={() => onToggleBreak(activeBreak)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm transition hover:scale-105 active:scale-95"
            title="Resume work"
          >
            <Play className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[90vw]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/96">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Time Tracking
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-brand-600 transition-all duration-1000" style={{ width: checkInAt ? '100%' : '0%' }} />
            </div>

            {error ? (
              <p className="mt-3 text-[0.65rem] font-bold text-rose-500 dark:text-rose-300">{error}</p>
            ) : null}

            <div className="mt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-300">
                {activeBreakLabel ? `Active Break: ${activeBreakLabel}` : checkInAt ? "Take a break" : "Check in to start tracking"}
              </p>

              <div className="mt-3 grid gap-2 max-h-60 overflow-y-auto pr-1">
                {breakConfigs.map((config) => {
                  const isActive = activeBreak === config.key;
                  const elapsed = getBreakElapsed(config.key);
                  const sessionCount = breakSessionCounts[config.key];
                  const sessionLimitReached = !isActive && config.sessionLimit !== null && sessionCount >= config.sessionLimit;
                  const overLimit = config.redAtMinutes !== undefined && elapsed >= config.redAtMinutes * 60_000;
                  const disabled = !checkInAt || sessionLimitReached;

                  return (
                    <button
                      key={config.key}
                      type="button"
                      onClick={() => onToggleBreak(config.key)}
                      disabled={disabled}
                      className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition active:scale-[0.98] ${
                        isActive
                          ? "border-brand-200 bg-brand-50 ring-1 ring-brand-100 shadow-sm dark:border-brand-500/25 dark:bg-brand-500/10 dark:ring-brand-400/20"
                          : overLimit
                            ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:bg-slate-800"
                      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-[0.65rem] font-black uppercase tracking-wider text-slate-700 dark:text-slate-100">
                          {config.label}
                        </span>
                        {isActive ? (
                          <span className="h-2 w-2 rounded-full bg-brand-600 animate-pulse" />
                        ) : null}
                      </div>
                      <div className="mt-1 flex w-full items-center justify-between text-[0.65rem] font-bold">
                        <span className="tabular-nums text-slate-500 dark:text-slate-300">
                          {formatDuration(elapsed)}
                        </span>
                        {config.sessionLimit !== null ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            {sessionCount}/{config.sessionLimit} used
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
