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
          <span className="font-bold text-slate-900">{r.employeeName}</span>
        </div>
      ) 
    },
    { 
      key: "type", 
      header: "Type", 
      render: (r) => (
        <span className="px-2 py-1 rounded-md bg-slate-100 text-[0.65rem] font-black uppercase tracking-widest text-slate-600">
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
            <p className="text-xs font-bold text-slate-700">
              {formatDate(r.payload.date)}: {r.payload.checkIn} - {r.payload.checkOut}
            </p>
          ) : (
            <p className="text-xs text-slate-500">View payload in system</p>
          )}
          <p className="text-[0.65rem] text-slate-400 italic mt-0.5 line-clamp-1">{r.reason}</p>
        </div>
      ) 
    },
    { 
      key: "date", 
      header: "Requested", 
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
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
            className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition shadow-sm border border-emerald-100"
            title="Approve"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
          <button 
            disabled={busyId === r.id}
            onClick={() => handleAction(r.id, "rejected")}
            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition shadow-sm border border-rose-100"
            title="Reject"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <span className="text-[0.65rem] font-bold text-slate-400 uppercase">Resolved</span>
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
        <div className="flex flex-wrap items-center gap-3 bg-white/50 p-2 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <RotateCcw className="h-4 w-4 text-slate-600" />
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
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
              <ClipboardCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[0.7rem] font-bold text-slate-500 leading-relaxed">
                Approving an attendance correction will automatically update the corresponding registry record.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
