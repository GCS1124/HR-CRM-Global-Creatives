import { useCallback, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Clock3 } from "lucide-react";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import { formatCurrency, formatDate, formatPercent } from "../utils/formatters";

export function EmployeeDashboardPage() {
  const { profile } = useAuthSession();
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const attendanceHook = useApi(useCallback(() => hrService.getMyAttendanceSummary(), []));
  const todayAttendanceHook = useApi(useCallback(() => hrService.getMyTodayAttendance(), []));
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

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
  const approvedLeaveCount = (leaveHook.data ?? []).filter((row) => row.status === "approved").length;
  const todayAttendance = todayAttendanceHook.data;
  const attendanceRate = Math.min(100, Math.max(0, presenceRate));
  const upcomingLeaves = (leaveHook.data ?? [])
    .filter((row) => new Date(row.startDate).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 3);

  const handleCheckIn = async (mode: "office" | "remote") => {
    setAttendanceBusy(true);
    setAttendanceError(null);
    try {
      await hrService.markMyAttendance(mode);
      await todayAttendanceHook.refetch();
      await attendanceHook.refetch();
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
      await todayAttendanceHook.refetch();
      await attendanceHook.refetch();
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Unable to check out.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-slate-600">Loading employee workspace...</p>;
  }

  if (isNewUserEmployeeSetupError(employeeHook.error)) {
    return <NewUserSetupModal email={profile?.email} />;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Employee profile unavailable"}</p>;
  }

  const employee = employeeHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title={`Welcome, ${employee.name.split(" ")[0]}`}
        subtitle="Your daily focus, attendance health, and payroll snapshot."
        eyebrow="Employee Dashboard"
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Attendance"
          value={formatPercent(presenceRate)}
          icon={Clock3}
          hint="Present + remote ratio"
          accent
        />
        <StatCard title="Pending leave" value={String(pendingLeaveCount)} icon={CalendarClock} />
        <StatCard
          title="Net pay"
          value={latestPayroll ? formatCurrency(latestPayroll.netPay) : "--"}
          icon={CircleDollarSign}
          hint={latestPayroll?.month ?? "No payroll yet"}
        />
        <StatCard title="Approved leave" value={String(approvedLeaveCount)} icon={CalendarClock} hint="This year" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Today Focus" subtitle="Check in, check out, and track your status">
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
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Attendance Health</span>
                <span className="text-emerald-700">{formatPercent(attendanceRate)}</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
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

        <SectionCard title="Leave Outlook" subtitle="Upcoming leave requests and approvals">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Pending approvals</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{pendingLeaveCount}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Awaiting manager response.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Upcoming leave</p>
              {upcomingLeaves.length > 0 ? (
                <div className="mt-3 space-y-2 text-sm font-medium text-slate-700">
                  {upcomingLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        {leave.leaveType} · {leave.days} day{leave.days === 1 ? "" : "s"}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(leave.startDate)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No upcoming leave on the calendar.</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Payroll Snapshot" subtitle="Latest payout details">
        {latestPayroll ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Base salary</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(latestPayroll.baseSalary)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Month: {latestPayroll.month}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bonus</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(latestPayroll.bonus)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Incentives paid</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deductions</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(latestPayroll.deductions)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Taxes + benefits</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Net pay</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{formatCurrency(latestPayroll.netPay)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Status: {latestPayroll.status}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-600">
            No payroll records yet. Your latest payout will appear here after the first cycle closes.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
