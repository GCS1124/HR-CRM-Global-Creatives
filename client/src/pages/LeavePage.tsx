import { useCallback, useMemo, useState } from "react";
import { CalendarClock, CircleCheckBig, CircleDashed, CircleX, Flag } from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { LeaveRequest } from "../types/hr";
import { formatDate } from "../utils/formatters";

export function LeavePage() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const leaveHook = useApi(useCallback(() => hrService.getLeaveRequests(), []));

  const stats = useMemo(() => {
    const list = leaveHook.data ?? [];

    return {
      total: list.length,
      approved: list.filter((item) => item.status === "approved").length,
      pending: list.filter((item) => item.status === "pending").length,
      rejected: list.filter((item) => item.status === "rejected").length,
    };
  }, [leaveHook.data]);

  const updateStatus = async (id: string, status: LeaveRequest["status"]) => {
    setUpdatingId(id);

    try {
      await hrService.updateLeaveStatus(id, status);
      await leaveHook.refetch();
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Array<TableColumn<LeaveRequest>> = [
    { key: "employee", header: "Employee", render: (row) => row.employeeName },
    { key: "type", header: "Type", render: (row) => row.leaveType.toUpperCase() },
    { key: "start", header: "Start", render: (row) => formatDate(row.startDate) },
    { key: "end", header: "End", render: (row) => formatDate(row.endDate) },
    { key: "days", header: "Days", render: (row) => row.days },
    {
      key: "reason",
      header: "Reason",
      render: (row) => <span className="line-clamp-1 max-w-[220px] text-brand-700">{row.reason}</span>,
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <select
          value={row.status}
          onChange={(event) => void updateStatus(row.id, event.target.value as LeaveRequest["status"])}
          disabled={updatingId === row.id}
          className="input-surface rounded-md py-1 text-xs font-semibold disabled:cursor-not-allowed"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
      ),
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Approve, reject, and monitor leave requests across every department"
        eyebrow="Leave Workflow"
      />

      <ModuleHero
        icon={CalendarClock}
        title="Approve Faster While Protecting Team Coverage"
        subtitle="Use policy guardrails and request analytics to reduce leave bottlenecks and avoid staffing risk."
        chips={["Approval workflow", "Coverage safety", "24h response target"]}
        spotlight={`${stats.pending} Pending Approvals`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Requests" value={String(stats.total)} icon={CalendarClock} />
        <StatCard title="Approved" value={String(stats.approved)} icon={CircleCheckBig} trend="Stable" />
        <StatCard title="Pending" value={String(stats.pending)} icon={CircleDashed} hint="Needs HR action" />
        <StatCard title="Rejected" value={String(stats.rejected)} icon={CircleX} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Leave Queue" subtitle="Current and upcoming leave requests">
          {leaveHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading leave requests...</p> : null}
          {leaveHook.error ? <p className="text-sm font-semibold text-rose-700">{leaveHook.error}</p> : null}
          <DataTable
            columns={columns}
            rows={leaveHook.data ?? []}
            rowKey={(row) => row.id}
            emptyText="No leave requests available."
          />
        </SectionCard>

        <SectionCard title="Policy Guardrails" subtitle="Approval checklist for team leads">
          <div className="space-y-3 text-sm font-medium text-brand-700">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="inline-flex items-center gap-2 font-semibold text-brand-900">
                <Flag className="h-4 w-4" />
                Balance staffing before approval
              </p>
              <p className="mt-1">Check overlapping requests in the same department and ensure coverage.</p>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="font-semibold text-brand-900">Critical window checks</p>
              <p className="mt-1">Flag leaves during payroll week, client launches, or interview cycles.</p>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="font-semibold text-brand-900">SLA expectation</p>
              <p className="mt-1">Respond to pending requests within 24 working hours.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Leave Radar" subtitle="Queue pressure by request status">
        <div className="space-y-4">
          {[
            { label: "Approved", value: stats.approved, tone: "bg-emerald-500" },
            { label: "Pending", value: stats.pending, tone: "bg-amber-500" },
            { label: "Rejected", value: stats.rejected, tone: "bg-rose-500" },
          ].map((item) => {
            const width = (item.value / Math.max(stats.total, 1)) * 100;

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm font-semibold text-brand-700">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-brand-100">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${Math.max(width, item.value > 0 ? 6 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
