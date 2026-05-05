import { LogOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hrService } from "../services/hrService";
import type {
  AttendanceBreakKey,
  AttendanceBreakSession,
  AttendanceCheckInMode,
  AttendanceRecord,
  Notification,
} from "../types/hr";
import type { NavItem } from "../types/navigation";
import {
  BREAK_KEYS,
  LIVE_BREAK_STORAGE_KEY,
  normalizeBreakSummary,
} from "../utils/attendanceBreaks";
import { ThemeToggle } from "./ThemeToggle";
import { TimeDisplay } from "./topbar/TimeDisplay";
import { NotificationBell } from "./topbar/NotificationBell";
import { AttendanceControls } from "./topbar/AttendanceControls";
import { TimeTracker } from "./topbar/TimeTracker";
import type { UserRole } from "../types/auth";

interface AppTopbarProps {
  onSignOut: () => void;
  items: NavItem[];
  workspaceLabel: string;
  userRole: UserRole;
  onToggleNotifications?: () => void;
  onCloseNotifications?: () => void;
  notifications?: Notification[];
  notificationsLoading?: boolean;
  notificationsError?: string | null;
  onMarkAllRead?: () => void;
  unreadNotifications?: number;
  notificationsOpen?: boolean;
}

type BreakKey = AttendanceBreakKey;
type BreakState = Record<BreakKey, { totalMs: number; activeStart: number | null }>;

const createInitialBreaks = (): BreakState =>
  BREAK_KEYS.reduce(
    (acc, key) => {
      acc[key] = { totalMs: 0, activeStart: null };
      return acc;
    },
    {} as BreakState,
  );

