import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Info,
  TimerReset,
  UserRoundCheck,
  UserRoundX,
  Wifi,
  XCircle,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { AttendanceRecord } from "../types/hr";
import { formatDate, getLocalDateKey } from "../utils/formatters";

export function EmployeeAttendancePage() {
  const { profile, signOut } = useAuthSession();
  const recordsHook = useApi(useCallback(() => hrService.getMyAttendanceRecords(), []));
  const todayKey = getLocalDateKey();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(todayKey);
  const [modeFilter, setModeFilter] = useState<"all" | "office" | "remote">("all");
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [showBreakOnly, setShowBreakOnly] = useState(false);
  const holidayHook = useApi(
    useCallback(() => hrService.getHolidayDatesForMonth(calendarMonth), [calendarMonth]),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      void recordsHook.refetch();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [recordsHook]);

  const breakThresholdMinutes = 60;
  const breakPolicies = [
    { id: "freshen", label: "Freshen Up", limit: 15, max: 15, match: ["fresh", "bio", "wash"] },
    { id: "lunch", label: "Lunch", limit: 30, max: 35, match: ["lunch"] },
    { id: "tea", label: "Tea", limit: 15, max: 20, match: ["tea"] },
    { id: "meeting", label: "Meeting / Training", limit: null, max: null, match: ["meeting", "training"] },
  ] as const;
  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2026, index, 1)),
      ),
    [],
  );
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarYear = calendarMonth.getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => calendarYear - 2 + index),
    [calendarYear],
  );
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const startDay = monthStart.getDay();
  const todayDate = new Date();
  const isFutureMonth =
    calendarMonth.getFullYear() > todayDate.getFullYear() ||
    (calendarMonth.getFullYear() === todayDate.getFullYear() && calendarMonth.getMonth() > todayDate.getMonth());
  const isCurrentMonth =
    calendarMonth.getFullYear() === todayDate.getFullYear() && calendarMonth.getMonth() === todayDate.getMonth();
  const cutoffDay = isFutureMonth ? 0 : isCurrentMonth ? todayDate.getDate() : daysInMonth;
  const cutoffKey =
    cutoffDay > 0
      ? getLocalDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), cutoffDay))
      : null;
  const monthDays = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, index) => {
        return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
      }),
    [calendarMonth, daysInMonth],
  );

  const recordsByDate = useMemo(() => {
    return new Map((recordsHook.data ?? []).map((record) => [record.date, record]));
  }, [recordsHook.data]);

  const holidayDates = useMemo(() => new Set(holidayHook.data ?? []), [holidayHook.data]);

  const monthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  const monthRecords = useMemo(
    () => (recordsHook.data ?? []).filter((record) => record.date.startsWith(monthKey)),
    [recordsHook.data, monthKey],
  );

  const monthStats = useMemo(() => {
    return monthRecords
      .filter((record) => (cutoffKey ? record.date <= cutoffKey : false))
      .reduce(
        (acc, record) => {
          if (record.status === "present") acc.present += 1;
          if (record.status === "late") acc.late += 1;
          if (record.status === "remote") acc.remote += 1;
          if (record.status === "absent") acc.absent += 1;
          return acc;
        },
        { present: 0, late: 0, remote: 0, absent: 0 },
      );
  }, [monthRecords, cutoffKey]);

  const weekendDaysInMonth = useMemo(() => {
    if (cutoffDay <= 0) return 0;
    let total = 0;
    for (let day = 1; day <= cutoffDay; day += 1) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const weekday = date.getDay();
      if (weekday === 0 || weekday === 6) {
        total += 1;
      }
    }
    return total;
  }, [calendarMonth, cutoffDay]);
  const totalDaysForAbsence = Math.max(0, cutoffDay - weekendDaysInMonth);
  const presentByFormula = useMemo(() => {
    return Math.max(0, monthStats.present + monthStats.late + monthStats.remote);
  }, [monthStats.late, monthStats.present, monthStats.remote]);
  const absentByFormula = useMemo(() => {
    return Math.max(0, totalDaysForAbsence - presentByFormula);
  }, [presentByFormula, totalDaysForAbsence]);

  const formatMinutes = (minutes: number) => {
    if (!minutes) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };
  const getBreakMinutes = (record?: AttendanceRecord | null) => {
    if (!record) return 0;
    if (record.breakMinutes && record.breakMinutes > 0) return record.breakMinutes;
    if (record.breakSummary) {
      return Object.values(record.breakSummary).reduce((sum, value) => sum + (value ?? 0), 0);
    }
    return 0;
  };
  const formatBreakLabel = (value: string) =>
    value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  const getBreakBreakdown = (record?: AttendanceRecord | null) => {
    if (!record) return [];
    const summary = record.breakSummary ?? null;
    const breakdownMap = new Map<
      string,
      { label: string; minutes: number; limit: number | null; max: number | null }
    >();
    if (summary) {
      Object.entries(summary).forEach(([key, minutes]) => {
        const normalized = key.toLowerCase();
        const policy = breakPolicies.find((item) =>
          item.match.some((token) => normalized.includes(token)),
        );
        const bucketKey = policy?.id ?? normalized;
        const existing = breakdownMap.get(bucketKey);
        if (existing) {
          existing.minutes += minutes ?? 0;
        } else {
          breakdownMap.set(bucketKey, {
            label: policy?.label ?? formatBreakLabel(key),
            minutes: minutes ?? 0,
            limit: policy?.limit ?? null,
            max: policy?.max ?? null,
          });
        }
      });
    } else if (record.breakMinutes) {
      breakdownMap.set("total", {
        label: "Total break",
        minutes: record.breakMinutes,
        limit: breakThresholdMinutes,
        max: breakThresholdMinutes,
      });
    }
    return Array.from(breakdownMap.values()).filter((item) => item.minutes > 0);
  };
  const getBreakExceedInfo = (record?: AttendanceRecord | null) => {
    const breakdown = getBreakBreakdown(record);
    const totalMinutes = breakdown.reduce((sum, item) => sum + item.minutes, 0);
    const totalAllowed = breakdown.reduce((sum, item) => sum + (item.max ?? 0), 0);
    const exceededItems = breakdown.filter((item) => item.max !== null && item.minutes > (item.max ?? 0));
    const exceededBy =
      exceededItems.length > 0
        ? Math.max(...exceededItems.map((item) => item.minutes - (item.max ?? 0)))
        : totalAllowed > 0 && totalMinutes > totalAllowed
          ? totalMinutes - totalAllowed
          : 0;
    return {
      breakdown,
      exceededBy,
      exceededItems,
      totalAllowed,
      totalMinutes,
      exceeds: exceededBy > 0,
    };
  };
  const totalBreakMinutes = monthRecords.reduce((sum, record) => sum + getBreakMinutes(record), 0);
  type DayStatusKey =
    | "normal"
    | "late"
    | "remote"
    | "longBreak"
    | "absent"
    | "weekend"
    | "holiday"
    | "upcoming";

  const statusConfig: Record<
    DayStatusKey,
    {
      label: string;
      tile: string;
      dot: string;
      icon?: typeof CheckCircle2;
    }
  > = {
    normal: {
      label: "On time",
      tile:
        "border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-slate-900 dark:border-[rgba(16,185,129,0.45)] dark:bg-[rgba(16,185,129,0.2)] dark:text-[#ecfdf5]",
      dot: "bg-[#22c55e]",
      icon: CheckCircle2,
    },
    late: {
      label: "Late",
      tile:
        "border-[rgba(249,115,22,0.45)] bg-[rgba(249,115,22,0.2)] text-slate-900 dark:border-[rgba(249,115,22,0.55)] dark:bg-[rgba(249,115,22,0.32)] dark:text-[#fff7ed]",
      dot: "bg-[#f97316]",
      icon: Clock3,
    },
    remote: {
      label: "Remote",
      tile:
        "border-sky-200/70 bg-sky-50/70 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100",
      dot: "bg-sky-500",
      icon: Wifi,
    },
    longBreak: {
      label: "Long break",
      tile:
        "border-[rgba(249,115,22,0.45)] bg-[rgba(249,115,22,0.18)] text-slate-900 dark:border-[rgba(249,115,22,0.55)] dark:bg-[rgba(249,115,22,0.28)] dark:text-[#fff7ed]",
      dot: "bg-[#f97316]",
      icon: TimerReset,
    },
    absent: {
      label: "Absent",
      tile:
        "border-[rgba(239,68,68,0.5)] bg-[rgba(239,68,68,0.2)] text-slate-900 dark:border-[rgba(239,68,68,0.55)] dark:bg-[rgba(239,68,68,0.32)] dark:text-[#fef2f2]",
      dot: "bg-[#ef4444]",
      icon: XCircle,
    },
    weekend: {
      label: "Weekend",
      tile:
        "border-slate-200/70 bg-slate-100/70 text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400",
      dot: "bg-slate-400",
    },
    holiday: {
      label: "Holiday",
      tile:
        "border-slate-200/70 bg-slate-100/70 text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-400",
      dot: "bg-slate-400",
    },
    upcoming: {
      label: "Upcoming",
      tile:
        "border-[rgba(250,204,21,0.45)] bg-[rgba(250,204,21,0.16)] text-slate-900 dark:border-[rgba(250,204,21,0.55)] dark:bg-[rgba(250,204,21,0.25)] dark:text-[#fefce8]",
      dot: "bg-[#facc15]",
    },
  };

  const getDayStatus = (date: Date, record: AttendanceRecord | undefined): DayStatusKey => {
    const dateKey = getLocalDateKey(date);
    const isFuture = dateKey > todayKey;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (holidayDates.has(dateKey)) return "holiday";
    if (isWeekend) return "weekend";
    if (!record) return isFuture ? "upcoming" : "absent";
    if (record.status === "absent") return "absent";
    if (record.status === "late") return "late";
    if (getBreakExceedInfo(record).exceeds) return "longBreak";
    if (record.status === "remote") return "remote";
    return "normal";
  };

  const isFilteredOut = (status: DayStatusKey, record: AttendanceRecord | undefined) => {
    if (modeFilter === "remote" && record?.status !== "remote") return true;
    if (modeFilter === "office" && record?.status === "remote") return true;
    if (showLateOnly && status !== "late") return true;
    if (showBreakOnly && status !== "longBreak") return true;
    return false;
  };

  const selectedRecord = selectedDateKey ? recordsByDate.get(selectedDateKey) : undefined;
  const selectedDate = selectedDateKey ? new Date(selectedDateKey) : null;
  const selectedStatus = selectedDate ? getDayStatus(selectedDate, selectedRecord) : "upcoming";
  const selectedStatusLabel = statusConfig[selectedStatus].label;
  const selectedBreakMinutes = getBreakMinutes(selectedRecord);
  const selectedBreakInfo = getBreakExceedInfo(selectedRecord);
  const selectedBreakEntries = selectedBreakInfo.breakdown;
  const selectedBreakCount = selectedBreakEntries.length;
  const selectedWorkMinutes = selectedRecord?.timeOnSystemMinutes ?? 0;

  const columns: Array<TableColumn<AttendanceRecord>> = [
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "check-in", header: "Check In", render: (row) => row.checkIn },
    { key: "check-out", header: "Check Out", render: (row) => row.checkOut },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ];

  if (isNewUserEmployeeSetupError(recordsHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Attendance"
        subtitle=""
        eyebrow="Employee Attendance"
      />

      

      {recordsHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading attendance summary...</p> : null}
      {recordsHook.error ? <p className="text-sm font-semibold text-rose-700">{recordsHook.error}</p> : null}

      {!recordsHook.loading && !recordsHook.error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Present" value={String(presentByFormula)} icon={UserRoundCheck} />
          <StatCard title="Remote" value={String(monthStats.remote)} icon={Home} />
          <StatCard title="Late" value={String(monthStats.late)} icon={Clock3} />
          <StatCard title="Absent" value={String(absentByFormula)} icon={UserRoundX} />
        </div>
      ) : null}

      <SectionCard title="Attendance Calendar" subtitle="">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Present days
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{presentByFormula}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Late days
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-300">{monthStats.late}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Break hours
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-300">
                {formatMinutes(totalBreakMinutes)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Absents
              </p>
              <p className="mt-2 text-3xl font-bold text-rose-600 dark:text-rose-300">{absentByFormula}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)] dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200">
                <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                <div className="relative flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-sm transition hover:border-brand-300 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200/60 dark:border-slate-700/60 dark:bg-slate-900/80">
                  <span className="min-w-[78px] text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {monthNames[calendarMonthIndex]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={calendarMonthIndex}
                    onChange={(event) =>
                      setCalendarMonth((prev) => new Date(prev.getFullYear(), Number(event.target.value), 1))
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Select month"
                  >
                    {monthNames.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-sm transition hover:border-brand-300 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200/60 dark:border-slate-700/60 dark:bg-slate-900/80">
                  <span className="min-w-[52px] text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {calendarYear}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={calendarYear}
                    onChange={(event) =>
                      setCalendarMonth((prev) => new Date(Number(event.target.value), prev.getMonth(), 1))
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Select year"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="segmented-control inline-flex items-center rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
                {(["all", "office", "remote"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setModeFilter(mode)}
                    className={`min-w-[68px] rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      modeFilter === mode
                        ? "segmented-active bg-slate-900 !text-white shadow-sm dark:bg-white dark:!text-slate-900"
                        : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                    }`}
                  >
                    {mode === "all" ? "All" : mode === "office" ? "Office" : "Remote"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowLateOnly((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  showLateOnly
                    ? "border-amber-400/60 bg-amber-100/80 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-200"
                    : "border-slate-200 bg-white/90 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300"
                }`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                Late days
              </button>
              <button
                type="button"
                onClick={() => setShowBreakOnly((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  showBreakOnly
                    ? "border-orange-400/60 bg-orange-100/80 text-orange-700 dark:border-orange-400/40 dark:bg-orange-400/15 dark:text-orange-200"
                    : "border-slate-200 bg-white/90 text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300"
                }`}
              >
                <TimerReset className="h-3.5 w-3.5" />
                Break issues
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {Array.from({ length: startDay }).map((_, index) => (
                  <div key={`empty-${index}`} className="h-16 rounded-2xl border border-transparent" />
                ))}
                {monthDays.map((date) => {
                  const dateKey = getLocalDateKey(date);
                  const record = recordsByDate.get(dateKey);
                  const status = getDayStatus(date, record);
                  const config = statusConfig[status];
                  const filteredOut = isFilteredOut(status, record);
                  const isSelected = selectedDateKey === dateKey;
                  const Icon = config.icon;
                  const breakInfo = getBreakExceedInfo(record);
                  const breakLabel =
                    status === "longBreak" && breakInfo.exceeds
                      ? `Break exceeded by ${formatMinutes(breakInfo.exceededBy)}`
                      : null;
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(dateKey)}
                      className={`group relative flex h-20 flex-col rounded-2xl border p-2 text-left text-[0.7rem] font-semibold transition hover:-translate-y-0.5 hover:shadow-md ${config.tile} ${
                        filteredOut ? "opacity-40" : ""
                      } ${isSelected ? "ring-2 ring-brand-500/60" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold">{date.getDate()}</span>
                        {Icon ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-slate-700 shadow-sm dark:bg-slate-900/60 dark:text-slate-100">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-auto inline-flex items-center gap-2 text-[0.65rem] font-semibold">
                        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                      {breakLabel ? (
                        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-full border border-orange-200 bg-white/95 px-3 py-1 text-[0.65rem] font-semibold text-slate-700 opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-orange-400/40 dark:bg-slate-900/90 dark:text-slate-100">
                          {breakLabel}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.values(statusConfig).map((config) => (
                  <span
                    key={config.label}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300"
                  >
                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  Day details
                </p>
                <Info className="h-4 w-4 text-slate-400 dark:text-slate-400" />
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                {selectedDate ? formatDate(getLocalDateKey(selectedDate)) : "Select a date"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{selectedStatusLabel}</p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Check-in / Check-out
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedRecord ? `${selectedRecord.checkIn} - ${selectedRecord.checkOut}` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Working hours
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedRecord ? formatMinutes(selectedWorkMinutes) : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Breaks
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedRecord ? `${formatMinutes(selectedBreakMinutes)} · ${selectedBreakCount} breaks` : "--"}
                  </p>
                  {selectedBreakInfo.exceeds ? (
                    <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">
                      Break limit exceeded by {formatMinutes(selectedBreakInfo.exceededBy)}
                    </p>
                  ) : null}
                  {selectedBreakEntries.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedBreakEntries.map((entry) => {
                        const exceeded =
                          entry.max !== null && entry.minutes > (entry.max ?? 0);
                        return (
                          <span
                            key={entry.label}
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold ${
                              exceeded
                                ? "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-200"
                                : "border-slate-200 bg-white text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300"
                            }`}
                          >
                            {entry.label} {formatMinutes(entry.minutes)}
                            {entry.limit !== null ? ` / ${formatMinutes(entry.limit)}` : ""}
                            {entry.max !== null && entry.max !== entry.limit ? ` (max ${formatMinutes(entry.max)})` : ""}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{selectedStatusLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      

      <SectionCard title="Attendance Timeline" subtitle="Your recent attendance records">
        {recordsHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading attendance records...</p> : null}
        {recordsHook.error ? <p className="text-sm font-semibold text-rose-700">{recordsHook.error}</p> : null}
        <DataTable
          columns={columns}
          rows={recordsHook.data ?? []}
          rowKey={(row) => row.id}
          exportFileName="my-attendance"
          emptyText="No attendance records available."
        />
      </SectionCard>
    </div>
  );
}
