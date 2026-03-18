import { Briefcase, MapPin, Users } from "lucide-react";
import type { Employee } from "../types/hr";
import { getInitials } from "../utils/formatters";
import { StatusBadge } from "./StatusBadge";

export interface OrgChartManagerNode {
  manager: string;
  reports: Employee[];
  departments: string[];
}

interface OrgChartTreeProps {
  managers: OrgChartManagerNode[];
  emptyLabel?: string;
}

export function OrgChartTree({ managers, emptyLabel = "No manager structure found." }: OrgChartTreeProps) {
  if (managers.length === 0) {
    return <p className="text-sm font-semibold text-brand-700">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      {managers.map((node) => {
        const preview = node.reports.slice(0, 8);
        const overflow = node.reports.length - preview.length;

        return (
          <section key={node.manager} className="rounded-[28px] border border-brand-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-brand-500">Manager</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-brand-950">{node.manager}</h3>
                <p className="mt-1 text-sm font-semibold text-brand-600">
                  {node.departments.length > 0 ? node.departments.join(" · ") : "Department not tagged"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                  <Users className="h-3.5 w-3.5" />
                  {node.reports.length} direct reports
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                  <Briefcase className="h-3.5 w-3.5" />
                  {node.reports.filter((report) => report.status === "active").length} active
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {preview.map((report) => (
                <div key={report.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {getInitials(report.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{report.name}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {report.role} · {report.department}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {report.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge value={report.status} />
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-bold text-slate-600">
                      {report.performanceScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {overflow > 0 ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
                + {overflow} more direct reports
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
