import { useCallback, useMemo } from "react";
import { BadgeDollarSign, CircleDollarSign, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { PayrollRecord } from "../types/hr";
import { formatCurrency } from "../utils/formatters";

export function EmployeePayrollPage() {
  const payrollHook = useApi(useCallback(() => hrService.getMyPayrollRecords(), []));

  const summary = useMemo(() => {
    const rows = payrollHook.data ?? [];

    return {
      totalNet: rows.reduce((sum, row) => sum + row.netPay, 0),
      totalBonus: rows.reduce((sum, row) => sum + row.bonus, 0),
      totalDeduction: rows.reduce((sum, row) => sum + row.deductions, 0),
    };
  }, [payrollHook.data]);

  const latestPayroll = payrollHook.data?.[0] ?? null;

  const columns: Array<TableColumn<PayrollRecord>> = [
    { key: "month", header: "Month", render: (row) => row.month },
    { key: "base", header: "Base", render: (row) => formatCurrency(row.baseSalary) },
    { key: "bonus", header: "Bonus", render: (row) => formatCurrency(row.bonus) },
    { key: "deduction", header: "Deductions", render: (row) => formatCurrency(row.deductions) },
    { key: "net", header: "Net Pay", render: (row) => <span className="font-semibold text-brand-900">{formatCurrency(row.netPay)}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Payroll"
        subtitle="View your processed salary records and payout breakdown"
        eyebrow="Employee Payroll"
      />

      <ModuleHero
        icon={Wallet}
        title="Salary Records in One Secure View"
        subtitle="Track monthly payouts, deductions, and bonus history with a cleaner summary-first layout."
        chips={["Payout history", "Compensation clarity", "Secure access"]}
        spotlight={formatCurrency(summary.totalNet)}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Net" value={formatCurrency(summary.totalNet)} icon={Wallet} />
        <StatCard title="Total Bonus" value={formatCurrency(summary.totalBonus)} icon={BadgeDollarSign} />
        <StatCard title="Total Deductions" value={formatCurrency(summary.totalDeduction)} icon={ReceiptText} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-brand-200 bg-[linear-gradient(135deg,rgba(26,42,105,0.96),rgba(59,130,246,0.9))] p-6 text-white shadow-soft">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_28%)]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Latest Statement</p>
            <p className="mt-3 font-display text-4xl font-extrabold">{latestPayroll ? formatCurrency(latestPayroll.netPay) : "--"}</p>
            <p className="mt-1 text-sm text-white/72">{latestPayroll?.month ?? "No statement has been processed yet."}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">Base</p>
                <p className="mt-2 text-lg font-bold text-white">{latestPayroll ? formatCurrency(latestPayroll.baseSalary) : "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">Bonus</p>
                <p className="mt-2 text-lg font-bold text-white">{latestPayroll ? formatCurrency(latestPayroll.bonus) : "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">Deductions</p>
                <p className="mt-2 text-lg font-bold text-white">{latestPayroll ? formatCurrency(latestPayroll.deductions) : "--"}</p>
              </div>
            </div>
          </div>
        </section>

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
                  : "Payroll numbers will appear here once a statement is processed."}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure history
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900">Use this space to confirm each processed payout and keep your records aligned.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Payroll Records" subtitle="Your monthly compensation statements">
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
