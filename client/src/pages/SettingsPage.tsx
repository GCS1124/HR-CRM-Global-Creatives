import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookCheck,
  Building2,
  CalendarDays,
  Clock3,
  Copy,
  Download,
  Globe2,
  Landmark,
  RotateCcw,
  Save,
  Workflow,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useApi } from "../hooks/useApi";
import { hrService } from "../services/hrService";
import type { UpdateCRMSettingsPayload } from "../types/hr";
import { copyText, downloadJson } from "../utils/fileExport";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timezoneOptions = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai"];
const payrollCycleOptions = ["Monthly", "Semi-monthly", "Bi-weekly", "Weekly"];

const checklistSeed = {
  handbook: true,
  payrollAudit: true,
  managerTraining: false,
  timezoneNotice: false,
};

const settingTemplates: Array<{
  id: string;
  label: string;
  description: string;
  values: Pick<UpdateCRMSettingsPayload, "payrollCycle" | "workingDays" | "workHours" | "leavePolicy">;
}> = [
  {
    id: "standard_5_day",
    label: "Standard 5-day",
    description: "Default corporate workweek with monthly payroll cadence.",
    values: {
      payrollCycle: "Monthly",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workHours: "09:00 - 18:00",
      leavePolicy: { annual: 18, sick: 8, casual: 6 },
    },
  },
  {
    id: "agency_6_day",
    label: "Agency 6-day",
    description: "High-output creative operations with Saturday coverage.",
    values: {
      payrollCycle: "Semi-monthly",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      workHours: "10:00 - 19:00",
      leavePolicy: { annual: 15, sick: 8, casual: 5 },
    },
  },
  {
    id: "distributed_remote",
    label: "Distributed remote",
    description: "Global remote teams with stronger leave buffer and shorter hours.",
    values: {
      payrollCycle: "Bi-weekly",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workHours: "08:00 - 16:00",
      leavePolicy: { annual: 20, sick: 10, casual: 7 },
    },
  },
];

function getDailyHours(workHours: string): number {
  const match = workHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) {
    return 8;
  }

  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  const totalMinutes = Math.max(end - start, 0);
  return Number((totalMinutes / 60).toFixed(1));
}

function getPayrollRunsPerYear(payrollCycle: string): number {
  const normalized = payrollCycle.toLowerCase();
  if (normalized.includes("weekly") && !normalized.includes("bi")) {
    return 52;
  }
  if (normalized.includes("bi")) {
    return 26;
  }
  if (normalized.includes("semi")) {
    return 24;
  }
  return 12;
}

