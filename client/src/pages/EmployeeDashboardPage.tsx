import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, ClipboardList, Clock3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AnnouncementStrip } from "../components/AnnouncementStrip";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import { getLoginBroadcastRemainingMs } from "../utils/loginBroadcast";
import { formatCurrency, formatDate, formatPercent } from "../utils/formatters";

const focusTone: Record<string, string> = {
  info: "border-sky-200/80 bg-sky-50/80",
  success: "border-emerald-200/80 bg-emerald-50/80",
  warning: "border-amber-200/80 bg-amber-50/80",
  critical: "border-rose-200/80 bg-rose-50/80",
};

export function EmployeeDashboardPage() {
  const { profile, signOut } = useAuthSession();
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const attendanceHook = useApi(useCallback(() => hrService.getMyAttendanceSummary(), []));
  const todayAttendanceHook = useApi(useCallback(() => hrService.getMyTodayAttendance(), []));
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));
  const commandHook = useApi(useCallback(() => hrService.getEmployeeCommandCenterData(), []));
  const announcementsHook = useApi(useCallback(() => hrService.getAnnouncements("employee"), []));
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [showBroadcasts, setShowBroadcasts] = useState(() => getLoginBroadcastRemainingMs() > 0);

  useEffect(() => {
    const remaining = getLoginBroadcastRemainingMs();
    if (remaining <= 0) {
      setShowBroadcasts(false);
      return;
    }

    setShowBroadcasts(true);
    const timer = window.setTimeout(() => setShowBroadcasts(false), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  const presenceRate = useMemo(() => {
    if (!attendanceHook.data) {
      return 0;
    }

    const total =
      attendanceHook.data.present +
      attendanceHook.data.remote +
      attendanceHook.data.late +
      attendanceHook.data.absent;

    return ((attendanceHook.data.present + attendanceHook.data.remote) / Math.max(total, 1)) * 100;
  }, [attendanceHook.data]);

  const latestPayroll = payrollHook.data?.[0] ?? null;
  const pendingLeaveCount = (leaveHook.data ?? []).filter((row) => row.status === "pending").length;
  const todayAttendance = todayAttendanceHook.data;
  const command = commandHook.data;

  const handleCheckIn = async (mode: "office" | "remote") => {
    setAttendanceBusy(true);
    setAttendanceError(null);
    try {
      await hrService.markMyAttendance(mode);
      await Promise.all([
        todayAttendanceHook.refetch(),
        attendanceHook.refetch(),
        commandHook.refetch(),
      ]);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Unable to check in.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setAttendanceBusy(true);
    setAttendanceError(null);
    try {
      await hrService.markMyCheckOut();
      await Promise.all([
        todayAttendanceHook.refetch(),
        attendanceHook.refetch(),
        commandHook.refetch(),
      ]);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Unable to check out.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-slate-700">Loading employee workspace...</p>;
  }

  if (isNewUserEmployeeSetupError(employeeHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Employee profile unavailable"}</p>;
  }

  const employee = employeeHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title={`Welcome, ${employee.name.split(" ")[0]}`}
        subtitle="Your upgraded self-service workspace for attendance, work, leave, and payroll."
        eyebrow="Employee Workspace"
        action={
          <Link to="/employee/tasks" className="btn-primary px-4 py-2.5">
            Open my tasks
            <ClipboardList className="h-4 w-4" />
          </Link>
        }
      />

      {showBroadcasts ? (
        <AnnouncementStrip announcements={announcementsHook.data ?? []} loading={announcementsHook.loading} />
      ) : null}

      <section className="hero-panel relative overflow-hidden rounded-[32px] border p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,157,0,0.18),transparent_24%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              Personal Command View
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.02] text-white">
              One place to manage your day instead of bouncing through separate modules.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/78">
              Stay on top of check-ins, active tasks, leave approvals, and payroll without hunting for context.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/58">Attendance streak</p>
              <p className="mt-2 text-3xl font-bold text-white">{command?.attendanceStreak ?? 0} days</p>
              <p className="mt-1 text-sm text-white/70">Keep the run clean this week.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/58">Open tasks</p>
              <p className="mt-2 text-3xl font-bold text-white">{command?.pendingTasks ?? 0}</p>
              <p className="mt-1 text-sm text-white/70">Workload still active in your queue.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/58">Leave approvals</p>
              <p className="mt-2 text-3xl font-bold text-white">{command?.pendingApprovals ?? pendingLeaveCount}</p>
              <p className="mt-1 text-sm text-white/70">Requests waiting on review.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/58">Latest payroll</p>
              <p className="mt-2 text-3xl font-bold text-white">{command?.nextPayrollMonth ?? latestPayroll?.month ?? "--"}</p>
              <p className="mt-1 text-sm text-white/70">Cycle currently visible in the system.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Attendance"
          value={formatPercent(presenceRate)}
          icon={Clock3}
          hint="Present + remote ratio"
          accent
        />
        <StatCard title="Pending Leave" value={String(pendingLeaveCount)} icon={CalendarClock} />
        <StatCard
          title="Net Pay"
          value={latestPayroll ? formatCurrency(latestPayroll.netPay) : "--"}
          icon={CircleDollarSign}
          hint={latestPayroll?.month ?? "No payroll yet"}
        />
        <StatCard
          title="Completed Tasks"
          value={String(command?.completedTasks ?? 0)}
          icon={ClipboardList}
          hint="Delivered from your queue"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Today Focus" subtitle="Check in, track your day, and close it cleanly">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
              <span>Status:</span>
              {todayAttendance ? <StatusBadge value={todayAttendance.status} /> : <span>Not checked in</span>}
              {todayAttendance?.checkIn && todayAttendance.checkIn !== "--" ? (
                <span className="text-slate-500">Check in: {todayAttendance.checkIn}</span>
              ) : null}
              {todayAttendance?.checkOut && todayAttendance.checkOut !== "--" ? (
                <span className="text-slate-500">Check out: {todayAttendance.checkOut}</span>
              ) : null}
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <span>Attendance Health</span>
                <span className="text-emerald-700">{formatPercent(presenceRate)}</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, presenceRate))}%` }} />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">Based on present + remote check-ins.</p>
            </div>
            {attendanceError ? <p className="text-sm font-semibold text-rose-700">{attendanceError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCheckIn("office")}
                className="btn-primary"
                disabled={attendanceBusy || Boolean(todayAttendance?.checkIn && todayAttendance.checkIn !== "--")}
              >
                Check in (Office)
              </button>
              <button
                type="button"
                onClick={() => void handleCheckIn("remote")}
                className="btn-secondary"
                disabled={attendanceBusy || Boolean(todayAttendance?.checkIn && todayAttendance.checkIn !== "--")}
              >
                Check in (Remote)
              </button>
              <button
                type="button"
                onClick={() => void handleCheckOut()}
                className="btn-secondary"
                disabled={attendanceBusy || !todayAttendance || todayAttendance.checkOut !== "--"}
              >
                Check out
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Priority Radar" subtitle="The main things you should not lose track of">
          <div className="space-y-3">
            {(command?.focusItems ?? []).map((item) => (
              <Link
                key={item.id}
                to={item.route}
                className={`block rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${focusTone[item.tone]}`}
              >
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
                <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Active Work" subtitle="Your current delivery queue and upcoming leave">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Current tasks</p>
              <div className="mt-4 space-y-3">
                {(command?.activeTasks ?? []).length > 0 ? (
                  (command?.activeTasks ?? []).map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                      <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{task.description ?? "No description provided."}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-slate-500">No active tasks right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Upcoming leave</p>
              <div className="mt-4 space-y-3">
                {(command?.upcomingLeaves ?? []).length > 0 ? (
                  (command?.upcomingLeaves ?? []).map((leave) => (
                    <div key={leave.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {leave.leaveType} · {leave.days} day{leave.days === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge value={leave.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium text-slate-500">No upcoming leave on your calendar.</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payroll Snapshot" subtitle="Latest payout details">
          {latestPayroll ? (
            <div className="grid gap-3">
              <div className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Net pay</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(latestPayroll.netPay)}</p>
                <p className="mt-1 text-sm text-slate-600">Status: {latestPayroll.status}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Base salary</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(latestPayroll.baseSalary)}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Bonus</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(latestPayroll.bonus)}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Deductions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(latestPayroll.deductions)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-600">
              No payroll records yet. Your first cycle will appear here automatically.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
