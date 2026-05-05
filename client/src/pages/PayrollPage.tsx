import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Clock3,
  Download,
  Mail,
  Plus,
  ReceiptText,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { NewPayrollRecordPayload, PayrollRecord, PayrollStatus } from "../types/hr";
import { formatCurrency, formatDate } from "../utils/formatters";
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

const weekdayIndex: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function getMonthRange(value: string): { start: Date; end: Date } | null {
  const date = parseMonthValue(value);
  if (!date) {
    return null;
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function countOverlapDays(startDate: string, endDate: string, rangeStart: Date, rangeEnd: Date): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const overlapStart = start > rangeStart ? start : rangeStart;
  const overlapEnd = end < rangeEnd ? end : rangeEnd;

  if (Number.isNaN(overlapStart.valueOf()) || Number.isNaN(overlapEnd.valueOf())) {
    return 0;
  }

  if (overlapEnd < overlapStart) {
    return 0;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / dayMs) + 1;
}

function getWorkingDaysInMonth(value: string, workingDays: string[] | null | undefined): number | null {
  const range = getMonthRange(value);
  if (!range || !workingDays || workingDays.length === 0) {
    return null;
  }

  const indices = new Set(
    workingDays
      .map((day) => weekdayIndex[day])
      .filter((dayIndex) => typeof dayIndex === "number"),
  );

  if (indices.size === 0) {
    return null;
  }

  let count = 0;
  for (let cursor = new Date(range.start); cursor <= range.end; cursor.setDate(cursor.getDate() + 1)) {
    if (indices.has(cursor.getDay())) {
      count += 1;
    }
  }

  return count;
}

function formatDispatchSummary(
  results: Array<{ employeeName: string; status: "sent" | "skipped" | "failed"; message: string }>,
): string {
  if (results.length === 0) {
    return "No payslip emails were dispatched.";
  }

  const sentCount = results.filter((item) => item.status === "sent").length;
  const skippedCount = results.filter((item) => item.status === "skipped").length;
  const failedCount = results.filter((item) => item.status === "failed").length;
  const lead = `${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed.`;
  const firstFailure = results.find((item) => item.status === "failed");

  return firstFailure ? `${lead} First failure: ${firstFailure.employeeName} - ${firstFailure.message}` : lead;
}

export function PayrollPage() {
  const recordsHook = useApi(useCallback(() => hrService.getPayrollRecords(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const leavesHook = useApi(useCallback(() => hrService.getLeaveRequests(), []));
  const settingsHook = useApi(useCallback(() => hrService.getSettings(), []));
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"status" | "delete" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const leaveSummary = useMemo(() => {
    if (!formState.month || (!formState.employeeId && !formState.employeeName)) {
      return null;
    }

    const range = getMonthRange(formState.month);
    if (!range || !leavesHook.data) {
      return null;
    }

    let eligibleDays = 0;
    let compensatedDays = 0;

    leavesHook.data.forEach((leave) => {
      const matchesEmployee = formState.employeeId
        ? leave.employeeId === formState.employeeId
        : leave.employeeName === formState.employeeName;
      if (!matchesEmployee || leave.status !== "approved") {
        return;
      }

      const overlapDays = countOverlapDays(leave.startDate, leave.endDate, range.start, range.end);
      if (overlapDays <= 0) {
        return;
      }

      if (leave.compensated) {
        compensatedDays += overlapDays;
      } else {
        eligibleDays += overlapDays;
      }
    });

    const workingDaysInMonth = getWorkingDaysInMonth(formState.month, settingsHook.data?.workingDays);
    const baseSalary = Number(formState.baseSalary) || 0;
    const divisor = workingDaysInMonth && workingDaysInMonth > 0 ? workingDaysInMonth : 30;
    const perDayRate = divisor > 0 ? baseSalary / divisor : 0;
    const chargeableDays = Math.max(eligibleDays - 1, 0);
    const deduction = eligibleDays > 1 ? perDayRate * chargeableDays : 0;

    return {
      eligibleDays,
      compensatedDays,
      totalDays: eligibleDays + compensatedDays,
      chargeableDays,
      perDayRate,
      deduction,
      workingDaysInMonth: workingDaysInMonth ?? 0,
    };
  }, [formState.baseSalary, formState.employeeId, formState.employeeName, formState.month, leavesHook.data, settingsHook.data?.workingDays]);

  const computedDeductions = useMemo(
    () => (leaveSummary ? Number(leaveSummary.deduction.toFixed(2)) : 0),
    [leaveSummary],
  );

  const leaveDeductionNote = useMemo(() => {
    if (leavesHook.loading) {
      return "Calculating leave-based deductions...";
    }

    if (!formState.employeeId && !formState.employeeName) {
      return "Select an employee to calculate leave deductions.";
    }

    if (!formState.month) {
      return "Select a payroll month to calculate leave deductions.";
    }

    if (!leaveSummary) {
      return "No leave data available for this selection.";
    }

    if (leaveSummary.totalDays === 0) {
      return "No approved leave days in this month.";
    }

    const compensatedText = leaveSummary.compensatedDays > 0 ? `${leaveSummary.compensatedDays} compensated` : "0 compensated";
    return `${leaveSummary.eligibleDays} eligible day(s), ${compensatedText}. Deductions apply after the first eligible day.`;
  }, [formState.employeeId, formState.employeeName, formState.month, leaveSummary, leavesHook.loading]);

  useEffect(() => {
    setFormState((current) => (current.deductions === computedDeductions ? current : { ...current, deductions: computedDeductions }));
  }, [computedDeductions]);

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

  const handleDispatchPayslip = async (record: PayrollRecord) => {
    setUpdatingPayrollId(record.id);
    setUpdateError(null);
    setActionMessage(null);

    try {
      const dispatch = await hrService.dispatchPayrollPayslip(record.id);
      setActionMessage(
        dispatch.status === "failed"
          ? `Payslip delivery failed for ${record.employeeName}: ${dispatch.message}`
          : `Payslip update for ${record.employeeName}: ${dispatch.message}`,
      );
      await recordsHook.refetch();
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to send payslip.");
    } finally {
      setUpdatingPayrollId(null);
    }
  };

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

  const dispatchProcessedPayrolls = async (recordsToDispatch: PayrollRecord[]) => {
    if (recordsToDispatch.length === 0) {
      return;
    }

    const results = await Promise.all(
      recordsToDispatch.map(async (record) => {
        try {
          const dispatch = await hrService.dispatchPayrollPayslip(record.id);
          return {
            employeeName: record.employeeName,
            status: dispatch.status,
            message: dispatch.message,
          };
        } catch (error) {
          return {
            employeeName: record.employeeName,
            status: "failed" as const,
            message: error instanceof Error ? error.message : "Unable to send payslip.",
          };
        }
      }),
    );

    setActionMessage(`Payslip dispatch complete. ${formatDispatchSummary(results)}`);
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
      key: "payslip",
      header: "Payslip",
      render: (row) => (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">
                {row.payslipSentAt ? formatDate(row.payslipSentAt) : row.status === "processed" ? "Ready to send" : "Pending completion"}
              </p>
              <p className="text-xs text-slate-500">{row.payslipFileName ?? "No salary slip emailed yet."}</p>
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
            <option value="processed">Completed</option>
          </select>
          <button type="button" onClick={() => void handleDuplicateRecord(row)} className="btn-secondary px-3 py-2">
            Next cycle
          </button>
          {row.status === "processed" ? (
            <button
              type="button"
              onClick={() => void handleDispatchPayslip(row)}
              disabled={updatingPayrollId === row.id}
              className="btn-secondary px-3 py-2"
            >
              <Mail className="h-4 w-4" />
              {updatingPayrollId === row.id ? "Sending..." : row.payslipSentAt ? "Resend slip" : "Send slip"}
            </button>
          ) : null}
          <button type="button" onClick={() => void handleDeleteRecord(row.id, row.employeeName)} className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-700 transition hover:bg-rose-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleEmployeeSelect = (employeeId: string) => {
    setActionMessage(null);
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
    setActionMessage(null);
    setFormState((current) => ({
      ...current,
      [field]: ["baseSalary", "bonus", "deductions"].includes(field) ? Number(value) : value,
    }));
  };

  async function handleStatusChange(id: string, status: PayrollStatus) {
    setUpdatingPayrollId(id);
    setUpdateError(null);
    setActionMessage(null);

    try {
      const updatedRecord = await hrService.updatePayrollStatus(id, status);
      if (status === "processed") {
        const dispatch = await hrService.dispatchPayrollPayslip(id);
        setActionMessage(
          dispatch.status === "failed"
            ? `Payroll completed for ${updatedRecord.employeeName}, but payslip delivery failed: ${dispatch.message}`
            : `Payroll completed for ${updatedRecord.employeeName}. ${dispatch.message}`,
        );
      } else {
        setActionMessage(`Payroll moved to ${status} for ${updatedRecord.employeeName}.`);
      }
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
    setActionMessage(null);

    try {
      const updatedRecords = await hrService.bulkUpdatePayrollStatus(selectedIds, status);
      if (status === "processed") {
        await dispatchProcessedPayrolls(updatedRecords);
      } else {
        setActionMessage(`${updatedRecords.length} payroll record(s) moved to ${status}.`);
      }
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
    setActionMessage(null);

    try {
      await hrService.deletePayrollRecord(id);
      await recordsHook.refetch();
      setActionMessage(`Payroll record removed for ${employeeName}.`);
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
    setActionMessage(null);

    try {
      await hrService.bulkDeletePayrollRecords(selectedIds);
      setSelectedIds([]);
      await recordsHook.refetch();
      setActionMessage("Selected payroll records deleted.");
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
    setActionMessage(null);

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
      setActionMessage(`Next cycle draft created for ${record.employeeName} (${nextMonth}).`);
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
    setActionMessage(null);

    try {
      const createdRecord = await hrService.createPayrollRecord({
        ...formState,
        month: formatMonthLabel(formState.month),
      });
      setFormState(initialPayrollForm);
      if (createdRecord.status === "processed") {
        const dispatch = await hrService.dispatchPayrollPayslip(createdRecord.id);
        setActionMessage(
          dispatch.status === "failed"
            ? `Payroll record created for ${createdRecord.employeeName}, but payslip delivery failed: ${dispatch.message}`
            : `Payroll record created for ${createdRecord.employeeName}. ${dispatch.message}`,
        );
      } else {
        setActionMessage("Payroll record created.");
      }
      setFormMessage(null);
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

      {actionMessage ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visible net pay" value={formatCurrency(summary.totalNetPay)} hint="Current register scope" icon={Wallet} accent />
        <StatCard title="Average payout" value={formatCurrency(averageNetPay)} hint="Per record in active view" icon={BadgeDollarSign} accent />
        <StatCard title="Scheduled exposure" value={formatCurrency(summary.scheduledExposure)} hint="Awaiting finance close" icon={Clock3} accent />
        <StatCard title="Deduction rate" value={`${deductionRate.toFixed(1)}%`} hint="Of gross visible payout" icon={ReceiptText} accent />
      </div>

      <SectionCard
        title="Payroll controls"
        subtitle="Move between period review, payout state, and deduction-focused analysis without leaving the register"
        collapsible
        defaultCollapsed
      >
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
            <option value="processed">Completed</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { id: "all", label: "All register" },
            { id: "scheduled", label: "Scheduled queue" },
            { id: "processed", label: "Completed archive" },
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
                Set completed
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
        {downloadNotice ? (
          <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">{downloadNotice}</p>
        ) : null}
        {downloadError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{downloadError}</p> : null}
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
            collapsible
            defaultCollapsed
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
                <input type="number" min="0" value={formState.deductions} placeholder="Deductions" className="input-surface w-full" required readOnly />
              </div>
              <p className="text-xs font-medium text-slate-500">{leaveDeductionNote}</p>
              <select value={formState.status} onChange={(event) => handleFormChange("status", event.target.value)} className="input-surface w-full">
                <option value="scheduled">Scheduled</option>
                <option value="processed">Completed</option>
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
