import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreHorizontal, PencilLine, Plus, Trash2, X } from "lucide-react";
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
  const isAdminView = role === "admin";

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editFormState, setEditFormState] = useState<NewTaskPayload | null>(null);
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  const [editingError, setEditingError] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

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

  const selectedTaskResolved = selectedTask ? (tasksHook.data ?? []).find((task) => task.id === selectedTask.id) ?? selectedTask : null;
  const editingTaskResolved = editingTask ? (tasksHook.data ?? []).find((task) => task.id === editingTask.id) ?? editingTask : null;

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

  const handleEditAssigneeChange = (employeeId: string) => {
    const employee = employeesById.get(employeeId) ?? null;
    setEditFormState((current) =>
      current
        ? {
            ...current,
            assigneeId: employee?.id ?? null,
            assigneeName: employee?.name ?? null,
          }
        : current,
    );
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

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditingError(null);
    setOpenRowMenuId(null);
    setEditFormState({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
    });
  };

  const closeEditTask = () => {
    setEditingTask(null);
    setEditFormState(null);
    setEditingError(null);
  };

  const handleRemoveTask = async (task: Task) => {
    const confirmed = window.confirm(`Remove task "${task.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await hrService.deleteTask(task.id);
      if (selectedTask?.id === task.id) setSelectedTask(null);
      if (editingTask?.id === task.id) closeEditTask();
      await tasksHook.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove task.";
      setSubmitError(message);
    } finally {
      setOpenRowMenuId(null);
    }
  };

  const handleEditTask = async () => {
    if (!editingTask || !editFormState) return;
    setEditingSubmitting(true);
    setEditingError(null);

    try {
      const payload: NewTaskPayload = { ...editFormState, title: editFormState.title.trim() };
      if (!payload.title) {
        setEditingError("Task title is required.");
        return;
      }

      if (!canAssign) {
        payload.assigneeId = currentEmployee?.id ?? null;
        payload.assigneeName = currentEmployee?.name ?? null;
      }

      await hrService.updateTask(editingTask.id, payload);
      await tasksHook.refetch();
      closeEditTask();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update task.";
      setEditingError(message);
    } finally {
      setEditingSubmitting(false);
    }
  };

  return (
    <div className="animate-page-enter space-y-4">
      <PageHeader title="Task Command" subtitle="" eyebrow="Task Center" />

      <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
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
                      <th className="w-[18%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Assigned Date</th>
                      <th className="w-[28%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Task</th>
                      {isAdminView ? <th className="w-[18%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Assignee</th> : null}
                      <th className="w-[12%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Due</th>
                      <th className="w-[10%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Priority</th>
                      <th className="w-[10%] px-3 text-left text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Status</th>
                      {isAdminView ? <th className="w-[6%] px-3 text-right text-[12px] font-normal uppercase tracking-[0.14em] text-slate-500">Edit</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={isAdminView ? 7 : 5} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      pagedTasks.map((task) => {
                        return (
                          <tr key={task.id} className="h-[40px] border-b border-slate-200 last:border-0 bg-white hover:bg-slate-50">
                            <td className="px-3 py-0.5 align-middle text-[13px] leading-tight text-slate-900" title={task.createdAt}>
                              {formatDate(task.createdAt)}
                            </td>
                            <td className="min-w-0 px-3 py-0.5 align-middle">
                              <button type="button" onClick={() => setSelectedTask(task)} className="min-w-0 text-left" title={task.title}>
                                <p className="truncate text-[13px] font-medium leading-tight text-slate-900">{task.title}</p>
                              </button>
                            </td>
                            {isAdminView ? (
                              <td className="px-3 py-0.5 align-middle">
                                <p className="truncate text-[13px] leading-tight text-slate-900" title={resolveAssigneeLabel(task)}>
                                  {resolveAssigneeLabel(task)}
                                </p>
                              </td>
                            ) : null}
                            <td
                              className={`px-3 py-0.5 align-middle text-[13px] leading-tight ${isOverdue(task) ? "font-semibold text-rose-700" : "text-slate-900"}`}
                              title={task.dueDate ?? "No due date"}
                            >
                              {formatTaskDue(task)}
                            </td>
                            <td className="px-3 py-0.5 align-middle">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityTone(task.priority)}`}>
                                {formatPriorityLabel(task.priority)}
                              </span>
                            </td>
                            <td className="px-3 py-0.5 align-middle">
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
                            {isAdminView ? (
                              <td className="relative px-3 py-0.5 align-middle text-right">
                                <button
                                  type="button"
                                  onClick={() => setOpenRowMenuId((current) => (current === task.id ? null : task.id))}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  aria-label="Task actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openRowMenuId === task.id ? (
                                  <div className="absolute right-3 top-10 z-10 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() => void handleRemoveTask(task)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Remove
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditTask(task)}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      <PencilLine className="h-3.5 w-3.5" />
                                      Edit
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            ) : null}
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

      {isAdminView && editingTaskResolved && editFormState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" onClick={closeEditTask}>
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Edit Task</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{editingTaskResolved.title}</h3>
              </div>
              <button type="button" onClick={closeEditTask} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                value={editFormState.title}
                onChange={(event) => setEditFormState((current) => (current ? { ...current, title: event.target.value } : current))}
                placeholder="Task title"
                className="input-surface h-11 w-full"
              />
              <textarea
                value={editFormState.description ?? ""}
                onChange={(event) => setEditFormState((current) => (current ? { ...current, description: event.target.value } : current))}
                placeholder="Describe the task"
                className="input-surface min-h-[90px] w-full"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={editFormState.priority}
                  onChange={(event) =>
                    setEditFormState((current) => (current ? { ...current, priority: event.target.value as TaskPriority } : current))
                  }
                  className="input-surface h-11 w-full"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={editFormState.status}
                  onChange={(event) => setEditFormState((current) => (current ? { ...current, status: event.target.value as TaskStatus } : current))}
                  className="input-surface h-11 w-full"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  value={editFormState.dueDate ?? ""}
                  onChange={(event) => setEditFormState((current) => (current ? { ...current, dueDate: event.target.value } : current))}
                  className="input-surface h-11 w-full"
                />
                <select
                  value={editFormState.assigneeId ?? ""}
                  onChange={(event) => handleEditAssigneeChange(event.target.value)}
                  disabled={!canAssign}
                  className="input-surface h-11 w-full disabled:cursor-not-allowed"
                >
                  <option value="">Assign to</option>
                  {(employeesHook.data ?? []).map((employee: Employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} Â· {employee.department}
                    </option>
                  ))}
                </select>
              </div>
              {editingError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{editingError}</p> : null}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={closeEditTask} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={() => void handleEditTask()} disabled={editingSubmitting} className="btn-primary px-4 py-2">
                  <PencilLine className="h-4 w-4" />
                  {editingSubmitting ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
