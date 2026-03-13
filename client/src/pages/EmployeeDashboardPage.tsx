import { useCallback, useMemo } from "react";
import { ArrowRight, CalendarClock, CircleDollarSign, Clock3, CreditCard, FileClock, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import { formatCurrency, formatPercent } from "../utils/formatters";

export function EmployeeDashboardPage() {
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const attendanceHook = useApi(useCallback(() => hrService.getMyAttendanceSummary(), []));
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));

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

  const leaveStats = useMemo(() => {
    const rows = leaveHook.data ?? [];

    return {
      total: rows.length,
      pending: rows.filter((row) => row.status === "pending").length,
      approved: rows.filter((row) => row.status === "approved").length,
      rejected: rows.filter((row) => row.status === "rejected").length,
    };
  }, [leaveHook.data]);

  const latestPayroll = payrollHook.data?.[0] ?? null;
  const latestLeave = leaveHook.data?.[0] ?? null;

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-slate-600">Loading employee workspace...</p>;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Employee profile unavailable"}</p>;
  }

  const employee = employeeHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title={`Welcome, ${employee.name.split(" ")[0]}`}
        subtitle="Enterprise-ready employee dashboard with the essentials surfaced first."
        eyebrow="Employee dashboard"
        action={
          <>
            <Link to="/employee/attendance" className="btn-secondary">
              Attendance
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/employee/leave" className="btn-secondary">
              Leave
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/employee/profile" className="btn-secondary">
              Profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Attendance" value={formatPercent(presenceRate)} icon={Clock3} hint="Present + remote ratio" />
        <StatCard title="Pending leave" value={String(leaveStats.pending)} icon={CalendarClock} />
        <StatCard title="Approved leave" value={String(leaveStats.approved)} icon={CalendarClock} />
        <StatCard
          title="Net pay"
          value={latestPayroll ? formatCurrency(latestPayroll.netPay) : "--"}
          icon={CircleDollarSign}
          hint={latestPayroll?.month ?? "No payroll yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Employee summary" subtitle="Current role, reporting, and profile state">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Role</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{employee.role}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Manager</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{employee.manager}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Location</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{employee.location}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Department</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{employee.department}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
              <div className="mt-2">
                <StatusBadge value={employee.status} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-slate-500">Profile</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">Employee record linked</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Action center" subtitle="What needs attention right now">
          <div className="space-y-3">
            <Link
              to="/employee/attendance"
              className="flex items-start justify-between rounded-xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Attendance</p>
                  <p className="mt-1 text-sm text-slate-600">Current attendance quality is {formatPercent(presenceRate)}.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/employee/leave"
              className="flex items-start justify-between rounded-xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <FileClock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Leave queue</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {leaveStats.pending > 0
                      ? `${leaveStats.pending} request${leaveStats.pending > 1 ? "s" : ""} pending approval.`
                      : "No pending leave requests right now."}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/employee/payroll"
              className="flex items-start justify-between rounded-xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Payroll</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {latestPayroll ? `${latestPayroll.month} processed at ${formatCurrency(latestPayroll.netPay)}.` : "No payroll record processed yet."}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                  <UserCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Latest leave update</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {latestLeave ? `${latestLeave.leaveType.toUpperCase()} from ${latestLeave.startDate} to ${latestLeave.endDate}.` : "No leave activity recorded yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
