import { useCallback, useEffect, useState } from "react";
import { Building2, CalendarClock, Landmark, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { EmployeePrivateDetailsForm } from "../components/EmployeePrivateDetailsForm";
import { NewUserSetupModal } from "../components/NewUserSetupModal";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { useAuthSession } from "../hooks/useAuthSession";
import { hrService, isNewUserEmployeeSetupError } from "../services/hrService";
import type { EmployeeProfileDetailsPayload } from "../types/hr";
import { formatDate } from "../utils/formatters";
import {
  emptyEmployeeProfileDetails,
  hasCompleteEmployeeProfileDetails,
  toEmployeeProfileDetailsPayload,
} from "../utils/employeeProfile";

export function EmployeeProfilePage() {
  const { profile, signOut } = useAuthSession();
  const employeeHook = useApi(useCallback(() => hrService.getCurrentEmployee(), []));
  const settingsHook = useApi(useCallback(() => hrService.getSettings(), []));
  const [detailsDraft, setDetailsDraft] = useState<EmployeeProfileDetailsPayload>(emptyEmployeeProfileDetails);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeHook.data) {
      return;
    }

    setDetailsDraft(toEmployeeProfileDetailsPayload(employeeHook.data));
  }, [employeeHook.data]);

  if (employeeHook.loading) {
    return <p className="text-sm font-semibold text-brand-700">Loading profile...</p>;
  }

  if (isNewUserEmployeeSetupError(employeeHook.error)) {
    return <NewUserSetupModal email={profile?.email} onSignOut={() => void signOut()} />;
  }

  if (employeeHook.error || !employeeHook.data) {
    return <p className="text-sm font-semibold text-rose-700">{employeeHook.error ?? "Profile unavailable"}</p>;
  }

  const employee = employeeHook.data;
  const detailsComplete = hasCompleteEmployeeProfileDetails(employee);

  const handleDetailsChange = (field: keyof EmployeeProfileDetailsPayload, value: string) => {
    setDetailsError(null);
    setDetailsMessage(null);
    setDetailsDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveDetails = async () => {
    setDetailsSaving(true);
    setDetailsError(null);
    setDetailsMessage(null);

    try {
      const updatedEmployee = await hrService.upsertMyProfileDetails(detailsDraft);
      employeeHook.setData(updatedEmployee);
      setDetailsDraft(toEmployeeProfileDetailsPayload(updatedEmployee));
      setDetailsMessage("Profile details updated.");
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : "Unable to update profile details.");
    } finally {
      setDetailsSaving(false);
    }
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader title="My Profile" eyebrow="Employee Profile" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Department" value={employee.department} icon={Building2} />
        <StatCard title="Manager" value={employee.manager} icon={ShieldCheck} />
        <StatCard title="Location" value={employee.location} icon={MapPin} />
        <StatCard title="Joined" value={formatDate(employee.joinDate)} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="hero-panel relative overflow-hidden rounded-[32px] border p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_36%)]" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-extrabold text-brand-950">{employee.name}</h2>
                  <p className="mt-2 inline-flex rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-brand-900 shadow-sm ring-1 ring-brand-200/80">
                    {employee.email}
                  </p>
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

        <SectionCard title="Policy Defaults">
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Private Details"
          rightSlot={
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${
                detailsComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {detailsComplete ? "Complete" : "Action needed"}
            </span>
          }
        >
          <EmployeePrivateDetailsForm
            value={detailsDraft}
            onChange={handleDetailsChange}
            onSubmit={handleSaveDetails}
            submitting={detailsSaving}
            submitLabel="Save private details"
            error={detailsError}
            successMessage={detailsMessage}
          />
        </SectionCard>

        <SectionCard title="Verification Snapshot">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                <Phone className="h-3.5 w-3.5" />
                Mobile
              </p>
              <p className="mt-2 text-sm font-semibold text-brand-900">{employee.mobile ?? "Pending update"}</p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
                <Landmark className="h-3.5 w-3.5" />
                Bank
              </p>
              <p className="mt-2 text-sm font-semibold text-brand-900">{employee.bankName ?? "Pending update"}</p>
              <p className="mt-1 text-xs text-slate-500">{employee.bankAccountNumber ?? "Account number missing"}</p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">PAN</p>
              <p className="mt-2 text-sm font-semibold text-brand-900">{employee.pan ?? "Pending update"}</p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Address</p>
              <p className="mt-2 text-sm font-semibold text-brand-900 whitespace-pre-line">
                {employee.address ?? "Pending update"}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Profile Card">
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
