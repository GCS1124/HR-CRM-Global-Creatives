import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  Briefcase,
  Clock3,
  Filter,
  MapPin,
  PencilLine,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
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
import { formatDate, getInitials } from "../utils/formatters";

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
};

const initialEditForm: UpdateEmployeePayload = {
  role: "",
  department: "",
  location: "",
  manager: "",
  status: "active",
  performanceScore: 80,
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type ViewPreset = "all" | "high_performers" | "attention" | "new_joiners";
type SortMode = "recent" | "performance" | "name" | "manager";

function getDaysSince(dateValue: string): number {
  const stamp = new Date(dateValue);
  if (Number.isNaN(stamp.valueOf())) {
    return 0;
  }

  return Math.max(Math.floor((Date.now() - stamp.valueOf()) / DAY_IN_MS), 0);
}

function formatTenure(dateValue: string): string {
  const days = getDaysSince(dateValue);
  if (days < 45) {
    return `${days} days`;
  }

  if (days < 365) {
    return `${Math.max(Math.round(days / 30), 1)} months`;
  }

  return `${(days / 365).toFixed(1)} yrs`;
}

function getEmployeePriority(employee: Employee): "high" | "medium" | "normal" {
  if (employee.status === "inactive" || employee.performanceScore < 70) {
    return "high";
  }

  if (employee.status === "on_leave" || employee.performanceScore < 82) {
    return "medium";
  }

  return "normal";
}

function getRecommendation(employee: Employee): string {
  if (employee.status === "inactive") {
    return "Confirm whether the profile should remain archived or be fully removed.";
  }

  if (employee.status === "on_leave") {
    return "Review coverage and check handoff readiness with the reporting manager.";
  }

  if (employee.performanceScore < 70) {
    return "Schedule a coaching checkpoint and align on a short recovery plan.";
  }

  if (employee.performanceScore >= 92) {
    return "Strong candidate for stretch assignments, promotion review, or mentorship.";
  }

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
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"archive" | "delete" | "status" | null>(null);

  const { data, loading, error, refetch } = useApi(useCallback(() => hrService.getEmployees(), []));

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
      if (sortMode === "performance") {
        return right.performanceScore - left.performanceScore;
      }

      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sortMode === "manager") {
        return left.manager.localeCompare(right.manager) || left.name.localeCompare(right.name);
      }

      return new Date(right.joinDate).valueOf() - new Date(left.joinDate).valueOf();
    });

    return next;
  }, [department, presetScopedEmployees, sortMode]);

  const selectedEmployee = useMemo(
    () => allEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [allEmployees, selectedEmployeeId],
  );

  useEffect(() => {
    if (!selectedEmployee) {
      return;
    }

    setEditState({
      role: selectedEmployee.role,
      department: selectedEmployee.department,
      location: selectedEmployee.location,
      manager: selectedEmployee.manager,
      status: selectedEmployee.status,
      performanceScore: selectedEmployee.performanceScore,
    });
  }, [selectedEmployee]);

  const stats = useMemo(() => {
    const averagePerformance =
      filteredEmployees.length > 0
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
        if (getEmployeePriority(employee) !== "normal") {
          current.attention += 1;
        }
        map.set(key, current);
        return map;
      }, new Map<string, { manager: string; count: number; attention: number; averagePerformance: number }>()).values(),
    )
      .map((item) => ({
        ...item,
        averagePerformance: Math.round(item.averagePerformance / Math.max(item.count, 1)),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4);
  }, [presetScopedEmployees]);

  const columns: Array<TableColumn<Employee>> = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {getInitials(row.name)}
          </span>
          <div>
            <p className="font-bold text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "assignment",
      header: "Assignment",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.role}</p>
          <p className="text-xs text-slate-500">{row.department}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (row) => (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <MapPin className="h-4 w-4 text-slate-400" />
          {row.location}
        </span>
      ),
    },
    { key: "manager", header: "Manager", render: (row) => row.manager },
    {
      key: "tenure",
      header: "Tenure",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{formatTenure(row.joinDate)}</p>
          <p className="text-xs text-slate-500">Joined {formatDate(row.joinDate)}</p>
        </div>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-brand-700">{row.performanceScore}%</p>
            {row.performanceScore >= 90 ? <Star className="h-4 w-4 text-amber-500" /> : null}
          </div>
          <div className="mt-1 h-1.5 w-20 rounded-full bg-brand-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.performanceScore}%` }} />
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <button type="button" onClick={() => setSelectedEmployeeId(row.id)} className="btn-secondary px-3 py-2">
          <PencilLine className="h-4 w-4" />
          Manage
        </button>
      ),
    },
  ];

  const handleChange = (field: keyof NewEmployeePayload, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: field === "performanceScore" ? Number(value) : value,
    }));
  };

  const handleEditChange = (field: keyof UpdateEmployeePayload, value: string) => {
    setEditState((current) => ({
      ...current,
      [field]: field === "performanceScore" ? Number(value) : value,
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
    });
    setSubmitError(null);
    setActionMessage("Starter template loaded into the add employee form.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setActionMessage(null);

    try {
      await hrService.createEmployee(formState);
      setFormState(initialForm);
      await refetch();
      setActionMessage("Employee profile created.");
    } catch (submitIssue) {
      setSubmitError(submitIssue instanceof Error ? submitIssue.message : "Unable to add employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedEmployee) {
      return;
    }

    setUpdating(true);
    setUpdateError(null);
    setActionMessage(null);

    try {
      await hrService.updateEmployee(selectedEmployee.id, editState);
      await refetch();
      setActionMessage("Employee profile updated.");
    } catch (updateIssue) {
      setUpdateError(updateIssue instanceof Error ? updateIssue.message : "Unable to update employee.");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatusAction = async (nextStatus: Employee["status"]) => {
    if (!selectedEmployee) {
      return;
    }

    setActionLoading("status");
    setUpdateError(null);
    setActionMessage(null);

    try {
      await hrService.updateEmployee(selectedEmployee.id, { ...editState, status: nextStatus });
      await refetch();
      setEditState((current) => ({ ...current, status: nextStatus }));
      setActionMessage(`${selectedEmployee.name} moved to ${nextStatus.replaceAll("_", " ")}.`);
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to update employee status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async () => {
    if (!selectedEmployee) {
      return;
    }

    setActionLoading("archive");
    setUpdateError(null);
    setActionMessage(null);

    try {
      await hrService.archiveEmployee(selectedEmployee.id);
      await refetch();
      setActionMessage(`${selectedEmployee.name} archived as inactive.`);
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to archive employee.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedEmployee.name}? This can remove linked HR records.`);
    if (!confirmed) {
      return;
    }

    setActionLoading("delete");
    setUpdateError(null);
    setActionMessage(null);

    try {
      await hrService.deleteEmployee(selectedEmployee.id);
      setSelectedEmployeeId(null);
      await refetch();
      setActionMessage("Employee deleted.");
    } catch (issue) {
      setUpdateError(issue instanceof Error ? issue.message : "Unable to delete employee.");
    } finally {
      setActionLoading(null);
    }
  };

  const hasActiveFilters = Boolean(search || department || status || managerFocus || viewPreset !== "all" || sortMode !== "recent");

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Operate the directory like a real people console: filter, prioritize, assign ownership, and move employee records through their lifecycle without losing context."
        eyebrow="People directory"
        action={
          <>
            <button type="button" onClick={handleApplyStarterTemplate} className="btn-secondary">
              <UserPlus className="h-4 w-4" />
              Starter template
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDepartment("");
                  setStatus("");
                  setViewPreset("all");
                  setManagerFocus("");
                  setSortMode("recent");
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visible people" value={String(stats.total)} hint="Current working set" icon={Users} />
        <StatCard title="Active workforce" value={String(stats.active)} hint="Ready for allocation" icon={UserCheck} />
        <StatCard title="Recent joiners" value={String(stats.recentJoiners)} hint="Joined in the last 45 days" icon={Clock3} />
        <StatCard title="Attention queue" value={String(stats.attention)} hint="Low performance or lifecycle follow-up" icon={Activity} />
      </div>

      <SectionCard title="People command bar" subtitle="Layer saved views, ownership filters, and sorting without leaving the directory">
        <div className="grid gap-3 xl:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, email, role, or manager"
            className="input-surface"
          />
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="input-surface">
            <option value="">All departments</option>
            {departments.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-surface">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="input-surface">
            <option value="recent">Sort: most recent joins</option>
            <option value="performance">Sort: highest performance</option>
            <option value="name">Sort: name A-Z</option>
            <option value="manager">Sort: manager</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All people" },
            { id: "high_performers", label: "High performers" },
            { id: "attention", label: "Needs attention" },
            { id: "new_joiners", label: "Recent joiners" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setViewPreset(preset.id as ViewPreset)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                viewPreset === preset.id ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
          {managerFocus ? (
            <span className="insight-pill">
              <Filter className="h-3.5 w-3.5" />
              Manager: {managerFocus}
            </span>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Manager coverage" subtitle="See who owns the largest teams and where review load is building">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {managerInsights.map((manager) => {
            const active = managerFocus === manager.manager;
            const attentionRatio = Math.round((manager.attention / Math.max(manager.count, 1)) * 100);

            return (
              <button
                key={manager.manager}
                type="button"
                onClick={() => setManagerFocus(active ? "" : manager.manager)}
                className={`rounded-xl border p-4 text-left transition ${
                  active ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{manager.manager}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">{manager.count}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>{manager.averagePerformance}% avg score</span>
                  <span>{attentionRatio}% attention</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(attentionRatio, 8)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <SectionCard
          title="Employee list"
          subtitle="Primary operating table with selected-row highlighting and attention cues"
          rightSlot={<span className="insight-pill">{filteredEmployees.length} visible records</span>}
        >
          {loading ? <p className="text-sm font-semibold text-slate-600">Loading employees...</p> : null}
          {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          <DataTable
            columns={columns}
            rows={filteredEmployees}
            rowKey={(row) => row.id}
            exportFileName="employees"
            emptyText="No employees match this filter."
            rowClassName={(row) => {
              if (row.id === selectedEmployeeId) {
                return "!bg-brand-100/80";
              }

              return getEmployeePriority(row) === "high" ? "bg-amber-50/60" : "";
            }}
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Add employee"
            subtitle="Create a profile with a reusable onboarding template"
            rightSlot={
              <button type="button" onClick={handleApplyStarterTemplate} className="btn-secondary px-3 py-2">
                <Plus className="h-4 w-4" />
                Prefill
              </button>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required value={formState.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Full name" className="input-surface w-full" />
              <input required type="email" value={formState.email} onChange={(event) => handleChange("email", event.target.value)} placeholder="Email" className="input-surface w-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={formState.role} onChange={(event) => handleChange("role", event.target.value)} placeholder="Role" className="input-surface w-full" />
                <input required value={formState.department} onChange={(event) => handleChange("department", event.target.value)} placeholder="Department" className="input-surface w-full" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={formState.location} onChange={(event) => handleChange("location", event.target.value)} placeholder="Location" className="input-surface w-full" />
                <input required value={formState.manager} onChange={(event) => handleChange("manager", event.target.value)} placeholder="Manager" className="input-surface w-full" />
              </div>
              <input required type="date" value={formState.joinDate} onChange={(event) => handleChange("joinDate", event.target.value)} className="input-surface w-full" />
              <select value={formState.status} onChange={(event) => handleChange("status", event.target.value)} className="input-surface w-full">
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="inactive">Inactive</option>
              </select>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Performance score</label>
                <input type="range" min={0} max={100} value={formState.performanceScore} onChange={(event) => handleChange("performanceScore", event.target.value)} className="w-full accent-brand-700" />
                <p className="text-xs font-semibold text-slate-600">{formState.performanceScore}%</p>
              </div>

              {submitError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</p> : null}
              {actionMessage && !selectedEmployee ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}
              <button type="submit" disabled={submitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                <Plus className="h-4 w-4" />
                {submitting ? "Adding..." : "Add employee"}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Manage employee" subtitle="Act on role, assignment, lifecycle, and performance from one panel">
            {selectedEmployee ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{selectedEmployee.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{selectedEmployee.email}</p>
                    </div>
                    <StatusBadge value={selectedEmployee.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Location</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{selectedEmployee.location}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Manager</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{selectedEmployee.manager}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Tenure</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{formatTenure(selectedEmployee.joinDate)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quick lifecycle action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "active", label: "Active" },
                      { value: "on_leave", label: "On leave" },
                      { value: "inactive", label: "Inactive" },
                    ] as Array<{ value: Employee["status"]; label: string }>).map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => void handleQuickStatusAction(item.value)}
                        disabled={actionLoading !== null}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          editState.status === item.value
                            ? "border-brand-300 bg-brand-50 text-brand-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={editState.role} onChange={(event) => handleEditChange("role", event.target.value)} placeholder="Role" className="input-surface w-full" />
                  <input value={editState.department} onChange={(event) => handleEditChange("department", event.target.value)} placeholder="Department" className="input-surface w-full" />
                  <input value={editState.location} onChange={(event) => handleEditChange("location", event.target.value)} placeholder="Location" className="input-surface w-full" />
                  <input value={editState.manager} onChange={(event) => handleEditChange("manager", event.target.value)} placeholder="Manager" className="input-surface w-full" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Performance score</label>
                  <input type="range" min={0} max={100} value={editState.performanceScore} onChange={(event) => handleEditChange("performanceScore", event.target.value)} className="w-full accent-brand-700" />
                  <p className="text-xs font-semibold text-slate-600">{editState.performanceScore}%</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Briefcase className="h-4 w-4 text-brand-700" />
                    Recommended next step
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{getRecommendation(selectedEmployee)}</p>
                </div>

                {updateError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{updateError}</p> : null}
                {actionMessage ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{actionMessage}</p> : null}

                <button type="submit" disabled={updating} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                  <PencilLine className="h-4 w-4" />
                  {updating ? "Saving..." : "Save changes"}
                </button>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void handleArchive()} disabled={actionLoading !== null} className="btn-secondary w-full border-amber-200 text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70">
                    <Archive className="h-4 w-4" />
                    {actionLoading === "archive" ? "Archiving..." : "Archive employee"}
                  </button>
                  <button type="button" onClick={() => void handleDelete()} disabled={actionLoading !== null} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70">
                    <Trash2 className="h-4 w-4" />
                    {actionLoading === "delete" ? "Deleting..." : "Delete employee"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm font-medium text-slate-600">Choose an employee from the table to edit their assignment, change lifecycle state, or remove the record.</p>
            )}
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
