import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  CalendarClock,
  CircleCheckBig,
  CircleDashed,
  CircleX,
  Flag,
  Send,
  Sparkles,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import type { TableColumn } from "../components/DataTable";
import { ModuleHero } from "../components/ModuleHero";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { LeaveRequest, NewLeaveRequestPayload } from "../types/hr";
import { formatDate } from "../utils/formatters";

const initialForm: NewLeaveRequestPayload = {
  leaveType: "annual",
  startDate: "",
  endDate: "",
  reason: "",
};

export function EmployeeLeavePage() {
  const { profile, signOut } = useAuthSession();
  const leaveHook = useApi(useCallback(() => hrService.getMyLeaveRequests(), []));
  const [formState, setFormState] = useState<NewLeaveRequestPayload>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const rows = leaveHook.data ?? [];

    return {
      total: rows.length,
      approved: rows.filter((row) => row.status === "approved").length,
      pending: rows.filter((row) => row.status === "pending").length,
      rejected: rows.filter((row) => row.status === "rejected").length,
    };
  }, [leaveHook.data]);

  const latestLeave = leaveHook.data?.[0] ?? null;

  if (isNewUserEmployeeSetupError(leaveHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  const columns: Array<TableColumn<LeaveRequest>> = [
    { key: "type", header: "Type", render: (row) => row.leaveType.toUpperCase() },
    { key: "start", header: "Start", render: (row) => formatDate(row.startDate) },
    { key: "end", header: "End", render: (row) => formatDate(row.endDate) },
    { key: "days", header: "Days", render: (row) => row.days },
    { key: "reason", header: "Reason", render: (row) => row.reason },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await hrService.createMyLeaveRequest(formState);
      setFormState(initialForm);
      await leaveHook.refetch();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit leave request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Leave"
        subtitle="Submit new leave requests and track your approval status"
        eyebrow="Employee Leave"
      />

      <ModuleHero
        icon={CalendarClock}
        title="Manage Leave Requests with Full Visibility"
        subtitle="Plan ahead, keep your schedule clear, and push requests through a more polished self-service flow."
        chips={["Request tracking", "Approval visibility", "Policy aligned"]}
        spotlight={`${stats.pending} Pending`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total" value={String(stats.total)} icon={CalendarClock} />
        <StatCard title="Approved" value={String(stats.approved)} icon={CircleCheckBig} />
        <StatCard title="Pending" value={String(stats.pending)} icon={CircleDashed} />
        <StatCard title="Rejected" value={String(stats.rejected)} icon={CircleX} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="accent-panel relative overflow-hidden rounded-[32px] border p-6 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              Request Planner
            </p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Keep leave planning clear and low-friction</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/90">
              Submit the request once, keep the reason concise, and monitor the approval state from the same screen.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Latest Request</p>
                <p className="mt-2 text-lg font-bold text-white">{latestLeave ? latestLeave.leaveType.toUpperCase() : "None yet"}</p>
                <p className="mt-1 text-xs font-medium text-white/86">{latestLeave ? latestLeave.status : "You are clear right now."}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Pending Queue</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{stats.pending}</p>
                <p className="mt-1 text-xs font-medium text-white/86">Requests waiting on review.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/84">Approval Rate</p>
                <p className="mt-2 text-3xl font-extrabold text-white">
                  {stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : "--"}
                </p>
                <p className="mt-1 text-xs font-medium text-white/86">Approved vs total requests.</p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard title="Apply Leave" subtitle="Submit a new request">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                required
                value={formState.leaveType}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, leaveType: event.target.value as NewLeaveRequestPayload["leaveType"] }))
                }
                className="input-surface w-full"
              >
                <option value="annual">Annual</option>
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                Keep your reason specific and short so approvals move faster.
              </div>
            </div>
            <input
              required
              type="date"
              value={formState.startDate}
              onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
              className="input-surface w-full"
            />
            <input
              required
              type="date"
              value={formState.endDate}
              onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))}
              className="input-surface w-full"
            />
            <textarea
              required
              value={formState.reason}
              onChange={(event) => setFormState((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Reason for leave"
              rows={4}
              className="input-surface w-full resize-none"
            />
            {error ? <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Leave History" subtitle="Your submitted requests">
          {leaveHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading leave history...</p> : null}
          {leaveHook.error ? <p className="text-sm font-semibold text-rose-700">{leaveHook.error}</p> : null}
          <DataTable
            columns={columns}
            rows={leaveHook.data ?? []}
            rowKey={(row) => row.id}
            exportFileName="my-leave"
            emptyText="No leave requests yet."
          />
        </SectionCard>

        <SectionCard title="Approval Notes" subtitle="Simple rules that keep requests moving">
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <Flag className="h-3.5 w-3.5" />
                Plan early
              </p>
              <p className="mt-2 text-sm font-medium text-emerald-900">Submit planned leave before peak delivery windows when possible.</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700">Clear reason</p>
              <p className="mt-2 text-sm font-medium text-sky-900">A short, clear reason reduces follow-up and speeds approvals.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Latest status</p>
              <p className="mt-2 text-sm font-medium text-amber-900">
                {latestLeave ? `Your newest request is currently ${latestLeave.status}.` : "No request is currently in review."}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
