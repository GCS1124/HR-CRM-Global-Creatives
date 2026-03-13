import { useCallback } from "react";
import { Building2, CalendarClock, MapPin, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { ModuleHero } from "../components/ModuleHero";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import { formatDate } from "../utils/formatters";

export function EmployeeProfilePage() {
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const settingsHook = useApi(useCallback(() => hrService.getSettings(), []));

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-brand-700">Loading profile...</p>;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Profile unavailable"}</p>;
  }

  const employee = employeeHook.data;

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Review your HR profile details, reporting line, and policy defaults"
        eyebrow="Employee Profile"
      />

      <ModuleHero
        icon={UserRound}
        title="Your Core Employment Details"
        subtitle="Keep profile information aligned with HR records and understand current policy settings through a cleaner profile view."
        chips={["Employment info", "Manager visibility", "Policy context"]}
        spotlight={employee.department}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Department" value={employee.department} icon={Building2} />
        <StatCard title="Manager" value={employee.manager} icon={ShieldCheck} />
        <StatCard title="Location" value={employee.location} icon={MapPin} />
        <StatCard title="Joined" value={formatDate(employee.joinDate)} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-brand-200 bg-[linear-gradient(135deg,rgba(243,248,255,0.98),rgba(225,236,255,0.95))] p-6 shadow-soft">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(33,91,184,0.12),transparent_36%)]" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              Identity Snapshot
            </p>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold text-brand-950">{employee.name}</h2>
                <p className="mt-1 text-sm text-brand-700">{employee.email}</p>
              </div>
              <StatusBadge value={employee.status} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-200 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Role</p>
                <p className="mt-2 text-lg font-bold text-brand-900">{employee.role}</p>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Reporting To</p>
                <p className="mt-2 text-lg font-bold text-brand-900">{employee.manager}</p>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Location</p>
                <p className="mt-2 text-lg font-bold text-brand-900">{employee.location}</p>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-white/90 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Performance Signal</p>
                <p className="mt-2 text-lg font-bold text-brand-900">{employee.performanceScore}%</p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard title="Policy Defaults" subtitle="Current global settings inherited in your workspace">
          {settingsHook.loading ? <p className="text-sm font-semibold text-brand-700">Loading policy defaults...</p> : null}
          {settingsHook.error ? <p className="text-sm font-semibold text-rose-700">{settingsHook.error}</p> : null}

          {settingsHook.data ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Annual Leave</p>
                <p className="mt-2 text-2xl font-extrabold text-brand-900">{settingsHook.data.leavePolicy.annual}</p>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Sick Leave</p>
                <p className="mt-2 text-2xl font-extrabold text-brand-900">{settingsHook.data.leavePolicy.sick}</p>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Casual Leave</p>
                <p className="mt-2 text-2xl font-extrabold text-brand-900">{settingsHook.data.leavePolicy.casual}</p>
              </div>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Profile Card" subtitle="Current employee record">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Department</p>
            <p className="mt-2 text-sm font-semibold text-brand-900">{employee.department}</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Join Date</p>
            <p className="mt-2 text-sm font-semibold text-brand-900">{formatDate(employee.joinDate)}</p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Status</p>
            <div className="mt-2">
              <StatusBadge value={employee.status} />
            </div>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Email</p>
            <p className="mt-2 text-sm font-semibold text-brand-900 break-all">{employee.email}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
