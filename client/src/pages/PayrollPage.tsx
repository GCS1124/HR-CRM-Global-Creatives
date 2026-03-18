import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Clock3,
  Download,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { NewPayrollRecordPayload, PayrollRecord, PayrollStatus } from "../types/hr";
import { formatCurrency } from "../utils/formatters";
import { downloadCsv } from "../utils/fileExport";

const initialPayrollForm: NewPayrollRecordPayload = {
  employeeId: null,
  employeeName: "",
  department: "",
  month: new Date().toISOString().slice(0, 7),
  baseSalary: 0,
  bonus: 0,
  deductions: 0,
  status: "scheduled",
};

type FocusMode = "all" | "scheduled" | "processed" | "deductions_review";

function parseMonthValue(value: string): Date | null {
  if (!value) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01T00:00:00` : `${value} 1`;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatMonthLabel(value: string): string {
  const date = parseMonthValue(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

function getNextMonthLabel(value: string): string {
  const date = parseMonthValue(value);
  if (!date) {
    return value;
  }

  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(next);
}

export function PayrollPage() {
  const recordsHook = useApi(useCallback(() => hrService.getPayrollRecords(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [focusMode, setFocusMode] = useState<FocusMode>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formState, setFormState] = useState<NewPayrollRecordPayload>(initialPayrollForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [updatingPayrollId, setUpdatingPayrollId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"status" | "delete" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const records = useMemo(() => recordsHook.data ?? [], [recordsHook.data]);
  const employees = useMemo(() => employeesHook.data ?? [], [employeesHook.data]);

  const months = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.month)))
        .sort((left, right) => (parseMonthValue(right)?.valueOf() ?? 0) - (parseMonthValue(left)?.valueOf() ?? 0)),
    [records],
  );

  const latestRecordByEmployee = useMemo(() => {
    return records.reduce((map, record) => {
      const key = record.employeeId ?? record.employeeName;
      if (!key) {
        return map;
      }

      const current = map.get(key);
      const currentValue = current ? parseMonthValue(current.month)?.valueOf() ?? 0 : 0;
      const nextValue = parseMonthValue(record.month)?.valueOf() ?? 0;
      if (!current || nextValue > currentValue) {
        map.set(key, record);
      }
      return map;
    }, new Map<string, PayrollRecord>());
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((row) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = query
        ? [row.employeeName, row.department, row.month].join(" ").toLowerCase().includes(query)
        : true;
      const matchesDepartment = department ? row.department === department : true;
      const matchesMonth = monthFilter ? row.month === monthFilter : true;
      const matchesStatus = statusFilter ? row.status === statusFilter : true;

      let matchesFocus = true;
      if (focusMode === "scheduled") {
        matchesFocus = row.status === "scheduled";
      } else if (focusMode === "processed") {
        matchesFocus = row.status === "processed";
      } else if (focusMode === "deductions_review") {
        matchesFocus = row.deductions > row.baseSalary * 0.1;
      }

      return matchesSearch && matchesDepartment && matchesMonth && matchesStatus && matchesFocus;
    });
  }, [department, focusMode, monthFilter, records, search, statusFilter]);

  useEffect(() => {
    const visibleIds = new Set(filteredRecords.map((record) => record.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredRecords]);

  const departments = useMemo(
    () => Array.from(new Set(records.map((record) => record.department))).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, row) => {
        acc.totalNetPay += row.netPay;
        acc.totalBonus += row.bonus;
        acc.totalDeductions += row.deductions;
        if (row.status === "processed") {
          acc.processedCount += 1;
        }
        if (row.status === "scheduled") {
          acc.scheduledExposure += row.netPay;
        }
        acc.highestNetPay = Math.max(acc.highestNetPay, row.netPay);
        return acc;
      },
      { totalNetPay: 0, totalBonus: 0, totalDeductions: 0, processedCount: 0, scheduledExposure: 0, highestNetPay: 0 },
    );
  }, [filteredRecords]);

  const averageNetPay = filteredRecords.length > 0 ? summary.totalNetPay / filteredRecords.length : 0;
  const deductionRate = summary.totalNetPay > 0 ? (summary.totalDeductions / (summary.totalNetPay + summary.totalDeductions)) * 100 : 0;
  const netPayPreview = Math.max(Number(formState.baseSalary) + Number(formState.bonus) - Number(formState.deductions), 0);
  const grossPayPreview = Math.max(Number(formState.baseSalary) + Number(formState.bonus), 0);
  const deductionRatePreview = grossPayPreview > 0 ? (Number(formState.deductions) / grossPayPreview) * 100 : 0;
  const latestPayrollSnapshot = formState.employeeId
    ? latestRecordByEmployee.get(formState.employeeId) ?? latestRecordByEmployee.get(formState.employeeName)
    : null;
  const hasActiveFilters = Boolean(search || department || monthFilter || statusFilter || focusMode !== "all");
  const allVisibleSelected = filteredRecords.length > 0 && selectedIds.length === filteredRecords.length;

  const scheduledQueue = useMemo(
    () => filteredRecords.filter((record) => record.status === "scheduled").sort((left, right) => right.netPay - left.netPay).slice(0, 5),
    [filteredRecords],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredRecords.map((row) => row.id));
  };

  const columns: Array<TableColumn<PayrollRecord>> = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={toggleSelectAll}
          aria-label="Select all payroll records"
          className="h-4 w-4 accent-white"
        />
      ),
      headerClassName: "w-10",
      cellClassName: "w-10",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelection(row.id)}
          aria-label={`Select payroll for ${row.employeeName}`}
          className="h-4 w-4 accent-brand-700"
        />
      ),
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-950">{row.employeeName}</p>
          <p className="text-xs text-slate-500">{row.department}</p>
        </div>
      ),
    },
    { key: "month", header: "Month", render: (row) => formatMonthLabel(row.month) },
    {
      key: "compensation",
      header: "Compensation",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-950">{formatCurrency(row.baseSalary)}</p>
          <p className="text-xs text-slate-500">+ {formatCurrency(row.bonus)} bonus · - {formatCurrency(row.deductions)}</p>
        </div>
      ),
    },
    {
      key: "net",
      header: "Net Pay",
      render: (row) => <span className="font-semibold text-slate-950">{formatCurrency(row.netPay)}</span>,
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={row.status}
            onChange={(event) => void handleStatusChange(row.id, event.target.value as PayrollStatus)}
            disabled={updatingPayrollId === row.id}
            className="input-surface min-w-[132px] py-2"
          >
            <option value="scheduled">Scheduled</option>
            <option value="processed">Processed</option>
          </select>
          <button type="button" onClick={() => void handleDuplicateRecord(row)} className="btn-secondary px-3 py-2">
            Next cycle
          </button>
          <button type="button" onClick={() => void handleDeleteRecord(row.id, row.employeeName)} className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-700 transition hover:bg-rose-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleEmployeeSelect = (employeeId: string) => {
    if (!employeeId) {
      setFormState((current) => ({ ...current, employeeId: null, employeeName: "", department: "" }));
      setFormMessage(null);
      return;
    }

    const employee = employees.find((row) => row.id === employeeId);
    if (!employee) {
      return;
    }

    const latestRecord = latestRecordByEmployee.get(employee.id) ?? latestRecordByEmployee.get(employee.name);
    setFormState((current) => ({
      ...current,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      baseSalary: latestRecord?.baseSalary ?? current.baseSalary,
      bonus: latestRecord?.bonus ?? current.bonus,
      deductions: latestRecord?.deductions ?? current.deductions,
      status: "scheduled",
    }));
    setFormMessage(latestRecord ? `Loaded latest payroll values from ${formatMonthLabel(latestRecord.month)}.` : "Employee linked to a new payroll draft.");
  };

  const handleFormChange = (field: keyof NewPayrollRecordPayload, value: string) => {
    setFormMessage(null);
    setFormState((current) => ({
      ...current,
      [field]: ["baseSalary", "bonus", "deductions"].includes(field) ? Number(value) : value,
    }));
  };

  async function handleStatusChange(id: string, status: PayrollStatus) {
    setUpdatingPayrollId(id);
    setUpdateError(null);

    try {
      await hrService.updatePayrollStatus(id, status);
      await recordsHook.refetch();
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to update payroll status.");
    } finally {
      setUpdatingPayrollId(null);
    }
  }

  const handleBulkStatusChange = async (status: PayrollStatus) => {
    if (selectedIds.length === 0) {
      return;
    }

    setBulkLoading("status");
    setBulkError(null);

    try {
      await hrService.bulkUpdatePayrollStatus(selectedIds, status);
      setSelectedIds([]);
      await recordsHook.refetch();
    } catch (issue) {
      setBulkError(issue instanceof Error ? issue.message : "Unable to bulk update payroll status.");
    } finally {
      setBulkLoading(null);
    }
  };

  const handleDeleteRecord = async (id: string, employeeName: string) => {
    const confirmed = window.confirm(`Delete payroll record for ${employeeName}?`);
    if (!confirmed) {
      return;
    }

    setUpdatingPayrollId(id);
    setUpdateError(null);

    try {
      await hrService.deletePayrollRecord(id);
      await recordsHook.refetch();
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to delete payroll record.");
    } finally {
      setUpdatingPayrollId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedIds.length} selected payroll record(s)?`);
    if (!confirmed) {
      return;
    }

    setBulkLoading("delete");
    setBulkError(null);

    try {
      await hrService.bulkDeletePayrollRecords(selectedIds);
      setSelectedIds([]);
      await recordsHook.refetch();
    } catch (issue) {
      setBulkError(issue instanceof Error ? issue.message : "Unable to bulk delete payroll records.");
    } finally {
      setBulkLoading(null);
    }
  };

  const handleDuplicateRecord = async (record: PayrollRecord) => {
    const nextMonth = getNextMonthLabel(record.month);
    const alreadyExists = records.some(
      (item) =>
        (item.employeeId && item.employeeId === record.employeeId && item.month === nextMonth) ||
        (!item.employeeId && item.employeeName === record.employeeName && item.month === nextMonth),
    );

    if (alreadyExists) {
      setUpdateError(`A ${nextMonth} payroll record already exists for ${record.employeeName}.`);
      return;
    }

    setUpdatingPayrollId(record.id);
    setUpdateError(null);

    try {
      await hrService.createPayrollRecord({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        month: nextMonth,
        baseSalary: record.baseSalary,
        bonus: record.bonus,
        deductions: record.deductions,
        status: "scheduled",
      });
      await recordsHook.refetch();
      setFormMessage(`Next cycle draft created for ${record.employeeName} (${nextMonth}).`);
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to duplicate payroll record.");
    } finally {
      setUpdatingPayrollId(null);
    }
  };

  const handleCreatePayroll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await hrService.createPayrollRecord({
        ...formState,
        month: formatMonthLabel(formState.month),
      });
      setFormState(initialPayrollForm);
      setFormMessage("Payroll record created.");
      await recordsHook.refetch();
    } catch (issue) {
      setSubmitError(issue instanceof Error ? issue.message : "Unable to create payroll record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportVisible = () => {
    downloadCsv(
      `payroll-register-${monthFilter || "all"}.csv`,
      [
        ["Employee", "Department", "Month", "Base Salary", "Bonus", "Deductions", "Net Pay", "Status"],
        ...filteredRecords.map((record) => [
          record.employeeName,
          record.department,
          formatMonthLabel(record.month),
          record.baseSalary,
          record.bonus,
          record.deductions,
          record.netPay,
          record.status,
        ]),
      ],
    );
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Treat payroll like a controlled cycle: filter by period, push bulk status changes, duplicate into the next run, and build new records from prior history instead of starting from zero."
        eyebrow="Compensation engine"
        action={
          <>
            <button type="button" onClick={handleExportVisible} disabled={filteredRecords.length === 0} className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60">
              <Download className="h-4 w-4" />
              Export visible
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDepartment("");
                  setMonthFilter("");
                  setStatusFilter("");
                  setFocusMode("all");
                }}
                className="btn-secondary"
              >
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </button>
            ) : null}
          </>
        }
      />

      <ModuleHero
        icon={Wallet}
        title="Payroll processing with smarter cycle control"
        subtitle="The register now supports month filtering, saved queue modes, export, next-cycle duplication, and draft autofill from the latest employee payroll history."
        chips={["Cycle control", "Queue review", "Draft autofill"]}
        spotlight={filteredRecords.length > 0 ? `${formatCurrency(summary.scheduledExposure)} scheduled exposure` : "Payroll workspace"}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visible net pay" value={formatCurrency(summary.totalNetPay)} hint="Current register scope" icon={Wallet} accent />
        <StatCard title="Average payout" value={formatCurrency(averageNetPay)} hint="Per record in active view" icon={BadgeDollarSign} accent />
        <StatCard title="Scheduled exposure" value={formatCurrency(summary.scheduledExposure)} hint="Awaiting finance close" icon={Clock3} accent />
        <StatCard title="Deduction rate" value={`${deductionRate.toFixed(1)}%`} hint="Of gross visible payout" icon={ReceiptText} accent />
      </div>

      <SectionCard title="Payroll controls" subtitle="Move between period review, payout state, and deduction-focused analysis without leaving the register">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr]">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, department, or month" className="input-surface" />
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="input-surface">
            <option value="">All departments</option>
            {departments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className="input-surface">
            <option value="">All months</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {formatMonthLabel(value)}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-surface">
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="processed">Processed</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { id: "all", label: "All register" },
            { id: "scheduled", label: "Scheduled queue" },
            { id: "processed", label: "Processed archive" },
            { id: "deductions_review", label: "Deductions review" },
          ] as Array<{ id: FocusMode; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFocusMode(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                focusMode === item.id ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <SectionCard title="Payroll register" subtitle="Operate status, queue selection, deletion, and next-cycle duplication from one ledger view">
          {selectedIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <span className="text-sm font-semibold text-brand-900">{selectedIds.length} selected</span>
              <button type="button" onClick={() => void handleBulkStatusChange("scheduled")} disabled={bulkLoading !== null} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Set scheduled
              </button>
              <button type="button" onClick={() => void handleBulkStatusChange("processed")} disabled={bulkLoading !== null} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Set processed
              </button>
              <button type="button" onClick={() => void handleBulkDelete()} disabled={bulkLoading !== null} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70">
                <Trash2 className="h-4 w-4" />
                Delete selected
              </button>
            </div>
          ) : null}
          {bulkError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{bulkError}</p> : null}
          {recordsHook.loading ? <p className="text-sm font-semibold text-slate-600">Loading payroll records...</p> : null}
          {recordsHook.error ? <p className="text-sm font-semibold text-rose-700">{recordsHook.error}</p> : null}
          {updateError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{updateError}</p> : null}
          <DataTable
            columns={columns}
            rows={filteredRecords}
            rowKey={(row) => row.id}
            exportFileName="payroll"
            emptyText="No payroll records available for this filter."
            rowClassName={(row) => {
              if (selectedIds.includes(row.id)) {
                return "!bg-brand-100/80";
              }

              return row.status === "scheduled" ? "bg-blue-50/50" : "";
            }}
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Create payroll record"
            subtitle="Compose a new cycle entry with optional autofill from the latest employee record"
            rightSlot={
              <button
                type="button"
                onClick={() => {
                  setFormState((current) => ({ ...current, bonus: 0, deductions: 0 }));
                  setFormMessage("Bonus and deductions reset to zero.");
                }}
                className="btn-secondary px-3 py-2"
              >
                Clear adjustments
              </button>
            }
          >
            <form onSubmit={handleCreatePayroll} className="space-y-3">
              <select value={formState.employeeId ?? ""} onChange={(event) => handleEmployeeSelect(event.target.value)} className="input-surface w-full">
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <input value={formState.employeeName} onChange={(event) => handleFormChange("employeeName", event.target.value)} placeholder="Employee name" className="input-surface w-full" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={formState.department} onChange={(event) => handleFormChange("department", event.target.value)} placeholder="Department" className="input-surface w-full" required />
                <input type="month" value={formState.month} onChange={(event) => handleFormChange("month", event.target.value)} className="input-surface w-full" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input type="number" min="0" value={formState.baseSalary} onChange={(event) => handleFormChange("baseSalary", event.target.value)} placeholder="Base" className="input-surface w-full" required />
                <input type="number" min="0" value={formState.bonus} onChange={(event) => handleFormChange("bonus", event.target.value)} placeholder="Bonus" className="input-surface w-full" required />
                <input type="number" min="0" value={formState.deductions} onChange={(event) => handleFormChange("deductions", event.target.value)} placeholder="Deductions" className="input-surface w-full" required />
              </div>
              <select value={formState.status} onChange={(event) => handleFormChange("status", event.target.value)} className="input-surface w-full">
                <option value="scheduled">Scheduled</option>
                <option value="processed">Processed</option>
              </select>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net pay preview</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(netPayPreview)}</p>
                {formMessage ? <p className="mt-2 text-sm font-medium text-emerald-700">{formMessage}</p> : null}
              </div>
              {submitError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</p> : null}
              <button type="submit" disabled={submitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                <Plus className="h-4 w-4" />
                {submitting ? "Creating..." : "Create payroll record"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Processing queue" subtitle="Scheduled payouts with the highest immediate exposure">
            {scheduledQueue.length > 0 ? (
              <div className="space-y-3">
                {scheduledQueue.map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{record.employeeName}</p>
                        <p className="mt-1 text-sm text-slate-600">{record.department} · {formatMonthLabel(record.month)}</p>
                      </div>
                      <StatusBadge value={record.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>Net pay</span>
                      <span className="font-semibold text-slate-950">{formatCurrency(record.netPay)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">No scheduled payouts in the current view.</p>
            )}
          </SectionCard>
        </div>
      </div>

    </div>
  );
}
