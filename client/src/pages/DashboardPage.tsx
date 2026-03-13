import { useCallback } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  LineChart,
  Users,
} from "lucide-react";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import { formatCurrency, formatPercent } from "../utils/formatters";

export function DashboardPage() {
  const fetchDashboard = useCallback(() => hrService.getDashboardOverview(), []);
  const { data, loading, error } = useApi(fetchDashboard);

  if (loading) {
    return <p className="text-sm font-semibold text-brand-700">Loading dashboard...</p>;
  }

  if (error || !data) {
    return <p className="text-sm font-semibold text-rose-700">{error ?? "Failed to load dashboard"}</p>;
  }

  const statusBlocks = [
    {
      label: "Active",
      value: data.metrics.activeEmployees,
      color: "bg-emerald-500",
    },
    {
      label: "Pending Leave",
      value: data.metrics.pendingLeaves,
      color: "bg-amber-500",
    },
    {
      label: "Hiring Pipeline",
      value: data.metrics.activeOpenings,
      color: "bg-sky-500",
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="HR Control Center"
        subtitle="Live snapshot of Global Creative workforce operations, hiring velocity, and payroll health"
        eyebrow="Executive Dashboard"
        action={
          <button type="button" className="btn-primary">
            <FileText className="h-4 w-4" />
            Export report
          </button>
        }
      />

      <ModuleHero
        icon={LineChart}
        title="Operate HR, Recruitment, and Payroll from One Command Layer"
        subtitle={`Attendance is at ${formatPercent(data.metrics.attendanceRate)} and payroll is tracking ${formatCurrency(data.metrics.payrollTotal)} in current-cycle net payouts.`}
        chips={["Executive visibility", "Fast approvals", "Recruitment momentum"]}
        spotlight={`${data.metrics.activeEmployees} Active Team Members`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={String(data.metrics.totalEmployees)}
          hint="Across all departments"
          trend="+4%"
          icon={Users}
        />
        <StatCard
          title="Active Openings"
          value={String(data.metrics.activeOpenings)}
          hint="Recruitment pipeline"
          trend="+2 roles"
          icon={BriefcaseBusiness}
        />
        <StatCard
          title="Attendance Rate"
          value={formatPercent(data.metrics.attendanceRate)}
          hint="Present + remote today"
          trend="+1.2%"
          icon={Clock3}
        />
        <StatCard
          title="Payroll Total"
          value={formatCurrency(data.metrics.payrollTotal)}
          hint="Current cycle net payouts"
          trend="On track"
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <SectionCard
          title="Workforce Distribution"
          subtitle="Current team composition and active HR load"
          rightSlot={
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Updated live
            </span>
          }
        >
          <div className="space-y-4">
            {statusBlocks.map((item) => {
              const pct = Math.max((item.value / Math.max(data.metrics.totalEmployees, 1)) * 100, 5);

              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-brand-700">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-brand-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Stable
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-800">Core teams are fully staffed for this sprint.</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Watchlist
              </p>
              <p className="mt-1 text-sm font-medium text-amber-800">Leave approvals need fast turn-around.</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sky-700">
                <LineChart className="h-3.5 w-3.5" />
                Growth
              </p>
              <p className="mt-1 text-sm font-medium text-sky-800">Hiring pipeline remains active and healthy.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Operational Highlights" subtitle="Focus items for this week">
          <div className="space-y-3">
            {data.highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-xl border border-brand-200 bg-brand-50/65 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">{highlight.title}</p>
                <p className="mt-2 font-display text-3xl font-bold text-brand-900">{highlight.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
