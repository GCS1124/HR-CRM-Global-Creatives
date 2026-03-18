import { useMemo } from "react";
import { CalendarDays, Flame } from "lucide-react";
import type { Employee, LeaveRequest } from "../types/hr";
import { getLocalDateKey } from "../utils/formatters";

interface LeaveCalendarProps {
  requests: LeaveRequest[];
  employees: Employee[];
  month?: Date;
}

interface DayStats {
  total: number;
  departmentCounts: Record<string, number>;
}

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function LeaveCalendar({ requests, employees, month = new Date() }: LeaveCalendarProps) {
  const { cells, label, statsByDay } = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startOffset = (start.getDay() + 6) % 7;
    const daysInMonth = end.getDate();

    const departmentByEmployee = new Map(employees.map((employee) => [employee.id, employee.department]));
    const stats = new Map<string, DayStats>();

    requests.forEach((request) => {
      const rangeStart = new Date(request.startDate);
      const rangeEnd = new Date(request.endDate);

      for (let current = new Date(rangeStart); current <= rangeEnd; current = addDays(current, 1)) {
        if (current.getMonth() !== start.getMonth() || current.getFullYear() !== start.getFullYear()) {
          continue;
        }

        const key = getLocalDateKey(current);
        const department = departmentByEmployee.get(request.employeeId) ?? "General";
        const existing = stats.get(key) ?? { total: 0, departmentCounts: {} };

        existing.total += 1;
        existing.departmentCounts[department] = (existing.departmentCounts[department] ?? 0) + 1;
        stats.set(key, existing);
      }
    });

    const cellsList: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i += 1) {
      cellsList.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cellsList.push(new Date(start.getFullYear(), start.getMonth(), day));
    }

    return {
      cells: cellsList,
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      statsByDay: stats,
    };
  }, [employees, month, requests]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">Coverage Month</p>
          <p className="text-2xl font-semibold text-brand-950">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-brand-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            Leave scheduled
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1">
            <Flame className="h-4 w-4 text-rose-600" />
            Coverage risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
        {weekDays.map((day) => (
          <div key={day} className="text-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="h-24 rounded-xl border border-dashed border-brand-100 bg-brand-50/30" />;
          }

          const key = getLocalDateKey(cell);
          const stats = statsByDay.get(key);
          const total = stats?.total ?? 0;
          const risk = stats
            ? Object.values(stats.departmentCounts).some((value) => value >= 2)
            : false;

          return (
            <div
              key={key}
              className={`h-24 rounded-xl border p-2 transition ${
                risk
                  ? "border-rose-200 bg-rose-50"
                  : total > 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-brand-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between text-xs font-semibold text-brand-700">
                <span>{cell.getDate()}</span>
                {total > 0 ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold text-brand-700">
                    {total}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-1">
                {stats
                  ? Object.entries(stats.departmentCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 2)
                      .map(([department, value]) => (
                        <div key={department} className="flex items-center justify-between text-[0.7rem] font-semibold text-brand-600">
                          <span className="truncate">{department}</span>
                          <span>{value}</span>
                        </div>
                      ))
                  : null}
                {risk ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-bold text-rose-700">
                    <Flame className="h-3 w-3" />
                    Risk
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
