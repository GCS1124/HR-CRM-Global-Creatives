import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { TaskPagination } from "../components/tasks/TaskPagination";
import { TaskQueueToolbar } from "../components/tasks/TaskQueueToolbar";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { Employee, NewTaskPayload, Task, TaskPriority, TaskStatus } from "../types/hr";
import { formatDate } from "../utils/formatters";

const PAGE_SIZE = 10;
const statusOptions: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorityOptions: TaskPriority[] = ["low", "medium", "high", "critical"];
const taskAssignerEmails = ["test@crm.co.in"];

function resolveAssigneeLabel(task: Task) {
  return task.assigneeName ?? "Unassigned";
}

function formatTaskDue(task: Task) {
  if (!task.dueDate) return "No due date";
  return new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "2-digit" });
}

function isOverdue(task: Task) {
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}

function formatPriorityLabel(priority: TaskPriority) {
  if (priority === "critical") return "Urgent";
  return priority.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/_/g, " ");
}

function priorityTone(priority: TaskPriority) {
  if (priority === "critical" || priority === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function statusTone(status: TaskStatus) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatStatusLabel(status: TaskStatus) {
  if (status === "todo") return "To Do";
  if (status === "in_progress") return "In Progress";
  if (status === "blocked") return "Blocked";
  return "Done";
}

function exportTasksCsv(rows: Task[]) {
  const headers = ["Task", "Assignee", "Due", "Priority", "Status"];
  const formatCsvValue = (value: string) => {
    const escaped = value.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const csv = [
    headers.map(formatCsvValue).join(","),
    ...rows.map((row) =>
      [
        row.title,
        resolveAssigneeLabel(row),
        row.dueDate ? formatDate(row.dueDate) : "No due date",
        row.priority.replace(/_/g, " "),
        row.status.replace(/_/g, " "),
      ]
        .map(formatCsvValue)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TasksPage() {
  const { role, profile } = useAuthSession();
  const tasksHook = useApi(useCallback(() => hrService.getTasks(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const currentEmployeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));

  const currentEmployee = currentEmployeeHook.data ?? null;
  const isClientAssigner = currentEmployee?.department === "Client Success";
  const isAdminEmail = profile?.email ? taskAssignerEmails.includes(profile.email.toLowerCase()) : false;
  const canAssign = role === "admin" || isClientAssigner || isAdminEmail;

  const [formState, setFormState] = useState<NewTaskPayload>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: null,
    assigneeId: currentEmployee?.id ?? null,
    assigneeName: currentEmployee?.name ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [requiresEmployeeSetup, setRequiresEmployeeSetup] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const employeesById = useMemo(
    () => new Map((employeesHook.data ?? []).map((employee) => [employee.id, employee])),
    [employeesHook.data],
  );

  useEffect(() => {
    if (!currentEmployee) return;
    setFormState((current) => ({
      ...current,
      assigneeId: current.assigneeId ?? currentEmployee.id,
      assigneeName: current.assigneeName ?? currentEmployee.name,
    }));
  }, [currentEmployee]);

  const filteredTasks = useMemo(() => {
    const rows = tasksHook.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((task) => {
      const matchesSearch =
        q === "" ||
        [task.id, task.title, task.description ?? "", task.assigneeName ?? "", task.priority, task.status]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tasksHook.data]);

  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, page]);

  const selectedPageIds = useMemo(() => pagedTasks.map((task) => task.id), [pagedTasks]);
  const allPageSelected = selectedPageIds.length > 0 && selectedPageIds.every((id) => selectedIds.has(id));
  const selectedTaskResolved = selectedTask ? (tasksHook.data ?? []).find((task) => task.id === selectedTask.id) ?? selectedTask : null;

  if (
    role === "employee" &&
    (requiresEmployeeSetup ||
      isNewUserEmployeeSetupError(currentEmployeeHook.error) ||
      isNewUserEmployeeSetupError(tasksHook.error) ||
      isNewUserEmployeeSetupError(employeesHook.error) ||
      isNewUserEmployeeSetupError(submitError))
  ) {
    return <NewUserSetupModal email={profile?.email} />;
  }

  const handleChange = (field: keyof NewTaskPayload, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleAssigneeChange = (employeeId: string) => {
    const employee = employeesById.get(employeeId) ?? null;
    setFormState((current) => ({
      ...current,
      assigneeId: employee?.id ?? null,
      assigneeName: employee?.name ?? null,
    }));
  };

  const handleCreateTask = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload: NewTaskPayload = { ...formState, title: formState.title.trim() };
      if (!payload.title) {
        setSubmitError("Task title is required.");
        return;
      }

      if (!canAssign) {
        payload.assigneeId = currentEmployee?.id ?? null;
        payload.assigneeName = currentEmployee?.name ?? null;
      }

      await hrService.createTask(payload);
      setRequiresEmployeeSetup(false);
      setFormState({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        assigneeId: currentEmployee?.id ?? null,
        assigneeName: currentEmployee?.name ?? null,
      });
      await tasksHook.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create task.";
      if (role === "employee" && isNewUserEmployeeSetupError(message)) {
        setRequiresEmployeeSetup(true);
        setSubmitError(null);
        return;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      await hrService.updateTaskStatus(taskId, status);
      setRequiresEmployeeSetup(false);
      await tasksHook.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update task status.";
      if (role === "employee" && isNewUserEmployeeSetupError(message)) {
        setRequiresEmployeeSetup(true);
        return;
      }
      setSubmitError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="animate-page-enter space-y-4">
      <PageHeader title="Task Command" subtitle="" eyebrow="Task Center" />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Create Task" showAccent={false}>
          <div className="space-y-3 px-0.5 pt-1">
            {employeesHook.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{employeesHook.error}</p> : null}
            <input
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="Task title"
              className="input-surface h-11 w-full"
            />
            <textarea
              value={formState.description ?? ""}
              onChange={(event) => handleChange("description", event.target.value)}
              placeholder="Describe the task"
              className="input-surface min-h-[90px] w-full"
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <select value={formState.priority} onChange={(event) => handleChange("priority", event.target.value)} className="input-surface h-11 w-full">
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select value={formState.status} onChange={(event) => handleChange("status", event.target.value)} className="input-surface h-11 w-full">
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                value={formState.dueDate ?? ""}
                onChange={(event) => handleChange("dueDate", event.target.value)}
                className="input-surface h-11 w-full"
              />
              <select
                value={formState.assigneeId ?? ""}
                onChange={(event) => handleAssigneeChange(event.target.value)}
                disabled={!canAssign}
                className="input-surface h-11 w-full disabled:cursor-not-allowed"
              >
                <option value="">Assign to</option>
                {(employeesHook.data ?? []).map((employee: Employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} · {employee.department}
                  </option>
                ))}
              </select>
            </div>
            {submitError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{submitError}</p> : null}
            <button type="button" onClick={() => void handleCreateTask()} disabled={submitting} className="btn-primary w-full">
              <Plus className="h-4 w-4" />
              {submitting ? "Creating task..." : "Create task"}
            </button>
            {!canAssign ? <p className="text-xs font-semibold text-brand-600">You can only create tasks assigned to yourself.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Task Queue" showAccent={false}>
          <div className="space-y-2.5">
            <TaskQueueToolbar
              taskCount={filteredTasks.length}
              search={search}
              statusFilter={statusFilter}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onStatusFilterChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              onExport={() => exportTasksCsv(filteredTasks)}
            />

            {tasksHook.loading ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : null}

            {tasksHook.error ? <p className="text-sm font-semibold text-rose-700">{tasksHook.error}</p> : null}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full table-fixed border-collapse">
                  <thead className="border-b border-slate-200 bg-white">
                    <tr className="h-10">
                      <th className="w-[40%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Task</th>
                      <th className="w-[20%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Due</th>
                      <th className="w-[12%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Priority</th>
                      <th className="w-[15%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      pagedTasks.map((task) => {
                        const selected = selectedIds.has(task.id);
                        return (
                          <tr
                            key={task.id}
                            className={`h-[42px] border-b border-slate-200 last:border-0 hover:bg-slate-50 ${selected ? "bg-slate-50/70" : "bg-white"}`}
                          >
                            <td className="px-3 py-1 align-middle">
                              <div className="flex min-w-0 items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(event) => {
                                    setSelectedIds((current) => {
                                      const next = new Set(current);
                                      if (event.target.checked) next.add(task.id);
                                      else next.delete(task.id);
                                      return next;
                                    });
                                  }}
                                  className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedTask(task)}
                                  className="min-w-0 text-left"
                                  title={task.title}
                                >
                                  <p className="truncate text-[13px] font-medium leading-tight text-slate-900">{task.title}</p>
                                </button>
                              </div>
                            </td>
                            <td
                              className={`px-3 py-1 align-middle text-[13px] leading-tight ${isOverdue(task) ? "font-semibold text-rose-700" : "text-slate-900"}`}
                              title={task.dueDate ?? "No due date"}
                            >
                              {formatTaskDue(task)}
                            </td>
                            <td className="px-3 py-1 align-middle">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                                {formatPriorityLabel(task.priority)}
                              </span>
                            </td>
                            <td className="px-3 py-1 align-middle">
                              <select
                                value={task.status}
                                onChange={(event) => void handleStatusChange(task.id, event.target.value as TaskStatus)}
                                disabled={updatingId === task.id}
                                className={`w-full max-w-[132px] rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight outline-none ${statusTone(task.status)}`}
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {formatStatusLabel(status)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <TaskPagination
                page={page}
                pageCount={pageCount}
                totalCount={filteredTasks.length}
                pageSize={PAGE_SIZE}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(pageCount, current + 1))}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedIds((current) => {
              const next = new Set(current);
              for (const id of selectedPageIds) {
                if (allPageSelected) next.delete(id);
                else next.add(id);
              }
              return next;
            });
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          {allPageSelected ? "Unselect page" : "Select page"}
        </button>
        <span className="text-xs font-semibold text-slate-500">{selectedIds.size} selected</span>
      </div>

      {selectedTaskResolved ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Task Details</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{selectedTaskResolved.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedTask(null)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Assignee</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{resolveAssigneeLabel(selectedTaskResolved)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Due</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatTaskDue(selectedTaskResolved)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Priority</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatPriorityLabel(selectedTaskResolved.priority)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatStatusLabel(selectedTaskResolved.status)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{selectedTaskResolved.description || "No task description provided."}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
