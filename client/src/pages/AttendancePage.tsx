import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  CheckCheck,
  ClockAlert,
  Download,
  RotateCcw,
  Search,
  TimerReset,
  UserRoundCheck,
  X,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
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
  if (Number.isNaN(anchor.valueOf())) return [getLocalDateKey()];
  if (rangeMode === "day") return [anchorDate];
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() - (6 - index));
    return getLocalDateKey(next);
  });
}

function isExceptionRecord(record: AttendanceRecord): boolean {
  return record.status === "late" || record.status === "absent" || record.checkOut === "--";
}

function formatMinutes(value: number): string {
  if (!value || value <= 0) return "--";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function AttendancePage() {
  const recordsHook = useApi(useCallback(() => hrService.getAttendanceRecords(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(getLocalDateKey());
  const [rangeMode, setRangeMode] = useState<RangeMode>("day");
  const [focusMode, setFocusMode] = useState<FocusMode>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editState, setEditState] = useState<UpdateAttendanceRecordPayload>(initialEditForm);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const didAutoSetDate = useRef(false);

  const employeeDepartmentMap = useMemo(() => new Map((employeesHook.data ?? []).map((e) => [e.id, e.department])), [employeesHook.data]);
  const dateWindow = useMemo(() => getDateWindow(dateFilter, rangeMode), [dateFilter, rangeMode]);
  const dateSet = useMemo(() => new Set(dateWindow), [dateWindow]);

  const filteredRecords = useMemo(() => {
    const rows = recordsHook.data ?? [];
    return rows.filter((row) => {
      const department = employeeDepartmentMap.get(row.employeeId) ?? "";
      const matchesSearch = search.trim() ? [row.employeeName, department].join(" ").toLowerCase().includes(search.trim().toLowerCase()) : true;
      const matchesStatus = statusFilter ? row.status === statusFilter : true;
      const matchesDate = dateSet.has(row.date);
      let matchesFocus = true;
      if (focusMode === "exceptions") matchesFocus = isExceptionRecord(row);
      else if (focusMode === "remote") matchesFocus = row.status === "remote";
      return matchesSearch && matchesStatus && matchesDate && matchesFocus;
    });
  }, [dateSet, employeeDepartmentMap, focusMode, recordsHook.data, search, statusFilter]);

  useEffect(() => {
    const visibleIds = new Set(filteredRecords.map((r) => r.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredRecords]);

  useEffect(() => {
    if (didAutoSetDate.current) return;
    const rows = recordsHook.data ?? [];
    if (rows.length === 0 || rangeMode !== "day" || dateFilter !== getLocalDateKey()) return;
    const hasToday = rows.some((row) => row.date === dateFilter);
    if (!hasToday && rows[0]?.date) setDateFilter(rows[0].date);
    didAutoSetDate.current = true;
  }, [dateFilter, rangeMode, recordsHook.data]);

  const summary = useMemo(() => filteredRecords.reduce((acc, record) => {
    acc[record.status] += 1;
    if (record.checkOut === "--") acc.missingCheckout += 1;
    return acc;
  }, { present: 0, late: 0, remote: 0, absent: 0, missingCheckout: 0 }), [filteredRecords]);

  const total = summary.present + summary.late + summary.remote + summary.absent;
  const presenceRate = ((summary.present + summary.remote) / Math.max(total, 1)) * 100;

  const exceptionRecords = useMemo(() => filteredRecords.filter(isExceptionRecord), [filteredRecords]);

  const selectedRecord = useMemo(() => 
    (recordsHook.data ?? []).find((r) => r.id === selectedRecordId) ?? null,
  [recordsHook.data, selectedRecordId]);

  useEffect(() => {
    if (!selectedRecord) return;
    setEditState({ checkIn: selectedRecord.checkIn, checkOut: selectedRecord.checkOut, status: selectedRecord.status });
  }, [selectedRecord]);

  const handleCorrect = (recordId: string) => {
    setSelectedRecordId(recordId);
    setShowCorrectionModal(true);
    setUpdateMessage(null);
    setUpdateError(null);
  };

  const handleUpdate = async () => {
    if (!selectedRecord) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await hrService.updateAttendanceRecord(selectedRecord.id, editState);
      await recordsHook.refetch();
      setUpdateMessage(`Saved.`);
      setTimeout(() => setShowCorrectionModal(false), 800);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkStatus = async (status: AttendanceStatus) => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      await hrService.bulkUpdateAttendanceStatus(selectedIds, status);
      setSelectedIds([]);
      await recordsHook.refetch();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Bulk update failed.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const applyCorrectionPreset = (preset: "office" | "remote" | "missed_checkout" | "absent") => {
    if (preset === "office") setEditState({ checkIn: "09:00", checkOut: "18:00", status: "present" });
    else if (preset === "remote") setEditState({ checkIn: "09:30", checkOut: "18:30", status: "remote" });
    else if (preset === "missed_checkout") setEditState((c) => ({ ...c, checkOut: "--" }));
    else setEditState({ checkIn: "--", checkOut: "--", status: "absent" });
  };

  const handleExportVisible = () => {
    downloadCsv(`attendance-${dateFilter}.csv`, [
      ["Employee", "Department", "Date", "Check In", "Check Out", "Status"],
      ...filteredRecords.map((r) => [r.employeeName, employeeDepartmentMap.get(r.employeeId) ?? "Unassigned", r.date, r.checkIn, r.checkOut, r.status]),
    ]);
  };

  const columns: Array<TableColumn<AttendanceRecord>> = [
    {
      key: "select",
      header: <input type="checkbox" checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length} onChange={() => setSelectedIds(selectedIds.length === filteredRecords.length ? [] : filteredRecords.map(r => r.id))} className="h-4 w-4 accent-white" title="Select All" />,
      headerClassName: "w-10",
      cellClassName: "w-10",
      render: (row) => <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => setSelectedIds(c => c.includes(row.id) ? c.filter(id => id !== row.id) : [...c, row.id])} className="h-4 w-4 accent-brand-700" title={`Select ${row.employeeName}`} />,
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.employeeName}</p>
          <p className="text-[0.65rem] font-black uppercase text-slate-400">{employeeDepartmentMap.get(row.employeeId) ?? "Operations"}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (r) => <span className="text-xs font-bold text-slate-500">{formatDate(r.date)}</span> },
    { key: "check-in", header: "Check In", render: (r) => <span className="font-black text-slate-700">{r.checkIn}</span> },
    { key: "check-out", header: "Check Out", render: (r) => <span className="font-black text-slate-700">{r.checkOut}</span> },
    { key: "time", header: "Hours", render: (r) => <span className="font-bold text-slate-500">{formatMinutes(r.timeOnSystemMinutes)}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button type="button" onClick={() => handleCorrect(row.id)} className="btn-secondary px-2.5 py-1.5 text-xs">
          Correct
        </button>
      ),
    },
  ];

  const hasActiveFilters = Boolean(search || statusFilter || dateFilter !== getLocalDateKey() || rangeMode !== "day" || focusMode !== "all");

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Review presence and handle exceptions."
        eyebrow="Operations"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={handleExportVisible} disabled={filteredRecords.length === 0} className="btn-secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Presence Rate" value={formatPercent(presenceRate)} hint="Present + Remote" icon={UserRoundCheck} accent />
        <StatCard title="Active Views" value={String(filteredRecords.length)} hint="Total visible logs" icon={CalendarDays} />
        <StatCard title="Total Exceptions" value={String(exceptionRecords.length)} hint="Late or absent" icon={ClockAlert} />
        <StatCard title="Missing Out" value={String(summary.missingCheckout)} hint="Pending same-day lock" icon={AlarmClock} />
      </div>

      <div className="sticky top-[72px] z-10 -mx-4 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-slate-200/60 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or department..." className="input-surface w-full pl-10 h-10" />
          </div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-surface h-10 text-xs font-bold" title="Filter by Date" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-surface h-10 text-xs font-bold" title="Filter by Status">
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="remote">Remote</option>
            <option value="absent">Absent</option>
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setDateFilter(getLocalDateKey()); setRangeMode("day"); setFocusMode("all"); }} className="btn-secondary h-10 px-3" title="Reset Filters">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            className="btn-secondary h-10 px-3"
          >
            {showAdvancedFilters ? "Less filters" : "More filters"}
          </button>
        </div>
        {showAdvancedFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[{ id: "day", label: "Single Day" }, { id: "week", label: "7-Day Window" }].map((item) => (
              <button key={item.id} onClick={() => setRangeMode(item.id as RangeMode)} className={`rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider transition ${rangeMode === item.id ? 'bg-brand-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item.label}</button>
            ))}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            {[{ id: "all", label: "All Logs" }, { id: "exceptions", label: "Exceptions Only" }, { id: "remote", label: "Remote Only" }].map((item) => (
              <button key={item.id} onClick={() => setFocusMode(item.id as FocusMode)} className={`rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider transition ${focusMode === item.id ? 'bg-brand-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item.label}</button>
            ))}
          </div>
        ) : null}
      </div>

      <SectionCard 
        title="Registry" 
        rightSlot={
          <div className="flex items-center gap-2">
            <span className="insight-pill">{filteredRecords.length} records</span>
            <button onClick={() => setSelectedIds(exceptionRecords.map(r => r.id))} disabled={exceptionRecords.length === 0} className="btn-secondary text-xs h-8">
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Select Exceptions
            </button>
          </div>
        }
      >
        {selectedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-brand-50 border border-brand-100 rounded-xl animate-page-enter">
            <span className="text-xs font-black text-brand-800 uppercase tracking-widest mr-2">{selectedIds.length} selected</span>
            { (["present", "late", "remote", "absent"] as AttendanceStatus[]).map(s => (
              <button key={s} onClick={() => handleBulkStatus(s)} disabled={bulkUpdating} className="btn-secondary h-8 px-3 text-[0.65rem] uppercase font-black tracking-widest">{s}</button>
            ))}
            <button onClick={() => setSelectedIds([])} className="ml-auto text-[0.65rem] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 px-2">Clear</button>
          </div>
        )}
        {bulkError && <p className="mb-3 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">{bulkError}</p>}
        {recordsHook.loading && <p className="text-sm font-bold text-brand-600 animate-pulse">Syncing Registry...</p>}
        
        <DataTable
          columns={columns}
          rows={filteredRecords}
          rowKey={(r) => r.id}
          exportFileName="attendance"
          rowClassName={(r) => selectedIds.includes(r.id) ? "!bg-brand-50/50" : isExceptionRecord(r) ? "bg-amber-50/30" : ""}
        />
      </SectionCard>

      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-page-enter">
          <div className="w-full max-w-lg bg-white rounded-[32px] shadow-panel overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Correct Record</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">{selectedRecord.employeeName} · {formatDate(selectedRecord.date)}</p>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-slate-200" title="Close">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-2">
                 {(["office", "remote", "missed_checkout", "absent"] as const).map(p => (
                   <button key={p} onClick={() => applyCorrectionPreset(p)} className="btn-secondary text-[0.6rem] font-black uppercase tracking-widest py-2.5">
                     {p.replace("_", " ")}
                   </button>
                 ))}
               </div>

               <div className="space-y-4">
                 <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-1">
                       <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
                       <select value={editState.status} onChange={(e) => setEditState(c => ({ ...c, status: e.target.value as AttendanceStatus }))} className="input-surface w-full h-10 px-2" title="Select Status">
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="remote">Remote</option>
                          <option value="absent">Absent</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Dept</label>
                       <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
                         {employeeDepartmentMap.get(selectedRecord.employeeId) ?? "Operations"}
                       </div>
                    </div>
                 </div>

                 <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-1">
                       <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Check In</label>
                       <input value={editState.checkIn} onChange={(e) => setEditState(c => ({ ...c, checkIn: e.target.value }))} className="input-surface w-full h-10" placeholder="00:00 or --" title="Check In" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Check Out</label>
                       <input value={editState.checkOut} onChange={(e) => setEditState(c => ({ ...c, checkOut: e.target.value }))} className="input-surface w-full h-10" placeholder="00:00 or --" title="Check Out" />
                    </div>
                 </div>
               </div>

               {updateError && <p className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold">{updateError}</p>}
               {updateMessage && <p className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold">{updateMessage}</p>}

               <button type="button" onClick={() => void handleUpdate()} disabled={updating} className="btn-primary w-full h-12 shadow-lg">
                 <TimerReset className="h-4 w-4" />
                 {updating ? "Processing..." : "Finalise Correction"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