const readLiveBreak = (): { key: BreakKey; startedAt: number } | null => {
  try {
    const raw = window.localStorage.getItem(LIVE_BREAK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key?: BreakKey; startedAt?: number };
    if (!parsed.key || !parsed.startedAt) return null;
    return { key: parsed.key, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
};

const writeLiveBreak = (payload: { key: BreakKey; startedAt: number } | null) => {
  if (!payload) {
    window.localStorage.removeItem(LIVE_BREAK_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(LIVE_BREAK_STORAGE_KEY, JSON.stringify(payload));
};

export function AppTopbar({
  onSignOut,
  userRole,
  onToggleNotifications,
  onCloseNotifications,
  notifications = [],
  notificationsLoading = false,
  notificationsError = null,
  onMarkAllRead,
  unreadNotifications = 0,
  notificationsOpen = false,
}: AppTopbarProps) {
  const trackerRef = useRef<HTMLDivElement | null>(null);
  const checkInRef = useRef<HTMLDivElement | null>(null);
  const alertsRef = useRef<HTMLDivElement | null>(null);
  const lastProgressSyncRef = useRef(0);
  const showAttendanceControls = userRole !== "admin";

  const [trackerOpen, setTrackerOpen] = useState(false);
  const [checkInAt, setCheckInAt] = useState<number | null>(null);
  const [activeBreak, setActiveBreak] = useState<BreakKey | null>(null);
  const [breaks, setBreaks] = useState<BreakState>(() => createInitialBreaks());
  const [breakSessions, setBreakSessions] = useState<AttendanceBreakSession[]>([]);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [checkInMenuOpen, setCheckInMenuOpen] = useState(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trackerRef.current && !trackerRef.current.contains(target)) {
        setTrackerOpen(false);
      }
      if (checkInRef.current && !checkInRef.current.contains(target)) {
        setCheckInMenuOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(target)) {
        onCloseNotifications?.();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTrackerOpen(false);
        setCheckInMenuOpen(false);
        onCloseNotifications?.();
      }
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCloseNotifications]);

  const breakSessionCounts = useMemo(
    () =>
      breakSessions.reduce(
        (acc, session) => {
          acc[session.key] += 1;
          return acc;
        },
        BREAK_KEYS.reduce(
          (acc, key) => {
            acc[key] = 0;
            return acc;
          },
          {} as Record<BreakKey, number>,
        ),
      ),
    [breakSessions],
  );

  const applyAttendanceRecord = useCallback((record: AttendanceRecord | null) => {
    setAttendanceRecord(record);
    const nextCheckInAt =
      record && record.checkOut === "--"
        ? record.checkInAt
          ? new Date(record.checkInAt).getTime()
          : null
        : null;
    setCheckInAt(nextCheckInAt);
    const normalizedBreaks = normalizeBreakSummary(record?.breakSummary ?? null);
    const liveBreak = record && record.checkOut === "--" ? readLiveBreak() : null;
    setActiveBreak(liveBreak?.key ?? null);
    setBreakSessions(normalizedBreaks.sessions);
    setBreaks(() => {
      const next = createInitialBreaks();
      if (!record || record.checkOut !== "--") return next;
      BREAK_KEYS.forEach((key) => {
        const recordedMs = (normalizedBreaks.totals[key] || 0) * 60_000;
        if (liveBreak?.key === key) {
          next[key] = { totalMs: recordedMs, activeStart: liveBreak.startedAt };
        } else {
          next[key] = { totalMs: recordedMs, activeStart: null };
        }
      });
      return next;
    });
  }, []);

  const persistAttendanceProgress = useCallback(
    async (snapshot: { breakMinutes: number; breakSummary: AttendanceRecord["breakSummary"] }) => {
      if (!checkInAt || attendanceBusy || !attendanceRecord || attendanceRecord.checkOut !== "--") return;
      const nowMs = Date.now();
      if (nowMs - lastProgressSyncRef.current < 30_000) return;
      lastProgressSyncRef.current = nowMs;
      const timeOnSystemMinutes = Math.max(0, Math.round((nowMs - checkInAt) / 60000) - snapshot.breakMinutes);

      try {
        const record = await hrService.updateMyAttendanceProgress({
          breakMinutes: snapshot.breakMinutes,
          breakSummary: snapshot.breakSummary,
          timeOnSystemMinutes,
        });
        if (record) applyAttendanceRecord(record);
      } catch {
        // Silent fail
      }
    },
    [attendanceBusy, attendanceRecord, checkInAt, applyAttendanceRecord],
  );

  const buildBreakSnapshot = useCallback(
    (state: BreakState, sessions: AttendanceBreakSession[], timestamp: number, closeOpenSessions = false) => {
      const summary = BREAK_KEYS.reduce((acc, key) => {
        const entry = state[key];
        const activeMs = entry.activeStart ? timestamp - entry.activeStart : 0;
        acc[key] = Math.round((entry.totalMs + activeMs) / 60000);
        return acc;
      }, {} as Record<BreakKey, number>);
      
      const normalizedSessions = sessions.map((session) => {
        const activeStart = state[session.key].activeStart;
        if (session.endedAt === null && activeStart) {
          return {
            ...session,
            minutes: Math.max(0, Math.round((timestamp - activeStart) / 60000)),
            endedAt: closeOpenSessions ? new Date(timestamp).toISOString() : null,
          };
        }
        return session;
      });

      const breakMinutes = Object.values(summary).reduce((sum, value) => sum + (value ?? 0), 0);
      return { breakMinutes, breakSummary: { totals: summary, sessions: normalizedSessions } };
    },
    [],
  );

  useEffect(() => {
    if (!showAttendanceControls) {
      setAttendanceRecord(null);
      setCheckInAt(null);
      setActiveBreak(null);
      setBreaks(createInitialBreaks());
      setBreakSessions([]);
      return;
    }

    const load = async () => {
      try {
        const record = await hrService.getMyTodayAttendance();
        applyAttendanceRecord(record);
      } catch {
        setAttendanceError("Unable to load attendance.");
      }
    };
    void load();
  }, [applyAttendanceRecord, showAttendanceControls]);

  useEffect(() => {
    if (!showAttendanceControls || !checkInAt || !attendanceRecord || attendanceRecord.checkOut !== "--") return;
    const interval = window.setInterval(() => {
      const snapshot = buildBreakSnapshot(breaks, breakSessions, Date.now());
      void persistAttendanceProgress(snapshot);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [attendanceRecord, breaks, breakSessions, buildBreakSnapshot, checkInAt, persistAttendanceProgress, showAttendanceControls]);

  const handleCheckIn = async (mode: AttendanceCheckInMode) => {
    if (!showAttendanceControls || attendanceBusy) return;
    setAttendanceBusy(true);
    setCheckInMenuOpen(false);
    try {
      const record = await hrService.markMyAttendance(mode);
      applyAttendanceRecord(record);
      writeLiveBreak(null);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Check in failed.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!showAttendanceControls || attendanceBusy || !checkInAt) return;
    setAttendanceBusy(true);
    const now = Date.now();
    try {
      const snapshot = buildBreakSnapshot(breaks, breakSessions, now, true);
      const totalBreakMs = BREAK_KEYS.reduce((acc, key) => {
        const e = breaks[key];
        return acc + e.totalMs + (e.activeStart ? now - e.activeStart : 0);
      }, 0);
      const timeOnSystemMinutes = Math.max(0, Math.round((now - checkInAt - totalBreakMs) / 60000));
      const record = await hrService.markMyCheckOut({
        breakMinutes: snapshot.breakMinutes,
        breakSummary: snapshot.breakSummary,
        timeOnSystemMinutes,
      });
      applyAttendanceRecord(record);
      writeLiveBreak(null);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Check out failed.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleToggleBreak = (key: BreakKey) => {
    if (!showAttendanceControls || !checkInAt) return;
    const now = Date.now();
    const isEnding = activeBreak === key;
    const nextActive = isEnding ? null : key;

    setBreaks((prev) => {
      const next = { ...prev };
      if (activeBreak) {
        const start = prev[activeBreak].activeStart;
        if (start) {
          next[activeBreak] = { totalMs: prev[activeBreak].totalMs + (now - start), activeStart: null };
        }
      }
      if (nextActive) {
        next[nextActive] = { ...prev[nextActive], activeStart: now };
      }
      return next;
    });

    setBreakSessions((prev) => {
      const next = prev.map((s) => {
        if (activeBreak && s.key === activeBreak && s.endedAt === null) {
          const start = s.startedAt ? new Date(s.startedAt).getTime() : now;
          return { ...s, minutes: Math.max(0, Math.round((now - start) / 60000)), endedAt: new Date(now).toISOString() };
        }
        return s;
      });
      if (nextActive) {
        next.push({ id: `${nextActive}-${now}`, key: nextActive, minutes: 0, startedAt: new Date(now).toISOString(), endedAt: null });
      }
      return next;
    });

    setActiveBreak(nextActive);
    writeLiveBreak(nextActive ? { key: nextActive, startedAt: now } : null);
    if (!nextActive) setTrackerOpen(false);
  };

  return (
    <header className="app-topbar sticky top-0 z-20 border-b backdrop-blur-xl transition-all duration-200" aria-label="Topbar">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <TimeDisplay />
          <ThemeToggle className="min-h-[40px]" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {showAttendanceControls ? (
            <>
              <div ref={checkInRef}>
                <AttendanceControls
                  checkInAt={checkInAt}
                  checkedOut={Boolean(attendanceRecord && attendanceRecord.checkOut !== "--")}
                  attendanceBusy={attendanceBusy}
                  menuOpen={checkInMenuOpen}
                  onToggleMenu={() => setCheckInMenuOpen(!checkInMenuOpen)}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                />
              </div>

              <div ref={trackerRef}>
                <TimeTracker
                  checkInAt={checkInAt}
                  activeBreak={activeBreak}
                  breaks={breaks}
                  breakSessionCounts={breakSessionCounts}
                  onToggleBreak={handleToggleBreak}
                  isOpen={trackerOpen}
                  onToggleOpen={() => setTrackerOpen(!trackerOpen)}
                  onClose={() => setTrackerOpen(false)}
                  error={attendanceError}
                />
              </div>
            </>
          ) : null}

          <div ref={alertsRef}>
            <NotificationBell
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationsError}
              isOpen={notificationsOpen}
              unreadCount={unreadNotifications}
              onToggle={() => onToggleNotifications?.()}
              onClose={() => onCloseNotifications?.()}
              onMarkAllRead={() => onMarkAllRead?.()}
            />
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="btn-primary px-3 py-2 text-xs sm:text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
