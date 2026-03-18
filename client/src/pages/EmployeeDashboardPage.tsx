import { useCallback, useMemo, useState } from "react";
import { CalendarClock, CircleDollarSign, Clock3, UserCheck, Wallet, User } from "lucide-react";
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
  const todayAttendance = todayAttendanceHook.data;

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

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Employee profile unavailable"}</p>;
  }

  const employee = employeeHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title={`Welcome, ${employee.name.split(" ")[0]}`}
        subtitle="Check in, see your status, and navigate quickly."
        eyebrow="Employee dashboard"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Attendance" value={formatPercent(presenceRate)} icon={Clock3} hint="Present + remote ratio" />
        <StatCard title="Pending leave" value={String(pendingLeaveCount)} icon={CalendarClock} />
        <StatCard
          title="Net pay"
          value={latestPayroll ? formatCurrency(latestPayroll.netPay) : "--"}
          icon={CircleDollarSign}
          hint={latestPayroll?.month ?? "No payroll yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Today" subtitle="Check in or check out">
          <div className="space-y-3">
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

        <SectionCard title="Profile" subtitle="Your current record">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{employee.role}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Department</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{employee.department}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Manager</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{employee.manager}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge value={employee.status} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Quick links" subtitle="Go straight to your tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Attendance",
              path: "/employee/attendance",
              icon: UserCheck,
              tone: "border-sky-200 bg-sky-50/60 text-sky-700",
              iconTone: "bg-sky-100 text-sky-700",
            },
            {
              label: "Leave",
              path: "/employee/leave",
              icon: CalendarClock,
              tone: "border-amber-200 bg-amber-50/60 text-amber-700",
              iconTone: "bg-amber-100 text-amber-700",
            },
            {
              label: "Payroll",
              path: "/employee/payroll",
              icon: Wallet,
              tone: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
              iconTone: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Profile",
              path: "/employee/profile",
              icon: User,
              tone: "border-slate-200 bg-slate-50/60 text-slate-700",
              iconTone: "bg-slate-100 text-slate-700",
            },
          ].map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition hover:brightness-95 ${card.tone}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconTone}`}>
                <card.icon className="h-4 w-4" />
              </span>
              {card.label}
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