export function SettingsPage() {
  const settingsHook = useApi(useCallback(() => hrService.getSettings(), []));
  const [draft, setDraft] = useState<UpdateCRMSettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(checklistSeed);

  useEffect(() => {
    if (settingsHook.data) {
      setDraft(settingsHook.data);
    }
  }, [settingsHook.data]);

  const updateDraft = <K extends keyof UpdateCRMSettingsPayload>(field: K, value: UpdateCRMSettingsPayload[K]) => {
    setSaveError(null);
    setSaveMessage(null);
    setWorkspaceMessage(null);
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const derived = useMemo(() => {
    if (!draft) {
      return null;
    }

    const workingDayCount = draft.workingDays.length;
    const nonWorkingDays = weekDays.filter((day) => !draft.workingDays.includes(day));
    const totalLeaveAllowance = draft.leavePolicy.annual + draft.leavePolicy.sick + draft.leavePolicy.casual;
    const dailyHours = getDailyHours(draft.workHours);
    const weeklyHours = Number((dailyHours * workingDayCount).toFixed(1));
    const payrollRunsPerYear = getPayrollRunsPerYear(draft.payrollCycle);

    return {
      workingDayCount,
      nonWorkingDays,
      totalLeaveAllowance,
      dailyHours,
      weeklyHours,
      payrollRunsPerYear,
    };
  }, [draft]);

  const changeList = useMemo(() => {
    if (!settingsHook.data || !draft) {
      return [];
    }

    const live = settingsHook.data;
    const changes: Array<{ label: string; before: string; after: string }> = [];

    if (live.companyName !== draft.companyName) {
      changes.push({ label: "Company name", before: live.companyName, after: draft.companyName });
    }
    if (live.timezone !== draft.timezone) {
      changes.push({ label: "Timezone", before: live.timezone, after: draft.timezone });
    }
    if (live.payrollCycle !== draft.payrollCycle) {
      changes.push({ label: "Payroll cycle", before: live.payrollCycle, after: draft.payrollCycle });
    }
    if (live.workHours !== draft.workHours) {
      changes.push({ label: "Work hours", before: live.workHours, after: draft.workHours });
    }
    if (live.workingDays.join(",") !== draft.workingDays.join(",")) {
      changes.push({ label: "Working days", before: live.workingDays.join(", "), after: draft.workingDays.join(", ") });
    }
    if (live.leavePolicy.annual !== draft.leavePolicy.annual) {
      changes.push({ label: "Annual leave", before: String(live.leavePolicy.annual), after: String(draft.leavePolicy.annual) });
    }
    if (live.leavePolicy.sick !== draft.leavePolicy.sick) {
      changes.push({ label: "Sick leave", before: String(live.leavePolicy.sick), after: String(draft.leavePolicy.sick) });
    }
    if (live.leavePolicy.casual !== draft.leavePolicy.casual) {
      changes.push({ label: "Casual leave", before: String(live.leavePolicy.casual), after: String(draft.leavePolicy.casual) });
    }

    return changes;
  }, [draft, settingsHook.data]);

  const riskFlags = useMemo(() => {
    if (!draft || !derived) {
      return [];
    }

    const flags: Array<{ title: string; detail: string; value: string }> = [];

    if (derived.workingDayCount < 5) {
      flags.push({ title: "Light workweek coverage", detail: "Fewer than 5 working days may create leave and attendance edge cases.", value: `${derived.workingDayCount} days` });
    }
    if (derived.nonWorkingDays.length === 0) {
      flags.push({ title: "No recovery day configured", detail: "Every day is marked as working, which is risky for compliance and attendance policy.", value: "0 off days" });
    }
    if (derived.weeklyHours > 48) {
      flags.push({ title: "Weekly hour load is high", detail: "Configured work hours exceed a typical sustainable planning threshold.", value: `${derived.weeklyHours} hrs/week` });
    }
    if (derived.totalLeaveAllowance < 18) {
      flags.push({ title: "Leave buffer is tight", detail: "Low total leave allowance can increase approval pressure later in the year.", value: `${derived.totalLeaveAllowance} days` });
    }
    if (derived.payrollRunsPerYear < 12) {
      flags.push({ title: "Payroll cadence is sparse", detail: "Long intervals between runs may not match a high-frequency operational environment.", value: `${derived.payrollRunsPerYear} runs/year` });
    }

    return flags;
  }, [derived, draft]);

  const memoText = useMemo(() => {
    if (!draft || !derived) {
      return "";
    }

    return [
      `${draft.companyName} operates on a ${derived.workingDayCount}-day workweek with ${draft.workHours} daily hours in ${draft.timezone}.`,
      `Payroll is configured as ${draft.payrollCycle}, which results in approximately ${derived.payrollRunsPerYear} payroll runs per year.`,
      `The configured leave allowance totals ${derived.totalLeaveAllowance} days per employee across annual, sick, and casual categories.`,
      derived.nonWorkingDays.length > 0
        ? `Non-working days are ${derived.nonWorkingDays.join(", ")}, which should be reflected in attendance and manager coverage planning.`
        : "No non-working days are currently configured, so attendance exceptions and rest-day policies should be reviewed immediately.",
    ].join("\n\n");
  }, [derived, draft]);

  const checklistCompletion = useMemo(() => {
    const completed = Object.values(checklist).filter(Boolean).length;
    return Math.round((completed / Object.keys(checklist).length) * 100);
  }, [checklist]);

  if (settingsHook.loading || !draft || !derived) {
    return <p className="text-sm font-semibold text-slate-600">Loading settings...</p>;
  }

  if (settingsHook.error) {
    return <p className="text-sm font-semibold text-rose-700">{settingsHook.error}</p>;
  }

  const isDirty = changeList.length > 0;

  const toggleWorkingDay = (day: string) => {
    const nextDays = draft.workingDays.includes(day)
      ? draft.workingDays.filter((value) => value !== day)
      : weekDays.filter((value) => value === day || draft.workingDays.includes(value));

    updateDraft("workingDays", nextDays);
  };

  const handleTemplateApply = (templateId: string) => {
    const template = settingTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            payrollCycle: template.values.payrollCycle,
            workingDays: template.values.workingDays,
            workHours: template.values.workHours,
            leavePolicy: template.values.leavePolicy,
          }
        : current,
    );
    setWorkspaceMessage(`${template.label} template applied to the draft configuration.`);
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleLeavePolicyChange = (field: keyof UpdateCRMSettingsPayload["leavePolicy"], value: string) => {
    updateDraft("leavePolicy", {
      ...draft.leavePolicy,
      [field]: Number(value),
    });
  };

  const handleReset = () => {
    if (!settingsHook.data) {
      return;
    }

    setDraft(settingsHook.data);
    setSaveError(null);
    setSaveMessage(null);
    setWorkspaceMessage("Draft reset to the live configuration.");
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setWorkspaceMessage(null);

    try {
      await hrService.updateSettings(draft);
      await settingsHook.refetch();
      setSaveMessage("Settings saved to Supabase.");
    } catch (issue) {
      setSaveError(issue instanceof Error ? issue.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadJson(`crm-settings-${new Date().toISOString().slice(0, 10)}.json`, draft);
    setWorkspaceMessage("Configuration exported as JSON.");
  };

  const handleCopyMemo = async () => {
    try {
      await copyText(memoText);
      setWorkspaceMessage("Policy memo copied to clipboard.");
    } catch (issue) {
      setWorkspaceMessage(issue instanceof Error ? issue.message : "Unable to copy memo.");
    }
  };

  return (
    <div className="animate-page-enter space-y-6">
      <PageHeader
        title="Settings"
        subtitle="This is now a real admin configuration studio: edit policies, test templates, inspect change impact, save to Supabase, and export or circulate the resulting policy memo."
        eyebrow="Organization configuration"
        action={
          <>
            <button type="button" onClick={handleExport} className="btn-secondary">
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button type="button" onClick={() => void handleCopyMemo()} className="btn-secondary">
              <Copy className="h-4 w-4" />
              Copy memo
            </button>
            {isDirty ? (
              <button type="button" onClick={handleReset} className="btn-secondary">
                <RotateCcw className="h-4 w-4" />
                Reset draft
              </button>
            ) : null}
            <button type="button" onClick={() => void handleSave()} disabled={!isDirty || saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Company" value={draft.companyName} icon={Building2} hint="Live organization profile" />
        <StatCard title="Timezone" value={draft.timezone} icon={Globe2} hint="Default system timezone" />
        <StatCard title="Payroll cadence" value={draft.payrollCycle} icon={CalendarDays} hint={`${derived.payrollRunsPerYear} runs per year`} />
        <StatCard title="Weekly load" value={`${derived.weeklyHours} hrs`} icon={Clock3} hint={`${derived.totalLeaveAllowance} total leave days`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Configuration studio" subtitle="Edit the organization-level defaults that shape attendance, leave, and payroll behavior">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Company name</label>
              <input value={draft.companyName} onChange={(event) => updateDraft("companyName", event.target.value)} className="input-surface w-full" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</label>
              <select value={draft.timezone} onChange={(event) => updateDraft("timezone", event.target.value)} className="input-surface w-full">
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payroll cycle</label>
              <select value={draft.payrollCycle} onChange={(event) => updateDraft("payrollCycle", event.target.value)} className="input-surface w-full">
                {payrollCycleOptions.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Work hours</label>
              <input value={draft.workHours} onChange={(event) => updateDraft("workHours", event.target.value)} className="input-surface w-full" placeholder="09:00 - 18:00" />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Templates</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {settingTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateApply(template.id)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
                >
                  <p className="text-sm font-semibold text-slate-950">{template.label}</p>
                  <p className="mt-2 text-sm text-slate-600">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Change center"
          subtitle="Dirty-state tracking, status messaging, and the exact fields that will change on save"
          rightSlot={<StatusBadge value={isDirty ? "pending" : "approved"} />}
          collapsible
          defaultCollapsed
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Unsaved changes</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{changeList.length}</p>
              <p className="mt-2 text-sm text-slate-600">Fields that differ from the live settings record.</p>
            </div>
            {saveError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{saveError}</p> : null}
            {saveMessage ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}
            {workspaceMessage ? <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{workspaceMessage}</p> : null}
            {changeList.length > 0 ? (
              <div className="space-y-2">
                {changeList.map((change) => (
                  <div key={change.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-slate-950">{change.label}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{change.before}{" -> "}{change.after}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-600">No unsaved changes in the current draft.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Workweek designer"
          subtitle="Toggle the operating week and keep the draft aligned to a real staffing model"
          collapsible
          defaultCollapsed
        >
          <div className="grid gap-3 md:grid-cols-7">
            {weekDays.map((day) => {
              const enabled = draft.workingDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`rounded-xl border px-3 py-4 text-left transition ${enabled ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                >
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">{day.slice(0, 3)}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{enabled ? "Working" : "Off"}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Working days</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{derived.workingDayCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Daily hours</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{derived.dailyHours}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Recovery days</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{derived.nonWorkingDays.length}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Policy simulator"
          subtitle="Live impact preview driven by the current draft values"
          collapsible
          defaultCollapsed
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Payroll frequency</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{derived.payrollRunsPerYear} runs/year</p>
              <p className="mt-1 text-sm text-slate-600">Based on the selected payroll cycle.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Leave budget</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{derived.totalLeaveAllowance} days/employee</p>
              <p className="mt-1 text-sm text-slate-600">Total annual leave allocation across all leave buckets.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Weekly load</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{derived.weeklyHours} hours</p>
              <p className="mt-1 text-sm text-slate-600">Used as a rough staffing and compliance reference.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">Non-working days</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{derived.nonWorkingDays.length > 0 ? derived.nonWorkingDays.join(", ") : "None configured"}</p>
              <p className="mt-1 text-sm text-slate-600">Feeds attendance exceptions and manager planning.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Leave policy editor"
          subtitle="Adjust each leave bucket and review the total allocation immediately"
          collapsible
          defaultCollapsed
        >
          <div className="grid gap-3 md:grid-cols-3">
            {([
              { key: "annual", label: "Annual", tone: "border-brand-200 bg-brand-50" },
              { key: "sick", label: "Sick", tone: "border-emerald-200 bg-emerald-50" },
              { key: "casual", label: "Casual", tone: "border-amber-200 bg-amber-50" },
            ] as Array<{ key: keyof UpdateCRMSettingsPayload["leavePolicy"]; label: string; tone: string }>).map((item) => (
              <div key={item.key} className={`rounded-xl border px-4 py-4 ${item.tone}`}>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                <input
                  type="number"
                  min="0"
                  value={draft.leavePolicy[item.key]}
                  onChange={(event) => handleLeavePolicyChange(item.key, event.target.value)}
                  className="input-surface mt-3 w-full"
                />
                <p className="mt-2 text-sm text-slate-600">{draft.leavePolicy[item.key]} days configured</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">Total configured leave allowance</p>
            <p className="mt-1 text-sm text-slate-600">{derived.totalLeaveAllowance} days across annual, sick, and casual leave.</p>
          </div>
        </SectionCard>

        <SectionCard
          title="Risk radar"
          subtitle="Policy combinations that deserve admin attention before you save"
          collapsible
          defaultCollapsed
        >
          {riskFlags.length > 0 ? (
            <div className="space-y-3">
              {riskFlags.map((flag) => (
                <div key={flag.title} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{flag.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{flag.detail}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">{flag.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">No structural risks detected</p>
              <p className="mt-2 text-sm text-slate-600">The current draft has a balanced weekly load, leave coverage, and payroll cadence.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Governance checklist"
          subtitle="Track readiness items that usually block policy rollout"
          collapsible
          defaultCollapsed
        >
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">Checklist completion</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{checklistCompletion}%</p>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(checklistCompletion, 6)}%` }} />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: "handbook", label: "Employee handbook reflects the latest leave policy" },
              { key: "payrollAudit", label: "Finance has approved the selected payroll cadence" },
              { key: "managerTraining", label: "Managers have been briefed on the working-day structure" },
              { key: "timezoneNotice", label: "Timezone and work-hour changes have been communicated" },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
                <input
                  type="checkbox"
                  checked={checklist[item.key as keyof typeof checklist]}
                  onChange={(event) =>
                    setChecklist((current) => ({
                      ...current,
                      [item.key]: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-brand-700"
                />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Operational memo"
          subtitle="Generated policy summary for sharing with finance, managers, or leadership"
          rightSlot={
            <button type="button" onClick={() => void handleCopyMemo()} className="btn-secondary px-3 py-2">
              <Copy className="h-4 w-4" />
              Copy text
            </button>
          }
          collapsible
          defaultCollapsed
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
              <BookCheck className="h-4 w-4 text-brand-700" />
              Policy summary
            </p>
            <pre className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">{memoText}</pre>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Landmark className="h-4 w-4 text-brand-700" />
                Finance impact
              </p>
              <p className="mt-2 text-sm text-slate-600">Cadence and weekly hours shape payout timing, overtime expectations, and payroll-close rhythm.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Workflow className="h-4 w-4 text-brand-700" />
                Manager impact
              </p>
              <p className="mt-2 text-sm text-slate-600">Working-day design and leave allowance directly affect approval loads, coverage planning, and attendance exceptions.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
