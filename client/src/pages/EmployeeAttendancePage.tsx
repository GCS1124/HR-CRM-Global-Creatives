import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarRange,
  Clock3,
  Home,
  LogOut,
  Sparkles,
  SunMedium,
  TimerReset,
  UserRoundCheck,
  UserRoundX,
  Wifi,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { AttendanceRecord } from "../types/hr";
import { formatDate, formatPercent, getLocalDateKey } from "../utils/formatters";

export function EmployeeAttendancePage() {
  const { profile } = useAuthSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [nowLabel, setNowLabel] = useState(() =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  );
  const summaryHook = useApi(useCallback(() => hrService.getMyAttendanceSummary(), []));
  const recordsHook = useApi(useCallback(() => hrService.getMyAttendanceRecords(), []));
  const todayKey = getLocalDateKey();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowLabel(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const total = summaryHook.data
    ? summaryHook.data.present + summaryHook.data.remote + summaryHook.data.late + summaryHook.data.absent
    : 0;

  const presenceRate = useMemo(() => {
    if (!summaryHook.data) {
      return 0;
    }

    return ((summaryHook.data.present + summaryHook.data.remote) / Math.max(total, 1)) * 100;
  }, [summaryHook.data, total]);

  const todayRecord = useMemo(
    () => (recordsHook.data ?? []).find((row) => row.date === todayKey) ?? null,
    [recordsHook.data, todayKey],
  );

  const checkedOut = Boolean(todayRecord?.checkOut && todayRecord.checkOut !== "--");
  const todaySummaryLabel = todayRecord ? "Attendance locked in" : "Ready to start your day";
  const todaySummaryText = todayRecord
    ? `Check-in ${todayRecord.checkIn} and check-out ${todayRecord.checkOut}.`
    : "Choose your work mode and record the first punch for today.";
  const todayModeLabel =
    todayRecord?.status === "remote"
      ? "Remote mode"
      : todayRecord?.status === "late"
        ? "Late office entry"
        : todayRecord?.status === "present"
          ? "Office mode"
          : "No mark yet";
  const consistencyTone =
    presenceRate >= 90 ? "text-emerald-700" : presenceRate >= 70 ? "text-amber-700" : "text-rose-700";

  const columns: Array<TableColumn<AttendanceRecord>> = [
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "check-in", header: "Check In", render: (row) => row.checkIn },
    { key: "check-out", header: "Check Out", render: (row) => row.checkOut },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ];

  if (isNewUserEmployeeSetupError(summaryHook.error) || isNewUserEmployeeSetupError(recordsHook.error)) {
    return <NewUserSetupModal email={profile?.email} />;
  }

  const handleCheckIn = async (mode: "office" | "remote") => {
    setActionError(null);
    setActionMessage(null);
    setIsSubmitting(true);

    try {
      const record = await hrService.markMyAttendance(mode);
      setActionMessage(
        mode === "remote"
          ? `Remote attendance marked at ${record.checkIn}.`
          : `Attendance marked at ${record.checkIn}.`,
      );
      await Promise.all([recordsHook.refetch(), summaryHook.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to mark attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsSubmitting(true);

    try {
      const record = await hrService.markMyCheckOut();
      setActionMessage(`Check out marked at ${record.checkOut}.`);
      await Promise.all([recordsHook.refetch(), summaryHook.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to mark check out.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Attendance"
        subtitle="Review your check-in behavior, remote logs, and attendance quality"
        eyebrow="Employee Attendance"
      />

      <ModuleHero
        icon={Clock3}
        title="Stay on Top of Daily Presence"
        subtitle="Track your day with a sharper workflow, clearer punch states, and a more confident rhythm view."
        chips={["Self tracking", "Transparent logs", "Status history"]}
        spotlight={formatPercent(presenceRate)}
      />

      {summaryHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading attendance summary...</p> : null}
      {summaryHook.error ? <p className="text-sm font-semibold text-rose-700">{summaryHook.error}</p> : null}

      {summaryHook.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Present" value={String(summaryHook.data.present)} icon={UserRoundCheck} />
          <StatCard title="Remote" value={String(summaryHook.data.remote)} icon={Home} />
          <StatCard title="Late" value={String(summaryHook.data.late)} icon={Clock3} />
          <StatCard title="Absent" value={String(summaryHook.data.absent)} icon={UserRoundX} />
        </div>
      ) : null}

      <SectionCard
        title="Mark Attendance"
        subtitle="Check in from office or remote, then close the day with a check out stamp"
      >
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="accent-panel relative overflow-hidden rounded-[28px] border p-5 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Daily Pulse
                </p>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/88">Today</p>
                <h3 className="mt-1 font-display text-3xl font-extrabold">{todaySummaryLabel}</h3>
                <p className="mt-2 max-w-xl text-sm font-medium text-white/90">{todaySummaryText}</p>
              </div>
              <div className="min-w-[150px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/88">Live Time</p>
                <p className="mt-2 text-3xl font-extrabold">{nowLabel}</p>
                <p className="mt-2 text-xs font-medium text-white/88">Attendance stamp follows your current browser time.</p>
              </div>
            </div>

            <div className="relative mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Work Mode</p>
                <p className="mt-2 text-lg font-bold text-white">{todayModeLabel}</p>
                <p className="mt-1 text-xs font-medium text-white/86">Switch mode before check-out if your day changes.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Check In</p>
                <p className="mt-2 text-lg font-bold text-white">{todayRecord?.checkIn ?? "--"}</p>
                <p className="mt-1 text-xs font-medium text-white/86">First punch of the day.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Check Out</p>
                <p className="mt-2 text-lg font-bold text-white">
                  {todayRecord?.checkOut && todayRecord.checkOut !== "--" ? todayRecord.checkOut : "Pending"}
                </p>
                <p className="mt-1 text-xs font-medium text-white/86">Close the day when your shift ends.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => void handleCheckIn("office")}
              disabled={isSubmitting || checkedOut}
              className="inline-flex w-full items-center justify-between rounded-[24px] border border-brand-200 bg-white px-4 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-2xl bg-brand-900 p-3 text-white">
                  <Building2 className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-brand-900">
                    {todayRecord ? "Switch to Office" : "Mark Office Check-in"}
                  </span>
                  <span className="block text-xs font-medium text-slate-700">Use this if you are working onsite today.</span>
                </span>
              </span>
              {todayRecord?.status === "present" || todayRecord?.status === "late" ? <BadgeCheck className="h-5 w-5 text-emerald-600" /> : null}
            </button>

            <button
              type="button"
              onClick={() => void handleCheckIn("remote")}
              disabled={isSubmitting || checkedOut}
              className="inline-flex w-full items-center justify-between rounded-[24px] border border-brand-200 bg-white px-4 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-2xl bg-sky-600 p-3 text-white">
                  <Wifi className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-brand-900">
                    {todayRecord ? "Switch to Remote" : "Mark Remote Check-in"}
                  </span>
                  <span className="block text-xs font-medium text-slate-700">Use this if you are logging your day from home.</span>
                </span>
              </span>
              {todayRecord?.status === "remote" ? <BadgeCheck className="h-5 w-5 text-emerald-600" /> : null}
            </button>

            <button
              type="button"
              onClick={() => void handleCheckOut()}
              disabled={isSubmitting || !todayRecord || checkedOut}
              className="inline-flex w-full items-center justify-between rounded-[24px] border border-brand-900 bg-brand-900 px-4 py-4 text-left text-white shadow-[0_18px_40px_rgba(13,33,74,0.18)] transition hover:-translate-y-0.5 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-2xl bg-white/12 p-3 text-white">
                  <LogOut className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Mark Check-out</span>
                  <span className="block text-xs font-medium text-white/86">Close the day once your work session is complete.</span>
                </span>
              </span>
              {checkedOut ? <BadgeCheck className="h-5 w-5 text-emerald-300" /> : null}
            </button>
          </div>
        </div>

        {actionMessage ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {actionMessage}
          </p>
        ) : null}
        {actionError ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {actionError}
          </p>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Daily Rhythm" subtitle="What your current attendance pattern is saying">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand-200 bg-brand-50/75 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
                <TimerReset className="h-3.5 w-3.5" />
                Consistency
              </p>
              <p className={`mt-3 text-3xl font-extrabold ${consistencyTone}`}>{formatPercent(presenceRate)}</p>
              <p className="mt-2 text-sm text-brand-700">Your presence quality for recorded attendance days in this view.</p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-white p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
                <CalendarRange className="h-3.5 w-3.5" />
                Today&apos;s State
              </p>
              <p className="mt-3 text-lg font-extrabold text-brand-900">{todayModeLabel}</p>
              <p className="mt-2 text-sm text-brand-700">
                {checkedOut ? "Day closed successfully." : todayRecord ? "Attendance is active and waiting for check-out." : "No attendance action recorded yet."}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Smart Guidance" subtitle="Simple rules to keep your day clean and compliant">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                First punch
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900">Mark attendance as soon as your workday starts so the log stays accurate.</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
                <Home className="h-3.5 w-3.5" />
                Mode clarity
              </p>
              <p className="mt-2 text-sm font-medium text-sky-900">Switch between office and remote before check-out if your work mode changes mid-day.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                <SunMedium className="h-3.5 w-3.5" />
                Close the loop
              </p>
              <p className="mt-2 text-sm font-medium text-amber-900">Always mark check-out before ending the day so your attendance line is fully closed.</p>
            </div>
          </div>
        </SectionCard>
      </div>

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
