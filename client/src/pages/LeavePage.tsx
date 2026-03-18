import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleCheckBig, CircleDashed, CircleX, Copy, Flag } from "lucide-react";
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
import { formatDate, getLocalDateKey } from "../utils/formatters";
import { copyText } from "../utils/fileExport";

export function LeavePage() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveRequest["status"] | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
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

  const filteredRequests = useMemo(() => {
    const list = leaveHook.data ?? [];
    const query = search.trim().toLowerCase();

    return list.filter((item) => {
      const matchesSearch = query
        ? [item.employeeName, item.leaveType, item.reason].join(" ").toLowerCase().includes(query)
        : true;
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      const matchesStart = startDate ? item.startDate >= startDate : true;
      const matchesEnd = endDate ? item.endDate <= endDate : true;

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [endDate, leaveHook.data, search, startDate, statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const stillVisible = filteredRequests.some((item) => item.id === selectedId);
    if (!stillVisible) {
      setSelectedId(null);
    }
  }, [filteredRequests, selectedId]);

  useEffect(() => {
    setDetailMessage(null);
  }, [selectedId]);

  const selectedLeave =
    filteredRequests.find((item) => item.id === selectedId) ??
    (leaveHook.data ?? []).find((item) => item.id === selectedId) ??
    null;

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
    {
      key: "review",
      header: "Review",
      render: (row) => (
        <button type="button" onClick={() => setSelectedId(row.id)} className="btn-secondary px-3 py-2">
          View
        </button>
      ),
    },
  ];

  const applyDatePreset = (preset: "next_7" | "this_month" | "clear") => {
    if (preset === "clear") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const today = new Date();
    if (preset === "next_7") {
      const end = new Date(today);
      end.setDate(end.getDate() + 6);
      setStartDate(getLocalDateKey(today));
      setEndDate(getLocalDateKey(end));
      return;
    }

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setStartDate(getLocalDateKey(monthStart));
    setEndDate(getLocalDateKey(monthEnd));
  };

  const handleQuickStatus = async (status: LeaveRequest["status"]) => {
    if (!selectedLeave) {
      return;
    }

    setDetailMessage(null);

    try {
      await updateStatus(selectedLeave.id, status);
      setDetailMessage(`Status updated to ${status}.`);
    } catch (error) {
      setDetailMessage(error instanceof Error ? error.message : "Unable to update status.");
    }
  };

  const handleCopyReason = async () => {
    if (!selectedLeave) {
      return;
    }

    try {
      await copyText(selectedLeave.reason);
      setDetailMessage("Reason copied to clipboard.");
    } catch (error) {
      setDetailMessage(error instanceof Error ? error.message : "Unable to copy reason.");
    }
  };

  const hasActiveFilters = Boolean(search || statusFilter || startDate || endDate);

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

      <SectionCard title="Review controls" subtitle="Search and filter leave requests before taking action">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, type, or reason"
            className="input-surface"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeaveRequest["status"] | "")}
            className="input-surface"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="input-surface"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="input-surface"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              statusFilter === "" ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            All · {stats.total}
          </button>
          {([
            { value: "pending", label: "Pending", count: stats.pending },
            { value: "approved", label: "Approved", count: stats.approved },
            { value: "rejected", label: "Rejected", count: stats.rejected },
          ] as Array<{ value: LeaveRequest["status"]; label: string; count: number }>).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                statusFilter === item.value ? "bg-brand-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label} · {item.count}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => applyDatePreset("next_7")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next 7 days
          </button>
          <button
            type="button"
            onClick={() => applyDatePreset("this_month")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => applyDatePreset("clear")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear dates
          </button>
        </div>
        {hasActiveFilters ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="btn-secondary"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          title="Leave Queue"
          subtitle="Current and upcoming leave requests"
          rightSlot={<span className="insight-pill">{filteredRequests.length} visible</span>}
        >
          {leaveHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading leave requests...</p> : null}
          {leaveHook.error ? <p className="text-sm font-semibold text-rose-700">{leaveHook.error}</p> : null}
          <DataTable
            columns={columns}
            rows={filteredRequests}
            rowKey={(row) => row.id}
            exportFileName="leave-requests"
            rowClassName={(row) => (row.id === selectedId ? "!bg-brand-100/70" : "")}
            emptyText="No leave requests match this filter."
          />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Request detail" subtitle="Full context for the selected request">
            {selectedLeave ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Employee</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedLeave.employeeName}</p>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <StatusBadge value={selectedLeave.status} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {selectedLeave.leaveType.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleQuickStatus("approved")}
                      disabled={updatingId === selectedLeave.id}
                      className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickStatus("rejected")}
                      disabled={updatingId === selectedLeave.id}
                      className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleQuickStatus("pending")}
                      disabled={updatingId === selectedLeave.id}
                      className="btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Mark pending
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Start</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(selectedLeave.startDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">End</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(selectedLeave.endDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Days</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedLeave.days}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{selectedLeave.status}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Reason</p>
                    <button type="button" onClick={() => void handleCopyReason()} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{selectedLeave.reason}</p>
                </div>
                {detailMessage ? (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{detailMessage}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">Select a request from the queue to see full details.</p>
            )}
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
