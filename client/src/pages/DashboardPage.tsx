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
  sourced: "bg-slate-50 text-slate-700 border-slate-200",
  interview: "bg-sky-50 text-sky-700 border-sky-200",
  offer: "bg-amber-50 text-amber-700 border-amber-200",
  hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const priorityTone: Record<string, string> = {
  info: "border-sky-100 bg-sky-50/50",
  success: "border-emerald-100 bg-emerald-50/50",
  warning: "border-amber-100 bg-amber-50/50",
  critical: "border-rose-100 bg-rose-50/50",
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
      return;
    }

    const timer = window.setTimeout(() => setShowBroadcasts(false), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  if (dashboardHook.loading) return <div className="p-8 text-center"><p className="text-sm font-black text-brand-700 animate-pulse">Syncing Command Center...</p></div>;
  if (dashboardHook.error || !dashboardHook.data) return <div className="p-8 text-center text-rose-600 font-bold">{dashboardHook.error ?? "Failed to load signals."}</div>;

  const { overview, command } = dashboardHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Live operating signals."
        eyebrow="Admin"
        action={
          <Link to="/admin/payroll" className="btn-primary">
            Payroll
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {showBroadcasts && <AnnouncementStrip announcements={announcementsHook.data ?? []} loading={announcementsHook.loading} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Headcount" value={String(overview.metrics.totalEmployees)} icon={Users} hint={`${overview.metrics.activeEmployees} active profiles`} accent />
        <StatCard title="Open Positions" value={String(overview.metrics.activeOpenings)} icon={BriefcaseBusiness} hint="Active talent intake" />
        <StatCard title="Presence Rate" value={formatPercent(overview.metrics.attendanceRate)} icon={Clock3} hint={`${command.attendanceBreakdown.late} late today`} />
        <StatCard title="Cycle Exposure" value={formatCurrency(overview.metrics.payrollTotal)} icon={CircleDollarSign} hint={`${command.payrollHealth.processedCount} processed`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SectionCard
          title="Department Health"
          subtitle="Headcount, payroll, and performance distribution"
          collapsible
          defaultCollapsed
        >
          <div className="grid gap-4 md:grid-cols-2">
            {command.departmentSnapshots.map((d) => {
              const rate = d.headcount ? Math.round((d.activeCount / d.headcount) * 100) : 0;
              return (
                <div key={d.department} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[0.65rem] font-black uppercase text-brand-600 tracking-wider">{d.department}</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{d.headcount} <span className="text-xs text-slate-400 font-bold tracking-normal">People</span></p>
                    </div>
                    <span className="text-[0.6rem] font-black bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{rate}% Active</span>
                  </div>
                  <div className="mt-4 flex gap-4 text-center border-t border-slate-100/60 pt-3">
                    <div className="flex-1"><p className="text-[0.55rem] font-black uppercase text-slate-400">Payroll</p><p className="text-xs font-black text-slate-700 truncate">{formatCurrency(d.payrollTotal)}</p></div>
                    <div className="flex-1 border-x border-slate-100/60"><p className="text-[0.55rem] font-black uppercase text-slate-400">Leave</p><p className="text-xs font-black text-slate-700">{d.leaveCount}</p></div>
                    <div className="flex-1"><p className="text-[0.55rem] font-black uppercase text-slate-400">Score</p><p className="text-xs font-black text-slate-700">{d.avgPerformance}%</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Priority Queue" subtitle="Actionable items requiring leadership review">
          <div className="space-y-3">
            {command.priorityItems.map((item) => (
              <Link key={item.id} to={item.route} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${priorityTone[item.tone] || priorityTone.info}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 truncate">{item.title}</p>
                  <p className="text-sm font-bold text-slate-600 truncate mt-0.5">{item.value}</p>
                  <p className="text-[0.65rem] font-bold text-slate-400 mt-1">{item.meta}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 ml-2" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Execution Velocity"
          subtitle="Task pressure and recruiting cadence"
          collapsible
          defaultCollapsed
        >
           <div className="grid gap-4 sm:grid-cols-3">
              {[
                { l: "To do", v: command.taskSummary.todo, i: Layers3 },
                { l: "In progress", v: command.taskSummary.inProgress, i: KanbanSquare },
                { l: "Blocked", v: command.taskSummary.blocked, i: TriangleAlert, t: "text-amber-600" },
                { l: "Done", v: command.taskSummary.done, i: Clock3 },
                { l: "Overdue", v: command.taskSummary.overdue, i: CalendarClock, t: "text-rose-600" },
                { l: "Critical", v: command.taskSummary.critical, i: TriangleAlert, t: "text-rose-700" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-white">
                   <div className="flex items-center justify-between">
                      <span className="text-[0.55rem] font-black uppercase text-slate-400">{item.l}</span>
                      <item.i className={`h-3.5 w-3.5 ${item.t || "text-brand-600"}`} />
                   </div>
                   <p className={`mt-2 text-xl font-black ${item.t || "text-slate-900"}`}>{item.v}</p>
                </div>
              ))}
           </div>
           
           <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-[0.65rem] font-black uppercase text-slate-400 tracking-wider mb-4">Talent Intake Funnel</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {command.candidatePipeline.map((p) => (
                  <div key={p.stage} className={`p-2.5 rounded-xl border flex flex-col items-center text-center ${stageTone[p.stage] || stageTone.sourced}`}>
                    <span className="text-[0.55rem] font-black uppercase truncate w-full">{p.stage.replace("_", " ")}</span>
                    <span className="text-lg font-black mt-1">{p.count}</span>
                  </div>
                ))}
              </div>
           </div>
        </SectionCard>

        <SectionCard
          title="System Resilience"
          subtitle="Workforce attendance and payroll readiness"
          collapsible
          defaultCollapsed
        >
           <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <p className="text-[0.65rem] font-black uppercase text-slate-400 tracking-wider">Attendance Mix</p>
                <div className="space-y-3">
                  {[
                    { l: "Present", v: command.attendanceBreakdown.present, c: "bg-brand-600" },
                    { l: "Remote", v: command.attendanceBreakdown.remote, c: "bg-sky-400" },
                    { l: "Late", v: command.attendanceBreakdown.late, c: "bg-amber-500" },
                    { l: "Absent", v: command.attendanceBreakdown.absent, c: "bg-rose-500" },
                  ].map((item) => {
                    const total = Object.values(command.attendanceBreakdown).reduce((a, b) => a + b, 0);
                    const w = total > 0 ? Math.max((item.v / total) * 100, 4) : 4;
                    return (
                      <div key={item.l}>
                        <div className="flex justify-between text-[0.65rem] font-black mb-1.5">
                           <span className="text-slate-500 uppercase">{item.l}</span>
                           <span className="text-slate-900">{item.v}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full ${item.c} transition-all duration-1000`} style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[0.65rem] font-black uppercase text-slate-400 tracking-wider">Financial Snapshot</p>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                   <p className="text-[0.55rem] font-black uppercase text-emerald-600">Exposure</p>
                   <p className="text-xl font-black text-emerald-900 mt-1">{formatCurrency(command.payrollHealth.scheduledExposure)}</p>
                   <p className="text-[0.6rem] font-bold text-emerald-700/70 mt-1">{command.payrollHealth.scheduledCount} records pending</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <p className="text-[0.55rem] font-black uppercase text-slate-400">Avg Pay</p>
                      <p className="text-xs font-black text-slate-700 mt-1">{formatCurrency(command.payrollHealth.averageNetPay)}</p>
                   </div>
                   <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <p className="text-[0.55rem] font-black uppercase text-slate-400">Processed</p>
                      <p className="text-xs font-black text-slate-700 mt-1">{command.payrollHealth.processedCount}</p>
                   </div>
                </div>
              </div>
           </div>
        </SectionCard>
      </div>
    </div>
  );
}
