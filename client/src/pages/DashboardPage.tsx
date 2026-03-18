import { useCallback } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Users,
} from "lucide-react";
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

  const activeRate = data.metrics.totalEmployees
    ? Math.round((data.metrics.activeEmployees / data.metrics.totalEmployees) * 100)
    : 0;
  const attendanceRate = Math.min(100, Math.max(0, data.metrics.attendanceRate));

  const actionItems = [
    {
      label: "Pending leave approvals",
      value: `${data.metrics.pendingLeaves} requests`,
      meta: "Requires manager sign-off",
      icon: CalendarClock,
      tone: "border-amber-200/70 bg-amber-50/60 text-amber-700",
      iconTone: "bg-amber-100 text-amber-700",
    },
    {
      label: "Open roles in pipeline",
      value: `${data.metrics.activeOpenings} roles`,
      meta: "Review hiring stages today",
      icon: BriefcaseBusiness,
      tone: "border-indigo-200/70 bg-indigo-50/60 text-indigo-700",
      iconTone: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Payroll review",
      value: formatCurrency(data.metrics.payrollTotal),
      meta: "Total for current cycle",
      icon: CircleDollarSign,
      tone: "border-emerald-200/70 bg-emerald-50/60 text-emerald-700",
      iconTone: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time view of headcount, attendance, and payroll readiness."
        eyebrow="Executive Dashboard"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={String(data.metrics.totalEmployees)}
          icon={Users}
          hint={`${data.metrics.activeEmployees} active`}
          accent
        />
        <StatCard
          title="Active Openings"
          value={String(data.metrics.activeOpenings)}
          icon={BriefcaseBusiness}
          hint="Hiring pipeline"
        />
        <StatCard
          title="Attendance Rate"
          value={formatPercent(data.metrics.attendanceRate)}
          icon={Clock3}
          hint="Present + remote"
        />
        <StatCard
          title="Payroll Total"
          value={formatCurrency(data.metrics.payrollTotal)}
          icon={CircleDollarSign}
          hint="Current cycle"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Workforce Pulse" subtitle="Active headcount health and attendance quality">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Active Employees",
                value: data.metrics.activeEmployees,
                meta: `${activeRate}% of total`,
                tone: "border-emerald-200/70 bg-emerald-50/60 text-emerald-700",
              },
              {
                label: "Pending Leaves",
                value: data.metrics.pendingLeaves,
                meta: "Awaiting approval",
                tone: "border-amber-200/70 bg-amber-50/60 text-amber-700",
              },
              {
                label: "Open Positions",
                value: data.metrics.activeOpenings,
                meta: "Hiring in flight",
                tone: "border-indigo-200/70 bg-indigo-50/60 text-indigo-700",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl border p-4 ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{item.meta}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Attendance Health</span>
                <span className="text-emerald-700">{formatPercent(attendanceRate)}</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Based on present + remote check-ins across the company.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Active Workforce</span>
                <span className="text-brand-700">{activeRate}%</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-brand-600 transition-all"
                  style={{ width: `${activeRate}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Active employees vs. total headcount.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Action Center" subtitle="What needs attention right now">
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${item.tone}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconTone}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="text-xs font-medium text-slate-500">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
