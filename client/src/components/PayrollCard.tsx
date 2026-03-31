import { CalendarDays, Landmark, MinusCircle } from "lucide-react";
import { calculatePayroll } from "../utils/payroll";
import type { PayrollInput } from "../utils/payroll";

type PayrollCardProps = PayrollInput & {
  monthLabel: string;
  attendanceDays?: number;
  className?: string;
};

export function PayrollCard({
  monthLabel,
  totalDays,
  baseSalary,
  bonus = 0,
  leaveDays,
  paidHolidays,
  attendanceDays,
  className = "",
}: PayrollCardProps) {
  const summary = calculatePayroll({ totalDays, baseSalary, bonus, leaveDays, paidHolidays });
  const trackedAttendanceDays =
    attendanceDays !== undefined ? Math.max(0, Math.round(attendanceDays)) : summary.payableDays;
  const attendanceNotFoundDays =
    attendanceDays !== undefined
      ? Math.max(0, summary.totalDays - summary.leaveDays - trackedAttendanceDays)
      : 0;
  const payableDays =
    attendanceDays !== undefined
      ? Math.max(0, summary.totalDays - summary.leaveDays - attendanceNotFoundDays)
      : summary.payableDays;
  const attendanceRatio = summary.totalDays > 0 ? trackedAttendanceDays / summary.totalDays : 0;

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border border-white/20 bg-[linear-gradient(135deg,#0ea5ff_0%,#1d4ed8_55%,#1e3a8a_100%)] p-6 text-white shadow-[0_40px_120px_rgba(15,23,42,0.35)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_45%)]" />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_14px_30px_rgba(15,23,42,0.38)] md:text-4xl lg:text-[2.6rem]">
              View your completed salary and breakdown
            </h2>
            <div className="mt-3 h-1.5 w-40 rounded-full bg-gradient-to-r from-white/80 via-white/45 to-transparent shadow-[0_10px_26px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="flex flex-col items-end gap-3 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/85 shadow-[0_8px_30px_rgba(15,23,42,0.25)]">
              <CalendarDays className="h-3.5 w-3.5" />
              {monthLabel}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            <span>Attendance</span>
            <span>
              {trackedAttendanceDays}/{summary.totalDays} days
            </span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-white" style={{ width: `${Math.max(6, attendanceRatio * 100)}%` }} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/70">Working Days</p>
            <p className="mt-2 text-lg font-extrabold text-white">{summary.totalDays}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/70">Leaves Taken</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-extrabold text-white">
              <MinusCircle className="h-4 w-4 text-white/80" />
              {summary.leaveDays}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/12 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/70">Payable Days</p>
            <p className="mt-2 text-lg font-extrabold text-white">{payableDays}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-white/70">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
            <Landmark className="h-3.5 w-3.5" />
            Deductions are based on unpaid leaves only
          </span>
        </div>
      </div>
    </section>
  );
}
