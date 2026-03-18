import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService } from "../services/hrService";
import type { Employee, NewTaskPayload, Task, TaskPriority, TaskStatus } from "../types/hr";
import { formatDate } from "../utils/formatters";

const statusOptions: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorityOptions: TaskPriority[] = ["low", "medium", "high", "critical"];
const taskAssignerEmails = ["test@crm.co.in"];

function resolveAssigneeLabel(task: Task) {
  return task.assigneeName ?? "Unassigned";
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

  const employeesById = useMemo(() => {
    return new Map((employeesHook.data ?? []).map((employee) => [employee.id, employee]));
  }, [employeesHook.data]);

  useEffect(() => {
    if (!currentEmployee) {
      return;
    }

    setFormState((current) => ({
      ...current,
      assigneeId: current.assigneeId ?? currentEmployee.id,
      assigneeName: current.assigneeName ?? currentEmployee.name,
    }));
  }, [currentEmployee]);

  const handleChange = (field: keyof NewTaskPayload, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
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
      const payload: NewTaskPayload = {
        ...formState,
        title: formState.title.trim(),
      };

      if (!payload.title) {
        setSubmitError("Task title is required.");
        return;
      }

      if (!canAssign) {
        payload.assigneeId = currentEmployee?.id ?? null;
        payload.assigneeName = currentEmployee?.name ?? null;
      }

      await hrService.createTask(payload);
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
      setSubmitError(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      await hrService.updateTaskStatus(taskId, status);
      await tasksHook.refetch();
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Array<TableColumn<Task>> = [
    { key: "title", header: "Task", render: (row) => row.title },
    { key: "assignee", header: "Assignee", render: (row) => resolveAssigneeLabel(row) },
    {
      key: "due",
      header: "Due",
      render: (row) => (row.dueDate ? formatDate(row.dueDate) : "No due date"),
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => <StatusBadge value={row.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "action",
      header: "Update",
      render: (row) => (
        <select
          value={row.status}
          onChange={(event) => void handleStatusChange(row.id, event.target.value as TaskStatus)}
          disabled={updatingId === row.id}
          className="input-surface rounded-md py-1 text-xs font-semibold disabled:cursor-not-allowed"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Task Command"
        subtitle="Assign, track, and close operational tasks from a single queue."
        eyebrow="Task Center"
      />

      <ModuleHero
        icon={ClipboardList}
        title="Task list"
        subtitle="Create a task, assign it, and update status in one place."
        chips={[]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1.8fr]">
        <SectionCard title="Create Task" subtitle="Add a task to the operational queue">
          <div className="space-y-3">
            {employeesHook.error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {employeesHook.error}
              </p>
            ) : null}
            <input
              value={formState.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="Task title"
              className="input-surface w-full"
            />
            <textarea
              value={formState.description ?? ""}
              onChange={(event) => handleChange("description", event.target.value)}
              placeholder="Describe the task"
              className="input-surface min-h-[110px] w-full"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={formState.priority}
                onChange={(event) => handleChange("priority", event.target.value)}
                className="input-surface w-full"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <select
                value={formState.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="input-surface w-full"
              >
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
                className="input-surface w-full"
              />
              <select
                value={formState.assigneeId ?? ""}
                onChange={(event) => handleAssigneeChange(event.target.value)}
                disabled={!canAssign}
                className="input-surface w-full disabled:cursor-not-allowed"
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
            <button
              type="button"
              onClick={() => void handleCreateTask()}
              disabled={submitting}
              className="btn-primary w-full"
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Creating task..." : "Create task"}
            </button>
            {!canAssign ? (
              <p className="text-xs font-semibold text-brand-600">
                You can only create tasks assigned to yourself.
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Task Queue" subtitle="Monitor execution and progress updates">
          {tasksHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading tasks...</p> : null}
          {tasksHook.error ? <p className="text-sm font-semibold text-rose-700">{tasksHook.error}</p> : null}
          <DataTable
            columns={columns}
            rows={tasksHook.data ?? []}
            rowKey={(row) => row.id}
            exportFileName="tasks"
            emptyText="No tasks yet."
          />
        </SectionCard>
      </div>
    </div>
  );
}
