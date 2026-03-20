import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  CheckCheck,
  ClockAlert,
  Download,
  PencilLine,
  RotateCcw,
  TimerReset,
  UserRoundCheck,
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
import type { AttendanceRecord, AttendanceStatus, UpdateAttendanceRecordPayload } from "../types/hr";
import { formatDate, formatPercent, getLocalDateKey } from "../utils/formatters";
import { downloadCsv } from "../utils/fileExport";

const initialEditForm: UpdateAttendanceRecordPayload = {
  checkIn: "--",
  checkOut: "--",
  status: "present",
};

type RangeMode = "day" | "week";
type FocusMode = "all" | "exceptions" | "remote";

function getDateWindow(anchorDate: string, rangeMode: RangeMode): string[] {
  const anchor = new Date(`${anchorDate}T00:00:00`);
  if (Number.isNaN(anchor.valueOf())) {
    return [getLocalDateKey()];
  }

  if (rangeMode === "day") {
    return [anchorDate];
  }

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() - (6 - index));
    return getLocalDateKey(next);
  });
}

function isExceptionRecord(record: AttendanceRecord): boolean {
  return record.status === "late" || record.status === "absent" || record.checkOut === "--";
}

export function AttendancePage() {
  const recordsHook = useApi(useCallback(() => hrService.getAttendanceRecords(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(getLocalDateKey());
  const [rangeMode, setRangeMode] = useState<RangeMode>("day");
  const [focusMode, setFocusMode] = useState<FocusMode>("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editState, setEditState] = useState<UpdateAttendanceRecordPayload>(initialEditForm);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const employeeDepartmentMap = useMemo(
    () =>
      new Map((employeesHook.data ?? []).map((employee) => [employee.id, employee.department])),
    [employeesHook.data],
  );

  const dateWindow = useMemo(() => getDateWindow(dateFilter, rangeMode), [dateFilter, rangeMode]);
  const dateSet = useMemo(() => new Set(dateWindow), [dateWindow]);

  const filteredRecords = useMemo(() => {
    const rows = recordsHook.data ?? [];
    return rows.filter((row) => {
      const department = employeeDepartmentMap.get(row.employeeId) ?? "";
      const matchesSearch = search.trim()
        ? [row.employeeName, department]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        : true;
      const matchesStatus = statusFilter ? row.status === statusFilter : true;
      const matchesDate = dateSet.has(row.date);

      let matchesFocus = true;
      if (focusMode === "exceptions") {
        matchesFocus = isExceptionRecord(row);
      } else if (focusMode === "remote") {
        matchesFocus = row.status === "remote";
      }

      return matchesSearch && matchesStatus && matchesDate && matchesFocus;
    });
  }, [dateSet, employeeDepartmentMap, focusMode, recordsHook.data, search, statusFilter]);

  useEffect(() => {
    const visibleIds = new Set(filteredRecords.map((record) => record.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredRecords]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        acc[record.status] += 1;
        if (record.checkOut === "--") {
          acc.missingCheckout += 1;
        }
        return acc;
      },
      { present: 0, late: 0, remote: 0, absent: 0, missingCheckout: 0 },
    );
  }, [filteredRecords]);

  const total = summary.present + summary.late + summary.remote + summary.absent;
  const presenceRate = ((summary.present + summary.remote) / Math.max(total, 1)) * 100;
  const uniqueEmployees = new Set(filteredRecords.map((record) => record.employeeId)).size;

  const exceptionQueue = useMemo(() => {
    return filteredRecords
      .filter((record) => isExceptionRecord(record))
      .sort((left, right) => {
        const rank = (record: AttendanceRecord) => {
          if (record.status === "absent") {
            return 3;
          }
          if (record.status === "late") {
            return 2;
          }
          if (record.checkOut === "--") {
            return 1;
          }
          return 0;
        };

        return rank(right) - rank(left) || right.date.localeCompare(left.date);
      })
      .slice(0, 6);
  }, [filteredRecords]);

  const selectedRecord = useMemo(
    () =>
      filteredRecords.find((record) => record.id === selectedRecordId) ??
      (recordsHook.data ?? []).find((record) => record.id === selectedRecordId) ??
      null,
    [filteredRecords, recordsHook.data, selectedRecordId],
  );

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    setEditState({
      checkIn: selectedRecord.checkIn,
      checkOut: selectedRecord.checkOut,
      status: selectedRecord.status,
    });
  }, [selectedRecord]);

  const allVisibleSelected = filteredRecords.length > 0 && selectedIds.length === filteredRecords.length;

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

  const handleSelectExceptions = () => {
    setSelectedIds(exceptionQueue.map((record) => record.id));
  };

  const columns: Array<TableColumn<AttendanceRecord>> = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={toggleSelectAll}
          aria-label="Select all attendance records"
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
          aria-label={`Select ${row.employeeName}`}
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
          <p className="text-xs text-slate-500">{employeeDepartmentMap.get(row.employeeId) ?? "Unassigned department"}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "check-in", header: "Check In", render: (row) => row.checkIn },
    { key: "check-out", header: "Check Out", render: (row) => row.checkOut },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button type="button" onClick={() => setSelectedRecordId(row.id)} className="btn-secondary px-3 py-2">
          <PencilLine className="h-4 w-4" />
          Correct
        </button>
      ),
    },
  ];

  const handleUpdate = async () => {
    if (!selectedRecord) {
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    setUpdateMessage(null);

    try {
      await hrService.updateAttendanceRecord(selectedRecord.id, editState);
      await recordsHook.refetch();
      setUpdateMessage(`Attendance correction saved for ${selectedRecord.employeeName}.`);
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to update attendance record.");
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkStatus = async (status: AttendanceStatus) => {
    if (selectedIds.length === 0) {
      return;
    }

    setBulkUpdating(true);
    setBulkError(null);

    try {
      await hrService.bulkUpdateAttendanceStatus(selectedIds, status);
      setSelectedIds([]);
      await recordsHook.refetch();
    } catch (issue) {
      setBulkError(issue instanceof Error ? issue.message : "Unable to bulk update attendance.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const applyCorrectionPreset = (preset: "office" | "remote" | "missed_checkout" | "absent") => {
    if (preset === "office") {
      setEditState({ checkIn: "09:00", checkOut: "18:00", status: "present" });
      return;
    }

    if (preset === "remote") {
      setEditState({ checkIn: "09:30", checkOut: "18:30", status: "remote" });
      return;
    }

    if (preset === "missed_checkout") {
      setEditState((current) => ({ ...current, checkOut: "--" }));
      return;
    }

    setEditState({ checkIn: "--", checkOut: "--", status: "absent" });
  };

  const handleExportVisible = () => {
    downloadCsv(
      `attendance-${dateFilter}-${rangeMode}.csv`,
      [
        ["Employee", "Department", "Date", "Check In", "Check Out", "Status"],
        ...filteredRecords.map((record) => [
          record.employeeName,
          employeeDepartmentMap.get(record.employeeId) ?? "Unassigned",
          record.date,
          record.checkIn,
          record.checkOut,
          record.status,
        ]),
      ],
    );
  };

  const hasActiveFilters = Boolean(
    search ||
      statusFilter ||
      dateFilter !== getLocalDateKey() ||
      rangeMode !== "day" ||
      focusMode !== "all",
  );

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Run the attendance register as an exception workflow: shift between day and week views, isolate risk, bulk-correct records, and export the active queue."
        eyebrow="Workforce presence"
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
                  setStatusFilter("");
                  setDateFilter(getLocalDateKey());
                  setRangeMode("day");
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
        icon={UserRoundCheck}
        title="Attendance monitoring with exception-first admin controls"
        subtitle="The table is now backed by week-window review, saved focus modes, export, and quick correction presets so admins can work the queue instead of scanning rows manually."
        chips={["Day or week view", "Exception queue", "Bulk correction"]}
        spotlight={`${formatPercent(presenceRate)} presence quality`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Presence rate" value={formatPercent(presenceRate)} hint="Present + remote in active view" icon={UserRoundCheck} />
        <StatCard title="Visible people" value={String(uniqueEmployees)} hint="Unique employees in current view" icon={CalendarDays} />
        <StatCard title="Exceptions" value={String(exceptionQueue.length)} hint="Late, absent, or missing checkout" icon={ClockAlert} />
        <StatCard title="Missing checkout" value={String(summary.missingCheckout)} hint="Needs same-day cleanup" icon={AlarmClock} />
      </div>

      <SectionCard title="Review controls" subtitle="Filter by person, time window, and queue focus before you edit or export">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee or department"
            className="input-surface"
          />
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="input-surface" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-surface">
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="remote">Remote</option>
            <option value="absent">Absent</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([
            { id: "day", label: "Single day" },
            { id: "week", label: "7-day window" },
          ] as Array<{ id: RangeMode; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRangeMode(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                rangeMode === item.id ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          {([
            { id: "all", label: "All records" },
            { id: "exceptions", label: "Exceptions only" },
            { id: "remote", label: "Remote only" },
          ] as Array<{ id: FocusMode; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFocusMode(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                focusMode === item.id ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <SectionCard
          title="Daily records"
          subtitle="Attendance registry with selection, queue focus, and export-ready results"
          rightSlot={
            <div className="flex flex-wrap items-center gap-2">
              <span className="insight-pill">
                <TimerReset className="h-3.5 w-3.5" />
                {filteredRecords.length} visible
              </span>
              <button type="button" onClick={handleSelectExceptions} disabled={exceptionQueue.length === 0} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60">
                <CheckCheck className="h-4 w-4" />
                Select exceptions
              </button>
            </div>
          }
        >
          {selectedIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <span className="text-sm font-semibold text-brand-900">{selectedIds.length} selected</span>
              <button type="button" onClick={() => void handleBulkStatus("present")} disabled={bulkUpdating} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Mark present
              </button>
              <button type="button" onClick={() => void handleBulkStatus("late")} disabled={bulkUpdating} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Mark late
              </button>
              <button type="button" onClick={() => void handleBulkStatus("remote")} disabled={bulkUpdating} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Mark remote
              </button>
              <button type="button" onClick={() => void handleBulkStatus("absent")} disabled={bulkUpdating} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Mark absent
              </button>
              <button type="button" onClick={() => setSelectedIds([])} disabled={bulkUpdating} className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70">
                Clear selection
              </button>
            </div>
          ) : null}
          {bulkError ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{bulkError}</p> : null}
          {recordsHook.loading ? <p className="text-sm font-semibold text-slate-600">Loading records...</p> : null}
          {recordsHook.error ? <p className="text-sm font-semibold text-rose-700">{recordsHook.error}</p> : null}
          <DataTable
            columns={columns}
            rows={filteredRecords}
            rowKey={(row) => row.id}
            exportFileName="attendance"
            emptyText="No attendance records available for this filter."
            rowClassName={(row) => {
              if (selectedIds.includes(row.id)) {
                return "!bg-brand-100/80";
              }

              return isExceptionRecord(row) ? "bg-amber-50/55" : "";
            }}
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Exception queue" subtitle="Highest-risk rows in the current view, ordered by admin urgency">
            {exceptionQueue.length > 0 ? (
              <div className="space-y-3">
                {exceptionQueue.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedRecordId(record.id)}
                    className="flex w-full items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{record.employeeName}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatDate(record.date)} · {employeeDepartmentMap.get(record.employeeId) ?? "No department"}</p>
                    </div>
                    <StatusBadge value={record.status} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">No exceptions in the current working set.</p>
            )}
          </SectionCard>

          <SectionCard title="Correction studio" subtitle="Use presets to normalize common exceptions faster">
            {selectedRecord ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-950">{selectedRecord.employeeName}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(selectedRecord.date)} · {employeeDepartmentMap.get(selectedRecord.employeeId) ?? "No department"}</p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Correction presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => applyCorrectionPreset("office")} className="btn-secondary px-3 py-2">Office day</button>
                    <button type="button" onClick={() => applyCorrectionPreset("remote")} className="btn-secondary px-3 py-2">Remote day</button>
                    <button type="button" onClick={() => applyCorrectionPreset("missed_checkout")} className="btn-secondary px-3 py-2">Clear checkout</button>
                    <button type="button" onClick={() => applyCorrectionPreset("absent")} className="btn-secondary px-3 py-2">Mark absent</button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                    <select
                      value={editState.status}
                      onChange={(event) => setEditState((current) => ({ ...current, status: event.target.value as AttendanceStatus }))}
                      className="input-surface w-full"
                    >
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="remote">Remote</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                      {employeeDepartmentMap.get(selectedRecord.employeeId) ?? "Unassigned"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={editState.checkIn} onChange={(event) => setEditState((current) => ({ ...current, checkIn: event.target.value }))} placeholder="Check-in time or --" className="input-surface w-full" />
                  <input value={editState.checkOut} onChange={(event) => setEditState((current) => ({ ...current, checkOut: event.target.value }))} placeholder="Check-out time or --" className="input-surface w-full" />
                </div>

                {updateError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{updateError}</p> : null}
                {updateMessage ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{updateMessage}</p> : null}
                <button type="button" onClick={() => void handleUpdate()} disabled={updating} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                  <PencilLine className="h-4 w-4" />
                  {updating ? "Saving..." : "Save correction"}
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">Select a row from the table or exception queue to open the correction studio.</p>
            )}
          </SectionCard>
        </div>
      </div>

      
    </div>
  );
}
