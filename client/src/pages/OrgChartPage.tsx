import { useCallback, useMemo, useState } from "react";
import { ChartNetwork, Filter, RotateCcw, Users } from "lucide-react";
import { ModuleHero } from "../components/ModuleHero";
import { OrgChartTree } from "../components/OrgChartTree";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { Employee, EmployeeStatus } from "../types/hr";

const statusOptions: Array<{ value: EmployeeStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "inactive", label: "Inactive" },
];

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

export function OrgChartPage() {
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "">("");
  const [managerFocus, setManagerFocus] = useState("");
  const [sortMode, setSortMode] = useState<"headcount" | "alpha">("headcount");

  const employees = useMemo(() => employeesHook.data ?? [], [employeesHook.data]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department))).sort((a, b) => a.localeCompare(b)),
    [employees],
  );

  const managerOptions = useMemo(() => {
    const list = Array.from(new Set(employees.map((employee) => employee.manager).filter(Boolean)));
    return list.sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const scopedEmployees = useMemo(() => {
    const query = normalizeValue(search);
    return employees.filter((employee) => {
      const matchesDepartment = department ? employee.department === department : true;
      const matchesStatus = status ? employee.status === status : true;
      const matchesSearch = query
        ? [employee.name, employee.email, employee.role, employee.manager, employee.department]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;
      const matchesManager = managerFocus ? employee.manager === managerFocus : true;

      return matchesDepartment && matchesStatus && matchesSearch && matchesManager;
    });
  }, [department, employees, managerFocus, search, status]);

  const managerNodes = useMemo(() => {
    const map = new Map<string, Employee[]>();
    scopedEmployees.forEach((employee) => {
      const managerName = employee.manager?.trim() || "Unassigned";
      const bucket = map.get(managerName) ?? [];
      bucket.push(employee);
      map.set(managerName, bucket);
    });

    const nodes = Array.from(map.entries()).map(([manager, reports]) => ({
      manager,
      reports: reports.slice().sort((left, right) => left.name.localeCompare(right.name)),
      departments: Array.from(new Set(reports.map((report) => report.department))).sort((a, b) => a.localeCompare(b)),
    }));

    nodes.sort((left, right) => {
      if (sortMode === "alpha") {
        return left.manager.localeCompare(right.manager);
      }

      return right.reports.length - left.reports.length || left.manager.localeCompare(right.manager);
    });

    return nodes;
  }, [scopedEmployees, sortMode]);

  const managerCount = managerNodes.length;
  const teamCount = scopedEmployees.length;
  const largestTeam = managerNodes[0]?.reports.length ?? 0;
  const attentionCount = scopedEmployees.filter((employee) => employee.status !== "active").length;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Org Chart"
        subtitle="Map reporting lines, manager coverage, and team distribution at a glance"
        eyebrow="People structure"
      />

      <ModuleHero
        icon={ChartNetwork}
        title="See Every Manager, Team, and Reporting Line in One Place"
        subtitle="Filter by department, status, or manager focus to isolate leadership coverage and spot coverage gaps quickly."
        chips={["Manager radar", "Team structure", "Coverage visibility"]}
        spotlight={`${managerCount} Active Managers`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Teams" value={String(managerCount)} icon={Users} hint="Active managers" />
        <StatCard title="Total people" value={String(teamCount)} icon={Users} hint="Scoped employees" />
        <StatCard title="Largest team" value={String(largestTeam)} icon={Users} hint="Direct reports" />
        <StatCard title="Needs attention" value={String(attentionCount)} icon={Users} hint="Leave or inactive" />
      </div>

      <SectionCard title="Filter org view" subtitle="Narrow to focus areas before reviewing team nodes">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search names, roles, managers"
            className="input-surface w-full"
          />
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="input-surface w-full">
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as EmployeeStatus | "")}
            className="input-surface w-full"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={managerFocus} onChange={(event) => setManagerFocus(event.target.value)} className="input-surface w-full">
            <option value="">All managers</option>
            {managerOptions.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSortMode((current) => (current === "headcount" ? "alpha" : "headcount"))}
              className="btn-secondary"
            >
              <Filter className="h-4 w-4" />
              Sort: {sortMode === "headcount" ? "Headcount" : "A-Z"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDepartment("");
                setStatus("");
                setManagerFocus("");
                setSortMode("headcount");
              }}
              className="btn-ghost"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Manager radar" subtitle="Direct report clusters with department context">
        {employeesHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading org chart...</p> : null}
        {employeesHook.error ? <p className="text-sm font-semibold text-rose-700">{employeesHook.error}</p> : null}
        {employeesHook.data ? <OrgChartTree managers={managerNodes} emptyLabel="No manager teams match the filters." /> : null}
      </SectionCard>
    </div>
  );
}
