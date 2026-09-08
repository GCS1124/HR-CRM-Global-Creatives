import { useCallback, useMemo, useState } from "react";
import {
  CheckCheck,
  ClipboardCheck,
  RotateCcw,
  Search,
  X,
  MessageSquare,
  Clock,
  User,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type {
  AdminRequest,
  AdminRequestStatus,
  AdminRequestType,
  AttendanceCorrectionRequestPayload,
} from "../types/hr";
import { formatDate } from "../utils/formatters";

function isAttendanceCorrectionPayload(
  payload: AdminRequest["payload"],
): payload is AttendanceCorrectionRequestPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const value = payload as Record<string, unknown>;
  return (
    typeof value.date === "string" &&
    typeof value.checkIn === "string" &&
    typeof value.checkOut === "string"
  );
}

export function RequestsPage() {
  const requestsHook = useApi(useCallback(() => hrService.getRequests(), []));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AdminRequestType | "">("");
  const [statusFilter, setStatusFilter] = useState<AdminRequestStatus | "">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const filteredRequests = useMemo(() => {
    const rows = requestsHook.data ?? [];
    return rows.filter((r) => {
      const matchesSearch = search.trim()
        ? [r.employeeName, r.reason].join(" ").toLowerCase().includes(search.trim().toLowerCase())
        : true;
      const matchesType = typeFilter ? r.type === typeFilter : true;
      const matchesStatus = statusFilter ? r.status === statusFilter : true;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requestsHook.data, search, typeFilter, statusFilter]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      await hrService.updateRequestStatus(id, status, adminComment);
      await requestsHook.refetch();
      setAdminComment("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const columns: Array<TableColumn<AdminRequest>> = [
    { 
      key: "employee", 
      header: "Employee", 
      render: (r) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-bold text-slate-900 dark:text-slate-50">{r.employeeName}</span>
        </div>
      ) 
    },
    { 
      key: "type", 
      header: "Type", 
      render: (r) => (
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[0.65rem] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
          {r.type.replace("_", " ")}
        </span>
      ) 
    },
    { 
      key: "details", 
      header: "Details", 
      render: (r) => (
        <div className="max-w-xs">
          {r.type === "attendance_correction" && isAttendanceCorrectionPayload(r.payload) ? (
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {formatDate(r.payload.date)}: {r.payload.checkIn} - {r.payload.checkOut}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-300">View payload in system</p>
          )}
          <p className="mt-0.5 line-clamp-1 text-[0.65rem] italic text-slate-400 dark:text-slate-400">{r.reason}</p>
        </div>
      ) 
    },
    { 
      key: "date", 
      header: "Requested", 
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
          <Clock className="h-3 w-3" />
          {formatDate(r.createdAt)}
        </div>
      ) 
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
    {
      key: "actions",
      header: "Action",
      render: (r) => r.status === "pending" ? (
        <div className="flex items-center gap-2">
          <button 
            disabled={busyId === r.id}
            onClick={() => handleAction(r.id, "approved")}
            className="rounded-lg border border-emerald-100 p-1.5 text-emerald-600 transition shadow-sm hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
            title="Approve"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
          <button 
            disabled={busyId === r.id}
            onClick={() => handleAction(r.id, "rejected")}
            className="rounded-lg border border-rose-100 p-1.5 text-rose-600 transition shadow-sm hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-200 dark:hover:bg-rose-500/10"
            title="Reject"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="text-[0.65rem] font-bold uppercase text-slate-400 dark:text-slate-500">Resolved</span>
      ),
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Approvals Console"
        subtitle="Review correction requests and system adjustments from the workforce."
        eyebrow="Operations Control"
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/50 p-2 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-950/70">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="input-surface w-full pl-10 h-10" />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.currentTarget.value as AdminRequestType | "")}
            className="input-surface h-10 text-xs font-bold"
            title="Request Type"
          >
            <option value="">All Types</option>
            <option value="attendance_correction">Correction</option>
            <option value="profile_update">Profile</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.currentTarget.value as AdminRequestStatus | "")}
            className="input-surface h-10 text-xs font-bold"
            title="Status"
          >
            <option value="pending">Pending Only</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All Status</option>
          </select>
          {(search || typeFilter || statusFilter !== 'pending') && (
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStatusFilter("pending");
              }}
              className="rounded-xl bg-slate-100 p-2.5 transition hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RotateCcw className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          )}
        </div>

        <SectionCard title="Active Requests" rightSlot={<span className="insight-pill">{filteredRequests.length} queue items</span>}>
          <DataTable columns={columns} rows={filteredRequests} rowKey={(r) => r.id} exportFileName="requests-data" />
        </SectionCard>

        <SectionCard title="Resolution Note" subtitle="Add context to your decision">
          <div className="space-y-4">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                value={adminComment}
                onChange={e => setAdminComment(e.target.value)}
                placeholder="Explain why approved or rejected..."
                className="input-surface w-full min-h-[120px] pl-10 pt-3"
              />
            </div>
            <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/70">
              <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-300" />
              <p className="text-[0.7rem] font-bold leading-relaxed text-slate-500 dark:text-slate-300">
                Approving an attendance correction will automatically update the corresponding registry record.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
