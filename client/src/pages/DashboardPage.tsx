import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  KanbanSquare,
  Layers3,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AnnouncementStrip } from "../components/AnnouncementStrip";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import { getLoginBroadcastRemainingMs } from "../utils/loginBroadcast";
import { formatCurrency, formatPercent } from "../utils/formatters";

const stageTone: Record<string, string> = {
  sourced: "border-slate-200/80 bg-slate-50/80 text-slate-800",
  interview: "border-sky-200/80 bg-sky-50/80 text-sky-800",
  offer: "border-amber-200/80 bg-amber-50/80 text-amber-800",
  hired: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
  rejected: "border-rose-200/80 bg-rose-50/80 text-rose-800",
};

const priorityTone: Record<string, string> = {
  info: "border-sky-200/80 bg-sky-50/80",
  success: "border-emerald-200/80 bg-emerald-50/80",
  warning: "border-amber-200/80 bg-amber-50/80",
  critical: "border-rose-200/80 bg-rose-50/80",
};

export function DashboardPage() {
  const dashboardHook = useApi(
    useCallback(async () => {
      const [overview, command] = await Promise.all([
        hrService.getDashboardOverview(),
        hrService.getAdminCommandCenterData(),
      ]);

      return { overview, command };
    }, []),
  );
  const announcementsHook = useApi(useCallback(() => hrService.getAnnouncements("admin"), []));
  const [showBroadcasts, setShowBroadcasts] = useState(() => getLoginBroadcastRemainingMs() > 0);

  useEffect(() => {
    const remaining = getLoginBroadcastRemainingMs();
    if (remaining <= 0) {
      setShowBroadcasts(false);
      return;
    }

    setShowBroadcasts(true);
    const timer = window.setTimeout(() => setShowBroadcasts(false), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  if (dashboardHook.loading) {
    return <p className="text-sm font-semibold text-brand-800">Loading dashboard...</p>;
  }

  if (dashboardHook.error || !dashboardHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{dashboardHook.error ?? "Failed to load dashboard"}</p>;
  }

  const { overview, command } = dashboardHook.data;
  const activeRate = overview.metrics.totalEmployees
    ? Math.round((overview.metrics.activeEmployees / overview.metrics.totalEmployees) * 100)
    : 0;
  const attendanceRate = Math.min(100, Math.max(0, overview.metrics.attendanceRate));

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Command the people, payroll, attendance, and hiring system from one high-signal view."
        eyebrow="Admin Command Center"
        action={
          <Link to="/admin/payroll" className="btn-primary px-4 py-2.5">
            Open payroll cockpit
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {showBroadcasts ? (
        <AnnouncementStrip announcements={announcementsHook.data ?? []} loading={announcementsHook.loading} />
      ) : null}

      <section className="hero-panel relative overflow-hidden rounded-[32px] border p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,157,0,0.2),transparent_24%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/90">
              <Layers3 className="h-3.5 w-3.5" />
              Operating Signal
            </p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] text-white">
              Your HR CRM is now a proper operations layer, not just a list of modules.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/78">
              Track workforce health, blocked delivery, recruiting momentum, and payroll readiness without leaving the dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/58">Active workforce</p>
                <p className="mt-2 text-3xl font-bold text-white">{activeRate}%</p>
                <p className="mt-1 text-sm text-white/70">Headcount currently active</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/58">Blocked tasks</p>
                <p className="mt-2 text-3xl font-bold text-white">{command.taskSummary.blocked}</p>
                <p className="mt-1 text-sm text-white/70">Require decision or owner recovery</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/58">Next payroll cycle</p>
                <p className="mt-2 text-3xl font-bold text-white">{command.payrollHealth.nextCycleLabel ?? "--"}</p>
                <p className="mt-1 text-sm text-white/70">Cycle already inferred from live records</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/58">Attendance health</p>
                <p className="mt-2 text-3xl font-bold text-white">{formatPercent(attendanceRate)}</p>
                <p className="mt-1 text-sm text-white/70">Present + remote against headcount</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {overview.highlights.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/14 bg-white/10 p-4 backdrop-blur">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/58">{item.title}</p>
                <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={String(overview.metrics.totalEmployees)}
          icon={Users}
          hint={`${overview.metrics.activeEmployees} active`}
          accent
        />
        <StatCard
          title="Active Openings"
          value={String(overview.metrics.activeOpenings)}
          icon={BriefcaseBusiness}
          hint="Live recruiting pipeline"
        />
        <StatCard
          title="Attendance Rate"
          value={formatPercent(overview.metrics.attendanceRate)}
          icon={Clock3}
          hint={`${command.attendanceBreakdown.late} late and ${command.attendanceBreakdown.absent} absent`}
        />
        <StatCard
          title="Payroll Total"
          value={formatCurrency(overview.metrics.payrollTotal)}
          icon={CircleDollarSign}
          hint={`${command.payrollHealth.processedCount} processed this cycle`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Department Performance" subtitle="Where headcount, payroll, and leave pressure are concentrated">
          <div className="grid gap-4 md:grid-cols-2">
            {command.departmentSnapshots.map((department) => {
              const departmentActiveRate = department.headcount
                ? Math.round((department.activeCount / department.headcount) * 100)
                : 0;

              return (
                <div key={department.department} className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-800">{department.department}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{department.headcount} people</p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                      {departmentActiveRate}% active
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payroll</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{formatCurrency(department.payrollTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pending leave</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{department.leaveCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Performance</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{department.avgPerformance}/100</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Priority Queue" subtitle="The next issues leadership should clear">
          <div className="space-y-3">
            {command.priorityItems.map((item) => (
              <Link
                key={item.id}
                to={item.route}
                className={`flex items-start justify-between gap-3 rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)] ${priorityTone[item.tone]}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-700" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Execution Grid" subtitle="Task pressure, recruiting flow, and workforce attendance">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "To do", value: command.taskSummary.todo, icon: Layers3 },
              { label: "In progress", value: command.taskSummary.inProgress, icon: KanbanSquare },
              { label: "Blocked", value: command.taskSummary.blocked, icon: TriangleAlert },
              { label: "Done", value: command.taskSummary.done, icon: Clock3 },
              { label: "Overdue", value: command.taskSummary.overdue, icon: CalendarClock },
              { label: "Critical", value: command.taskSummary.critical, icon: TriangleAlert },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/88 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <item.icon className="h-4 w-4 text-brand-700" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Recruiting cadence</p>
              <div className="mt-4 grid gap-2">
                {command.candidatePipeline.map((item) => (
                  <div key={item.stage} className={`rounded-2xl border px-3 py-3 ${stageTone[item.stage] ?? stageTone.sourced}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold capitalize">{item.stage.replace("_", " ")}</p>
                      <p className="text-lg font-semibold">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Attendance breakdown</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Present", value: command.attendanceBreakdown.present, width: "#2a7b9b" },
                  { label: "Remote", value: command.attendanceBreakdown.remote, width: "#57c5c7" },
                  { label: "Late", value: command.attendanceBreakdown.late, width: "#ff9d00" },
                  { label: "Absent", value: command.attendanceBreakdown.absent, width: "#fb7185" },
                ].map((item) => {
                  const total = Object.values(command.attendanceBreakdown).reduce((sum, value) => sum + value, 0);
                  const width = total > 0 ? Math.max((item.value / total) * 100, item.value > 0 ? 8 : 0) : 0;

                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: item.width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payroll Cockpit" subtitle="Financial readiness for the current and next cycle">
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-emerald-200/80 bg-emerald-50/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Scheduled exposure</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(command.payrollHealth.scheduledExposure)}</p>
              <p className="mt-1 text-sm text-slate-600">{command.payrollHealth.scheduledCount} records still waiting for processing.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Average net pay</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(command.payrollHealth.averageNetPay)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Highest payout</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(command.payrollHealth.highestNetPay)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Processed count</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{command.payrollHealth.processedCount}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Next cycle</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{command.payrollHealth.nextCycleLabel ?? "--"}</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
