import { Download, Search } from "lucide-react";
import type { TaskStatus } from "../../types/hr";

interface TaskQueueToolbarProps {
  taskCount: number;
  search: string;
  statusFilter: TaskStatus | "";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatus | "") => void;
  onExport: () => void;
}

export function TaskQueueToolbar({
  taskCount,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onExport,
}: TaskQueueToolbarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="insight-pill">{taskCount} tasks</span>
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as TaskStatus | "")}
          className="input-surface h-9 w-full min-w-[150px] text-sm font-medium sm:w-[150px]"
        >
          <option value="">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onExport} className="btn-secondary w-full px-3 py-1.5 text-xs sm:w-auto">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  );
}
