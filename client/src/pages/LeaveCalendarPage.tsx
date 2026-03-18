import { useCallback } from "react";
import { CalendarRange, ShieldCheck } from "lucide-react";
import { LeaveCalendar } from "../components/LeaveCalendar";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";

export function LeaveCalendarPage() {
  const leaveHook = useApi(useCallback(() => hrService.getLeaveRequests(), []));
  const employeesHook = useApi(useCallback(() => hrService.getEmployees(), []));

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Leave Coverage Calendar"
        subtitle="Spot overlapping leave days and coverage risk before approvals land."
        eyebrow="Coverage Planning"
      />

      <ModuleHero
        icon={CalendarRange}
        title="Balance Leave Decisions With Real Coverage Data"
        subtitle="Monitor overlap by department and prioritize staffing gaps before approving time off."
        chips={["Overlap alerts", "Department view", "Risk signals"]}
        spotlight="Live coverage map"
      />

      <SectionCard title="Monthly Coverage View" subtitle="Department-level overlap and risk heat"> 
        {leaveHook.loading || employeesHook.loading ? (
          <p className="text-sm font-semibold text-brand-700">Loading leave coverage...</p>
        ) : null}
        {leaveHook.error ? <p className="text-sm font-semibold text-rose-700">{leaveHook.error}</p> : null}
        {employeesHook.error ? <p className="text-sm font-semibold text-rose-700">{employeesHook.error}</p> : null}
        {!leaveHook.loading && !employeesHook.loading ? (
          <LeaveCalendar requests={leaveHook.data ?? []} employees={employeesHook.data ?? []} />
        ) : null}
      </SectionCard>

      <SectionCard title="Approval Guidance" subtitle="Best practices for high-risk windows">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
              <ShieldCheck className="h-4 w-4" />
              Guard critical launches
            </p>
            <p className="mt-1 text-sm font-medium text-brand-600">
              Avoid approving overlapping leave during payroll week, client delivery sprints, or onboarding cycles.
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
              <ShieldCheck className="h-4 w-4" />
              Balance by department
            </p>
            <p className="mt-1 text-sm font-medium text-brand-600">
              Any day with 2+ leaves inside a single department should trigger a staffing check.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
