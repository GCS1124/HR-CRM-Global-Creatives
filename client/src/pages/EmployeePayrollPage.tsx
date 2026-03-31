import { useCallback, useMemo, useState } from "react";
import { CircleDollarSign, Download, ShieldCheck } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { PayrollCard } from "../components/PayrollCard";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { PayrollRecord } from "../types/hr";
import { formatCurrency, formatDate } from "../utils/formatters";

const resolveMonthDate = (label?: string | null) => {
  if (!label) {
    return new Date();
  }
  const parsed = new Date(`${label} 1`);
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
};

const getMonthDays = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

export function EmployeePayrollPage() {
  const { profile, signOut } = useAuthSession();
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const attendanceHook = useApi(useCallback(() => hrService.getMyAttendanceRecords(), []));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const latestPayroll = payrollHook.data?.[0] ?? null;
  const monthDate = useMemo(() => resolveMonthDate(latestPayroll?.month), [latestPayroll?.month]);
  const monthLabel = latestPayroll?.month ?? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(monthDate);
  const totalDays = getMonthDays(monthDate);

  const leaveDays = useMemo(() => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return (leaveHook.data ?? [])
      .filter((leave) => leave.status === "approved")
      .filter((leave) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return start <= monthEnd && end >= monthStart;
      })
      .reduce((sum, leave) => sum + leave.days, 0);
  }, [leaveHook.data, monthDate]);

  const attendanceDays = useMemo(() => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const uniqueDates = new Set<string>();

    (attendanceHook.data ?? []).forEach((record) => {
      const recordDate = new Date(record.date);
      if (recordDate < monthStart || recordDate > monthEnd) {
        return;
      }
      if (record.status === "absent" || record.checkIn === "--") {
        return;
      }
      uniqueDates.add(record.date);
    });

    return uniqueDates.size;
  }, [attendanceHook.data, monthDate]);

  const paidHolidays = 1;

  if (isNewUserEmployeeSetupError(payrollHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  const columns: Array<TableColumn<PayrollRecord>> = [
    { key: "month", header: "Month", render: (row) => row.month },
    { key: "base", header: "Base", render: (row) => formatCurrency(row.baseSalary) },
    { key: "bonus", header: "Bonus", render: (row) => formatCurrency(row.bonus) },
    { key: "deduction", header: "Deductions", render: (row) => formatCurrency(row.deductions) },
    { key: "net", header: "Net Pay", render: (row) => <span className="font-semibold text-brand-900">{formatCurrency(row.netPay)}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "payslip",
      header: "Payslip Email",
      render: (row) => (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{row.payslipSentAt ? formatDate(row.payslipSentAt) : "Not sent yet"}</p>
              <p className="text-xs text-slate-500">{row.payslipFileName ?? "Salary slip email pending"}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleDownloadPayslip(row)}
              disabled={downloadingId === row.id || row.status !== "processed"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={row.status === "processed" ? "Download payslip" : "Payslip available after completion"}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleDownloadPayslip = async (record: PayrollRecord) => {
    if (downloadingId || record.status !== "processed") {
      return;
    }
    setDownloadingId(record.id);
    setDownloadError(null);
    setDownloadNotice(null);
    try {
      const result = await hrService.downloadPayrollPayslip(record.id);
      const binary = atob(result.fileBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download payslip.";
      if (message.toLowerCase().includes("edge function")) {
        try {
          const dispatch = await hrService.dispatchPayrollPayslip(record.id);
          setDownloadNotice(
            dispatch.status === "failed"
              ? `Download service offline. Payslip email failed: ${dispatch.message}`
              : "Download service offline. Payslip emailed instead.",
          );
        } catch (dispatchError) {
          const dispatchMessage =
            dispatchError instanceof Error
              ? dispatchError.message
              : "Download service offline and email fallback failed.";
          setDownloadNotice(
            dispatchMessage.toLowerCase().includes("edge function")
              ? "Payslip download is unavailable. Please deploy or run Supabase Edge Functions to enable downloads."
              : dispatchMessage,
          );
        }
      } else {
        setDownloadError(message);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Payroll"
        subtitle=""     
         eyebrow="Employee Payroll"
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <PayrollCard
          monthLabel={monthLabel}
          totalDays={totalDays}
        baseSalary={latestPayroll?.baseSalary ?? 0}
        bonus={latestPayroll?.bonus ?? 0}
        leaveDays={leaveDays}
        paidHolidays={paidHolidays}
        attendanceDays={attendanceDays}
      />
        <SectionCard title="Compensation Readout" subtitle="How your current payroll history breaks down">
          <div className="space-y-3">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                <CircleDollarSign className="h-3.5 w-3.5" />
                Current status
              </p>
              <p className="mt-2 text-lg font-bold text-brand-900">{latestPayroll ? latestPayroll.status : "No data yet"}</p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Net vs deductions</p>
              <p className="mt-2 text-sm font-medium text-brand-900">
                {latestPayroll
                  ? `${formatCurrency(latestPayroll.netPay)} net after ${formatCurrency(latestPayroll.deductions)} deductions.`
                  : "Payroll numbers will appear here once a statement is completed."}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure history
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900">
                {latestPayroll?.payslipSentAt
                  ? `Latest salary slip emailed on ${formatDate(latestPayroll.payslipSentAt)}${latestPayroll.payslipFileName ? ` as ${latestPayroll.payslipFileName}.` : "."}`
                  : "Use this space to confirm each completed payout and keep your records aligned."}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Payroll Records" subtitle="Your monthly compensation statements">
        {downloadNotice ? (
          <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">{downloadNotice}</p>
        ) : null}
        {downloadError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{downloadError}</p> : null}
        {payrollHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading payroll records...</p> : null}
        {payrollHook.error ? <p className="text-sm font-semibold text-rose-700">{payrollHook.error}</p> : null}
        <DataTable
          columns={columns}
          rows={payrollHook.data ?? []}
          rowKey={(row) => row.id}
          exportFileName="my-payroll"
          emptyText="No payroll records found."
        />
      </SectionCard>
    </div>
  );
}
