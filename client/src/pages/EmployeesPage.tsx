import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Briefcase,
  ChevronUp,
  LayoutGrid,
  PencilLine,
  RotateCcw,
  Search,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
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
import type { Employee, NewEmployeePayload, UpdateEmployeePayload } from "../types/hr";
import { getInitials } from "../utils/formatters";
import {
  DEFAULT_SHIFT_APPROVAL_STATUS,
  DEFAULT_SHIFT_CODE,
  SHIFT_DEFINITIONS,
} from "../utils/shifts";

const initialForm: NewEmployeePayload = {
  name: "",
  email: "",
  role: "",
  department: "",
  location: "",
  joinDate: "",
  manager: "",
  status: "active",
  performanceScore: 80,
  shiftCode: null,
};

const initialEditForm: UpdateEmployeePayload = {
  role: "",
  department: "",
  location: "",
  manager: "",
  status: "active",
  performanceScore: 80,
  shiftCode: DEFAULT_SHIFT_CODE,
  shiftApprovalStatus: DEFAULT_SHIFT_APPROVAL_STATUS,
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type ViewPreset = "all" | "high_performers" | "attention" | "new_joiners";
type SortMode = "recent" | "performance" | "name" | "manager";

function getDaysSince(dateValue: string): number {
  const stamp = new Date(dateValue);
  if (Number.isNaN(stamp.valueOf())) return 0;
  return Math.max(Math.floor((Date.now() - stamp.valueOf()) / DAY_IN_MS), 0);
}

function getEmployeePriority(employee: Employee): "high" | "medium" | "normal" {
  if (employee.status === "inactive" || employee.performanceScore < 70) return "high";
  if (employee.status === "on_leave" || employee.performanceScore < 82) return "medium";
  return "normal";
}

function getRecommendation(employee: Employee): string {
  if (employee.status === "inactive") return "Confirm whether the profile should remain archived or be fully removed.";
  if (employee.status === "on_leave") return "Review coverage and check handoff readiness with the reporting manager.";
  if (employee.performanceScore < 70) return "Schedule a coaching checkpoint and align on a short recovery plan.";
  if (employee.performanceScore >= 92) return "Strong candidate for stretch assignments, promotion review, or mentorship.";
  return "Current assignment looks stable. Keep role, manager, and location aligned.";
}

export function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [viewPreset, setViewPreset] = useState<ViewPreset>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [managerFocus, setManagerFocus] = useState("");
  const [formState, setFormState] = useState<NewEmployeePayload>(initialForm);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editState, setEditState] = useState<UpdateEmployeePayload>(initialEditForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"archive" | "delete" | "status" | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data, loading, refetch } = useApi(useCallback(() => hrService.getEmployees(), []));

  const allEmployees = useMemo(() => data ?? [], [data]);
  const presetScopedEmployees = useMemo(() => {
    return allEmployees.filter((employee) => {
      const matchesSearch = search.trim()
        ? [employee.name, employee.email, employee.role, employee.manager]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        : true;
      const matchesStatus = status ? employee.status === status : true;
      const matchesManager = managerFocus ? employee.manager === managerFocus : true;

      let matchesPreset = true;
      if (viewPreset === "high_performers") {
        matchesPreset = employee.performanceScore >= 90;
      } else if (viewPreset === "attention") {
        matchesPreset = getEmployeePriority(employee) !== "normal";
      } else if (viewPreset === "new_joiners") {
        matchesPreset = getDaysSince(employee.joinDate) <= 45;
      }

      return matchesSearch && matchesStatus && matchesManager && matchesPreset;
    });
  }, [allEmployees, managerFocus, search, status, viewPreset]);

  const departments = useMemo(
    () => Array.from(new Set(presetScopedEmployees.map((employee) => employee.department))).sort((a, b) => a.localeCompare(b)),
    [presetScopedEmployees],
  );

  const filteredEmployees = useMemo(() => {
    const next = presetScopedEmployees.filter((employee) => (department ? employee.department === department : true));
    next.sort((left, right) => {
      if (sortMode === "performance") return right.performanceScore - left.performanceScore;
      if (sortMode === "name") return left.name.localeCompare(right.name);
      if (sortMode === "manager") return left.manager.localeCompare(right.manager) || left.name.localeCompare(right.name);
      return new Date(right.joinDate).valueOf() - new Date(left.joinDate).valueOf();
    });
    return next;
  }, [department, presetScopedEmployees, sortMode]);

  const selectedEmployee = useMemo(
    () => allEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [allEmployees, selectedEmployeeId],
  );

  useEffect(() => {
    if (!selectedEmployee) return;
    setEditState({
      role: selectedEmployee.role,
      department: selectedEmployee.department,
      location: selectedEmployee.location,
      manager: selectedEmployee.manager,
      status: selectedEmployee.status,
      performanceScore: selectedEmployee.performanceScore,
      shiftCode: selectedEmployee.shiftCode ?? DEFAULT_SHIFT_CODE,
      shiftApprovalStatus: selectedEmployee.shiftApprovalStatus ?? DEFAULT_SHIFT_APPROVAL_STATUS,
    });
  }, [selectedEmployee]);

  const stats = useMemo(() => {
    const averagePerformance = filteredEmployees.length > 0
        ? Math.round(filteredEmployees.reduce((sum, employee) => sum + employee.performanceScore, 0) / filteredEmployees.length)
        : 0;

    return {
      total: filteredEmployees.length,
      active: filteredEmployees.filter((employee) => employee.status === "active").length,
      recentJoiners: filteredEmployees.filter((employee) => getDaysSince(employee.joinDate) <= 45).length,
      attention: filteredEmployees.filter((employee) => getEmployeePriority(employee) !== "normal").length,
      averagePerformance,
    };
  }, [filteredEmployees]);

  const managerInsights = useMemo(() => {
    return Array.from(
      presetScopedEmployees.reduce((map, employee) => {
        const key = employee.manager || "Unassigned";
        const current = map.get(key) ?? { manager: key, count: 0, attention: 0, averagePerformance: 0 };
        current.count += 1;
        current.averagePerformance += employee.performanceScore;
        if (getEmployeePriority(employee) !== "normal") current.attention += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { manager: string; count: number; attention: number; averagePerformance: number }>()).values(),
    )
      .map((item) => ({ ...item, averagePerformance: Math.round(item.averagePerformance / Math.max(item.count, 1)) }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4);
  }, [presetScopedEmployees]);

  const columns: Array<TableColumn<Employee>> = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-[0.7rem] font-black text-brand-700">
            {getInitials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{row.name}</p>
            <p className="text-[0.65rem] text-slate-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "assignment",
      header: "Role / Dept",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-700 truncate">{row.role}</p>
          <p className="text-[0.65rem] font-black uppercase text-slate-400">{row.department}</p>
        </div>
      ),
    },
    { key: "manager", header: "Manager", render: (row) => <span className="font-bold text-slate-600">{row.manager}</span> },
    {
      key: "performance",
      header: "Performance",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-brand-700">{row.performanceScore}%</span>
          <div className="h-1.5 w-12 rounded-full bg-slate-100 hidden sm:block overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${row.performanceScore}%` }} />
          </div>
          {row.performanceScore >= 90 ? <Star className="h-3.5 w-3.5 text-amber-500 fill-current" /> : null}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button type="button" onClick={() => setSelectedEmployeeId(row.id)} className="btn-secondary px-2.5 py-1.5 text-xs">
          Manage
        </button>
      ),
    },
  ];

  const handleChange = (field: keyof NewEmployeePayload, value: string) => {
    const nextValue = field === "performanceScore" ? Number(value) : field === "shiftCode" ? value || null : value;
    setFormState((current) => ({ ...current, [field]: nextValue }));
  };

  const handleEditChange = (field: keyof UpdateEmployeePayload, value: string) => {
    const nextValue = field === "performanceScore" ? Number(value) : field === "shiftCode" ? value || null : value;
    setEditState((current) => ({
      ...current,
      [field]: nextValue,
      ...(field === "shiftCode" && selectedEmployee && nextValue !== (selectedEmployee.shiftCode ?? DEFAULT_SHIFT_CODE)
        ? { shiftApprovalStatus: DEFAULT_SHIFT_APPROVAL_STATUS }
        : {}),
    }));
  };

  const handleApplyStarterTemplate = () => {
    setFormState({
      ...initialForm,
      department: department || "Operations",
      location: "Remote",
      manager: managerFocus || "HR Admin",
      role: "Team Coordinator",
      joinDate: new Date().toISOString().slice(0, 10),
      status: "active",
      performanceScore: 78,
      shiftCode: DEFAULT_SHIFT_CODE,
    });
    setSubmitError(null);
    setActionMessage("Starter template loaded.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    if (!formState.shiftCode) {
      setSubmitError("Select a shift.");
      setSubmitting(false);
      return;
    }
    try {
      await hrService.createEmployee(formState);
      setFormState(initialForm);
      await refetch();
      setActionMessage(`Employee created.`);
      setShowAddModal(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to add employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    setUpdating(true);
    try {
      await hrService.updateEmployee(selectedEmployee.id, editState);
      await refetch();
      setActionMessage("Updated.");
    } catch {
      // Ignore
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatusAction = async (nextStatus: Employee["status"]) => {
    if (!selectedEmployee) return;
    setActionLoading("status");
    try {
      await hrService.updateEmployee(selectedEmployee.id, { ...editState, status: nextStatus });
      await refetch();
      setEditState((c) => ({ ...c, status: nextStatus }));
      setActionMessage(`Moved to ${nextStatus}.`);
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee || !window.confirm(`Delete ${selectedEmployee.name}?`)) return;
    setActionLoading("delete");
    try {
      await hrService.deleteEmployee(selectedEmployee.id);
      setSelectedEmployeeId(null);
      await refetch();
      setActionMessage("Deleted.");
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  const hasActiveFilters = Boolean(search || department || status || managerFocus || viewPreset !== "all" || sortMode !== "recent");

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Manage workforce and performance."
        eyebrow="Talent"
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowStats(!showStats)} className="btn-secondary" title="Toggle Signals">
              {showStats ? <ChevronUp className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {showStats ? "Hide Signals" : "Show Signals"}
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary" title="Add New Employee">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        }
      />

      {showStats ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Headcount" value={String(stats.total)} hint="Visible working set" icon={Users} accent />
            <StatCard title="Active" value={String(stats.active)} hint="Ready for allocation" icon={UserCheck} />
            <StatCard title="Avg Score" value={`${stats.averagePerformance}%`} hint="Performance health" icon={Star} />
            <StatCard title="Attention" value={String(stats.attention)} hint="Lifecycle follow-ups" icon={Activity} />
          </div>

          <SectionCard title="Manager Review Load" subtitle="Team distribution and focus areas">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {managerInsights.map((m) => {
                const active = managerFocus === m.manager;
                const ratio = Math.round((m.attention / Math.max(m.count, 1)) * 100);
                return (
                  <button
                    key={m.manager}
                    type="button"
                    onClick={() => setManagerFocus(active ? "" : m.manager)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      active ? "border-brand-300 bg-brand-50/50 ring-2 ring-brand-100" : "border-slate-100 bg-white hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-400">{m.manager}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">{m.count}</p>
                    <div className="mt-3 flex items-center justify-between text-[0.65rem] font-bold text-slate-500">
                      <span>{m.averagePerformance}% Score</span>
                      <span className={ratio > 20 ? "text-amber-600" : ""}>{ratio}% Attention</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}

      <div className="sticky top-[72px] z-10 -mx-4 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-slate-200/60 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, email, role..."
              className="input-surface w-full pl-10 h-10"
            />
          </div>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="input-surface h-10 text-xs font-bold" title="Sort order">
            <option value="recent">Sort: Newest</option>
            <option value="performance">Sort: Performance</option>
            <option value="name">Sort: A-Z</option>
            <option value="manager">Sort: Manager</option>
          </select>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            className="btn-secondary h-10 px-3"
          >
            {showAdvancedFilters ? "Less filters" : "More filters"}
          </button>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setDepartment(""); setStatus(""); setViewPreset("all"); setManagerFocus(""); setSortMode("recent"); }} className="btn-secondary h-10 px-3" title="Reset Filters">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        {showAdvancedFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input-surface h-10 text-xs font-bold" title="Filter by Department">
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-surface h-10 text-xs font-bold" title="Filter by Status">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
            {[
              { id: "all", label: "All People" },
              { id: "high_performers", label: "High Performers" },
              { id: "attention", label: "Needs Attention" },
              { id: "new_joiners", label: "Recent Joiners" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setViewPreset(p.id as ViewPreset)}
                className={`rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider transition ${
                  viewPreset === p.id ? "bg-brand-700 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`grid gap-6 transition-all duration-300 ${selectedEmployeeId ? 'lg:grid-cols-[1fr_400px]' : 'grid-cols-1'}`}>
        <SectionCard title="Employee Directory" rightSlot={<span className="insight-pill">{filteredEmployees.length} profiles</span>}>
          {loading && <p className="text-sm font-bold text-brand-600">Syncing...</p>}
          {actionMessage && <p className="mb-4 text-xs font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">{actionMessage}</p>}
          <DataTable
            columns={columns}
            rows={filteredEmployees}
            rowKey={(r) => r.id}
            exportFileName="employees"
            rowClassName={(r) => r.id === selectedEmployeeId ? "!bg-brand-50/80 ring-1 ring-brand-200 ring-inset" : ""}
          />
        </SectionCard>

        {selectedEmployee && (
          <aside className="lg:sticky lg:top-40 h-fit space-y-6 animate-page-enter">
            <SectionCard 
              title="Profile Editor" 
              rightSlot={
                <button onClick={() => setSelectedEmployeeId(null)} className="p-1 hover:bg-slate-100 rounded-lg transition" title="Close editor">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              }
            >
              <form onSubmit={handleUpdate} className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                   <span className="h-12 w-12 flex items-center justify-center rounded-full bg-white border border-slate-200 text-sm font-black text-brand-700 shadow-sm">
                      {getInitials(selectedEmployee.name)}
                   </span>
                   <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">{selectedEmployee.name}</p>
                      <p className="text-xs font-bold text-slate-500 truncate">{selectedEmployee.email}</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["active", "on_leave", "inactive"] as Employee["status"][]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void handleQuickStatusAction(s)}
                      disabled={actionLoading !== null}
                      className={`rounded-lg border py-2 text-[0.65rem] font-black uppercase tracking-widest transition ${
                        editState.status === s ? "border-brand-600 bg-brand-50 text-brand-700 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Role</label>
                    <input value={editState.role} onChange={(e) => handleEditChange("role", e.target.value)} className="input-surface w-full h-9" placeholder="Role" title="Role" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Dept</label>
                    <input value={editState.department} onChange={(e) => handleEditChange("department", e.target.value)} className="input-surface w-full h-9" placeholder="Department" title="Department" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                   <div className="space-y-1">
                    <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Shift</label>
                    <select value={editState.shiftCode ?? ""} onChange={(e) => handleEditChange("shiftCode", e.target.value)} className="input-surface w-full h-9 px-2" title="Select Shift">
                      {SHIFT_DEFINITIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Approval</label>
                    <select value={editState.shiftApprovalStatus} onChange={(e) => handleEditChange("shiftApprovalStatus", e.target.value)} className="input-surface w-full h-9 px-2" title="Shift Approval">
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Performance</label>
                    <span className="text-xs font-black text-brand-700">{editState.performanceScore}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={editState.performanceScore} onChange={(e) => handleEditChange("performanceScore", e.target.value)} className="w-full accent-brand-600" title="Score range" />
                </div>

                <div className="p-3 rounded-xl bg-brand-50/50 border border-brand-100 flex gap-3">
                  <Briefcase className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-[0.7rem] font-bold text-brand-800 leading-relaxed">{getRecommendation(selectedEmployee)}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button type="submit" disabled={updating} className="btn-primary w-full h-10">
                    <PencilLine className="h-4 w-4" />
                    {updating ? "Saving..." : "Save Profile"}
                  </button>
                  <button type="button" onClick={() => void handleDelete()} disabled={actionLoading !== null} className="btn-secondary w-full h-10 border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200">
                    <Trash2 className="h-4 w-4" />
                    Delete Record
                  </button>
                </div>
              </form>
            </SectionCard>
          </aside>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-page-enter">
          <div className="w-full max-w-xl bg-white rounded-[32px] shadow-panel overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Onboard New Talent</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Create a system profile and send access credentials.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition shadow-sm border border-slate-200" title="Close onboarder">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input required value={formState.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Full Name" className="input-surface w-full" />
                <input required type="email" value={formState.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="Email Address" className="input-surface w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required value={formState.role} onChange={(e) => handleChange("role", e.target.value)} placeholder="Job Role" className="input-surface w-full" />
                <input required value={formState.department} onChange={(e) => handleChange("department", e.target.value)} placeholder="Department" className="input-surface w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required value={formState.location} onChange={(e) => handleChange("location", e.target.value)} placeholder="Location (e.g. Remote)" className="input-surface w-full" />
                <input required value={formState.manager} onChange={(e) => handleChange("manager", e.target.value)} placeholder="Reporting Manager" className="input-surface w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required type="date" value={formState.joinDate} onChange={(e) => handleChange("joinDate", e.target.value)} className="input-surface w-full" title="Join Date" />
                <select required value={formState.shiftCode ?? ""} onChange={(e) => handleChange("shiftCode", e.target.value)} className="input-surface w-full" title="Shift Code">
                  <option value="">Select Shift</option>
                  {SHIFT_DEFINITIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              </div>

              {submitError && <p className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold">{submitError}</p>}
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleApplyStarterTemplate} className="btn-secondary flex-1">
                  Use Template
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-[2] h-11">
                  {submitting ? "Processing..." : "Confirm Onboarding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
